# Módulo: Access Management
**Vertical:** `Feature 01: Roles, Permisos y Segmentación Operativa`  
**Casos de Uso:** `CU-SEG-001` (Segmentación por Alcance), `CU-EXC-001` (Excepciones de Permisos)  
**Historias de Usuario:** `HU-58` a `HU-61` (Técnico) / `HU-013` a `HU-018` (Funcional)  
**Dominio:** Catálogo Dominio 9 (Seguridad y Gobernanza)

---

## Propósito del Módulo
Administra la asignación de roles a usuarios vinculados a un **alcance organizacional / tramo de control** (Nivel Cadena, Formato, Zona o Tienda/Almacén), así como las excepciones granulares otorgadas o revocadas temporalmente por usuario.

## Endpoints Expuestos
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users` | `USER_VIEW` | Directorio de usuarios del sistema con paginación. |
| `GET` | `/api/v1/users/:userId` | `USER_VIEW` | Detalle de un usuario específico. |
| `GET` | `/api/v1/users/:userId/role-assignments` | `ROLE_ASSIGNMENT_VIEW` | Consulta de asignaciones de roles activas e inactivas de un usuario. |
| `POST` | `/api/v1/users/:userId/role-assignments` | `ROLE_ASSIGNMENT_MANAGE` | Asignación de rol a un usuario especificando alcance geográfico (ej. `STORE:LOC-001` o `ZONE:ZON-002`). |
| `PUT` | `/api/v1/users/:userId/role-assignments/:assignmentId` | `ROLE_ASSIGNMENT_MANAGE` | Actualización de fechas de vigencia o alcance de asignación. |
| `POST` | `/api/v1/users/:userId/role-assignments/:assignmentId/revoke` | `ROLE_ASSIGNMENT_MANAGE` | Revocación inmediata de asignación de rol. |
| `GET` | `/api/v1/users/:userId/permission-exceptions` | `PERMISSION_EXCEPTION_VIEW` | Consulta de excepciones de permisos directas del usuario. |
| `POST` | `/api/v1/users/:userId/permission-exceptions` | `PERMISSION_EXCEPTION_MANAGE` | Otorgamiento o denegación excepcional de permiso (`GRANT` / `DENY`). |
| `GET` | `/api/v1/users/:userId/effective-permissions` | `USER_VIEW` | **Permisos Efectivos:** Calcula la suma de roles + tramo de control + excepciones directas. |
