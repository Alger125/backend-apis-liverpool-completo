# Información de Rama: `feature/roles-segmentation-and-exceptions`

- **Nombre de la rama:** `feature/roles-segmentation-and-exceptions`
- **Carpeta simulada:** `feature__roles-segmentation-and-exceptions`
- **Rama base:** `main` (`backendZDeptos-integrado`)
- **Estado:** Terminada

---

## 1. Historias de Usuario Implementadas

| ID Matriz / Original | ID Homologado | Título | Implementación Backend |
| :--- | :--- | :--- | :--- |
| **HU-009** | **HU-009** | Clonar rol existente | `POST /api/v1/roles/:roleId/clone`: crea un nuevo rol copiando los permisos del rol origen con validación de nombre único y registro en bitácora (`ROLE_CLONED`). |
| **HU-55** | **HU-010** | Segmentación de Roles por Ubicación / Puesto / Unidad Organizativa / Departamento | `GET /api/v1/roles/:roleId/segmentation` y `PUT /api/v1/roles/:roleId/segmentation`: administra reglas de segmentación por dimensiones (`LOCATION`, `JOB_POSITION`, `ORG_UNIT`, `DEPARTMENT`) para asignación automática de roles. |
| **HU-017** | **HU-017** | Alta masiva (bulk) de excepciones de rol | `POST /api/v1/role-exceptions/bulk`: permite procesar lotes de hasta 200 excepciones de rol en una sola petición, devolviendo resumen de creadas (`createdCount`), omitidas (`skippedCount`) y detalle por fila (`results[]`) con auditoría. |
| **HU-61** | **HU-018** | Cálculo de permisos efectivos con excepciones aditivas (sin DENY) | `GET /api/v1/users/:userId/effective-permissions`: calcula la unión aditiva entre los permisos de los roles base (`baseRoles`) y los roles otorgados por excepciones vigentes (`activeExceptionRoles`), garantizando que las excepciones nunca resten permisos (`additiveOnly: true`, `denySupported: false`). |
| **HU-069** | **HU-069** | Catálogo y Seed de 12 perfiles de prueba base | `GET /api/v1/roles/test-profiles/catalog` y `POST /api/v1/roles/seed-test-profiles`: expone el catálogo de los 12 perfiles tipo del Anexo 8.2 (incluyendo `ROLE_CONSULTA_COMPRAS_ADMIN`, `ROLE_CONSULTA_UNIFICADA`, `ROLE_ADMIN_TIENDA`, `ROLE_APOYO_ALMACEN`, etc.) y permite sembrarlos de forma idempotente. |

---

## 2. Changelog Simulado de Commits (Conventional Commits)

```text
feat(HU-009): add POST /api/v1/roles/:roleId/clone to duplicate role permissions and audit ROLE_CLONED
feat(HU-010): add GET and PUT /api/v1/roles/:roleId/segmentation for automatic role assignment rules (HU-55)
feat(HU-017): add POST /api/v1/role-exceptions/bulk for batch role exception creation with per-item results
feat(HU-018): add GET /api/v1/users/:userId/effective-permissions with strictly additive union and no DENY (HU-61)
feat(HU-069): add GET /api/v1/roles/test-profiles/catalog and POST /api/v1/roles/seed-test-profiles for 12 base profiles
test(roles-exceptions): add unit tests for role cloning, segmentation, 12 base profiles seed, bulk exceptions, and effective permissions
```

---

## 3. Archivos Creados o Modificados

