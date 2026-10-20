# Información de Rama: `feature/roles-and-permissions`

- **Nombre de la rama:** `feature/roles-and-permissions`
- **Carpeta simulada:** `feature__roles-and-permissions`
- **Rama base:** `main` (`backendZDeptos-integrado`)
- **Dominio funcional:** Feature 01 — Gestión Integral de Roles, Permisos, Concurrencia Optimista y Análisis de Impacto
- **Estado:** Terminada

---

## 1. Historias de Usuario Implementadas

| ID Técnico | ID Documental | Caso de Uso / Regla | Título | Implementación Backend |
| :--- | :--- | :--- | :--- | :--- |
| **HU-54** | **HU-007** | `CU-SEC-002` / `RN-050` | Catálogo de Permisos y Creación de Rol | `GET /api/v1/permissions` y `GET /api/v1/permissions/grouped`: consulta de permisos institucionales planos y agrupados por módulo. `POST /api/v1/roles`: creación transaccional de rol con validación de código único y permisos asignables. |
| **HU-56** | **HU-008** | `CU-SEC-002 FA-01` | Consulta y Paginación de Roles | `GET /api/v1/roles` y `GET /api/v1/roles/:roleId`: búsqueda avanzada con filtros de texto, estado (`ACTIVE`, `INACTIVE`, `DELETED`), ordenamiento dinámico y paginación con conteo total. |
| **HU-56** | **HU-011** | `CU-SEC-002 FA-02` / `RN-051` | Edición de Rol con Concurrencia Optimista Atómica | `PUT /api/v1/roles/:roleId`: edición atómica que condiciona el `UPDATE` por `id + version`. Si la versión enviada no coincide, responde inmediatamente `409 Conflict` con código `ROLE_VERSION_CONFLICT`. |
| **HU-57** | **HU-012** | `CU-SEC-002 FA-04` / `RN-053` | Baja Lógica de Rol y Revocación de Asignaciones | `DELETE /api/v1/roles/:roleId`: baja lógica del rol con revocación automática en cascada de asignaciones y excepciones activas (`zd_security.user_role_assignment`, `zd_security.user_role_exception`). |
| **HU-57** | **HU-012** | `CU-SEC-002 FA-04` | Análisis de Impacto de Rol | `GET /api/v1/roles/:roleId/impact`: cálculo en tiempo real de usuarios y asignaciones afectadas antes de ejecutar modificaciones críticas o bajas de rol. |

---

## 2. Changelog Simulado de Commits (Conventional Commits)

```text
feat(HU-54): implementar catalogo de permisos simple y agrupado por modulo (GET /api/v1/permissions, /grouped)
feat(HU-54): implementar creacion transaccional de roles con matriz de permisos (POST /api/v1/roles)
feat(HU-56): implementar busqueda paginada y consulta de detalle de roles (GET /api/v1/roles, /:roleId)
feat(HU-56): implementar concurrencia optimista atomica con condicion id+version y 409 ROLE_VERSION_CONFLICT (PUT /api/v1/roles/:roleId)
feat(HU-57): implementar analisis de impacto de usuarios afectados (GET /api/v1/roles/:roleId/impact)
feat(HU-57): implementar baja logica de roles y revocacion automatica de asignaciones (DELETE /api/v1/roles/:roleId)
test(roles): agregar suites de pruebas unitarias para RolesController, RolesService, RoleRules y PermissionsGuard
```

---

## 3. Archivos Creados o Modificados

| Ruta del Archivo | Acción | Descripción Corta |
| :--- | :--- | :--- |
| `src/modules/roles/domain/role.entity.ts` | Creado | Entidad TypeORM para tabla `zd_security.role` con control de versión numérico (`version`), estado y auditoría. |
| `src/modules/roles/domain/role.errors.ts` | Creado | Errores de dominio tipados: `RoleNotFoundError`, `RoleVersionConflictError`, `RoleProtectedError`, `RoleDeletedError`. |
| `src/modules/roles/presentation/dto/roles.dto.ts` | Creado | DTOs de validación con `class-validator` y Swagger OAS 3.0: `CreateRoleRequest`, `UpdateRoleRequest`, `DeleteRoleRequest`, `SearchRolesQuery`. |
| `src/modules/roles/presentation/roles.controller.ts` | Creado | Controlador REST con guards `@RequirePermissions('ROLE_VIEW')`, `@RequirePermissions('ROLE_CREATE')`, etc. |
| `src/modules/roles/application/roles.service.ts` | Creado | Servicio de aplicación con transacciones atómicas de TypeORM, concurrencia optimista y cálculo de impacto. |
| `src/modules/roles/tests/roles.controller.spec.ts` | Creado | Pruebas unitarias de endpoints, concurrencia y validaciones de negocio. |
| `src/modules/permissions/domain/permission.entity.ts` | Creado | Entidad TypeORM para catálogo de permisos institucionales `zd_security.permission`. |
| `src/modules/permissions/permissions.module.ts` | Creado | Módulo NestJS que expone controladores y servicios de permisos. |
| `src/health/health.controller.ts` | Creado | Endpoint técnico de disponibilidad `GET /api/v1/health`. |
| `src/shared/security/security.ts` | Creado | Guards de autenticación (`ApiKeyGuard`) y control de acceso basado en permisos (`PermissionsGuard`). |

---

## 4. Endpoints Operativos

| Método | Ruta | Historia | Descripción |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/v1/roles` | HU-56 / HU-008 | Búsqueda y paginación de roles comerciales. |
| `POST` | `/api/v1/roles` | HU-54 / HU-007 | Alta de rol con matriz transaccional de permisos. |
| `GET` | `/api/v1/roles/:roleId` | HU-56 / HU-008 | Detalle de rol y lista de permisos asociados. |
| `PUT` | `/api/v1/roles/:roleId` | HU-56 / HU-011 | Edición con concurrencia optimista atómica (`id + version` -> 409). |
| `DELETE` | `/api/v1/roles/:roleId` | HU-57 / HU-012 | Baja lógica y revocación automática de asignaciones activas. |
| `GET` | `/api/v1/roles/:roleId/impact` | HU-57 / HU-012 | Cálculo de impacto en usuarios antes de aplicar cambios. |
| `GET` | `/api/v1/permissions` | HU-54 / HU-007 | Catálogo plano de permisos disponibles. |
| `GET` | `/api/v1/permissions/grouped` | HU-54 / HU-007 | Catálogo de permisos agrupados por módulo funcional. |
| `GET` | `/api/v1/health` | Monitoreo | Verificación de estado de salud del servicio y base de datos. |
