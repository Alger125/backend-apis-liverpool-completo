import {
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it } from "@jest/globals";
import type { Request } from "express";
import {
  ApiKeyGuard,
  PermissionsGuard,
  globalSessionStore,
} from "./security";

function context(
  request: Partial<Request>,
  requiredPermissions?: string[],
): ExecutionContext {
  const dummyHandler = () => undefined;
  const dummyClass = class {};
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => dummyHandler,
    getClass: () => dummyClass,
    requiredPermissions,
  } as unknown as ExecutionContext;
}

describe("ApiKeyGuard & PermissionsGuard (HU-01 a HU-06)", () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const tenantId = "11111111-2222-4333-8444-555555555555";
  const apiClientId = "aaaa1111-bbbb-4ccc-8ddd-eeee22223333";

  beforeEach(() => {
    globalSessionStore.resetAll();
  });

  function guard(values: Record<string, string>): ApiKeyGuard {
    return new ApiKeyGuard({
      get: (key: string) => values[key],
    } as ConfigService);
  }

  function makeUnsignedJwt(payload: Record<string, unknown>): string {
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" }),
    ).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${header}.${body}.sig`;
  }

  it("acepta una llave valida desde loopback", () => {
    const request = {
      headers: { "x-dev-api-key": "new-local-key" },
      ip: "127.0.0.1",
      socket: {},
    } as unknown as Request;
    const subject = guard({
      NODE_ENV: "development",
      DEV_API_KEY: "new-local-key",
      DEV_USER_ID: userId,
    });
    expect(subject.canActivate(context(request))).toBe(true);
    expect((request as Request & { user: { id: string } }).user.id).toBe(
      userId,
    );
  });

  it("rechaza una llave invalida", () => {
    const request = {
      headers: { "x-dev-api-key": "old-key" },
      ip: "127.0.0.1",
      socket: {},
    } as unknown as Request;
    const subject = guard({
      NODE_ENV: "development",
      DEV_API_KEY: "new-local-key",
      DEV_USER_ID: userId,
    });
    expect(() => subject.canActivate(context(request))).toThrow(
      UnauthorizedException,
    );
  });

  it("rechaza conexiones no locales", () => {
    const request = {
      headers: { "x-dev-api-key": "new-local-key" },
      ip: "10.10.10.25",
      socket: {},
    } as unknown as Request;
    const subject = guard({
      NODE_ENV: "development",
      DEV_API_KEY: "new-local-key",
      DEV_USER_ID: userId,
    });
    expect(() => subject.canActivate(context(request))).toThrow(
      ForbiddenException,
    );
  });

  it("se deshabilita fuera de development y test", () => {
    const request = {
      headers: { "x-dev-api-key": "new-local-key" },
      ip: "127.0.0.1",
      socket: {},
    } as unknown as Request;
    const subject = guard({
      NODE_ENV: "production",
      DEV_API_KEY: "new-local-key",
      DEV_USER_ID: userId,
    });
    expect(() => subject.canActivate(context(request))).toThrow(
      ServiceUnavailableException,
    );
  });

  it("rechaza la configuracion placeholder", () => {
    const request = {
      headers: { "x-dev-api-key": "change-me" },
      ip: "127.0.0.1",
      socket: {},
    } as unknown as Request;
    const subject = guard({
      NODE_ENV: "development",
      DEV_API_KEY: "change-me",
      DEV_USER_ID: userId,
    });
    expect(() => subject.canActivate(context(request))).toThrow(
      ServiceUnavailableException,
    );
  });

  it("HU-01 / HU-03 / HU-06: autentica Bearer token de Entra ID y rechaza cuando el token es revocado en logout", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const token = makeUnsignedJwt({
      aud: apiClientId,
      iss: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      tid: tenantId,
      oid: userId,
      scp: "access_as_user",
      groups: ["USR IDM ZDEPTO TI"],
      exp: nowSec + 3600,
    });

    const subject = guard({
      NODE_ENV: "production",
      AZURE_TENANT_ID: tenantId,
      API_CLIENT_ID: apiClientId,
      ALLOWED_GROUPS: "USR IDM ZDEPTO TI",
    });

    const req1 = {
      headers: { authorization: `Bearer ${token}` },
      ip: "10.0.0.15",
    } as unknown as Request;

    expect(subject.canActivate(context(req1))).toBe(true);

    // Revocar token (simulando logout en otra pestaña)
    globalSessionStore.revokeToken(token, "MANUAL");

    const req2 = {
      headers: { authorization: `Bearer ${token}` },
      ip: "10.0.0.15",
    } as unknown as Request;

    expect(() => subject.canActivate(context(req2))).toThrow(
      UnauthorizedException,
    );
  });

  it("HU-05: PermissionsGuard bloquea con 403 cuando falta el permiso requerido y registra el intento en bitacora", () => {
    const reflector = {
      getAllAndOverride: () => ["REPORTS_GLOBAL_VIEW"],
    } as unknown as Reflector;
    const permGuard = new PermissionsGuard(reflector);

    const req = {
      url: "/api/v1/reports/general",
      method: "GET",
      ip: "127.0.0.1",
      user: {
        id: userId,
        sessionId: "sess-123",
        permissions: ["STRUCTURE_VIEW"],
      },
    } as unknown as Request;

    expect(() => permGuard.canActivate(context(req))).toThrow(
      ForbiddenException,
    );
    expect(globalSessionStore.getForbiddenAttempts()).toHaveLength(1);
    expect(globalSessionStore.getForbiddenAttempts()[0]).toMatchObject({
      userId,
      path: "/api/v1/reports/general",
      requiredPermissions: ["REPORTS_GLOBAL_VIEW"],
    });
  });
});
