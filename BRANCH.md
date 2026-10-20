# Información de Rama: `feature/planning-schedule-lifecycle`

- **Nombre de la rama:** `feature/planning-schedule-lifecycle`
- **Carpeta simulada:** `feature__planning-schedule-lifecycle`
- **Rama base:** `main` (`backendZDeptos-integrado`)
- **Estado:** Terminada

---

## 1. Historias de Usuario Implementadas

| ID Matriz / Original | ID Homologado | Título | Implementación Backend |
| :--- | :--- | :--- | :--- |
| **HU-48 / HU-49** | **HU-047** | Derivación automática (copy-on-write) de estructura futura (`mes + 1`) | `POST /api/v1/structures/departments/:departmentId/future-draft/init`: clona bajo estrategia `COPY_ON_WRITE` los grupos y secciones del periodo vigente hacia el periodo objetivo (`mes + 1`) sin afectar la estructura operativa actual, auditando `FUTURE_DRAFT_INITIALIZED`. |
| **HU-049** | **HU-049** | Programar y editar cambios estructurales antes de su entrada en vigor (`CU-ADM-006 A5`) | `GET /api/v1/structures/scheduled-changes`, `POST /api/v1/structures/scheduled-changes` y `PUT /api/v1/structures/scheduled-changes/:changeId`: permite listar, programar y editar fecha efectiva, grupo destino o nombre propuesto de un cambio mientras su estado sea `SCHEDULED`, incrementando versión y auditando `SCHEDULED_CHANGE_UPDATED`. |
| **HU-050** | **HU-050** | Cancelar cambio programado antes de su fecha de vigencia (`CU-ADM-006 A6`) | `POST /api/v1/structures/scheduled-changes/:changeId/cancel`: cambia el estado a `CANCELLED`, conserva el registro histórico con motivo de cancelación y audita `SCHEDULED_CHANGE_CANCELLED`. |
| **HU-051** | **HU-051** | Activación de estructura planificada al llegar su fecha de vigencia | `POST /api/v1/structures/periods/:periodCode/activate`: promueve los borradores futuros del periodo a `ACTIVE`, aplica los cambios `SCHEDULED` pendientes, archiva el periodo previo como snapshot `HISTORICAL`, dispara el recálculo de secciones administradas y audita `PERIOD_ACTIVATED`. |
| **HU-052** | **HU-052** | Configuración del calendario operativo de corte y bloqueo por cálculo (`ERF §7`) | `PUT /api/v1/structures/calendar/operational-cutoff`: permite parametrizar los días naturales de la ventana de edición (`editingWindowDays`), el día de corte (`cutoffDayOfMonth`) y la bandera de bloqueo por cálculo de planes (`isLockedByCalculation`, que bloquea ediciones con `423 Locked`), auditando `OPERATIONAL_CALENDAR_CONFIGURED`. |

---

## 2. Changelog Simulado de Commits (Conventional Commits)

```text
feat(HU-047): add POST /api/v1/structures/departments/:departmentId/future-draft/init for copy-on-write mes+1 structure derivation
feat(HU-049): add GET, POST, and PUT /api/v1/structures/scheduled-changes to manage and edit future scheduled changes before effective date
feat(HU-050): add POST /api/v1/structures/scheduled-changes/:changeId/cancel with audit trail preservation
feat(HU-051): add POST /api/v1/structures/periods/:periodCode/activate to promote planned structures and archive historical snapshot
feat(HU-052): add PUT /api/v1/structures/calendar/operational-cutoff for editing window days and calculation lock configuration
test(structures): add unit tests for future draft derivation, scheduled changes lifecycle, period activation, and cutoff config
```

---

## 3. Archivos Creados o Modificados

