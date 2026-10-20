# ZDeptos API — Rama `feature/reports-and-exports`

- **Carpeta de rama:** `feature__reports-and-exports`
- **Rama Git destino:** `feature/reports-and-exports`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Alcance de la rama:** Catálogo de Columnas en 3 Categorías (`estructura`, `puestosPersonas`, `relaciones`), Reporte Dinámico por Rol con Tramo de Control y Fotografías Históricas (**HU-62 / HU-055, HU-056**), Reporte General Consolidado (**HU-63 / HU-057**), Reportes Especializados de Compensaciones y Productividad (**HU-64 / HU-058**) y Exportación `CSV` (preservando ceros SAP) y `TXT` delimitado por Pipes `|` (**HU-65, HU-66, HU-67 / HU-059 a HU-061**).

---

## 📂 Mapa de Carpetas y Trazabilidad por Historia de Usuario (HU)

```text
feature__reports-and-exports/
├── src/
│   ├── modules/
│   │   ├── reports/                           <-- [PROPIO DE ESTA RAMA] HU-62 a HU-67 (HU-055 a HU-061)
│   │   │   ├── application/                   <-- ReportsService, ColumnProjectionService y ExportFormatterService
│   │   │   ├── presentation/                  <-- Controlador /api/v1/reports/* (6 endpoints de consulta y exportación)
│   │   │   │   └── dto/                       <-- DTOs de filtros, metadatos de columnas y variantes de compensación
│   │   │   └── tests/                         <-- Pruebas unitarias de reportes, proyección de columnas y CSV/TXT
│   │   ├── audit/                             <-- [SOPORTE AUDITORÍA] HU-67 (Registro de evento REPORT_EXPORTED)
│   │   ├── roles/                             <-- [BASE MAIN] HU-54, HU-56, HU-57 (HU-007, HU-008, HU-011, HU-012)
│   │   └── permissions/                       <-- [BASE MAIN] HU-54 (HU-007: Catálogo de permisos)
│   ├── shared/
│   │   ├── security/                          <-- [BASE MAIN] Guards de autenticación y permisos
│   │   └── http/                              <-- [BASE MAIN] Tipado de request autenticado
│   └── health/                                <-- [BASE MAIN] Monitoreo técnico GET /api/v1/health
├── openapi/                                   <-- [BASE MAIN] Especificación OpenAPI base
└── BRANCH.md                                  <-- Especificación técnica, commits y posibles conflictos de merge
```

---

## 📋 Detalle de Carpetas, Archivos e Historias de Usuario

### 1. Carpetas Propias / Modificadas por la Rama (`feature/reports-and-exports`)

| Carpeta / Ruta | Archivos Principales | Historias (Original / Homologada) | Qué implementa |
| :--- | :--- | :--- | :--- |
| `src/modules/reports/` | `reports.module.ts` | **HU-62 a HU-67** (`HU-055 a HU-061`) | Módulo NestJS que integra los servicios de consulta, proyección dinámica de columnas y exportación de archivos. |
| `src/modules/reports/presentation/` | `reports.controller.ts` | **HU-62 a HU-67** (`HU-055 a HU-061`) | Expone los 6 endpoints: `GET /api/v1/reports/metadata/columns` (**HU-62**), `GET /api/v1/reports/role-based` (**HU-62**), `GET /api/v1/reports/general` (**HU-63**), `GET /api/v1/reports/compensations` (**HU-64**), `GET /api/v1/reports/export/csv` (**HU-65**) y `GET /api/v1/reports/export/txt` (**HU-66 / DEC-10**). |
| `src/modules/reports/presentation/dto/` | `report-query.dto.ts`, `report-response.dto.ts`, `reports-metadata.dto.ts` | **HU-62 a HU-67** (`HU-055 a HU-061`) | Validación de rangos de fechas, filtros por tienda/departamento, selección dinámica de columnas y variantes de compensaciones. |
| `src/modules/reports/application/` | `reports.service.ts`, `column-projection.service.ts`, `export-formatter.service.ts` | **HU-62 a HU-67** (`HU-055 a HU-061`) | Proyección de columnas en 3 categorías (`estructura`, `puestosPersonas`, `relaciones`), validación de alcance (`403`) y fotografías históricas sin sustitución silenciosa (`404`), generación `CSV` con formato `="00123"` para SAP y `TXT` delimitado por pipes `|` (`DEC-10`) con auditoría `REPORT_EXPORTED`. |
| `src/modules/reports/tests/` | `reports.controller.spec.ts` | **HU-62 a HU-67** | Pruebas unitarias de los 6 endpoints de reportes y exportación. |

