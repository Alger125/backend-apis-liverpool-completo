/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 01 — ROLES, PERMISOS Y SEGMENTACIÓN OPERATIVA
 * MÓDULO:   Roles (Gestión Integral de Roles y Matriz de Impacto)
 * HISTORIAS: HU-54 a HU-57 (HU-007 a HU-012) | CATÁLOGO DOMINIO 9
 * CASOS DE USO: CU-ROL-001 a CU-ROL-005
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
  CreateRoleRequest,
  DeleteRoleRequest,
  SearchRolesQuery,
  UpdateRoleRequest,
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
