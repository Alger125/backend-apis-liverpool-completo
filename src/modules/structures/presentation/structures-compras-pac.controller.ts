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

@ApiTags("Estructuras Compras, PAC, Suburbia 70051507 y SincronizaciÃ³n EC (HU-020..023, HU-19, HU-41, HU-44, HU-45)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorizaciÃ³n para desarrollo local",
  required: false,
})
@Controller("structures")
@UseGuards(ApiKeyGuard, PermissionsGuard)
export class StructuresComprasPacController {
  constructor(private readonly StructuresComprasPacService: StructuresComprasPacService) {}

  @Get("config/base-departments")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary: "Consultar ConfiguraciÃ³n de Departamentos Base para Compras y PAC (HU-022 / DEC-15)",
  })
  getBaseDepartmentsConfig(@Query("structureType") structureType?: "COMPRAS" | "PAC") {
    return this.StructuresComprasPacService.getBaseDepartmentsConfig(structureType);
  }

  @Put("config/base-departments")
  @RequirePermissions("GROUP_UPDATE")
  @ApiOperation({
    summary: "Actualizar ConfiguraciÃ³n de Departamentos Base para Compras y PAC (HU-022 / DEC-15)",
  })
  updateBaseDepartmentsConfig(
    @Body() dto: UpdateBaseDepartmentsConfigDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.StructuresComprasPacService.updateBaseDepartmentsConfig(dto, request?.user?.id);
  }

  @Get("compras-pac/tree")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary:
      "Navegar Estructura de Compras (Hardline/Softline) y PAC con ExclusiÃ³n No Comercial (HU-020, HU-021, HU-023 / DEC-01)",
  })
  getComprasPacTree(@Query() query: GetComprasPacTreeQueryDto) {
    return this.StructuresComprasPacService.getComprasPacTree(query);
  }

  @Get("suburbia-advisors")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary:
      "Consultar Nodo Intermedio Suburbia 70051507 - Asesor Especializado Experiencia Cliente (HU-19 / DEC-16)",
  })
  getSuburbiaAdvisors(@Query() query: SuburbiaAdvisorsQueryDto) {
    return this.StructuresComprasPacService.getSuburbiaAdvisors(query);
  }

  @Get("collaborators/:employeeId/managed-sections")
  @RequirePermissions("SECTION_VIEW")
  @ApiOperation({
    summary:
      "Consultar Secciones que Administra un Colaborador (SecciÃ³n Ancla + Secciones Heredadas del Grupo) (HU-41)",
  })
  getCollaboratorManagedSections(@Param("employeeId") employeeId: string) {
    return this.StructuresComprasPacService.getCollaboratorManagedSections(employeeId);
  }

  @Post("integrations/ec/events")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("SECTION_ASSIGN")
  @ApiOperation({
    summary:
      "Procesar Evento Entrante de Employee Central (Altas, Bajas, Transferencias, Cambios de LÃ­der y Ancla) (HU-45)",
  })
  processEcInboundEvent(
    @Body() dto: EcInboundEventDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.StructuresComprasPacService.processEcInboundEvent(dto, request?.user?.id);
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
    return this.StructuresComprasPacService.syncManagedSectionsToEc(dto, request?.user?.id);
  }

  @Get("integrations/ec/outbox")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary: "Consultar Bandeja de Salida (Outbox P-01) hacia Employee Central (HU-44)",
  })
  getEcOutbox(@Query("employeeId") employeeId?: string) {
    return this.StructuresComprasPacService.getEcOutbox(employeeId);
  }
}