---

### 2. Carpetas Heredadas de la Rama Base (`main`)

| Carpeta / Ruta | Historias Base (`main`) | Descripción |
| :--- | :--- | :--- |
| `src/modules/roles/` | **HU-54, HU-56, HU-57** (`HU-007, HU-008, HU-011, HU-012`) | CRUD base de roles y análisis de impacto (`GET/POST /roles`, `GET/PUT/DELETE /roles/:roleId`, `GET /roles/:roleId/impact`). |
| `src/modules/permissions/` | **HU-54** (`HU-007`) | Catálogo institucional de permisos (`GET /permissions`, `GET /permissions/grouped`). |
| `src/health/` | Infraestructura transversal | Endpoint de salud `GET /api/v1/health`. |

---

## 🚀 Comandos de Validación

```bash
npm run typecheck
npm test -- --runInBand
```

---

## 🔗 Relación con el Frontend (`frontZDeptos-estructuras-liz`)

> Ver también la [Guía Maestra de Integración Frontend ↔ Backend](../FRONTEND_INTEGRATION_GUIDE.md).

| Endpoint de esta Rama | HU | Archivo / Componente en `frontZDeptos-estructuras-liz` | Qué hace en la pantalla del Frontend |
| :--- | :---: | :--- | :--- |
| `GET /api/v1/reports/metadata/columns` | `HU-62` (`HU-057`) | `src/app/pages/ReportsPlaceholder.tsx` (ruta `/reports`) | Devuelve el catálogo de columnas seleccionables organizadas en 3 categorías (`estructura`, `puestosPersonas`, `relaciones`) para construir los checkboxes de columnas del reporte. |
| `GET /api/v1/reports/role-based` | `HU-63`, `HU-64` (`HU-055`, `HU-058`, `HU-061`) | `src/app/pages/ReportsPlaceholder.tsx` (Tabla de vista previa por Rol) | Genera la vista previa paginada filtrada por el tramo de control del usuario y el mes consultado (usando fotografía histórica si es un mes cerrado, o devolviendo `404 HISTORICAL_SNAPSHOT_NOT_FOUND`). |
| `GET /api/v1/reports/general` | `HU-65` (`HU-056`) | `src/app/pages/ReportsPlaceholder.tsx` (Pestaña Reporte General) | Genera la vista previa consolidada de toda la organización (requiere permiso `REPORTS_GLOBAL_VIEW`). |
| `GET /api/v1/reports/compensations` | `HU-056` | `src/app/pages/ReportsPlaceholder.tsx` (Selector de Modelo de Compensación) | Genera el reporte especializado para los 6 modelos de compensación (`COMP_ESTRUCTURA`, `COMP_LIDERES`, `COMP_SECCIONES`, `COMP_GRUPOS`, `COMP_VACANTES`, `COMP_MANCUERNAS`). |
| `GET /api/v1/reports/export/csv` | `HU-66` (`HU-059`) | Botón **"Exportar CSV"** en `/reports` | Descarga directa del archivo `.csv` (`text/csv; charset=utf-8` con BOM UTF-8 para abrirse correctamente en Excel). |
| `GET /api/v1/reports/export/txt` | `HU-67` (`HU-060`) | Botón **"Exportar TXT (Pipes)"** en `/reports` | Descarga directa del archivo `.txt` delimitado por pipes (`|`) para interfaces legadas y nómina/compensaciones. |
