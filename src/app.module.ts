/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * MÓDULO RAÍZ: AppModule
 * ============================================================================
 * Arquitectura modular agrupada por verticales funcionales (Features):
 * 
 * 1. HealthModule: Sondas de disponibilidad del servidor y base de datos (/health).
 * 2. Feature01RolesModule:
 *    - RolesModule (Gestión de Roles, Concurrencia Optimista)
 *    - PermissionsModule (Catálogo Institucional de Permisos)
 *    - AccessManagementModule (Asignaciones de Roles y Alcance Operativo)
 * 3. Feature02EstructurasModule:
 *    - GeographyModule (Filtros en Cascada: Formato, Cadena, Zona, Tienda)
 *    - StructuresModule (Árbol 6 Niveles, Grupos P-02, Secciones Ancla, Corte y Publicación)
 * 4. Feature03ReportesAuditoriaModule:
 *    - ReportsModule (Vistas Previas por Rol/General, Exportación CSV/TXT)
 *    - AuditModule (Bitácora Inmutable en zd_audit.audit_event y Consultas Históricas)
 *    - BatchImportModule (Layout de Carga Masiva Inicial, Validación y Ejecución Transaccional)
 * ============================================================================
 */
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "node:path";

import { HealthModule } from "./health/health.module";
import { Feature01RolesModule } from "./modules/feature-01-roles/feature-01-roles.module";
import { Feature02EstructurasModule } from "./modules/feature-02-estructuras/feature-02-estructuras.module";
import { Feature03ReportesAuditoriaModule } from "./modules/feature-03-reportes-auditoria/feature-03-reportes-auditoria.module";

@Module({
  imports: [
    // Configuración global de variables de entorno (.env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), ".env"),
      cache: true,
    }),

    // Conexión central a PostgreSQL 16
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>("DB_HOST");
        const portValue = configService.get<string>("DB_PORT");
        const username = configService.get<string>("DB_USERNAME");
        const password = configService.get<string>("DB_PASSWORD");
        const database = configService.get<string>("DB_NAME");

        const missingVariables = [
          ["DB_HOST", host],
          ["DB_PORT", portValue],
          ["DB_USERNAME", username],
          ["DB_PASSWORD", password],
          ["DB_NAME", database],
        ]
          .filter(
            ([, value]) =>
              value === undefined || value === null || value === "",
          )
          .map(([name]) => name);

        if (missingVariables.length > 0) {
          throw new Error(
            `Faltan variables de entorno: ${missingVariables.join(", ")}`,
          );
        }

        const port = Number(portValue);

        if (!Number.isInteger(port) || port <= 0) {
          throw new Error("DB_PORT debe ser un número entero mayor que cero");
        }

        return {
          type: "postgres" as const,
          host,
          port,
          username,
          password,
          database,
          autoLoadEntities: true,
          synchronize: false,
          logging: ["error"] as const,
        };
      },
    }),

    // Sonda de salud y monitoreo
    HealthModule,

    // ========================================================================
    // FEATURE 01: SEGURIDAD, ROLES, PERMISOS Y ALCANCE OPERATIVO (HU-54..61)
    // ========================================================================
    Feature01RolesModule,

    // ========================================================================
    // FEATURE 02: ESTRUCTURA COMERCIAL, ÁRBOL 6 NIVELES, GRUPOS P-02 (HU-13..53)
    // ========================================================================
    Feature02EstructurasModule,

    // ========================================================================
    // FEATURE 03: REPORTES CSV/TXT, AUDITORÍA Y CARGAS MASIVAS (HU-62..69)
    // ========================================================================
    Feature03ReportesAuditoriaModule,
  ],
})
export class AppModule {}
