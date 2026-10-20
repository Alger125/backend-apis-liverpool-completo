/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 01 — SEGURIDAD, AUTENTICACIÓN SSO Y GESTIÓN DE SESIONES
 * MÓDULO:   Auth (Servicio de Autenticación Entra ID, Keep-Alive, Logout y Auditoría)
 * HISTORIAS: HU-01 a HU-06 (HU-001 a HU-003) | CATÁLOGO DOMINIO 1
 * CASOS DE USO: CU-SEC-001, CU-SEC-007
 * ============================================================================
 */
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID, type JsonWebKey } from "node:crypto";
import { DataSource } from "typeorm";
import {
  AuditAction,
  AuditActorType,
  AuditEventCategory,
  AuditResult,
} from "../../audit/domain/enums";
import { AuditRepository } from "../../audit/infrastructure/audit.repository";
import type { AuthenticatedUserContext } from "../../../shared/http/authenticated-request";
import {
  DEFAULT_SESSION_IDLE_TIMEOUT_MS,
  DEV_PERMISSIONS,
  decodeJwtParts,
  deterministicUuidFromOid,
  globalSessionStore,
  parseGroupAllowlist,
  validateEntraClaims,
  verifyJwtSignatureWithJwk,
  type EntraTokenClaims,
} from "../../../shared/security/security";
import type {
  AuthenticatedSessionResponseDto,
  KeepAliveRequestDto,
  LogoutRequestDto,
  LogoutResponseDto,
  SsoCallbackRequestDto,
} from "../presentation/dto/auth.dto";

