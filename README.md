# ZDeptos API — Rama `feature/geography-and-store-structures`

- **Carpeta de rama:** `feature__geography-and-store-structures`
- **Rama Git destino:** `feature/geography-and-store-structures`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Alcance de la rama:** Geografía Comercial y Filtros en Cascada (**HU-13 / HU-068, HU-070**), Árbol Jerárquico de 6 Niveles de Tienda y Encabezado (**HU-14 a HU-18 / HU-024 a HU-027**), Grupos Comerciales con Autonumeración `P-02` (**HU-20 a HU-26 / HU-030 a HU-035**), Secciones Disponibles/Agregadas, Protección de Secciones Ancla `🔒` (`RN-030`) y Reubicación Drag & Drop (**HU-27 a HU-40 / HU-036 a HU-043**), Corte Operativo, Publicación Departamental y Concurrencia Optimista `If-Match` (**HU-48, HU-52, HU-53 / HU-046, HU-048, HU-053, HU-054**).

---

## 📂 Mapa de Carpetas y Trazabilidad por Historia de Usuario (HU)

```text
feature__geography-and-store-structures/
├── src/
│   ├── modules/
│   │   ├── geography/                         <-- [PROPIO DE ESTA RAMA] HU-13 (HU-068, HU-070: Zonas y Tiendas en cascada)
│   │   │   └── dto/                           <-- HU-13 (DTOs de respuesta de Zonas y Ubicaciones/Tiendas)
│   │   ├── structures/                        <-- [PROPIO DE ESTA RAMA] HU-14 a HU-40, HU-42..43, HU-46..48, HU-50..53
│   │   │   ├── application/                   <-- Lógica de Árbol 6 niveles, Grupos P-02, Secciones Ancla 🔒 y Publicación
│   │   │   ├── domain/entities/               <-- Entidades TypeORM (StructureNode, CommercialGroup, GroupSectionAssignment, etc.)
│   │   │   ├── presentation/                  <-- Controlador /api/v1/structures/* (13 operaciones de tienda)
│   │   │   │   └── dto/                       <-- DTOs de árbol, grupos, movimiento Drag & Drop, publicación y errores 409/422
│   │   │   └── tests/                         <-- Pruebas unitarias de los 13 endpoints de estructuras de tienda
│   │   ├── audit/                             <-- [SOPORTE AUDITORÍA] Registro de eventos STRUCTURE_CHANGE en bitácora
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

### 1. Carpetas Propias / Modificadas por la Rama (`feature/geography-and-store-structures`)

| Carpeta / Ruta | Archivos Principales | Historias (Original / Homologada) | Qué implementa |
| :--- | :--- | :--- | :--- |
| `src/modules/geography/` | `geography.controller.ts`, `geography.service.ts`, `geography.controller.spec.ts` | **HU-13** (`HU-068, HU-070`) | Filtros geográficos en cascada: `GET /api/v1/geography/zones` y `GET /api/v1/geography/zones/:zoneId/locations` (tiendas Liverpool y Suburbia). |
| `src/modules/geography/dto/` | `geography-response.dto.ts` | **HU-13** (`HU-068, HU-070`) | Contratos de salida de zonas geográficas y ubicaciones físicas (`Location`). |
| `src/modules/structures/domain/entities/` | `structure-node.entity.ts`, `commercial-group.entity.ts`, `group-section-assignment.entity.ts`, `section-reference.entity.ts`, `department-structure-state.entity.ts`, `operational-period.entity.ts` | **HU-14 a HU-53** (`HU-024 a HU-054`) | Modelo relacional `zd_core`, `zd_ref` y `zd_plan` para nodos jerárquicos, grupos operativos, asignaciones de secciones (`ANCHOR` vs `MANUAL`), versiones departamentales y periodos. |
| `src/modules/structures/presentation/` | `structures.controller.ts` | **HU-14 a HU-40, HU-48, HU-52, HU-53** (`HU-024 a HU-043, HU-046, HU-048, HU-053, HU-054`) | Expone los 13 endpoints de tienda: `GET /tree`, `GET /locations/:locationId/summary`, `GET/POST /departments/:departmentId/groups`, `PUT/DELETE /groups/:groupId`, `GET /available-sections`, `GET /aggregated-sections`, `POST /groups/:groupId/sections`, `DELETE /groups/:groupId/sections/:sectionId`, `PATCH /departments/:departmentId/sections/move`, `GET /calendar/operational-cutoff` y `POST /departments/:departmentId/publish`. |
| `src/modules/structures/presentation/dto/` | `structures.dto.ts`, `tree-response.dto.ts`, `mutation-response.dto.ts`, `location-summary-response.dto.ts`, `available-section-response.dto.ts`, `aggregated-section-response.dto.ts`, `error-response.dto.ts` | **HU-14 a HU-53** (`HU-024 a HU-054`) | DTOs de entrada/salida, bloqueo de sección ancla (`422 AnchorBlockedResponseDto`) y conflicto de concurrencia optimista (`409 VersionConflictResponseDto`). |
| `src/modules/structures/application/` | `structures.service.ts` | **HU-14 a HU-53** (`HU-024 a HU-054`) | Consulta recursiva CTE de 6 niveles, mancuernas (`leaders[]`), autonumeración atómica `P-02` (`SELECT FOR UPDATE`), protección estricta de secciones ancla `🔒` (`RN-030`), validación de anclas huérfanas al publicar (**HU-39**) y control optimista `If-Match` (**HU-53**). |
| `src/modules/structures/tests/` | `structures.controller.spec.ts` | **HU-14 a HU-53** | Pruebas unitarias de los 13 endpoints de estructuras de tienda. |

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
| `GET /api/v1/geography/zones` | `HU-13`, `HU-14` | `src/features/gestion-estructuras/components/EstructurasFilters.tsx` (campo `Zona`) | Llena el selector de Zonas Geográficas en la barra superior de filtros de Operaciones (reemplaza el string fijo `zone="Zona 1"` en `OperacionesPage.tsx`). |
| `GET /api/v1/geography/zones/:zoneId/locations` | `HU-13`, `HU-15` | `src/features/gestion-estructuras/pages/OperacionesPage.tsx` | Devuelve las tiendas/ubicaciones de la zona seleccionada (distinguiendo formato `Liverpool` y `Suburbia`). |
| `GET /api/v1/structures/locations/:locationId/summary` | `HU-22` (`HU-025`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (Breadcrumb `.gm-breadcrumb`)<br>`src/features/gestion-estructuras/components/EstructurasTable.tsx` | Devuelve el encabezado y totales de la tienda (ej. `"Liverpool Insurgentes"`, formato, total de gerencias, departamentos y grupos). |
| `GET /api/v1/structures/tree?locationId=...&period=YYYY-MM` | `HU-16..27` (`HU-026..030`) | `src/features/gestion-estructuras/pages/OperacionesPage.tsx`<br>`src/features/gestion-estructuras/components/EstructurasTable.tsx` | **Reemplaza `MOCK_OPERACIONES`** (`gestionEstructuras.mocks.ts`). Devuelve el árbol jerárquico de la tienda (Tienda $\rightarrow$ Gerencias $\rightarrow$ Departamentos $\rightarrow$ Grupos $\rightarrow$ Secciones/Colaboradores) y bandera `isReadOnly: true` para meses cerrados (`HU-50`). |
| `GET /api/v1/structures/departments/:departmentId/groups` | `HU-28`, `HU-31` (`HU-031`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (Columna izquierda `.gm-column--groups`) | **Reemplaza `MOCK_GROUPS`** (`groupManagement.mocks.ts`). Carga la lista de grupos comerciales (`Grupo 001`, `Grupo 002`, etc.) del departamento seleccionado. |
| `POST /api/v1/structures/departments/:departmentId/groups` | `HU-28..30` (`HU-031..032`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (`handleCreateGroup`)<br>`src/features/gestion-estructuras/components/CreateGroupModal.tsx` | Se ejecuta al confirmar el modal **"Crear nuevo grupo"** (`CreateGroupModal.tsx`). Genera el grupo con autonumeración atómica `P-02` y valida unicidad de nombre (`409`). |
| `PUT /api/v1/structures/groups/:groupId` | `HU-32` (`HU-033`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (menú `⋮` `.gm-group__menu`) | Permite renombrar un grupo comercial desde el menú de opciones `⋮` del grupo. |
| `DELETE /api/v1/structures/groups/:groupId` | `HU-33`, `HU-34` (`HU-034`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (menú `⋮` `.gm-group__menu`) | Elimina lógicamente el grupo comercial, bloqueando con `409/422` si es el único grupo, tiene secciones ancla `🔒` o colaboradores activos. |
| `GET /api/v1/structures/departments/:departmentId/available-sections` | `HU-36` (`HU-035`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (Columna derecha `.gm-column--available`: `"Secciones disponibles"`) | **Reemplaza `MOCK_AVAILABLE_SECTIONS`**. Alimenta las tarjetas `.gm-section-card` del panel derecho filtradas por el formato de la tienda. |
| `POST /api/v1/structures/groups/:groupId/sections` | `HU-37` (`HU-036`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (`handleAssignSection`, botón `<PlusIcon />` en `.gm-section-card`) | Se ejecuta al hacer clic en el botón **`+`** de una sección disponible en el panel derecho para asignarla al grupo seleccionado en el panel central (`.gm-column--selected`). |
| `DELETE /api/v1/structures/groups/:groupId/sections/:sectionId` | `HU-38`, `HU-39` (`HU-037`, `HU-038`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (Columna central `.gm-selected-sections`) | Desasigna una sección virtual del grupo. Si es **Sección Ancla (`isAnchor: true`)**, bloquea con `422 ANCHOR_SECTION_IMMUTABLE` (`HU-38`). |
| `PATCH /api/v1/structures/departments/:departmentId/sections/move` | `HU-35`, `HU-39`, `HU-47` | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (icono de arrastre `⠿` `.gm-section-card__drag`) | Ejecuta el movimiento **Drag & Drop** de una sección entre grupos con control de concurrencia `If-Match`. |
| `GET /api/v1/structures/departments/:departmentId/aggregated-sections` | `HU-40` (`HU-040`) | `src/features/gestion-estructuras/components/EstructurasTable.tsx` (columna `Estructura`: `"8 secciones"`) | Devuelve el conteo y consolidación ascendente de secciones hacia departamento, gerencia y tienda. |
| `GET /api/v1/structures/calendar/operational-cutoff?period=YYYY-MM` | `HU-50`, `HU-51` (`HU-048`) | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (barra `.gm-toolbar`) | Indica si el periodo seleccionado está dentro o fuera de la fecha límite de corte operativo. |
| `POST /api/v1/structures/departments/:departmentId/publish` | `HU-42..48`, `HU-52..53` | `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` (Toast `.gm-toast` / botón Publicar) | Publica atómicamente los cambios del departamento validando secciones ancla (`422`), `If-Match` (`412`) y registrando en auditoría. |
