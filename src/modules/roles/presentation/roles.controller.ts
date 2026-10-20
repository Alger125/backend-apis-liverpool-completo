/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 01 — ROLES, PERMISOS Y SEGMENTACIÓN OPERATIVA
 * MÓDULO:   Roles (Gestión Integral de Roles, Clonación, Segmentación y Perfiles QA)
 * HISTORIAS: HU-54 a HU-57, HU-009, HU-010, HU-069 | CATÁLOGO DOMINIO 9
 * CASOS DE USO: CU-SEC-002 (FA-03), CU-SEC-003, CU-SEC-004, CU-SEC-005
 * ============================================================================
 */
import {
  Body,
  Controller,
  Delete,
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
import {
  ApiHeader,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";

import {
  ApiKeyGuard,
  PermissionsGuard,
  RequirePermissions,
} from "../../../shared/security/security";

import { RolesService } from "../application/roles.service";

import {
  CloneRoleRequest,
  CreateRoleRequest,
  DeleteRoleRequest,
  SearchRolesQuery,
  UpdateRoleRequest,
  UpdateRoleSegmentationRequest,
} from "./dto/roles.dto";

@ApiTags("Feature 01: Gestión de Roles y Permisos (HU-54 a HU-61)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local (dev-api-key-zdeptos-2026)",
  example: "dev-api-key-zdeptos-2026",
  required: true,
})
@Controller("roles")
@UseGuards(ApiKeyGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions("ROLE_VIEW")
  search(@Query() query: SearchRolesQuery) {
    return this.rolesService.search(query);
  }

  @Get("test-profiles/catalog")
  @RequirePermissions("ROLE_VIEW")
  @ApiOperation({
    summary:
      "Consultar catálogo de los 12 perfiles estándar de pruebas funcionales (HU-069 / DEC-07, DEC-08, DEC-09)",
    description:
      "Retorna la definición normalizada de los roles ROL-001 a ROL-012 lista para validación de QA y operación.",
  })
  getTestProfilesCatalog() {
    return this.rolesService.getTestProfilesCatalog();
  }

  @Post("seed-test-profiles")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("ROLE_CREATE")
  @ApiOperation({
    summary:
      "Preparar e inicializar perfiles representativos para pruebas funcionales (HU-069)",
    description:
      "Inicializa la configuración de los 12 perfiles de operación, administración y consulta según la matriz aprobada.",
  })
  seedTestProfiles(@Req() request: AuthenticatedRequest) {
    return this.rolesService.seedTestProfiles(
      request.user.id,
      request.correlationId,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("ROLE_CREATE")
  create(
    @Body() body: CreateRoleRequest,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.rolesService.create(
      body,
      request.user.id,
      request.correlationId,
    );
  }

  @Post(":roleId/clone")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("ROLE_CREATE")
  @ApiOperation({
    summary:
      "Crear un nuevo rol reutilizando la configuración de un rol existente (HU-009 / CU-SEC-002 FA-03)",
    description:
      "Precarga los permisos y segmentación del rol base, genera un nuevo ID y código único sin alterar el rol base.",
  })
  clone(
    @Param("roleId", ParseUUIDPipe) roleId: string,
    @Body() body: CloneRoleRequest,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.rolesService.cloneRole(
      roleId,
      body,
      request.user.id,
      request.correlationId,
    );
  }

  @Get(":roleId/segmentation")
  @RequirePermissions("ROLE_VIEW")
  @ApiOperation({
    summary:
      "Consultar reglas de segmentación y alcance operativo de un rol (HU-55 / HU-010)",
  })
  getSegmentation(@Param("roleId", ParseUUIDPipe) roleId: string) {
    return this.rolesService.getSegmentation(roleId);
  }

  @Put(":roleId/segmentation")
  @RequirePermissions("ROLE_UPDATE")
  @ApiOperation({
    summary:
      "Configurar reglas de segmentación organizacional y alcance de un rol (HU-55 / HU-010 / RN-054)",
    description:
      "Permite definir reglas por puesto, ubicación, zona, departamento, nivel, función, división o correo institucional.",
  })
  updateSegmentation(
    @Param("roleId", ParseUUIDPipe) roleId: string,
    @Body() body: UpdateRoleSegmentationRequest,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.rolesService.updateSegmentation(
      roleId,
      body,
      request.user.id,
      request.correlationId,
    );
  }

  @Get(":roleId/impact")
  @RequirePermissions("ROLE_IMPACT_VIEW")
  impact(
    @Param("roleId", ParseUUIDPipe)
    roleId: string,
  ) {
    return this.rolesService.impact(roleId);
  }

  @Get(":roleId")
  @RequirePermissions("ROLE_VIEW")
  get(
    @Param("roleId", ParseUUIDPipe)
    roleId: string,
  ) {
    return this.rolesService.get(roleId);
  }

  @Put(":roleId")
  @RequirePermissions("ROLE_UPDATE")
  update(
    @Param("roleId", ParseUUIDPipe) roleId: string,
    @Body() body: UpdateRoleRequest,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.rolesService.update(
      roleId,
      body,
      request.user.id,
      request.correlationId ?? null,
    );
  }

  @Delete(":roleId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("ROLE_DELETE")
  async delete(
    @Param("roleId", ParseUUIDPipe) roleId: string,
    @Body() body: DeleteRoleRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.rolesService.delete(
      roleId,
      body,
      request.user.id,
      request.correlationId ?? null,
    );
  }
}