| Ruta del Archivo | Acción | Descripción Corta |
| :--- | :--- | :--- |
| `src/modules/roles/presentation/dto/roles.dto.ts` | Modificado | Agrega `CloneRoleRequest`, `SegmentationRuleItemDto` y `UpdateRoleSegmentationRequest` con validaciones `class-validator`. |
| `src/modules/roles/application/roles.service.ts` | Modificado | Implementa `cloneRole`, `getSegmentation`, `updateSegmentation`, `getTestProfilesCatalog` y `seedTestProfiles` con catálogo de 12 perfiles base (`HU-069`). |
| `src/modules/roles/presentation/roles.controller.ts` | Modificado | Expone los endpoints `POST /roles/:roleId/clone`, `GET/PUT /roles/:roleId/segmentation`, `GET /roles/test-profiles/catalog` y `POST /roles/seed-test-profiles`. |
| `src/modules/roles/tests/roles.controller.spec.ts` | Modificado | Pruebas unitarias de `HU-009`, `HU-55` (`HU-010`) y `HU-069`. |
| `src/modules/access-management/dto.ts` | Modificado | Agrega `BulkCreateExceptionDto` (`ArrayMaxSize(200)`, `ValidateNested`) para alta masiva de excepciones (`HU-017`). |
| `src/modules/access-management/access-management.repository.ts` | Modificado | Implementa `bulkCreateExceptions` (`HU-017`) y `effectivePermissions` con unión aditiva sin `DENY` (`HU-61` / `HU-018`). |
| `src/modules/access-management/access-management.controller.ts` | Modificado | Expone `POST /api/v1/role-exceptions/bulk` y `GET /api/v1/users/:userId/effective-permissions`. |
| `src/modules/access-management/dto.spec.ts` | Modificado | Pruebas unitarias de validación y cálculo de `bulkCreateExceptions` y `effectivePermissions`. |

---

## 4. Endpoints Nuevos

| Método | Ruta | Permiso / Autenticación | Historia | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/roles/:roleId/clone` | `roles:create` | HU-009 | Clona un rol existente copiando sus permisos hacia un nuevo rol. |
| `GET` | `/api/v1/roles/:roleId/segmentation` | `roles:read` | HU-55 (HU-010) | Consulta las reglas de segmentación automática configuradas para un rol. |
| `PUT` | `/api/v1/roles/:roleId/segmentation` | `roles:Edit` | HU-55 (HU-010) | Actualiza las reglas de segmentación por Ubicación, Puesto, Unidad Organizativa y Departamento. |
| `GET` | `/api/v1/roles/test-profiles/catalog` | `roles:read` | HU-069 | Devuelve la definición de los 12 perfiles base del Anexo 8.2. |
| `POST` | `/api/v1/roles/seed-test-profiles` | `roles:create` | HU-069 | Siembra de forma idempotente los 12 roles base en el catálogo activo. |
| `POST` | `/api/v1/role-exceptions/bulk` | `access_exceptions:manage` | HU-017 | Crea excepciones de rol de forma masiva con reporte detallado de creadas y omitidas. |
| `GET` | `/api/v1/users/:userId/effective-permissions` | `access_exceptions:read` | HU-61 (HU-018) | Devuelve los permisos efectivos combinando roles base + excepciones activas (unión aditiva sin `DENY`). |

---

## 5. Posibles Conflictos de Merge

Ningún archivo modificado en esta rama (`src/modules/roles/*` y `src/modules/access-management/*`) entra en conflicto directo con las demás ramas (`feature/auth-sso-session`, `feature/home-and-global-search`, `feature/structures-compras-pac-and-ec-sync`, `feature/planning-schedule-lifecycle`).

---

## 6. Pendientes o Supuestos

- **Persistencia de Reglas de Segmentación:** Las reglas de segmentación (`HU-55`) se almacenan en memoria dentro de `RolesService` siguiendo el patrón actual de `roles` en `backendZDeptos-integrado`, listas para persistirse en tabla relacional `role_segmentation_rules` cuando se conecte Prisma/PostgreSQL.
- **Unión Aditiva Estricta (`HU-61`):** Se garantiza por contrato (`additiveOnly: true`, `denySupported: false`) que las excepciones de rol únicamente agregan permisos temporales o permanentes sin bloquear ni restar permisos del rol base.
