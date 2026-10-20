# ZDeptos API — Rama `feature/planning-schedule-lifecycle`

- **Carpeta de rama:** `feature__planning-schedule-lifecycle`
- **Rama Git destino:** `feature/planning-schedule-lifecycle`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Alcance de la rama:** Derivación Automática `Copy-on-Write` de Estructura Futura (`mes + 1`) (**HU-48 / HU-49 / HU-047**), Programación y Edición de Cambios Estructurales Antes de su Entrada en Vigor (**HU-049 / CU-ADM-006 A5**), Cancelación de Cambios Programados con Preservación de Bitácora (**HU-050 / CU-ADM-006 A6**), Activación de Planificación Publicada en su Fecha de Vigencia con Archivo de Snapshot Histórico (**HU-051**) y Configuración del Calendario Operativo de Corte y Bloqueo `423 Locked` por Cálculo (**HU-052 / ERF §7**).

---

## 📂 Mapa de Carpetas y Trazabilidad por Historia de Usuario (HU)

```text
feature__planning-schedule-lifecycle/
├── src/
│   ├── modules/
│   │   ├── structures/                        <-- [PROPIO DE ESTA RAMA] HU-48/49 (HU-047), HU-049, HU-050, HU-051, HU-052
│   │   │   ├── application/                   <-- Lógica de derivación mes+1, scheduled-changes, activación y calendario
│   │   │   ├── presentation/                  <-- Controlador /api/v1/structures/* (7 endpoints exclusivos de planificación)
│   │   │   │   └── dto/                       <-- DTOs de borrador futuro, cambios programados, activación y corte operativo
│   │   │   └── tests/                         <-- Pruebas unitarias de los 7 endpoints del ciclo de vida de planificación
│   │   ├── audit/                             <-- [SOPORTE AUDITORÍA] HU-047, HU-049 a HU-052 (Acciones de planificación)
│   │   │   ├── domain/enums/                  <-- Enum AuditAction extendido con eventos de planificación y calendario
│   │   │   └── infrastructure/                <-- Repositorio de escritura en bitácora zd_audit.audit_event
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

### 1. Carpetas Propias / Modificadas por la Rama (`feature/planning-schedule-lifecycle`)

| Carpeta / Ruta | Archivos Principales | Historias (Original / Homologada) | Qué implementa |
| :--- | :--- | :--- | :--- |
| `src/modules/structures/presentation/` | `structures.controller.ts` | **HU-48/49, HU-049, HU-050, HU-051, HU-052** (`HU-047, HU-049 a HU-052`) | Expone los 7 endpoints exclusivos del ciclo de planificación: `POST /departments/:departmentId/future-draft/init` (**HU-48/49**), `GET /scheduled-changes`, `POST /scheduled-changes` y `PUT /scheduled-changes/:changeId` (**HU-049**), `POST /scheduled-changes/:changeId/cancel` (**HU-050**), `POST /periods/:periodCode/activate` (**HU-051**) y `PUT /calendar/operational-cutoff` (**HU-052**). |
| `src/modules/structures/presentation/dto/` | `structures.dto.ts` | **HU-48/49, HU-049 a HU-052** | DTOs validados `InitFutureDraftDto`, `CreateScheduledChangeDto`, `UpdateScheduledChangeDto`, `CancelScheduledChangeDto`, `ActivatePeriodDto` y `UpdateOperationalCutoffConfigDto`. |
| `src/modules/structures/application/` | `structures.service.ts` | **HU-48/49, HU-049 a HU-052** | Clonación `COPY_ON_WRITE` del periodo vigente hacia `mes + 1` (**HU-48/49 / HU-047**), edición de fecha efectiva o grupo destino antes de la vigencia con incremento de versión (**HU-049**), cancelación lógica con motivo y bitácora (**HU-050**), promoción de estructura planificada a `ACTIVE` archivando el snapshot previo como `HISTORICAL` (**HU-051**), y parametrización de ventana en días naturales y bloqueo `423 Locked` por cálculo (**HU-052**). |
| `src/modules/structures/tests/` | `structures.controller.spec.ts` | **HU-48/49, HU-049 a HU-052** | Pruebas unitarias de los 7 endpoints del ciclo de vida de planificación. |
| `src/modules/audit/domain/enums/` | `audit-action.enum.ts` | **HU-047, HU-049 a HU-052** | Agrega `FUTURE_DRAFT_INITIALIZED`, `SCHEDULED_CHANGE_CREATED`, `SCHEDULED_CHANGE_UPDATED`, `SCHEDULED_CHANGE_CANCELLED`, `PERIOD_ACTIVATED` y `OPERATIONAL_CALENDAR_CONFIGURED`. |

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
| `POST /api/v1/structures/future-draft/init` | `HU-48/49` (`HU-047`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (al cambiar el `<select>` de `Periodo` al mes futuro `"Noviembre"`) | Inicializa mediante *copy-on-write* el borrador editable del mes siguiente (`mes + 1`) clonando la estructura vigente sin afectar la operación actual. |
| `GET /api/v1/structures/scheduled-changes` | `HU-049`, `HU-050` | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx`<br>`src/features/gestion-estructuras/components/StructureActions.tsx` | Lista los cambios programados (`PENDING`, `APPLIED`, `CANCELLED`) para el departamento y periodo seleccionado. |
| `POST /api/v1/structures/scheduled-changes` | `HU-48/49` (`HU-047`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` | Registra un cambio programado (creación/renombrado de grupo, reasignación de sección, etc.) para entrar en vigor en el periodo futuro. |
| `PUT /api/v1/structures/scheduled-changes/:changeId` | `HU-049` | `src/features/gestion-estructuras/components/StructureActions.tsx` (`onEdit`) | Permite modificar el payload o periodo de un cambio programado mientras siga en estado `PENDING` (antes de su fecha de vigencia). |
| `POST /api/v1/structures/scheduled-changes/:changeId/cancel` | `HU-050` | `src/features/gestion-estructuras/components/StructureActions.tsx` | Cancela un cambio programado (`PENDING` $\rightarrow$ `CANCELLED`) antes de su entrada en vigor, dejando rastro en auditoría. |
| `POST /api/v1/structures/periods/:periodCode/activate` | `HU-051` | Administración de cierre/apertura de periodo mensual | Archiva el periodo vigente como fotografía histórica inmutable (`ARCHIVED` / `isReadOnly: true`) y activa los cambios programados del nuevo periodo (`ACTIVE`). |
| `PUT /api/v1/structures/calendar/operational-cutoff` | `HU-052` | Configuración de Calendario Operativo | Permite al administrador configurar la ventana de edición (`windowStartUtc`, `cutoffAtUtc`) de cada periodo mensual (`YYYY-MM`). |
