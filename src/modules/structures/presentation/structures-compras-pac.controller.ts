import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { ApiKeyGuard, PermissionsGuard, RequirePermissions } from "../../../shared/security/security";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import { StructuresComprasPacService } from "../application/structures-compras-pac.service";
import {
  EcInboundEventDto,
  GetComprasPacTreeQueryDto,
  SuburbiaAdvisorsQueryDto,
  SyncManagedSectionsRequestDto,
  UpdateBaseDepartmentsConfigDto,
} from "./dto/structures-compras-pac.dto";

@ApiTags("Estructuras Compras, PAC, Suburbia 70051507 y Sincronización EC (HU-020..023, HU-19, HU-41, HU-44, HU-45)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local",
  required: false,
})
@Controller("structures")
@UseGuards(ApiKeyGuard, PermissionsGuard)
export class StructuresComprasPacController {
  constructor(private readonly structuresComprasPacService: StructuresComprasPacService) {}

  @Get("config/base-departments")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary: "Consultar Configuración de Departamentos Base para Compras y PAC (HU-022 / DEC-15)",
    operationId: "StructuresComprasPacController_getBaseDepartmentsConfig",
  })
  getBaseDepartmentsConfig(@Query("structureType") structureType?: "COMPRAS" | "PAC") {
    return this.structuresComprasPacService.getBaseDepartmentsConfig(structureType);
  }

  @Put("config/base-departments")
  @RequirePermissions("GROUP_UPDATE")
  @ApiOperation({
    summary: "Actualizar Configuración de Departamentos Base para Compras y PAC (HU-022 / DEC-15)",
    operationId: "StructuresComprasPacController_updateBaseDepartmentsConfig",
  })
  updateBaseDepartmentsConfig(
    @Body() dto: UpdateBaseDepartmentsConfigDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresComprasPacService.updateBaseDepartmentsConfig(dto, request?.user?.id);
  }

  @Get("compras-pac/tree")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary:
      "Navegar Estructura de Compras (Hardline/Softline) y PAC con Exclusión No Comercial (HU-020, HU-021, HU-023 / DEC-01)",
    operationId: "StructuresComprasPacController_getComprasPacTree",
  })
  getComprasPacTree(@Query() query: GetComprasPacTreeQueryDto) {
    return this.structuresComprasPacService.getComprasPacTree(query);
  }

  @Get("suburbia-advisors")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary:
      "Consultar Nodo Intermedio Suburbia 70051507 - Asesor Especializado Experiencia Cliente (HU-19 / DEC-16)",
    operationId: "StructuresComprasPacController_getSuburbiaAdvisors",
  })
  getSuburbiaAdvisors(@Query() query: SuburbiaAdvisorsQueryDto) {
    return this.structuresComprasPacService.getSuburbiaAdvisors(query);
  }

  @Get("collaborators/:employeeId/managed-sections")
  @RequirePermissions("SECTION_VIEW")
  @ApiOperation({
    summary:
      "Consultar Secciones que Administra un Colaborador (Sección Ancla + Secciones Heredadas del Grupo) (HU-41)",
    operationId: "StructuresComprasPacController_getCollaboratorManagedSections",
  })
  getCollaboratorManagedSections(@Param("employeeId") employeeId: string) {
    return this.structuresComprasPacService.getCollaboratorManagedSections(employeeId);
  }

  @Post("integrations/ec/events")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("SECTION_ASSIGN")
  @ApiOperation({
    summary:
      "Procesar Evento Entrante de Employee Central (Altas, Bajas, Transferencias, Cambios de Líder y Ancla) (HU-45)",
    operationId: "StructuresComprasPacController_processEcInboundEvent",
  })
  processEcInboundEvent(
    @Body() dto: EcInboundEventDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresComprasPacService.processEcInboundEvent(dto, request?.user?.id);
  }

  @Post("integrations/ec/sync-managed-sections")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("SECTION_ASSIGN")
  @ApiOperation({
    summary:
      "Sincronizar 'Secciones que administra' hacia Employee Central bajo contrato P-01 (HU-44)",
    operationId: "StructuresComprasPacController_syncManagedSectionsToEc",
  })
  syncManagedSectionsToEc(
    @Body() dto: SyncManagedSectionsRequestDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresComprasPacService.syncManagedSectionsToEc(dto, request?.user?.id);
  }

  @Get("integrations/ec/outbox")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary: "Consultar Bandeja de Salida (Outbox P-01) hacia Employee Central (HU-44)",
    operationId: "StructuresComprasPacController_getEcOutbox",
  })
  getEcOutbox(@Query("employeeId") employeeId?: string) {
    return this.structuresComprasPacService.getEcOutbox(employeeId);
  }
}
