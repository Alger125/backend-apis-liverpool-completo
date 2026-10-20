/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 03 — REPORTES DINÁMICOS, AUDITORÍA HISTÓRICA Y CARGAS MASIVAS
 * HISTORIAS: HU-62 a HU-69 (HU-055 a HU-069) | CATÁLOGO DOMINIO 10
 * CASOS DE USO: CU-EST-002, CU-EST-003, CU-HIS-001, CU-CIN-001
 * DECISIONES DE ARQUITECTURA: DEC-10, DEC-17, ERF §7 (Bitácora inmutable)
 * ============================================================================
 * Módulos integrados:
 * - ReportsModule: Catálogo de columnas, vistas previas dinámicas (rol y general),
 *   cálculo de modelos de compensación y exportación de archivos planos CSV y TXT delimitados por pipes.
 * - AuditModule: Bitácora inmutable (Append-Only) en zd_audit.audit_event, consulta histórica
 *   con filtros multidimensionales, paginación estricta y catálogos de acciones y módulos.
 * - BatchImportModule: Descarga de layout oficial de carga masiva (.csv), validación sin mutar
 *   (dryRun: true) y ejecución transaccional atómica (dryRun: false) con registro de auditoría.
 * ============================================================================
 */
import { Module } from "@nestjs/common";
import { ReportsModule } from "../reports/reports.module";
import { AuditModule } from "../audit/audit.module";
import { BatchImportModule } from "../batch-import/batch-import.module";

@Module({
  imports: [ReportsModule, AuditModule, BatchImportModule],
  exports: [ReportsModule, AuditModule, BatchImportModule],
})
export class Feature03ReportesAuditoriaModule {}
