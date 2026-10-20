# Información de Rama: `feature/reports-and-exports`

- **Nombre de la rama:** `feature/reports-and-exports`
- **Carpeta simulada:** `feature__reports-and-exports`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Estado:** Terminada

---

## 1. Historias de Usuario Implementadas

| ID Original | ID Homologado | Título | Implementación Backend |
| :--- | :--- | :--- | :--- |
| **HU-62** | **HU-055 / HU-056** | Catálogo de columnas en 3 categorías y Reporte Dinámico por Rol | `GET /api/v1/reports/metadata/columns` (`estructura`, `puestosPersonas`, `relaciones`) y `GET /api/v1/reports/role-based` con validación de tramo de control (`403`) y fotografías históricas (`404` sin sustitución silenciosa). |
| **HU-63** | **HU-057** | Reporte General Consolidado | `GET /api/v1/reports/general`: vista previa paginada sobre el universo organizacional completo (requiere `REPORTS_GLOBAL_VIEW`). |
| **HU-64** | **HU-058** | Reportes Especializados de Compensaciones y Productividad | `GET /api/v1/reports/compensations`: soporta las 6 variantes (`JEFES_CON_SECCION`, `GERENTES`, `JEFES`, `PRODUCTIVIDAD_10_COL`, `PRODUCTIVIDAD_FILA`, `OPERACIONES_ZDEPTOS`). |
| **HU-65 / HU-66** | **HU-059 / HU-060 / HU-061** | Exportación de Reportes en Formato `CSV` y `TXT` delimitado por Pipes (`|`) | `GET /api/v1/reports/export/csv` (preservando ceros a la izquierda `="00123"`) y `GET /api/v1/reports/export/txt` (delimitado por `|` para SAP HCM / Nómina, `DEC-10`) con auditoría `REPORT_EXPORTED`. |

---

## 2. Changelog Simulado de Commits (Conventional Commits)

```text
feat(HU-62): add ReportsModule with GET /api/v1/reports/metadata/columns and /role-based dynamic projection
feat(HU-63): add GET /api/v1/reports/general requiring REPORTS_GLOBAL_VIEW permission
feat(HU-64): add GET /api/v1/reports/compensations supporting 6 compensation and productivity variants
feat(HU-65): add GET /api/v1/reports/export/csv and /export/txt (pipe-delimited DEC-10) with REPORT_EXPORTED audit
test(reports): add unit tests for ReportsController, ColumnProjectionService, and ExportFormatterService
```

---

## 3. Archivos Creados o Modificados

| Ruta del Archivo | Acción | Descripción Corta |
| :--- | :--- | :--- |
| `src/app.module.ts` | Modificado | Registra `ReportsModule` sobre la base `main`. |
| `src/modules/reports/reports.module.ts` | Creado | Módulo NestJS de reportes dinámicos y exportación. |
| `src/modules/reports/presentation/reports.controller.ts` | Creado | Expone los 6 endpoints de consulta y exportación `CSV`/`TXT`. |
| `src/modules/reports/application/reports.service.ts` | Creado | Lógica de negocio de reportes por rol, general, compensaciones y auditoría de descarga. |
| `src/modules/reports/application/column-projection.service.ts` | Creado | Proyección dinámica de columnas en 3 categorías (`estructura`, `puestosPersonas`, `relaciones`). |
| `src/modules/reports/application/export-formatter.service.ts` | Creado | Formateador `CSV` (ceros SAP) y `TXT` delimitado por pipes (`|`). |
| `src/modules/reports/tests/reports.controller.spec.ts` | Creado | Pruebas unitarias de los 6 endpoints de reportes y exportación. |

---

## 4. Endpoints Nuevos (6 Operaciones)

- `GET /api/v1/reports/metadata/columns`
- `GET /api/v1/reports/role-based`
- `GET /api/v1/reports/general`
- `GET /api/v1/reports/compensations`
- `GET /api/v1/reports/export/csv`
- `GET /api/v1/reports/export/txt`

---

## 5. Posibles Conflictos de Merge

- **`src/app.module.ts`**: Al integrar las ramas en `main`, conservar `ReportsModule` junto con los demás módulos en `imports`.
