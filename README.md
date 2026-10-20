# ZDeptos API — Rama `feature/audit-and-batch-import`

- **Carpeta de rama:** `feature__audit-and-batch-import`
- **Rama Git destino:** `feature/audit-and-batch-import`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Alcance de la rama:** Historial y Bitácora Inmutable de Auditoría con los 9 Campos Obligatorios del `ERF §7` (**HU-68 / HU-064 a HU-066 / CU-HIS-001**) y Cargas Masivas Iniciales con Descarga de Plantilla Oficial y Ejecución Transaccional `dryRun=true/false` (**HU-69 / HU-062, HU-063, HU-067 / CU-CIN-001**).

---

## 📂 Mapa de Carpetas y Trazabilidad por Historia de Usuario (HU)

```text
feature__audit-and-batch-import/
├── src/
│   ├── modules/
│   │   ├── audit/                             <-- [PROPIO DE ESTA RAMA] HU-68 (HU-064, HU-065, HU-066: Bitácora Inmutable)
│   │   │   ├── application/                   <-- AuditService (Consulta paginada con filtros y detalle por eventId)
│   │   │   ├── domain/                        <-- Tipos de dominio y enums (AuditAction, AuditActorType, AuditEventCategory)
│   │   │   ├── infrastructure/                <-- AuditEventEntity (zd_audit.audit_event) y AuditRepository append-only
│   │   │   ├── presentation/                  <-- AuditController (GET /api/v1/audit/logs y GET /api/v1/audit/logs/:eventId)
│   │   │   │   └── dto/                       <-- DTOs de filtros de consulta y respuesta paginada/detalle
│   │   │   └── test/                          <-- Pruebas unitarias de AuditController y AuditRepository
│   │   ├── batch-import/                      <-- [PROPIO DE ESTA RAMA] HU-69 (HU-062, HU-063, HU-067: Carga Masiva Inicial)
│   │   │   ├── application/                   <-- BatchImportService (Validación de layout, RN-010, dryRun y transacción ACID)
│   │   │   ├── presentation/                  <-- BatchImportController (GET /layout y POST /admin/batch-import)
│   │   │   │   └── dto/                       <-- DTOs de especificación de layout oficial y resultado de importación
│   │   │   └── tests/                         <-- Pruebas unitarias de descarga de plantilla y carga masiva
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

### 1. Carpetas Propias / Modificadas por la Rama (`feature/audit-and-batch-import`)

| Carpeta / Ruta | Archivos Principales | Historias (Original / Homologada) | Qué implementa |
| :--- | :--- | :--- | :--- |
| `src/modules/audit/presentation/` | `audit.controller.ts`, `dto/audit-logs-query.dto.ts`, `dto/audit-log-response.dto.ts` | **HU-68** (`HU-064, HU-065, HU-066`) | Expone `GET /api/v1/audit/logs` (consulta paginada con filtros por fecha, tienda, acción, entidad y usuario) y `GET /api/v1/audit/logs/:eventId` (detalle con `beforeValue` y `afterValue`). |
| `src/modules/audit/application/` | `audit.service.ts` | **HU-68** (`HU-064, HU-065, HU-066`) | Validación de rangos de fechas y recuperación de solo lectura sobre eventos históricos. |
| `src/modules/audit/infrastructure/` | `audit-event.entity.ts`, `audit.repository.ts` | **HU-68** (`HU-064` / `ERF §7`) | Persistencia inmutable (`append-only`, sin `UPDATE` ni `DELETE`) en `zd_audit.audit_event`. |
| `src/modules/audit/test/` | `audit.controller.spec.ts`, `audit.repository.spec.ts` | **HU-68** | Pruebas unitarias de consulta de bitácora e inmutabilidad del repositorio. |
| `src/modules/batch-import/presentation/` | `batch-import.controller.ts`, `dto/batch-import.dto.ts`, `dto/batch-import-layout.dto.ts` | **HU-69** (`HU-062, HU-063, HU-067`) | Expone `GET /api/v1/admin/batch-import/layout` (diccionario de columnas y descarga `?format=CSV`, **HU-067**) y `POST /api/v1/admin/batch-import` (**HU-062, HU-063**). |
| `src/modules/batch-import/application/` | `batch-import.service.ts` | **HU-69** (`HU-062, HU-063, HU-067`) | Validación de estructura `.csv`/`.txt`, calendario abierto, tienda, departamento y unicidad de sección (`RN-010`), soportando modo simulación (`dryRun=true`) y ejecución transaccional (`dryRun=false`). |
| `src/modules/batch-import/tests/` | `batch-import.controller.spec.ts` | **HU-69** | Pruebas unitarias de descarga de layout y procesamiento masivo. |

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
| `GET /api/v1/audit/logs` | `HU-68` (`HU-064`, `HU-065`) | `src/features/gestion-estructuras/components/StructureActions.tsx` (prop `onHistory` en botón `<HistoryIcon />`: `"Ver historial de..."`) | Cuando el usuario hace clic en el icono de reloj/historial de un departamento o coordinación en `EstructurasTable.tsx` / `StructureTreeTable.tsx`, consulta la bitácora paginada filtrando por `entityId`, `module`, `action`, `actorId` y rango de fechas (`from`, `to`). |
| `GET /api/v1/audit/logs/:eventId` | `HU-68` (`HU-066`) | Modal de detalle de evento de auditoría | Muestra el estado `before` y `after` (JSON diff), el usuario ejecutor, su IP y el `traceId` del movimiento seleccionado. |
| `GET /api/v1/admin/batch-import/layout` | `HU-69` (`HU-062`) | Pantalla administrativa de Carga Inicial (`CU-CIN-001`) | Permite descargar la plantilla oficial `.csv` o `.txt` y consultar las reglas de validación de columnas antes de subir un archivo. |
| `POST /api/v1/admin/batch-import` | `HU-69` (`HU-063`, `HU-067`) | Pantalla administrativa de Carga Inicial (`CU-CIN-001`) | Con `dryRun: true` prevalida todas las filas y devuelve la tabla de errores por fila/columna sin tocar la BD; con `dryRun: false` aplica la carga masiva en una transacción todo-o-nada. |
