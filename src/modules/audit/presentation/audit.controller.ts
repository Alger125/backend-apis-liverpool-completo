/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 03 — REPORTES DINÁMICOS, AUDITORÍA HISTÓRICA Y CARGAS MASIVAS
 * MÓDULO:   Audit (Bitácora Inmutable zd_audit.audit_event y Consulta Histórica)
 * HISTORIAS: HU-68 (HU-064 a HU-066) | CATÁLOGO DOMINIO 10
 * CASOS DE USO: CU-HIS-001 | REGLA: ERF §7 (Inmutabilidad y No Modificación)
 * ============================================================================
 */
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  ApiKeyGuard,
  PermissionsGuard,
  RequirePermissions,
} from "../../../shared/security/security";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import { AuditService } from "../application/audit.service";
import { AuditLogsQueryDto } from "./dto/audit-logs-query.dto";
import {
  AuditLogDetailDto,
  AuditLogsPaginatedResponseDto,
} from "./dto/audit-log-response.dto";

@ApiTags("Feature 03: Historial y Bitácora de Auditoría (CU-HIS-001 / HU-68)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local (dev-api-key-zdeptos-2026)",
  example: "dev-api-key-zdeptos-2026",
  required: true,
})
@UseGuards(ApiKeyGuard, PermissionsGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("logs")
  @RequirePermissions("AUDIT_VIEW")
  @ApiOperation({
    summary:
      "Consultar y filtrar historial de movimientos de auditoría (CU-HIS-001 / HU-68 / HU-065)",
    description:
      "Retorna bitácora inmutable de eventos con los campos mínimos exigidos por el ERF §7. Valida rangos de fecha y alcance organizacional.",
  })
  @ApiOkResponse({
    description: "Listado paginado de eventos de auditoría",
    type: AuditLogsPaginatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: "La fecha inicial no puede ser posterior a la fecha final.",
  })
  @ApiUnauthorizedResponse({ description: "Credencial temporal inválida" })
  @ApiForbiddenResponse({
    description: "Permiso AUDIT_VIEW insuficiente o fuera de alcance",
  })
  async getAuditLogs(
    @Query() query: AuditLogsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AuditLogsPaginatedResponseDto> {
    return this.auditService.findLogs(query, req.user?.id);
  }

  @Get("logs/:eventId")
  @RequirePermissions("AUDIT_VIEW")
  @ApiOperation({
    summary:
      "Consultar detalle de un movimiento de auditoría (HU-066)",
    description:
      "Recupera el detalle completo con estado previo (beforeValue), nuevo (afterValue), motivo y origen técnico. Inmutable y de solo lectura.",
  })
  @ApiParam({
    name: "eventId",
    type: "string",
    format: "uuid",
    description: "UUID del evento de auditoría",
  })
  @ApiOkResponse({
    description: "Detalle completo del evento de auditoría",
    type: AuditLogDetailDto,
  })
  @ApiNotFoundResponse({
    description: "Movimiento de auditoría no encontrado",
  })
  @ApiUnauthorizedResponse({ description: "Credencial temporal inválida" })
  @ApiForbiddenResponse({
    description: "Permiso AUDIT_VIEW insuficiente o fuera de alcance",
  })
  async getAuditLogById(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<AuditLogDetailDto> {
    return this.auditService.findLogById(eventId, req.user?.id);
  }
}