| Ruta del Archivo | Acción | Descripción Corta |
| :--- | :--- | :--- |
| `src/modules/audit/domain/enums/audit-action.enum.ts` | Modificado | Agrega `FUTURE_DRAFT_INITIALIZED`, `SCHEDULED_CHANGE_CREATED`, `SCHEDULED_CHANGE_UPDATED`, `SCHEDULED_CHANGE_CANCELLED`, `PERIOD_ACTIVATED` y `OPERATIONAL_CALENDAR_CONFIGURED`. |
| `src/modules/structures/presentation/dto/structures.dto.ts` | Modificado | Agrega `InitFutureDraftDto`, `CreateScheduledChangeDto`, `UpdateScheduledChangeDto`, `CancelScheduledChangeDto`, `ActivatePeriodDto` y `UpdateOperationalCutoffConfigDto`. |
| `src/modules/structures/application/structures.service.ts` | Modificado | Implementa `initFutureDraft`, `listScheduledChanges`, `createScheduledChange`, `updateScheduledChange`, `cancelScheduledChange`, `activatePlannedPeriod` y `configureOperationalCutoff`. |
| `src/modules/structures/presentation/structures.controller.ts` | Modificado | Expone los 7 endpoints nuevos del ciclo de vida de planificación y calendario operativo. |
| `src/modules/structures/tests/structures.controller.spec.ts` | Modificado | Agrega pruebas unitarias para todos los endpoints de la Rama 5. |

---

## 4. Endpoints Nuevos

| Método | Ruta | Permiso / Autenticación | Historia | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/structures/departments/:departmentId/future-draft/init` | `PLANNING_PUBLISH` | HU-48/49 (HU-047) | Deriva automáticamente (copy-on-write) la estructura futura (`mes + 1`) desde el periodo activo. |
| `GET` | `/api/v1/structures/scheduled-changes` | `PLANNING_VIEW` | HU-049 | Consulta cambios estructurales programados filtrando por departamento, periodo o estado. |
| `POST` | `/api/v1/structures/scheduled-changes` | `PLANNING_PUBLISH` | HU-049 | Programa un cambio estructural para un periodo futuro editable. |
| `PUT` | `/api/v1/structures/scheduled-changes/:changeId` | `PLANNING_PUBLISH` | HU-049 | Edita la fecha efectiva, grupo destino o nombre propuesto antes de su entrada en vigor. |
| `POST` | `/api/v1/structures/scheduled-changes/:changeId/cancel` | `PLANNING_PUBLISH` | HU-050 | Cancela un cambio programado antes de su vigencia conservando historial en bitácora. |
| `POST` | `/api/v1/structures/periods/:periodCode/activate` | `PLANNING_PUBLISH` | HU-051 | Activa la planificación publicada del periodo, archiva el snapshot anterior y recalcula secciones. |
| `PUT` | `/api/v1/structures/calendar/operational-cutoff` | `PLANNING_PUBLISH` | HU-052 | Configura la ventana de días naturales de corte y la bandera de bloqueo por cálculo (`423 Locked`). |

---

## 5. Posibles Conflictos de Merge

1. **`src/modules/audit/domain/enums/audit-action.enum.ts`**:
   - **Razón:** También es modificado en `feature/auth-sso-session` y en `feature/structures-compras-pac-and-ec-sync`. Al hacer merge a `main`, se deben conservar todos los valores del `enum AuditAction`.
2. **`src/modules/structures/presentation/dto/structures.dto.ts`**, **`src/modules/structures/application/structures.service.ts`**, **`src/modules/structures/presentation/structures.controller.ts`** y **`src/modules/structures/tests/structures.controller.spec.ts`**:
   - **Razón:** También se extienden al final del archivo en `feature/structures-compras-pac-and-ec-sync` (Rama 4). Al hacer merge a `main`, se deben conservar ambos bloques de DTOs, métodos de servicio, endpoints de controlador y suites de prueba.

---

## 6. Pendientes o Supuestos

- **Job Programado de Activación (`HU-051`):** El endpoint `POST /api/v1/structures/periods/:periodCode/activate` puede ser invocado tanto manualmente por un Administrador General como por un job programado (Cron / Scheduler de infraestructura) a las `00:00` del primer día del periodo operativo.
