/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 01 — SEGURIDAD, AUTENTICACIÓN SSO Y GESTIÓN DE SESIONES
 * MÓDULO:   Auth (Controlador REST de SSO, Keep-Alive, Logout y Estado de Sesión)
 * HISTORIAS: HU-01 a HU-06 (HU-001 a HU-003) | CATÁLOGO DOMINIO 1
 * CASOS DE USO: CU-SEC-001, CU-SEC-007
 * ============================================================================
 */
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Public } from "../../../common/auth/public.decorator";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import { ApiKeyGuard, PermissionsGuard } from "../../../shared/security/security";
import { AuthService } from "../application/auth.service";
import {
  AuthenticatedSessionResponseDto,
  KeepAliveRequestDto,
  LogoutRequestDto,
  LogoutResponseDto,
  SsoCallbackRequestDto,
} from "./dto/auth.dto";

@ApiTags("Feature 01: Autenticación SSO y Gestión de Sesiones (HU-01 a HU-06)")
@ApiBearerAuth()
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description:
    "Llave de autorización para desarrollo local o enviar Authorization: Bearer <token>",
  example: "dev-api-key-zdeptos-2026",
  required: false,
})
@UseGuards(ApiKeyGuard, PermissionsGuard)
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("sso/callback")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Intercambio y validación de token SSO Corporativo Entra ID (HU-01 / HU-001 / CU-SEC-001)",
    description:
      "Valida firma JWKS y claims del token de Microsoft Entra ID (aud, iss, tid, scp=access_as_user, groups/overage), resuelve roles y permisos del colaborador, crea la sesión activa y registra auditoría de acceso (HU-04).",
  })
  @ApiOkResponse({
    description: "Sesión corporativa autenticada y autorizada exitosamente",
    type: AuthenticatedSessionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token SSO inválido, expirado o revocado",
  })
  @ApiForbiddenResponse({
    description:
      "Cuenta inactiva, sin rol asignado o fuera de los grupos corporativos permitidos (HU-05)",
  })
  async ssoCallback(
    @Body() dto: SsoCallbackRequestDto,
    @Req() req: AuthenticatedRequest,
    @Headers("user-agent") userAgent?: string,
    @Headers("x-client-origin") clientOrigin?: string,
  ): Promise<AuthenticatedSessionResponseDto> {
    return this.authService.handleSsoCallback(dto, {
      ip: req.ip,
      userAgent,
      clientOrigin,
      correlationId: req.correlationId,
    });
  }

  @Post("session/keep-alive")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Renovar sesión activa y validar límite de inactividad (HU-02 / HU-002 / CU-SEC-001 FA-04)",
    description:
      "Verifica que la sesión no haya superado el tiempo máximo de inactividad, actualiza el timestamp de última actividad y extiende su vigencia. Si expiró, devuelve 401 y registra AUTH_LOGOUT_INACTIVITY.",
  })
  @ApiOkResponse({
    description: "Sesión renovada exitosamente",
    type: AuthenticatedSessionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Sesión expirada por inactividad o invalidada previamente",
  })
  async keepAlive(
    @Body() dto: KeepAliveRequestDto,
    @Req() req: AuthenticatedRequest,
    @Headers("authorization") authorization?: string,
    @Headers("x-session-id") sessionIdHeader?: string,
    @Headers("user-agent") userAgent?: string,
    @Headers("x-client-origin") clientOrigin?: string,
  ): Promise<AuthenticatedSessionResponseDto> {
    const rawToken = this.extractBearerToken(authorization);
    const mergedDto: KeepAliveRequestDto = {
      ...dto,
      sessionId: dto?.sessionId ?? sessionIdHeader,
    };
    return this.authService.keepAliveSession(req.user, mergedDto, rawToken, {
      ip: req.ip,
      userAgent,
      clientOrigin,
      correlationId: req.correlationId,
    });
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Cierre de sesión seguro, destrucción de contexto e invalidación multi-pestaña (HU-03, HU-04, HU-06 / CU-SEC-007)",
    description:
      "Invalida de inmediato el token y la sesión en la lista negra (blacklist), impide su reutilización desde otras pestañas abiertas y registra el evento de cierre (MANUAL o INACTIVITY) en la bitácora de auditoría.",
  })
  @ApiOkResponse({
    description: "Sesión cerrada e invalidada exitosamente",
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "No existe una sesión activa válida",
  })
  async logout(
    @Body() dto: LogoutRequestDto,
    @Req() req: AuthenticatedRequest,
    @Headers("authorization") authorization?: string,
    @Headers("x-session-id") sessionIdHeader?: string,
    @Headers("user-agent") userAgent?: string,
    @Headers("x-client-origin") clientOrigin?: string,
  ): Promise<LogoutResponseDto> {
    const rawToken = this.extractBearerToken(authorization);
    const mergedDto: LogoutRequestDto = {
      ...dto,
      sessionId: dto?.sessionId ?? sessionIdHeader,
    };
    return this.authService.logoutSession(req.user, mergedDto, rawToken, {
      ip: req.ip,
      userAgent,
      clientOrigin,
      correlationId: req.correlationId,
    });
  }

  @Get("session")
  @ApiOperation({
    summary:
      "Consultar estado de sesión activa y sincronización multi-pestaña (HU-02, HU-06 / CU-SEC-007 FA-02)",
    description:
      "Permite verificar si la sesión actual continúa activa o si fue cerrada desde otra pestaña o por inactividad.",
  })
  @ApiOkResponse({
    description: "Estado actual de la sesión y contexto de seguridad del usuario",
    type: AuthenticatedSessionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "La sesión fue cerrada en otra pestaña o expiró por inactividad",
  })
  getSession(
    @Req() req: AuthenticatedRequest,
    @Query("sessionId") sessionIdQuery?: string,
    @Headers("x-session-id") sessionIdHeader?: string,
    @Headers("authorization") authorization?: string,
  ): AuthenticatedSessionResponseDto {
    const rawToken = this.extractBearerToken(authorization);
    return this.authService.getSessionStatus(
      req.user,
      sessionIdQuery ?? sessionIdHeader,
      rawToken,
    );
  }

  private extractBearerToken(authorization?: string): string | undefined {
    if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
      return undefined;
    }
    const token = authorization.slice(7).trim();
    return token || undefined;
  }
}
