# Información de Rama: `feature/audit-and-batch-import`

- **Nombre de la rama:** `feature/audit-and-batch-import`
- **Carpeta simulada:** `feature__audit-and-batch-import`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Estado:** Terminada

---

## 1. Historias de Usuario Implementadas

| ID Original | ID Homologado | Título | Implementación Backend |
| :--- | :--- | :--- | :--- |
| **HU-68** | **HU-064 / HU-065 / HU-066** | Historial y Bitácora Inmutable de Auditoría (`CU-HIS-001` / `ERF §7`) | `GET /api/v1/audit/logs` (consulta paginada con filtros por fecha, tienda, acción, entidad y usuario) y `GET /api/v1/audit/logs/:eventId` (detalle inmutable con `beforeValue`, `afterValue`, motivo y origen técnico). |
| **HU-69** | **HU-062 / HU-063 / HU-067** | Carga Masiva Inicial y Descarga de Layout Oficial (`CU-CIN-001`) | `GET /api/v1/admin/batch-import/layout` (especificación de columnas y descarga de plantilla oficial `?format=CSV`) y `POST /api/v1/admin/batch-import` (validación previa `dryRun=true` y ejecución transaccional ACID `dryRun=false` con auditoría `BATCH_IMPORT_EXECUTED`). |

---

## 2. Changelog Simulado de Commits (Conventional Commits)

```text
feat(HU-68): add AuditController and AuditService with GET /api/v1/audit/logs and /audit/logs/:eventId (CU-HIS-001)
feat(HU-69): add BatchImportModule with GET /api/v1/admin/batch-import/layout and POST /api/v1/admin/batch-import (CU-CIN-001)
test(audit-batch): add unit tests for AuditController, AuditRepository, and BatchImportController
```

---

## 3. Archivos Creados o Modificados

| Ruta del Archivo | Acción | Descripción Corta |
| :--- | :--- | :--- |
| `src/app.module.ts` | Modificado | Registra `AuditModule` y `BatchImportModule` sobre la base `main`. |
| `src/modules/audit/presentation/audit.controller.ts` | Creado | Expone `GET /api/v1/audit/logs` y `GET /api/v1/audit/logs/:eventId`. |
| `src/modules/audit/application/audit.service.ts` | Creado | Consulta paginada y detalle de eventos inmutables de auditoría. |
| `src/modules/audit/test/*` | Creado | Pruebas unitarias de `AuditController` y `AuditRepository`. |
| `src/modules/batch-import/*` | Creado | Controlador, servicio, DTOs y pruebas de layout y carga masiva (`dryRun=true/false`). |

---

## 4. Endpoints Nuevos (4 Operaciones)

- `GET /api/v1/audit/logs`
- `GET /api/v1/audit/logs/:eventId`
- `GET /api/v1/admin/batch-import/layout`
- `POST /api/v1/admin/batch-import`

---

## 5. Posibles Conflictos de Merge

- **`src/app.module.ts`**: Conservar `AuditModule` y `BatchImportModule` en `imports` al hacer merge con las demás ramas.
- **`src/modules/audit/audit.module.ts`**: Esta rama registra `AuditController` y `AuditService` además de `AuditRepository`. Al hacer merge a `main`, se debe conservar la versión completa de `AuditModule`.
