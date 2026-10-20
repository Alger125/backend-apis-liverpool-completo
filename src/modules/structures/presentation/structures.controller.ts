import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { ApiKeyGuard, PermissionsGuard, RequirePermissions } from "../../../shared/security/security";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import { StructuresService } from "../application/structures.service";
import {
  ActivatePeriodDto,
  CancelScheduledChangeDto,
  CreateScheduledChangeDto,
  InitFutureDraftDto,
  UpdateOperationalCutoffConfigDto,
  UpdateScheduledChangeDto,
} from "./dto/structures.dto";

@ApiTags("Planificación Futura, Cambios Programados y Calendario de Corte (HU-48/49, HU-049 a HU-052)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local",
  required: false,
})
@Controller("structures")
@UseGuards(ApiKeyGuard, PermissionsGuard)
export class StructuresController {
  constructor(private readonly structuresService: StructuresService) {}

  @Post("departments/:departmentId/future-draft/init")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("PLANNING_PUBLISH")
  @ApiOperation({
    summary:
      "Derivar / Clonar Estructura Futura (Copy-on-Write mes + 1) desde Periodo Vigente (HU-48 / HU-49 / HU-047)",
  })
  initFutureDraft(
    @Param("departmentId", ParseUUIDPipe) departmentId: string,
    @Body() dto: InitFutureDraftDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresService.initFutureDraft(departmentId, dto, request?.user?.id);
  }

  @Get("scheduled-changes")
  @RequirePermissions("PLANNING_VIEW")
  @ApiOperation({
    summary: "Listar Cambios Estructurales Programados para Periodos Futuros (HU-049)",
  })
  listScheduledChanges(
    @Query("departmentId") departmentId?: string,
    @Query("targetPeriod") targetPeriod?: string,
    @Query("status") status?: string
  ) {
    return this.structuresService.listScheduledChanges(departmentId, targetPeriod, status);
  }

  @Post("scheduled-changes")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("PLANNING_PUBLISH")
  @ApiOperation({
    summary: "Programar Cambio Estructural para Periodo Futuro (HU-049)",
  })
  createScheduledChange(
    @Body() dto: CreateScheduledChangeDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresService.createScheduledChange(dto, request?.user?.id);
  }

  @Put("scheduled-changes/:changeId")
  @RequirePermissions("PLANNING_PUBLISH")
  @ApiOperation({
    summary: "Editar Cambio Programado Antes de su Fecha de Vigencia (HU-049 / CU-ADM-006 A5)",
  })
  updateScheduledChange(
    @Param("changeId") changeId: string,
    @Body() dto: UpdateScheduledChangeDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresService.updateScheduledChange(changeId, dto, request?.user?.id);
  }

  @Post("scheduled-changes/:changeId/cancel")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("PLANNING_PUBLISH")
  @ApiOperation({
    summary:
      "Cancelar Cambio Programado Antes de su Entrada en Vigor con Bitácora (HU-050 / CU-ADM-006 A6)",
  })
  cancelScheduledChange(
    @Param("changeId") changeId: string,
    @Body() dto: CancelScheduledChangeDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresService.cancelScheduledChange(changeId, dto, request?.user?.id);
  }

  @Post("periods/:periodCode/activate")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("PLANNING_PUBLISH")
  @ApiOperation({
    summary:
      "Activar Planificación Publicada del Periodo en su Fecha de Vigencia y Archivar Snapshot Anterior (HU-051)",
  })
  activatePlannedPeriod(
    @Param("periodCode") periodCode: string,
    @Body() dto: ActivatePeriodDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresService.activatePlannedPeriod(periodCode, dto, request?.user?.id);
  }

  @Put("calendar/operational-cutoff")
  @RequirePermissions("PLANNING_PUBLISH")
  @ApiOperation({
    summary:
      "Configurar Calendario Operativo de Corte y Ventana de Edición / Bloqueo (HU-052 / ERF §7)",
  })
  configureOperationalCutoff(
    @Body() dto: UpdateOperationalCutoffConfigDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresService.configureOperationalCutoff(dto, request?.user?.id);
  }
}
