import { Controller, Get, Module, Query, UseGuards } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { CatalogStatus, PermissionEntity } from "./domain/permission.entity";
import {
  ApiKeyGuard,
  PermissionsGuard,
  RequirePermissions,
} from "../../shared/security/security";
@Controller("permissions")
@UseGuards(ApiKeyGuard, PermissionsGuard)
class C {
  constructor(private db: DataSource) {}
  @Get(["grouped", "catalog"]) @RequirePermissions("PERMISSION_VIEW") async grouped() {
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
  @Get() @RequirePermissions("PERMISSION_VIEW") list(
    @Query("module") m?: string,
  ) {
    return this.db
      .getRepository(PermissionEntity)
      .find({ where: { module: m } });
  }
}
@Module({
  imports: [TypeOrmModule.forFeature([PermissionEntity])],
  controllers: [C],
  providers: [ApiKeyGuard, PermissionsGuard],
})
export class PermissionsModule {}
