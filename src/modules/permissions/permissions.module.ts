import { Controller, Get, Module, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { CatalogStatus, PermissionEntity } from "./domain/permission.entity";
import {
  ApiKeyGuard,
  PermissionsGuard,
  RequirePermissions,
} from "../../shared/security/security";

@ApiTags("Feature 01: Gestión de Roles y Permisos (HU-54 a HU-61)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local (dev-api-key-zdeptos-2026)",
  required: true,
})
@Controller("permissions")
@UseGuards(ApiKeyGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private db: DataSource) {}

  @Get(["grouped", "catalog"])
  @RequirePermissions("PERMISSION_VIEW")
  @ApiOperation({
    summary: "Consultar catálogo de permisos agrupados por módulo funcional (HU-54 / HU-007)",
    operationId: "PermissionsController_getGrouped",
  })
  async grouped() {
    const p = await this.db
      .getRepository(PermissionEntity)
      .findBy({ status: CatalogStatus.ACTIVE, assignable: true });
    return {
      modules: [...new Set(p.map((x) => x.module))].map((code, i) => ({
        code,
        displayName: code,
        description: "",
        displayOrder: i + 1,
        permissions: p.filter((x) => x.module === code),
      })),
    };
  }

  @Get()
  @RequirePermissions("PERMISSION_VIEW")
  @ApiOperation({
    summary: "Consultar catálogo plano de permisos institucionales del sistema (HU-54 / HU-007)",
    operationId: "PermissionsController_findAll",
  })
  list(@Query("module") m?: string) {
    return this.db
      .getRepository(PermissionEntity)
      .find({ where: { module: m } });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PermissionEntity])],
  controllers: [PermissionsController],
  providers: [ApiKeyGuard, PermissionsGuard],
})
export class PermissionsModule {}
