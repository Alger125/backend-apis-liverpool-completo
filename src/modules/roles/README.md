# Módulo: Roles
**Vertical:** `Feature 01: Roles, Permisos y Segmentación Operativa`  
**Casos de Uso:** `CU-ROL-001`, `CU-ROL-002`, `CU-ROL-003`, `CU-ROL-004`, `CU-ROL-005`  
**Historias de Usuario:** `HU-54` a `HU-57` (Técnico) / `HU-007` a `HU-012` (Funcional)  
**Dominio:** Catálogo Dominio 9 (Seguridad y Gobernanza)

---

## Propósito del Módulo
Administra el ciclo de vida de los roles operativos institucionales dentro de ZDeptos, garantizando control estricto de accesos, prevención de pérdidas de datos por sobreescritura concurrente y cálculo de impacto organizacional previo a modificaciones.

## Endpoints Expuestos
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/roles` | `ROLE_VIEW` | Búsqueda y listado paginado de roles con filtros por estado y texto. |
| `POST` | `/api/v1/roles` | `ROLE_CREATE` | Creación de nuevos roles con catálogo de permisos asociado. |
| `GET` | `/api/v1/roles/:roleId` | `ROLE_VIEW` | Consulta detallada de un rol específico y sus permisos. |
| `PUT` | `/api/v1/roles/:roleId` | `ROLE_UPDATE` | Edición atómica con **Concurrencia Optimista** (`version`). Retorna `409 Conflict` si la versión es obsoleta. |
| `DELETE` | `/api/v1/roles/:roleId` | `ROLE_DELETE` | Baja lógica de rol (cambio de estado a `INACTIVE`) con validación de asignaciones activas. |
| `GET` | `/api/v1/roles/:roleId/impact` | `ROLE_VIEW` | **Matriz de Impacto:** Determina cuántos usuarios y asignaciones se verían afectados por un cambio de permisos. |
| `POST` | `/api/v1/roles/:roleId/clone` | `ROLE_CREATE` | Clonación rápida de rol existente como plantilla base. |

## Reglas de Negocio Clave
- **Concurrencia Optimista:** Incremento atómico en SQL de `version = version + 1` condicionado a `WHERE id = :id AND version = :expectedVersion`.
- **Baja Lógica Inviolable:** Prohibido el borrado físico (`DELETE CASCADE`) para preservar integridad histórica referencial.
- **Auditoría:** Cada mutación registra un evento en la tabla `zd_audit.audit_event`.
