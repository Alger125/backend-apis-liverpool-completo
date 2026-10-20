import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import {
  createHash,
  createPublicKey,
  randomUUID,
  timingSafeEqual,
  verify as cryptoVerify,
  type JsonWebKey,
} from "node:crypto";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../../common/auth/public.decorator";
import type { AuthenticatedUserContext } from "../http/authenticated-request";

const REQUIRED_PERMISSIONS = "permissions";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export const DEV_PERMISSIONS = [
  "ROLE_VIEW",
  "ROLE_CREATE",
  "ROLE_UPDATE",
  "ROLE_DELETE",
  "ROLE_IMPACT_VIEW",
  "PERMISSION_VIEW",
  "USER_VIEW",
  "ROLE_ASSIGNMENT_VIEW",
  "ROLE_ASSIGNMENT_CREATE",
  "ROLE_ASSIGNMENT_UPDATE",
  "ROLE_ASSIGNMENT_REVOKE",
  "ROLE_ASSIGNMENT_IMPACT_VIEW",
  "ROLE_EXCEPTION_VIEW",
  "ROLE_EXCEPTION_CREATE",
  "ROLE_EXCEPTION_UPDATE",
  "ROLE_EXCEPTION_REVOKE",
  "ROLE_EXCEPTION_IMPACT_VIEW",
  "STRUCTURE_VIEW",
  "GROUP_VIEW",
  "GROUP_CREATE",
  "GROUP_UPDATE",
  "GROUP_INACTIVATE",
  "SECTION_VIEW",
  "SECTION_ASSIGN",
  "SECTION_MOVE",
  "SECTION_UNASSIGN",
  "PLANNING_VIEW",
  "PLANNING_CREATE",
  "PLANNING_UPDATE",
  "PLANNING_PUBLISH",
  "REPORTS_VIEW",
  "REPORTS_ROLE_VIEW",
  "REPORTS_GLOBAL_VIEW",
  "REPORTS_COMPENSATIONS_VIEW",
  "REPORTS_EXPORT",
  "REPORTS_DOWNLOAD_CSV",
  "AUDIT_VIEW",
  "BATCH_IMPORT_EXECUTE",
  "ADMIN_CONFIG",
] as const;

export const DEFAULT_SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export interface EntraTokenClaims {
  aud?: string | string[];
  iss?: string;
  tid?: string;
  oid?: string;
  sub?: string;
  name?: string;
  preferred_username?: string;
  upn?: string;
  email?: string;
  scp?: string;
  roles?: string[];
  groups?: string[];
  hasgroups?: boolean;
  _claim_names?: { groups?: string };
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  tokenHash: string;
  userContext: AuthenticatedUserContext;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  idleTimeoutMs: number;
  status: "ACTIVE" | "REVOKED" | "EXPIRED_INACTIVITY";
  closeReason?: "MANUAL" | "INACTIVITY";
  closedAt?: number;
  clientIp?: string;
  userAgent?: string;
  clientOrigin?: string;
}

export interface ForbiddenAccessAttempt {
  timestamp: string;
  userId: string;
  sessionId?: string;
  path: string;
  method: string;
  requiredPermissions: string[];
  userPermissions: string[];
  clientIp?: string;
}

