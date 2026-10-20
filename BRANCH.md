# Información de Rama: `feature/geography-and-store-structures`

- **Nombre de la rama:** `feature/geography-and-store-structures`
- **Carpeta simulada:** `feature__geography-and-store-structures`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Estado:** Terminada

---

## 1. Historias de Usuario Implementadas

| ID Original | ID Homologado | Título | Implementación Backend |
| :--- | :--- | :--- | :--- |
| **HU-13** | **HU-068 / HU-070** | Geografía comercial y filtros en cascada (Zonas y Tiendas) | `GET /api/v1/geography/zones` y `GET /api/v1/geography/zones/:zoneId/locations`: catálogos geográficos y tiendas por formato (Liverpool / Suburbia). |
| **HU-14 a HU-18** | **HU-024 a HU-027** | Visualización del Árbol Jerárquico Comercial de 6 niveles y encabezado de tienda | `GET /api/v1/structures/tree` y `GET /api/v1/structures/locations/:locationId/summary`: jerarquía recursiva CTE de 6 niveles, mancuernas (`leaders[]`), vacantes y bandera `isReadOnly`. |
| **HU-20 a HU-26** | **HU-030 a HU-035** | Gestión de Grupos Comerciales Operativos (`P-02`) | `GET/POST /api/v1/structures/departments/:departmentId/groups`, `PUT /api/v1/structures/groups/:groupId` y `DELETE /api/v1/structures/groups/:groupId`: autonumeración atómica (`Grupo 001`..`Grupo N`), unicidad de nombre y bloqueo de baja si es el único grupo o contiene secciones ancla/colaboradores. |
| **HU-27 a HU-40** | **HU-036 a HU-043** | Secciones Disponibles, Agregadas, Secciones Ancla (`🔒`) y Reubicación Drag & Drop | `GET /available-sections`, `GET /aggregated-sections`, `POST /groups/:groupId/sections`, `DELETE /groups/:groupId/sections/:sectionId` y `PATCH /departments/:departmentId/sections/move`: protección estricta `422 Unprocessable Entity` sobre secciones `ANCHOR` (`RN-030`). |
| **HU-48, HU-52, HU-53** | **HU-046, HU-048, HU-053, HU-054** | Corte Operativo, Publicación Departamental y Concurrencia Optimista (`If-Match`) | `GET /api/v1/structures/calendar/operational-cutoff` y `POST /api/v1/structures/departments/:departmentId/publish`: validación de anclas huérfanas (`422`), control optimista `If-Match` (`409 DEPARTMENT_VERSION_CONFLICT`) y auditoría `STRUCTURE_CHANGE`. |

---

## 2. Changelog Simulado de Commits (Conventional Commits)

```text
feat(HU-13): add GeographyModule with GET /api/v1/geography/zones and /zones/:zoneId/locations
feat(HU-14): add GET /api/v1/structures/tree and /locations/:locationId/summary for 6-level store hierarchy
feat(HU-21): add commercial groups CRUD with atomic P-02 sequence numbering and deletion guards
feat(HU-32): add available/aggregated sections, assign/unassign, and drag-and-drop move with anchor protection (RN-030)
feat(HU-48): add operational cutoff query and atomic department publication with If-Match optimistic locking (HU-53)
test(structures): add unit tests for GeographyController and StructuresController
```

---

## 3. Archivos Creados o Modificados

| Ruta del Archivo | Acción | Descripción Corta |
| :--- | :--- | :--- |
| `src/app.module.ts` | Modificado | Registra `GeographyModule` y `StructuresModule` sobre la base `main`. |
| `src/modules/geography/*` | Creado | Controlador, servicio, DTOs y pruebas de filtros geográficos en cascada (`HU-13`). |
| `src/modules/structures/*` | Creado | Controlador, servicio, entidades TypeORM, DTOs y pruebas de árbol de 6 niveles, grupos `P-02` y secciones (`HU-14..53`). |

---

## 4. Endpoints Nuevos (15 Operaciones)

- `GET /api/v1/geography/zones`
- `GET /api/v1/geography/zones/:zoneId/locations`
- `GET /api/v1/structures/tree`
- `GET /api/v1/structures/locations/:locationId/summary`
- `GET /api/v1/structures/departments/:departmentId/groups`
- `POST /api/v1/structures/departments/:departmentId/groups`
- `PUT /api/v1/structures/groups/:groupId`
- `DELETE /api/v1/structures/groups/:groupId`
- `GET /api/v1/structures/departments/:departmentId/aggregated-sections`
- `GET /api/v1/structures/departments/:departmentId/available-sections`
- `POST /api/v1/structures/groups/:groupId/sections`
- `DELETE /api/v1/structures/groups/:groupId/sections/:sectionId`
- `PATCH /api/v1/structures/departments/:departmentId/sections/move`
- `GET /api/v1/structures/calendar/operational-cutoff`
- `POST /api/v1/structures/departments/:departmentId/publish`

---

## 5. Posibles Conflictos de Merge

- **`src/app.module.ts`**: Al integrar las ramas en `main`, se deben conservar los `imports` de cada módulo.
- **`src/modules/structures/*`**: Las ramas `feature/structures-compras-pac-and-ec-sync` y `feature/planning-schedule-lifecycle` agregan sus propios endpoints bajo `/api/v1/structures`; al hacer merge a `main` se deben combinar los métodos de `StructuresController` y `StructuresService`.
