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
import { StructuresService } from "../application/structures.service";
import {
  EcInboundEventDto,
  GetComprasPacTreeQueryDto,
  SuburbiaAdvisorsQueryDto,
  SyncManagedSectionsRequestDto,
  UpdateBaseDepartmentsConfigDto,
} from "./dto/structures.dto";

@ApiTags("Estructuras Compras, PAC, Suburbia 70051507 y Sincronización EC (HU-020..023, HU-19, HU-41, HU-44, HU-45)")
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

  @Get("config/base-departments")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary: "Consultar Configuración de Departamentos Base para Compras y PAC (HU-022 / DEC-15)",
  })
  getBaseDepartmentsConfig(@Query("structureType") structureType?: "COMPRAS" | "PAC") {
    return this.structuresService.getBaseDepartmentsConfig(structureType);
  }

  @Put("config/base-departments")
  @RequirePermissions("GROUP_UPDATE")
  @ApiOperation({
    summary: "Actualizar Configuración de Departamentos Base para Compras y PAC (HU-022 / DEC-15)",
  })
  updateBaseDepartmentsConfig(
    @Body() dto: UpdateBaseDepartmentsConfigDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresService.updateBaseDepartmentsConfig(dto, request?.user?.id);
  }

  @Get("compras-pac/tree")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary:
      "Navegar Estructura de Compras (Hardline/Softline) y PAC con Exclusión No Comercial (HU-020, HU-021, HU-023 / DEC-01)",
  })
  getComprasPacTree(@Query() query: GetComprasPacTreeQueryDto) {
    return this.structuresService.getComprasPacTree(query);
  }

  @Get("suburbia-advisors")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary:
      "Consultar Nodo Intermedio Suburbia 70051507 - Asesor Especializado Experiencia Cliente (HU-19 / DEC-16)",
  })
  getSuburbiaAdvisors(@Query() query: SuburbiaAdvisorsQueryDto) {
    return this.structuresService.getSuburbiaAdvisors(query);
  }

  @Get("collaborators/:employeeId/managed-sections")
  @RequirePermissions("SECTION_VIEW")
  @ApiOperation({
    summary:
      "Consultar Secciones que Administra un Colaborador (Sección Ancla + Secciones Heredadas del Grupo) (HU-41)",
  })
  getCollaboratorManagedSections(@Param("employeeId") employeeId: string) {
    return this.structuresService.getCollaboratorManagedSections(employeeId);
  }

  @Post("integrations/ec/events")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("SECTION_ASSIGN")
  @ApiOperation({
    summary:
      "Procesar Evento Entrante de Employee Central (Altas, Bajas, Transferencias, Cambios de Líder y Ancla) (HU-45)",
  })
  processEcInboundEvent(
    @Body() dto: EcInboundEventDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresService.processEcInboundEvent(dto, request?.user?.id);
  }

  @Post("integrations/ec/sync-managed-sections")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("SECTION_ASSIGN")
  @ApiOperation({
    summary:
      "Sincronizar 'Secciones que administra' hacia Employee Central bajo contrato P-01 (HU-44)",
  })
  syncManagedSectionsToEc(
    @Body() dto: SyncManagedSectionsRequestDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.structuresService.syncManagedSectionsToEc(dto, request?.user?.id);
  }

  @Get("integrations/ec/outbox")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary: "Consultar Bandeja de Salida (Outbox P-01) hacia Employee Central (HU-44)",
  })
  getEcOutbox(@Query("employeeId") employeeId?: string) {
    return this.structuresService.getEcOutbox(employeeId);
  }
}
