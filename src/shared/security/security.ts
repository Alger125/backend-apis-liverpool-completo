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
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

const REQUIRED_PERMISSIONS = "permissions";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const DEV_PERMISSIONS = [
  "ROLE_VIEW",
  "ROLE_CREATE",
  "ROLE_UPDATE",
  "ROLE_DELETE",
  "ROLE_IMPACT_VIEW",
  "PERMISSION_VIEW",
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


type DevUser = {
  id: string;
  authenticationType: "DEV_API_KEY";
  permissions: string[];
};

type AuthenticatedRequest = Request & { user?: DevUser };

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const nodeEnv = this.config.get<string>("NODE_ENV") ?? "development";

    if (nodeEnv !== "development" && nodeEnv !== "test") {
      throw new ServiceUnavailableException(
        "La autenticacion temporal esta deshabilitada.",
      );
    }

    if (
      nodeEnv !== "test" &&
      !this.isLoopback(request.ip, request.socket.remoteAddress)
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

    request.user = {
      id: devUserId,
      authenticationType: "DEV_API_KEY",
      permissions: [...DEV_PERMISSIONS],
    };
    return true;
  }

  private readHeader(request: Request, name: string): string | undefined {
    const value = request.headers[name];
    return typeof value === "string" ? value : undefined;
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
    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user)
      throw new UnauthorizedException("Autenticacion requerida.");
    const effective = new Set(request.user.permissions);
    if (!required.every((permission) => effective.has(permission))) {
      throw new ForbiddenException("Permiso insuficiente.");
    }
    return true;
  }
}