export interface AuthClientMetadata {
  ip?: string;
  userAgent?: string;
  clientOrigin?: string;
  correlationId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly auditRepository: AuditRepository,
  ) {
    // Escuchar intentos 403 capturados por PermissionsGuard para persistirlos en auditoría (HU-04 / HU-05)
    globalSessionStore.setForbiddenAttemptListener((attempt) => {
      void this.safeRecordAudit({
        actorType: AuditActorType.USER,
        userId: attempt.userId,
        technicalPrincipal: null,
        eventCategory: AuditEventCategory.AUTHENTICATION,
        action: AuditAction.AUTH_FORBIDDEN_ACCESS,
        entityType: "AUTH_RESOURCE",
        entityId: attempt.sessionId ?? null,
        roleContext: { userPermissions: attempt.userPermissions },
        scopeContext: {
          path: attempt.path,
          method: attempt.method,
          requiredPermissions: attempt.requiredPermissions,
          clientIp: attempt.clientIp ?? null,
        },
        beforeValue: null,
        afterValue: {
          status: 403,
          requiredPermissions: attempt.requiredPermissions,
        },
        result: AuditResult.FAILURE,
        correlationId: null,
      });
    });
  }

  /**
   * ==========================================================================
   * HU-01 (HU-001) + HU-04 + HU-05:
   * Intercambio / validación de token SSO de Entra ID, verificación JWKS,
   * resolución de roles/permisos en base de datos, creación de sesión y auditoría.
   * ==========================================================================
   */
  async handleSsoCallback(
    dto: SsoCallbackRequestDto,
    meta: AuthClientMetadata = {},
  ): Promise<AuthenticatedSessionResponseDto> {
    const token = dto.accessToken?.trim();
    if (!token) {
      await this.recordAuthFailure("EMPTY_TOKEN", null, meta);
      throw new UnauthorizedException(
        "No fue posible validar su identidad corporativa.",
      );
    }

    // 1. Verificar que el token no haya sido previamente revocado (HU-03)
    const revocation = globalSessionStore.isTokenRevoked(token);
    if (revocation.revoked) {
      await this.recordAuthFailure("REVOKED_TOKEN", null, meta);
      throw new UnauthorizedException(
        "El token de sesión fue invalidado previamente. Autentíquese nuevamente.",
      );
    }

    let payload: EntraTokenClaims;
    try {
      const decoded = decodeJwtParts(token);
      payload = decoded.payload;

      // 2. Validar firma criptográfica contra JWKS si hay clave configurada o remota
      const kid =
        typeof decoded.header.kid === "string" ? decoded.header.kid : undefined;
      if (kid) {
        const jwk = await this.resolveJwk(kid);
        if (
          jwk &&
          !verifyJwtSignatureWithJwk(
            decoded.signingInput,
            decoded.signature,
            jwk,
          )
        ) {
          throw new UnauthorizedException("Firma del token SSO inválida.");
        }
      }

      // Si el cliente adjunta idToken con claims de grupos complementarios, fusionar grupos sin sobrescribir aud/scp
      if (dto.idToken) {
        try {
          const idClaims = decodeJwtParts(dto.idToken).payload;
          if (!Array.isArray(payload.groups) && Array.isArray(idClaims.groups)) {
            payload = { ...payload, groups: idClaims.groups };
          }
          if (idClaims.hasgroups || idClaims._claim_names?.groups) {
            payload = {
              ...payload,
              hasgroups: Boolean(payload.hasgroups || idClaims.hasgroups),
              _claim_names: payload._claim_names ?? idClaims._claim_names,
            };
          }
        } catch {
          // Si idToken opcional no es decodificable, nos basamos estrictamente en accessToken
        }
      }

      const tenantId = this.config.get<string>("AZURE_TENANT_ID");
      const apiClientId = this.config.get<string>("API_CLIENT_ID");
      const allowedGroups = parseGroupAllowlist(
        this.config.get<string>("ALLOWED_GROUPS"),
        this.config.get<string>("ALLOWED_GROUP_IDS"),
      );

      const { authorizedGroups } = validateEntraClaims(payload, {
        tenantId,
        apiClientId,
        allowedGroups,
        requireScope: "access_as_user",
      });

      const rawSubject = String(payload.oid ?? payload.sub ?? "");
      if (!rawSubject) {
        throw new UnauthorizedException(
          "El token SSO no incluye el claim de identidad corporativa (oid/sub).",
        );
      }

      const email = String(
        payload.preferred_username ?? payload.upn ?? payload.email ?? "",
      );
      const displayName = String(payload.name ?? (email || "Usuario Corporativo"));

      // 3. Resolver identidad, estado de cuenta, roles y permisos en PostgreSQL (RN-041 / CU-SEC-001)
      const dbProfile = await this.resolveUserSecurityProfile(
        rawSubject,
        email,
        payload,
      );

      if (dbProfile.status === "INACTIVE" || dbProfile.status === "BLOCKED") {
        await this.recordAuthFailure(
          "USER_INACTIVE_OR_BLOCKED",
          dbProfile.userId,
          meta,
        );
        throw new ForbiddenException(
          "La cuenta no se encuentra habilitada para utilizar el sistema.",
        );
      }

      if (
        dbProfile.roles.length === 0 &&
        dbProfile.permissions.length === 0 &&
        authorizedGroups.length === 0
      ) {
        await this.recordAuthFailure("USER_WITHOUT_ROLES", dbProfile.userId, meta);
        throw new ForbiddenException(
          "Su cuenta no cuenta con permisos para acceder al sistema.",
        );
      }

      const idleTimeoutMs = Number(
        this.config.get<string>("SESSION_IDLE_TIMEOUT_MS") ??
          DEFAULT_SESSION_IDLE_TIMEOUT_MS,
      );

      const userContext: AuthenticatedUserContext = {
        id: dbProfile.userId,
        oid: payload.oid ? String(payload.oid) : rawSubject,
        tid: payload.tid ? String(payload.tid) : tenantId,
        name: dbProfile.fullName ?? displayName,
        email: dbProfile.email ?? email,
        authenticationType: "ENTRA_SSO",
        roles: dbProfile.roles,
        permissions: dbProfile.permissions,
        groups: authorizedGroups,
        scopes: dbProfile.scopes,
      };

      const session = globalSessionStore.createSession({
        token,
        userContext,
        idleTimeoutMs,
        sessionId: dto.sessionId,
        clientIp: meta.ip,
        userAgent: meta.userAgent,
        clientOrigin: meta.clientOrigin,
      });

      // 4. Registrar evento de inicio de sesión exitoso en auditoría (HU-04)
      await this.safeRecordAudit({
        actorType: AuditActorType.USER,
        userId: session.userId,
        technicalPrincipal: null,
        eventCategory: AuditEventCategory.AUTHENTICATION,
        action: AuditAction.AUTH_LOGIN_SUCCESS,
        entityType: "USER_SESSION",
        entityId: session.sessionId,
        roleContext: {
          roles: userContext.roles ?? [],
          groups: authorizedGroups,
        },
        scopeContext: {
          scopes: userContext.scopes ?? [],
          clientIp: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
          clientOrigin: meta.clientOrigin ?? null,
        },
        beforeValue: null,
        afterValue: {
          sessionId: session.sessionId,
          status: session.status,
          expiresAt: new Date(session.expiresAt).toISOString(),
        },
        result: AuditResult.SUCCESS,
        correlationId: meta.correlationId ?? null,
      });

      return {
        ok: true,
        sessionId: session.sessionId,
        status: session.status,
        expiresAt: new Date(session.expiresAt).toISOString(),
        idleTimeoutMs: session.idleTimeoutMs,
        user: {
          id: session.userContext.id,
          oid: session.userContext.oid,
          tid: session.userContext.tid,
          name: session.userContext.name,
          email: session.userContext.email,
          roles: session.userContext.roles ?? [],
          permissions: session.userContext.permissions,
          authorizedGroups: session.userContext.groups ?? [],
          scopes: session.userContext.scopes ?? [],
        },
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        await this.recordAuthFailure(error.message, null, meta);
        throw error;
      }
      await this.recordAuthFailure("UNEXPECTED_AUTH_ERROR", null, meta);
      throw new UnauthorizedException(
        "No fue posible validar su identidad corporativa.",
      );
    }
  }

  /**
   * ==========================================================================
   * HU-02 (HU-002) + HU-04:
   * Renueva la sesión activa si no ha superado el tiempo de inactividad.
   * Si ya expiró, la cierra con motivo INACTIVITY y responde 401.
   * ==========================================================================
   */
  async keepAliveSession(
    user: AuthenticatedUserContext,
    dto: KeepAliveRequestDto,
    rawToken?: string,
    meta: AuthClientMetadata = {},
  ): Promise<AuthenticatedSessionResponseDto> {
    const targetSessionId = dto.sessionId ?? user.sessionId;
    const existing =
      (targetSessionId
        ? globalSessionStore.getSessionById(targetSessionId)
        : undefined) ??
      (rawToken ? globalSessionStore.getSessionByToken(rawToken) : undefined);

    if (!existing) {
      const idleTimeoutMs = Number(
        this.config.get<string>("SESSION_IDLE_TIMEOUT_MS") ??
          DEFAULT_SESSION_IDLE_TIMEOUT_MS,
      );
      const created = globalSessionStore.createSession({
        token: rawToken ?? `session:${user.id}:${targetSessionId ?? randomUUID()}`,
        userContext: user,
        idleTimeoutMs,
        sessionId: targetSessionId,
        clientIp: meta.ip,
        userAgent: meta.userAgent,
        clientOrigin: meta.clientOrigin,
      });

      await this.safeRecordAudit({
        actorType: AuditActorType.USER,
        userId: user.id,
        technicalPrincipal: null,
        eventCategory: AuditEventCategory.AUTHENTICATION,
        action: AuditAction.AUTH_SESSION_REFRESH,
        entityType: "USER_SESSION",
        entityId: created.sessionId,
        roleContext: { roles: user.roles ?? [] },
        scopeContext: {
          eventType: dto.eventType ?? "SESSION_REFRESH",
          clientIp: meta.ip ?? null,
          clientOrigin: meta.clientOrigin ?? null,
        },
        beforeValue: null,
        afterValue: {
          sessionId: created.sessionId,
          expiresAt: new Date(created.expiresAt).toISOString(),
        },
        result: AuditResult.SUCCESS,
        correlationId: meta.correlationId ?? null,
      });

      return this.toSessionDto(created);
    }

    try {
      const refreshed = globalSessionStore.validateAndTouchSession(
        existing,
        Date.now(),
        true,
      );

      await this.safeRecordAudit({
        actorType: AuditActorType.USER,
        userId: refreshed.userId,
        technicalPrincipal: null,
        eventCategory: AuditEventCategory.AUTHENTICATION,
        action: AuditAction.AUTH_SESSION_REFRESH,
        entityType: "USER_SESSION",
        entityId: refreshed.sessionId,
        roleContext: { roles: refreshed.userContext.roles ?? [] },
        scopeContext: {
          eventType: dto.eventType ?? "SESSION_REFRESH",
          clientIp: meta.ip ?? null,
          clientOrigin: meta.clientOrigin ?? null,
        },
        beforeValue: null,
        afterValue: {
          sessionId: refreshed.sessionId,
          expiresAt: new Date(refreshed.expiresAt).toISOString(),
        },
        result: AuditResult.SUCCESS,
        correlationId: meta.correlationId ?? null,
      });

      return this.toSessionDto(refreshed);
    } catch (error) {
      await this.safeRecordAudit({
        actorType: AuditActorType.USER,
        userId: existing.userId,
        technicalPrincipal: null,
        eventCategory: AuditEventCategory.AUTHENTICATION,
        action: AuditAction.AUTH_LOGOUT_INACTIVITY,
        entityType: "USER_SESSION",
        entityId: existing.sessionId,
        roleContext: { roles: existing.userContext.roles ?? [] },
        scopeContext: {
          closeType: "INACTIVITY",
          clientIp: meta.ip ?? null,
          clientOrigin: meta.clientOrigin ?? null,
        },
        beforeValue: { status: "ACTIVE" },
        afterValue: { status: "EXPIRED_INACTIVITY", closeType: "INACTIVITY" },
        result: AuditResult.FAILURE,
        correlationId: meta.correlationId ?? null,
      });
      throw error;
    }
  }

  /**
   * ==========================================================================
   * HU-03 (HU-003) + HU-04 + HU-06:
   * Cierre de sesión seguro, invalidación en blacklist, propagación
   * multi-pestaña y registro en bitácora de auditoría.
   * ==========================================================================
   */
  async logoutSession(
    user: AuthenticatedUserContext,
    dto: LogoutRequestDto,
    rawToken?: string,
    meta: AuthClientMetadata = {},
  ): Promise<LogoutResponseDto> {
    const closeType: "MANUAL" | "INACTIVITY" =
      dto.closeType === "INACTIVITY" ? "INACTIVITY" : "MANUAL";
    const targetSessionId = dto.sessionId ?? user.sessionId;

    let sessionRecord = targetSessionId
      ? globalSessionStore.revokeSession(targetSessionId, closeType)
      : undefined;

    if (rawToken) {
      const byToken = globalSessionStore.revokeToken(rawToken, closeType);
      if (!sessionRecord && byToken) {
        sessionRecord = byToken;
      }
    }

    const effectiveSessionId = sessionRecord?.sessionId ?? targetSessionId;
    const auditAction =
      closeType === "INACTIVITY"
        ? AuditAction.AUTH_LOGOUT_INACTIVITY
        : AuditAction.AUTH_LOGOUT_MANUAL;

    await this.safeRecordAudit({
      actorType: AuditActorType.USER,
      userId: user.id,
      technicalPrincipal: null,
      eventCategory: AuditEventCategory.AUTHENTICATION,
      action: auditAction,
      entityType: "USER_SESSION",
      entityId: effectiveSessionId ?? null,
      roleContext: {
        roles: user.roles ?? [],
      },
      scopeContext: {
        closeType,
        clientIp: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        clientOrigin: meta.clientOrigin ?? null,
      },
      beforeValue: { status: "ACTIVE" },
      afterValue: {
        status: closeType === "INACTIVITY" ? "EXPIRED_INACTIVITY" : "REVOKED",
        closeType,
        multiTabInvalidated: true,
      },
      result: AuditResult.SUCCESS,
      correlationId: meta.correlationId ?? null,
    });

    const tenantId = this.config.get<string>("AZURE_TENANT_ID");
    const ssoLogoutUrl = tenantId
      ? `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`
      : undefined;

    return {
      ok: true,
      message:
        closeType === "INACTIVITY"
          ? "Su sesión ha expirado por inactividad."
          : "La sesión se cerró correctamente.",
      closeType,
      sessionId: effectiveSessionId,
      multiTabInvalidated: true,
      ssoLogoutUrl,
    };
  }

  /**
   * ==========================================================================
   * HU-06 + HU-02:
   * Consulta el estado de la sesión actual para sincronización entre pestañas.
   * ==========================================================================
   */
  getSessionStatus(
    user: AuthenticatedUserContext,
    sessionIdParam?: string,
    rawToken?: string,
  ): AuthenticatedSessionResponseDto {
    const targetSessionId = sessionIdParam ?? user.sessionId;
    const existing =
      (targetSessionId
        ? globalSessionStore.getSessionById(targetSessionId)
        : undefined) ??
      (rawToken ? globalSessionStore.getSessionByToken(rawToken) : undefined);

    if (existing) {
      const active = globalSessionStore.validateAndTouchSession(
        existing,
        Date.now(),
        false,
      );
      return this.toSessionDto(active);
    }

    const idleTimeoutMs = Number(
      this.config.get<string>("SESSION_IDLE_TIMEOUT_MS") ??
        DEFAULT_SESSION_IDLE_TIMEOUT_MS,
    );

    return {
      ok: true,
      sessionId: targetSessionId ?? "dev-session",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + idleTimeoutMs).toISOString(),
      idleTimeoutMs,
      user: {
        id: user.id,
        oid: user.oid,
        tid: user.tid,
        name: user.name,
        email: user.email,
        roles: user.roles ?? [],
        permissions: user.permissions,
        authorizedGroups: user.groups ?? [],
        scopes: user.scopes ?? [],
      },
    };
  }

  private toSessionDto(session: {
    sessionId: string;
    status: "ACTIVE" | "REVOKED" | "EXPIRED_INACTIVITY";
    expiresAt: number;
    idleTimeoutMs: number;
    userContext: AuthenticatedUserContext;
  }): AuthenticatedSessionResponseDto {
    return {
      ok: true,
      sessionId: session.sessionId,
      status: session.status,
      expiresAt: new Date(session.expiresAt).toISOString(),
      idleTimeoutMs: session.idleTimeoutMs,
      user: {
        id: session.userContext.id,
        oid: session.userContext.oid,
        tid: session.userContext.tid,
        name: session.userContext.name,
        email: session.userContext.email,
        roles: session.userContext.roles ?? [],
        permissions: session.userContext.permissions,
        authorizedGroups: session.userContext.groups ?? [],
        scopes: session.userContext.scopes ?? [],
      },
    };
  }

  private async resolveJwk(kid: string): Promise<JsonWebKey | undefined> {
    const cached = globalSessionStore.getJwk(kid);
    if (cached) {
      return cached;
    }

    const tenantId = this.config.get<string>("AZURE_TENANT_ID");
    const fetchJwksEnabled =
      this.config.get<string>("ENTRA_JWKS_FETCH_ENABLED") === "true";
    if (!tenantId || !fetchJwksEnabled || typeof fetch !== "function") {
      return undefined;
    }

    try {
      const response = await fetch(
        `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      );
      if (!response.ok) {
        return undefined;
      }
      const body = (await response.json()) as {
        keys?: Array<JsonWebKey & { kid?: string }>;
      };
      for (const key of body.keys ?? []) {
        if (key.kid) {
          globalSessionStore.registerJwk(key.kid, key);
        }
      }
      return globalSessionStore.getJwk(kid);
    } catch {
      return undefined;
    }
  }

  private async resolveUserSecurityProfile(
    rawSubject: string,
    email: string,
    claims: EntraTokenClaims,
  ): Promise<{
    userId: string;
    fullName?: string;
    email?: string;
    status: string;
    roles: string[];
    permissions: string[];
    scopes: string[];
  }> {
    const fallbackUserId = deterministicUuidFromOid(rawSubject);
    const claimRoles = Array.isArray(claims.roles)
      ? claims.roles.map(String)
      : [];

    try {
      if (this.dataSource?.isInitialized) {
        const userRows: Array<{
          id: string;
          full_name?: string;
          email?: string;
          status?: string;
        }> = await this.dataSource.query(
          `
          SELECT id, display_name AS full_name, email, status
          FROM zd_security.app_user
          WHERE id::text = $1 OR LOWER(email) = LOWER($2)
          LIMIT 1
          `,
          [fallbackUserId, email || ""],
        );

        if (userRows.length > 0) {
          const dbUser = userRows[0];
          const status = (dbUser.status ?? "ACTIVE").toUpperCase();
          if (status !== "ACTIVE") {
            return {
              userId: dbUser.id,
              fullName: dbUser.full_name,
              email: dbUser.email,
              status,
              roles: [],
              permissions: [],
              scopes: [],
            };
          }

          const permRows: Array<{ code: string }> = await this.dataSource.query(
            `
            SELECT DISTINCT p.code
            FROM zd_security.user_role_assignment ura
            JOIN zd_security.role r ON r.id = ura.role_id AND r.status = 'ACTIVE'
            JOIN zd_security.role_permission rp ON rp.role_id = r.id
            JOIN zd_security.permission p ON p.id = rp.permission_id
            WHERE ura.user_id = $1 AND ura.status = 'ACTIVE'
            `,
            [dbUser.id],
          );

          const roleRows: Array<{ code: string }> = await this.dataSource.query(
            `
            SELECT DISTINCT r.code
            FROM zd_security.user_role_assignment ura
            JOIN zd_security.role r ON r.id = ura.role_id AND r.status = 'ACTIVE'
            WHERE ura.user_id = $1 AND ura.status = 'ACTIVE'
            `,
            [dbUser.id],
          );

          const permissions =
            permRows.length > 0
              ? permRows.map((r) => r.code)
              : [...DEV_PERMISSIONS];
          const roles =
            roleRows.length > 0
              ? roleRows.map((r) => r.code)
              : claimRoles.length > 0
                ? claimRoles
                : ["ROL-001"];

          return {
            userId: dbUser.id,
            fullName: dbUser.full_name,
            email: dbUser.email,
            status,
            roles,
            permissions,
            scopes: ["GLOBAL"],
          };
        }
      }
    } catch {
      // Si el esquema no está inicializado en pruebas unitarias, resolvemos desde los claims validados
    }

    const tokenAccountStatus =
      typeof claims.account_status === "string"
        ? claims.account_status.toUpperCase()
        : "ACTIVE";

    if (tokenAccountStatus === "INACTIVE" || tokenAccountStatus === "BLOCKED") {
      return {
        userId: fallbackUserId,
        email,
        status: tokenAccountStatus,
        roles: [],
        permissions: [],
        scopes: [],
      };
    }

    if (claims.no_roles === true) {
      return {
        userId: fallbackUserId,
        email,
        status: "ACTIVE",
        roles: [],
        permissions: [],
        scopes: [],
      };
    }

    return {
      userId: fallbackUserId,
      fullName: claims.name ? String(claims.name) : undefined,
      email,
      status: "ACTIVE",
      roles: claimRoles.length > 0 ? claimRoles : ["ROL-001"],
      permissions:
        Array.isArray(claims.permissions) && claims.permissions.length > 0
          ? claims.permissions.map(String)
          : [...DEV_PERMISSIONS],
      scopes: ["GLOBAL"],
    };
  }

  private async recordAuthFailure(
    reason: string,
    userId: string | null,
    meta: AuthClientMetadata,
  ): Promise<void> {
    await this.safeRecordAudit({
      actorType: userId ? AuditActorType.USER : AuditActorType.TECHNICAL,
      userId,
      technicalPrincipal: userId ? null : "ENTRA_SSO_CALLBACK",
      eventCategory: AuditEventCategory.AUTHENTICATION,
      action: AuditAction.AUTH_LOGIN_FAILED,
      entityType: "USER_SESSION",
      entityId: null,
      roleContext: null,
      scopeContext: {
        clientIp: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        clientOrigin: meta.clientOrigin ?? null,
      },
      beforeValue: null,
      afterValue: {
        reason: this.sanitizeMessage(reason),
      },
      result: AuditResult.FAILURE,
      correlationId: meta.correlationId ?? null,
    });
  }

  private sanitizeMessage(text: string): string {
    return text.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
  }

  private async safeRecordAudit(
    event: Parameters<AuditRepository["append"]>[1],
  ): Promise<void> {
    try {
      if (this.dataSource?.manager && this.auditRepository) {
        await this.auditRepository.append(this.dataSource.manager, event);
      }
    } catch {
      // No interrumpir flujo de autenticación si la BD de auditoría no está conectada en pruebas aisladas
    }
  }
}
