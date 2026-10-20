/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 02 — ESTRUCTURA COMERCIAL, ÁRBOL DE 6 NIVELES, GRUPOS Y SECCIONES
 * HISTORIAS: HU-13 a HU-53 (HU-019 a HU-054) | CATÁLOGO DOMINIOS 3 AL 8
 * CASOS DE USO: CU-EST-001, CU-ADM-001 a CU-ADM-008, UC-004 a UC-009
 * REGLAS DE NEGOCIO: RN-001..RN-040, Autonumeración P-02, Secciones Ancla 🔒
 * ============================================================================
 * Módulos integrados:
 * - GeographyModule: Filtros en cascada de Formato, Cadena, Zona Comercial y Tienda/Almacén.
 * - StructuresModule: Árbol jerárquico recursivo de 6 niveles, autonumeración atómica P-02
 *   de grupos ("Grupo 001", "Grupo 002"), protección de secciones ancla de contrato (RN-030),
 *   Drag & Drop de secciones virtuales, corte operativo y publicación departamental (If-Match).
 * ============================================================================
 */
import { Module } from "@nestjs/common";
import { GeographyModule } from "../geography/geography.module";
import { StructuresModule } from "../structures/structures.module";

@Module({
  imports: [GeographyModule, StructuresModule],
  exports: [GeographyModule, StructuresModule],
})
export class Feature02EstructurasModule {}
