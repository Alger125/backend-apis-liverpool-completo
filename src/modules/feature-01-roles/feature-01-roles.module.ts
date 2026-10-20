/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 01 — ROLES, PERMISOS, EXCEPCIONES Y SEGMENTACIÓN OPERATIVA
 * HISTORIAS: HU-54 a HU-61 (HU-007 a HU-018) | CATÁLOGO DOMINIO 9
 * CASOS DE USO: CU-ROL-001 a CU-ROL-005, CU-SEG-001, CU-EXC-001
 * ============================================================================
 * Módulos integrados:
 * - RolesModule: Creación, clonación, matriz de impacto, baja lógica y concurrencia optimista (versión).
 * - PermissionsModule: Catálogo institucional de permisos del sistema ZDeptos.
 * - AccessManagementModule: Asignaciones de roles con alcance operativo (tiendas/zonas) y excepciones.
 * ============================================================================
 */
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { HomeSearchModule } from "../home-search/home-search.module";
import { RolesModule } from "../roles/roles.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { AccessManagementModule } from "../access-management/access-management.module";

@Module({
  imports: [
    AuthModule,
    HomeSearchModule,
    RolesModule,
    PermissionsModule,
    AccessManagementModule,
  ],
  exports: [
    AuthModule,
    HomeSearchModule,
    RolesModule,
    PermissionsModule,
    AccessManagementModule,
  ],
})
export class Feature01RolesModule {}