export type ForbiddenAttemptListener = (attempt: ForbiddenAccessAttempt) => void;

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function deterministicUuidFromOid(oidOrSub: string): string {
  if (UUID_PATTERN.test(oidOrSub)) {
    return oidOrSub.toLowerCase();
  }
  const hex = createHash("sha256").update(oidOrSub, "utf8").digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function parseGroupAllowlist(
  allowedGroupsRaw?: string,
  allowedGroupIdsRaw?: string,
): string[] {
  return [
    ...new Set(
      [allowedGroupsRaw ?? "", allowedGroupIdsRaw ?? ""]
        .flatMap((entry) => entry.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeGroupValue(value: string): string {
  return value.trim().toLowerCase();
}

export function decodeJwtParts(token: string): {
  header: Record<string, unknown>;
  payload: EntraTokenClaims;
  signingInput: string;
  signature: Buffer;
} {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new UnauthorizedException("Formato de token JWT invalido.");
  }

  try {
    const header = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as EntraTokenClaims;
    const signature = Buffer.from(parts[2], "base64url");
    return {
      header,
      payload,
      signingInput: `${parts[0]}.${parts[1]}`,
      signature,
    };
  } catch {
    throw new UnauthorizedException("No fue posible decodificar el token JWT.");
  }
}

export function verifyJwtSignatureWithJwk(
  signingInput: string,
  signature: Buffer,
  jwk: JsonWebKey,
): boolean {
  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  return cryptoVerify(
    "RSA-SHA256",
    Buffer.from(signingInput, "utf8"),
    publicKey,
    signature,
  );
}

export function validateEntraClaims(
  claims: EntraTokenClaims,
  options: {
    tenantId?: string;
    apiClientId?: string;
    allowedGroups?: string[];
    requireScope?: string;
    nowSeconds?: number;
  },
): { authorizedGroups: string[] } {
  const nowSec = options.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (typeof claims.exp === "number" && claims.exp <= nowSec) {
    throw new UnauthorizedException("El token de sesion ha expirado.");
  }

  if (typeof claims.nbf === "number" && claims.nbf > nowSec + 60) {
    throw new UnauthorizedException("El token aun no entra en vigencia.");
  }

  if (options.apiClientId) {
    const expectedAudiences = new Set([
      options.apiClientId,
      `api://${options.apiClientId}`,
    ]);
    const tokenAud = Array.isArray(claims.aud)
      ? claims.aud
      : claims.aud
        ? [String(claims.aud)]
        : [];
    if (!tokenAud.some((aud) => expectedAudiences.has(aud))) {
      throw new UnauthorizedException(
        `Audiencia de token no valida: ${tokenAud.join(",") || "vacia"}`,
      );
    }
  }

  if (options.tenantId) {
    const expectedIssuers = new Set([
      `https://login.microsoftonline.com/${options.tenantId}/v2.0`,
      `https://sts.windows.net/${options.tenantId}/`,
    ]);
    if (!claims.iss || !expectedIssuers.has(String(claims.iss))) {
      throw new UnauthorizedException("Emisor (issuer) del token no autorizado.");
    }
    if (claims.tid !== options.tenantId) {
      throw new UnauthorizedException(
        "El tenant del token no coincide con el tenant corporativo configurado.",
      );
    }
  }

  const requiredScope = options.requireScope ?? "access_as_user";
  if (requiredScope) {
    const scopes =
      typeof claims.scp === "string"
        ? claims.scp.split(" ").map((s) => s.trim()).filter(Boolean)
        : [];
    if (!scopes.includes(requiredScope)) {
      throw new UnauthorizedException(
        `El token no incluye el scope delegado requerido (${requiredScope}).`,
      );
    }
  }

  // Validacion de Overage de grupos en Entra ID (CU-SEC-001 / RN-041)
  if (claims.hasgroups || claims._claim_names?.groups) {
    throw new ForbiddenException(
      "Group claims exceeded token limit (overage). Configure flujo OBO/Graph antes de autorizar.",
    );
  }

  const allowedGroups = options.allowedGroups ?? [];
  if (allowedGroups.length > 0) {
    const normalizedAllowed = new Set(allowedGroups.map(normalizeGroupValue));
    const userGroups = Array.isArray(claims.groups)
      ? claims.groups.map(String)
      : [];
    const matched = userGroups.filter((g) =>
      normalizedAllowed.has(normalizeGroupValue(g)),
    );
    if (matched.length === 0) {
      throw new ForbiddenException(
        "Su cuenta no cuenta con permisos ni grupo autorizado para acceder al sistema.",
      );
    }
    return { authorizedGroups: matched };
  }

  return {
    authorizedGroups: Array.isArray(claims.groups)
      ? claims.groups.map(String)
      : [],
  };
}

/**
 * Almacén en memoria de sesiones activas, tokens revocados (blacklist) y
 * bitácora de intentos 403 (HU-01 a HU-06).
 */
export class SessionStateStore {
  private readonly sessionsById = new Map<string, SessionRecord>();
  private readonly sessionIdByTokenHash = new Map<string, string>();
  private readonly revokedTokens = new Map<
    string,
    { revokedAt: number; reason: "MANUAL" | "INACTIVITY"; sessionId?: string }
  >();
  private readonly jwksCache = new Map<string, JsonWebKey>();
  private readonly forbiddenAttempts: ForbiddenAccessAttempt[] = [];
  private forbiddenListener: ForbiddenAttemptListener | null = null;

  registerJwk(kid: string, jwk: JsonWebKey): void {
    this.jwksCache.set(kid, jwk);
  }

  getJwk(kid: string): JsonWebKey | undefined {
    return this.jwksCache.get(kid);
  }

  clearJwks(): void {
    this.jwksCache.clear();
  }

  setForbiddenAttemptListener(listener: ForbiddenAttemptListener | null): void {
    this.forbiddenListener = listener;
  }

  recordForbiddenAttempt(attempt: ForbiddenAccessAttempt): void {
    this.forbiddenAttempts.push(attempt);
    if (this.forbiddenListener) {
      try {
        this.forbiddenListener(attempt);
      } catch {
        // Evitar que un fallo en listener secundario interrumpa el rechazo 403
      }
    }
  }

  getForbiddenAttempts(): ForbiddenAccessAttempt[] {
    return [...this.forbiddenAttempts];
  }

  createSession(params: {
    token: string;
    userContext: AuthenticatedUserContext;
    idleTimeoutMs?: number;
    sessionId?: string;
    now?: number;
    clientIp?: string;
    userAgent?: string;
    clientOrigin?: string;
  }): SessionRecord {
    const now = params.now ?? Date.now();
    const idleTimeoutMs =
      params.idleTimeoutMs && params.idleTimeoutMs > 0
        ? params.idleTimeoutMs
        : DEFAULT_SESSION_IDLE_TIMEOUT_MS;
    const tokenHash = hashToken(params.token);
    const sessionId =
      params.sessionId ?? params.userContext.sessionId ?? randomUUID();

    const userContext: AuthenticatedUserContext = {
      ...params.userContext,
      sessionId,
    };

    const record: SessionRecord = {
      sessionId,
      userId: userContext.id,
      tokenHash,
      userContext,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + idleTimeoutMs,
      idleTimeoutMs,
      status: "ACTIVE",
      clientIp: params.clientIp,
      userAgent: params.userAgent,
      clientOrigin: params.clientOrigin,
    };

    this.sessionsById.set(sessionId, record);
    this.sessionIdByTokenHash.set(tokenHash, sessionId);
    return record;
  }

  getSessionById(sessionId: string): SessionRecord | undefined {
    return this.sessionsById.get(sessionId);
  }

  getSessionByToken(token: string): SessionRecord | undefined {
    const tokenHash = hashToken(token);
    const sessionId = this.sessionIdByTokenHash.get(tokenHash);
    if (!sessionId) {
      return undefined;
    }
    return this.sessionsById.get(sessionId);
  }

  isTokenRevoked(token: string): {
    revoked: boolean;
    reason?: "MANUAL" | "INACTIVITY";
    sessionId?: string;
  } {
    const tokenHash = hashToken(token);
    const entry = this.revokedTokens.get(tokenHash);
    if (!entry) {
      return { revoked: false };
    }
    return {
      revoked: true,
      reason: entry.reason,
      sessionId: entry.sessionId,
    };
  }

  /**
   * Valida si la sesión sigue activa y dentro de la ventana de inactividad (HU-02 y HU-06).
   * Si el tiempo de inactividad fue superado, la invalida automáticamente con motivo INACTIVITY.
   */
  validateAndTouchSession(
    sessionOrId: string | SessionRecord,
    now: number = Date.now(),
    touch: boolean = true,
  ): SessionRecord {
    const session =
      typeof sessionOrId === "string"
        ? this.sessionsById.get(sessionOrId)
        : sessionOrId;

    if (!session) {
      throw new UnauthorizedException({
        code: "SESSION_NOT_FOUND",
        message: "La sesión ya no se encuentra activa.",
      });
    }

    if (session.status !== "ACTIVE") {
      const message =
        session.closeReason === "INACTIVITY"
          ? "Su sesión ha expirado por inactividad."
          : "La sesión ya no se encuentra activa.";
      throw new UnauthorizedException({
        code:
          session.closeReason === "INACTIVITY"
            ? "SESSION_EXPIRED_INACTIVITY"
            : "SESSION_TERMINATED",
        reason: session.closeReason ?? "MANUAL",
        sessionId: session.sessionId,
        message,
      });
    }

    if (now - session.lastActivityAt > session.idleTimeoutMs) {
      this.revokeSession(session.sessionId, "INACTIVITY", now);
      throw new UnauthorizedException({
        code: "SESSION_EXPIRED_INACTIVITY",
        reason: "INACTIVITY",
        sessionId: session.sessionId,
        message: "Su sesión ha expirado por inactividad.",
      });
    }

    if (touch) {
      session.lastActivityAt = now;
      session.expiresAt = now + session.idleTimeoutMs;
    }

    return session;
  }

  revokeSession(
    sessionId: string,
    reason: "MANUAL" | "INACTIVITY" = "MANUAL",
    now: number = Date.now(),
  ): SessionRecord | undefined {
    const session = this.sessionsById.get(sessionId);
    if (!session) {
      return undefined;
    }

    session.status =
      reason === "INACTIVITY" ? "EXPIRED_INACTIVITY" : "REVOKED";
    session.closeReason = reason;
    session.closedAt = now;

    this.revokedTokens.set(session.tokenHash, {
      revokedAt: now,
      reason,
      sessionId: session.sessionId,
    });

    return session;
  }

  revokeToken(
    token: string,
    reason: "MANUAL" | "INACTIVITY" = "MANUAL",
    now: number = Date.now(),
  ): SessionRecord | undefined {
    const tokenHash = hashToken(token);
    const sessionId = this.sessionIdByTokenHash.get(tokenHash);
    this.revokedTokens.set(tokenHash, {
      revokedAt: now,
      reason,
      sessionId,
    });
    if (sessionId) {
      return this.revokeSession(sessionId, reason, now);
    }
    return undefined;
  }

  resetAll(): void {
    this.sessionsById.clear();
    this.sessionIdByTokenHash.clear();
    this.revokedTokens.clear();
    this.jwksCache.clear();
    this.forbiddenAttempts.length = 0;
  }
}

export const globalSessionStore = new SessionStateStore();

type AuthenticatedGuardRequest = Request & {
  user?: AuthenticatedUserContext;
};

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler?.();
    const targetClass = context.getClass?.();
    const isPublic = Boolean(
      (handler && Reflect.getMetadata(IS_PUBLIC_KEY, handler)) ||
        (targetClass && Reflect.getMetadata(IS_PUBLIC_KEY, targetClass)),
    );
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedGuardRequest>();

    // 1. Soporte de Bearer Token SSO / Entra ID y sesiones activas (HU-01 a HU-06)
    const authHeader = this.readHeader(request, "authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7).trim();
      if (!token) {
        throw new UnauthorizedException("Token Bearer vacio.");
      }
      return this.authenticateBearerToken(request, token);
    }

    // 2. Soporte de x-dev-api-key (Desarrollo local y pruebas existentes)
    const nodeEnv = this.config.get<string>("NODE_ENV") ?? "development";

    if (nodeEnv !== "development" && nodeEnv !== "test") {
      throw new ServiceUnavailableException(
        "La autenticacion temporal esta deshabilitada.",
      );
    }

    if (
      nodeEnv !== "test" &&
      !this.isLoopback(request.ip, request.socket?.remoteAddress)
    ) {
      throw new ForbiddenException(
        "La autenticacion temporal solo admite conexiones locales.",
      );
    }

    const expectedKey = this.config.get<string>("DEV_API_KEY");
    const devUserId = this.config.get<string>("DEV_USER_ID");
    if (
      !expectedKey ||
      expectedKey === "change-me" ||
      !devUserId ||
      !UUID_PATTERN.test(devUserId)
    ) {
      throw new ServiceUnavailableException(
        "La autenticacion temporal no esta configurada.",
      );
    }

    const providedKey = this.readHeader(request, "x-dev-api-key");
    if (!providedKey || !this.keysMatch(providedKey, expectedKey)) {
      throw new UnauthorizedException("Credencial temporal invalida.");
    }

    // Si envía x-session-id junto con la llave de desarrollo, validamos estado de sesión multi-pestaña (HU-06)
    const sessionIdHeader = this.readHeader(request, "x-session-id");
    if (sessionIdHeader) {
      const existingSession = globalSessionStore.getSessionById(sessionIdHeader);
      if (existingSession) {
        const active = globalSessionStore.validateAndTouchSession(existingSession);
        request.user = active.userContext;
        return true;
      }
    }

    request.user = {
      id: devUserId,
      authenticationType: "DEV_API_KEY",
      permissions: [...DEV_PERMISSIONS],
    };
    return true;
  }

  private authenticateBearerToken(
    request: AuthenticatedGuardRequest,
    token: string,
  ): boolean {
    // 1. Verificar si el token fue revocado en logout o expiración previa (HU-03 / HU-06)
    const revocation = globalSessionStore.isTokenRevoked(token);
    if (revocation.revoked) {
      const message =
        revocation.reason === "INACTIVITY"
          ? "Su sesión ha expirado por inactividad."
          : "La sesión ya no se encuentra activa.";
      throw new UnauthorizedException({
        code:
          revocation.reason === "INACTIVITY"
            ? "SESSION_EXPIRED_INACTIVITY"
            : "SESSION_TERMINATED",
        reason: revocation.reason ?? "MANUAL",
        sessionId: revocation.sessionId,
        message,
      });
    }

    // 2. Verificar si existe una sesión activa asociada al token o x-session-id (HU-02 / HU-06)
    const sessionIdHeader = this.readHeader(request, "x-session-id");
    const existingSession =
      (sessionIdHeader
        ? globalSessionStore.getSessionById(sessionIdHeader)
        : undefined) ?? globalSessionStore.getSessionByToken(token);

    if (existingSession) {
      const validated = globalSessionStore.validateAndTouchSession(existingSession);
      request.user = validated.userContext;
      return true;
    }

    // 3. Validar token JWT de Entra ID directamente (HU-01 / HU-05)
    const { header, payload, signingInput, signature } = decodeJwtParts(token);
    const kid = typeof header.kid === "string" ? header.kid : undefined;
    if (kid) {
      const cachedJwk = globalSessionStore.getJwk(kid);
      if (cachedJwk && !verifyJwtSignatureWithJwk(signingInput, signature, cachedJwk)) {
        throw new UnauthorizedException("Firma criptografica del token invalida.");
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
        "El token no contiene identificador de identidad (oid/sub).",
      );
    }

    const userId = deterministicUuidFromOid(rawSubject);
    const idleTimeoutMs = Number(
      this.config.get<string>("SESSION_IDLE_TIMEOUT_MS") ??
        DEFAULT_SESSION_IDLE_TIMEOUT_MS,
    );

    const permissions =
      Array.isArray(payload.roles) && payload.roles.length > 0
        ? payload.roles.map(String)
        : [...DEV_PERMISSIONS];

    const userContext: AuthenticatedUserContext = {
      id: userId,
      oid: payload.oid ? String(payload.oid) : rawSubject,
      tid: payload.tid ? String(payload.tid) : tenantId,
      name: payload.name ? String(payload.name) : undefined,
      email: String(
        payload.preferred_username ?? payload.upn ?? payload.email ?? "",
      ),
      authenticationType: "ENTRA_SSO",
      permissions,
      roles: Array.isArray(payload.roles) ? payload.roles.map(String) : ["USR_ZDEPTOS"],
      groups: authorizedGroups,
      scopes:
        typeof payload.scp === "string"
          ? payload.scp.split(" ").filter(Boolean)
          : ["access_as_user"],
    };

    const session = globalSessionStore.createSession({
      token,
      userContext,
      idleTimeoutMs,
      sessionId: sessionIdHeader,
      clientIp: request.ip,
      userAgent: this.readHeader(request, "user-agent"),
      clientOrigin: this.readHeader(request, "x-client-origin"),
    });

    request.user = session.userContext;
    return true;
  }

  private readHeader(request: Request, name: string): string | undefined {
    const headers = request.headers ?? {};
    const direct = headers[name] ?? headers[name.toLowerCase()];
    return typeof direct === "string" ? direct : undefined;
  }

  private isLoopback(ip?: string, remoteAddress?: string): boolean {
    return Boolean(
      (ip && LOOPBACK_ADDRESSES.has(ip)) ||
        (remoteAddress && LOOPBACK_ADDRESSES.has(remoteAddress)),
    );
  }

  private keysMatch(providedKey: string, expectedKey: string): boolean {
    const provided = Buffer.from(providedKey, "utf8");
    const expected = Buffer.from(expectedKey, "utf8");
    return (
      provided.length === expected.length && timingSafeEqual(provided, expected)
    );
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler?.();
    const targetClass = context.getClass?.();
    const isPublic = Boolean(
      (handler && Reflect.getMetadata(IS_PUBLIC_KEY, handler)) ||
        (targetClass && Reflect.getMetadata(IS_PUBLIC_KEY, targetClass)),
    );
    if (isPublic) {
      return true;
    }

    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedGuardRequest>();
    if (!request.user) {
      throw new UnauthorizedException("Autenticacion requerida.");
    }
    const effective = new Set(request.user.permissions);
    if (!required.every((permission) => effective.has(permission))) {
      globalSessionStore.recordForbiddenAttempt({
        timestamp: new Date().toISOString(),
        userId: request.user.id,
        sessionId: request.user.sessionId,
        path: request.url ?? request.originalUrl ?? "/unknown",
        method: request.method ?? "GET",
        requiredPermissions: required,
        userPermissions: request.user.permissions,
        clientIp: request.ip,
      });
      throw new ForbiddenException(
        "Permiso insuficiente. No cuenta con autorización para ejecutar esta acción.",
      );
    }
    return true;
  }
}
