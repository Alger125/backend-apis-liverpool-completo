import {
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import type { DataSource } from "typeorm";
import { AuditAction, AuditResult } from "../../audit/domain/enums";
import type { AuditRepository } from "../../audit/infrastructure/audit.repository";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import { globalSessionStore } from "../../../shared/security/security";
import { AuthService } from "../application/auth.service";
import { AuthController } from "../presentation/auth.controller";

describe("AuthController & AuthService (HU-01 a HU-06)", () => {
  const tenantId = "11111111-2222-4333-8444-555555555555";
  const apiClientId = "aaaa1111-bbbb-4ccc-8ddd-eeee22223333";
  const allowedGroup = "USR IDM ZDEPTO TI";
  const kid = "entra-key-2026";

  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const publicJwk = publicKey.export({ format: "jwk" });

  let auditAppendMock: ReturnType<typeof jest.fn>;
  let authService: AuthService;
  let controller: AuthController;

  function signEntraJwt(
    claimsOverride: Record<string, unknown> = {},
    headerOverride: Record<string, unknown> = {},
  ): string {
    const nowSec = Math.floor(Date.now() / 1000);
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid,
      ...headerOverride,
    };
    const payload = {
      aud: apiClientId,
      iss: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      tid: tenantId,
      oid: "00000000-0000-4000-8000-000000000099",
      name: "César Coronado",
      preferred_username: "ccoronado@liverpool.com.mx",
      scp: "access_as_user User.Read",
      groups: [allowedGroup],
      roles: ["ROL-001"],
      iat: nowSec - 10,
      nbf: nowSec - 10,
      exp: nowSec + 3600,
      ...claimsOverride,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      "base64url",
    );
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = cryptoSign(
      "RSA-SHA256",
      Buffer.from(signingInput, "utf8"),
      privateKey,
    ).toString("base64url");

    return `${signingInput}.${signature}`;
  }

  beforeEach(() => {
    globalSessionStore.resetAll();
    globalSessionStore.registerJwk(kid, publicJwk);

    auditAppendMock = jest.fn(async () => undefined);
    const mockAuditRepo = {
      append: auditAppendMock,
    } as unknown as AuditRepository;

    const mockDataSource = {
      isInitialized: false,
      manager: {},
    } as unknown as DataSource;

    const envMap: Record<string, string> = {
      AZURE_TENANT_ID: tenantId,
      API_CLIENT_ID: apiClientId,
      ALLOWED_GROUPS: allowedGroup,
      SESSION_IDLE_TIMEOUT_MS: "900000",
    };
    const mockConfig = {
      get: (key: string) => envMap[key],
    } as unknown as ConfigService;

    authService = new AuthService(mockConfig, mockDataSource, mockAuditRepo);
    controller = new AuthController(authService);
  });

  it("HU-01 y HU-04: autentica un token SSO válido con JWKS, crea sesión y registra AUTH_LOGIN_SUCCESS", async () => {
    const token = signEntraJwt();
    const req = {
      ip: "127.0.0.1",
      correlationId: "corr-001",
    } as unknown as AuthenticatedRequest;

    const response = await controller.ssoCallback(
      { accessToken: token },
      req,
      "JestTestAgent/1.0",
      "http://localhost:3000",
    );

    expect(response.ok).toBe(true);
    expect(response.status).toBe("ACTIVE");
    expect(response.user.name).toBe("César Coronado");
    expect(response.user.authorizedGroups).toEqual([allowedGroup]);
    expect(auditAppendMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: AuditAction.AUTH_LOGIN_SUCCESS,
        result: AuditResult.SUCCESS,
      }),
    );
  });

  it("HU-01 y HU-05: rechaza con 403 cuando el usuario no pertenece a los grupos autorizados o tiene overage", async () => {
    const unauthToken = signEntraJwt({ groups: ["OTRO_GRUPO"] });
    const req = { ip: "127.0.0.1" } as unknown as AuthenticatedRequest;

    await expect(
      controller.ssoCallback({ accessToken: unauthToken }, req),
    ).rejects.toThrow(ForbiddenException);

    const overageToken = signEntraJwt({ groups: undefined, hasgroups: true });
    await expect(
      controller.ssoCallback({ accessToken: overageToken }, req),
    ).rejects.toThrow(ForbiddenException);

    expect(auditAppendMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: AuditAction.AUTH_LOGIN_FAILED,
        result: AuditResult.FAILURE,
      }),
    );
  });

  it("HU-01: rechaza con 403 cuando la cuenta corporativa está inactiva", async () => {
    const inactiveToken = signEntraJwt({ account_status: "INACTIVE" });
    const req = { ip: "127.0.0.1" } as unknown as AuthenticatedRequest;

    await expect(
      controller.ssoCallback({ accessToken: inactiveToken }, req),
    ).rejects.toThrow(ForbiddenException);
  });

  it("HU-02: renueva la sesión con keep-alive y expira con 401 si superó el límite de inactividad", async () => {
    const token = signEntraJwt();
    const req = { ip: "127.0.0.1" } as unknown as AuthenticatedRequest;
    const sessionResp = await controller.ssoCallback(
      { accessToken: token },
      req,
    );

    const authedReq = {
      ip: "127.0.0.1",
      user: {
        id: sessionResp.user.id,
        sessionId: sessionResp.sessionId,
        permissions: sessionResp.user.permissions,
        roles: sessionResp.user.roles,
      },
    } as unknown as AuthenticatedRequest;

    const refreshed = await controller.keepAlive(
      { eventType: "SESSION_REFRESH" },
      authedReq,
      `Bearer ${token}`,
      sessionResp.sessionId,
    );
    expect(refreshed.ok).toBe(true);
    expect(refreshed.sessionId).toBe(sessionResp.sessionId);

    // Simular que transcurrió más tiempo del permitido sin actividad
    const stored = globalSessionStore.getSessionById(sessionResp.sessionId)!;
    stored.lastActivityAt = Date.now() - stored.idleTimeoutMs - 5000;

    await expect(
      controller.keepAlive(
        { eventType: "SESSION_REFRESH" },
        authedReq,
        `Bearer ${token}`,
        sessionResp.sessionId,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(auditAppendMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: AuditAction.AUTH_LOGOUT_INACTIVITY,
        result: AuditResult.FAILURE,
      }),
    );
  });

  it("HU-03 y HU-06: cierra sesión, agrega token a blacklist e invalida la sesión en otras pestañas", async () => {
    const token = signEntraJwt();
    const req = { ip: "127.0.0.1" } as unknown as AuthenticatedRequest;
    const sessionResp = await controller.ssoCallback(
      { accessToken: token },
      req,
    );

    const authedReq = {
      ip: "127.0.0.1",
      user: {
        id: sessionResp.user.id,
        sessionId: sessionResp.sessionId,
        permissions: sessionResp.user.permissions,
        roles: sessionResp.user.roles,
      },
    } as unknown as AuthenticatedRequest;

    // Pestaña 1 ejecuta logout manual
    const logoutResult = await controller.logout(
      { closeType: "MANUAL" },
      authedReq,
      `Bearer ${token}`,
      sessionResp.sessionId,
    );

    expect(logoutResult.ok).toBe(true);
    expect(logoutResult.multiTabInvalidated).toBe(true);
    expect(logoutResult.closeType).toBe("MANUAL");

    // Pestaña 2 intenta consultar estado de la misma sesión -> debe recibir 401
    expect(() =>
      controller.getSession(
        authedReq,
        sessionResp.sessionId,
        sessionResp.sessionId,
        `Bearer ${token}`,
      ),
    ).toThrow(UnauthorizedException);

    // Reutilizar el mismo token en SSO callback también es rechazado por blacklist
    await expect(
      controller.ssoCallback({ accessToken: token }, req),
    ).rejects.toThrow(UnauthorizedException);
  });
});
