/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 01 — SEGURIDAD, AUTENTICACIÓN SSO Y GESTIÓN DE SESIONES
 * MÓDULO:   Auth (Single Sign-On Entra ID, Inactividad, Logout y Multi-Pestaña)
 * HISTORIAS: HU-01 a HU-06 (HU-001 a HU-003) | CATÁLOGO DOMINIO 1
 * CASOS DE USO: CU-SEC-001, CU-SEC-007
 * ============================================================================
 */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class SsoCallbackRequestDto {
  @ApiProperty({
    description:
      "Access Token delegado emitido por Microsoft Entra ID con scope api://<API_CLIENT_ID>/access_as_user",
    example: "eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS0xIn0...",
  })
  @IsString()
  @IsNotEmpty({ message: "El accessToken de SSO es obligatorio." })
  accessToken!: string;

  @ApiPropertyOptional({
    description: "ID Token opcional de MSAL con claims de identidad o grupos",
  })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiPropertyOptional({
    description: "Identificador de sesión sugerido por el cliente para sincronización multi-pestaña",
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;
}

export class KeepAliveRequestDto {
  @ApiPropertyOptional({
    description: "Tipo de evento que dispara la renovación de sesión (HU-02 / CU-SEC-001 FA-04)",
    example: "SESSION_REFRESH",
    default: "SESSION_REFRESH",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  eventType?: string;

  @ApiPropertyOptional({
    description: "ID de la sesión activa a renovar (si no se envía en header x-session-id)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;
}

export class LogoutRequestDto {
  @ApiPropertyOptional({
    description:
      "Motivo del cierre de sesión: MANUAL (acción del usuario) o INACTIVITY (expiración automática por tiempo de inactividad)",
    enum: ["MANUAL", "INACTIVITY"],
    default: "MANUAL",
    example: "MANUAL",
  })
  @IsOptional()
  @IsIn(["MANUAL", "INACTIVITY"])
  closeType?: "MANUAL" | "INACTIVITY";

  @ApiPropertyOptional({
    description: "ID de la sesión a invalidar en todas las pestañas abiertas (HU-06)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;
}

export class AuthenticatedSessionResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: "b3a9c410-812d-4c8a-9f12-441122334455" })
  sessionId!: string;

  @ApiProperty({ example: "ACTIVE", enum: ["ACTIVE", "REVOKED", "EXPIRED_INACTIVITY"] })
  status!: "ACTIVE" | "REVOKED" | "EXPIRED_INACTIVITY";

  @ApiProperty({ example: "2026-10-19T18:45:00.000Z" })
  expiresAt!: string;

  @ApiProperty({ example: 900000 })
  idleTimeoutMs!: number;

  @ApiProperty({
    description: "Contexto de identidad, roles, permisos y alcance del usuario autenticado",
  })
  user!: {
    id: string;
    oid?: string;
    tid?: string;
    name?: string;
    email?: string;
    roles: string[];
    permissions: string[];
    authorizedGroups: string[];
    scopes: string[];
  };
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: "La sesión se cerró correctamente." })
  message!: string;

  @ApiProperty({ enum: ["MANUAL", "INACTIVITY"], example: "MANUAL" })
  closeType!: "MANUAL" | "INACTIVITY";

  @ApiPropertyOptional({ example: "b3a9c410-812d-4c8a-9f12-441122334455" })
  sessionId?: string;

  @ApiProperty({ example: true })
  multiTabInvalidated!: boolean;

  @ApiPropertyOptional({
    description: "URL de cierre de sesión corporativa en el proveedor SSO (Entra ID)",
    example: "https://login.microsoftonline.com/common/oauth2/v2.0/logout",
  })
  ssoLogoutUrl?: string;
}
