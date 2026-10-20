# Módulo: Permissions
**Vertical:** `Feature 01: Roles, Permisos y Segmentación Operativa`  
**Casos de Uso:** `CU-ROL-001`, `CU-ROL-002`  
**Historias de Usuario:** `HU-54`, `HU-55` (Técnico) / `HU-007`, `HU-008` (Funcional)  
**Dominio:** Catálogo Dominio 9 (Seguridad y Gobernanza)

---

## Propósito del Módulo
Define la entidad institucional de permisos (`PermissionEntity`) que cataloga todas las acciones atómicas del sistema ZDeptos organizadas por módulos (Roles, Estructuras, Geografía, Reportes, Auditoría, Cargas Masivas).

## Entidades Principales
- `PermissionEntity`: Representa la tabla `permission` con código único (ej. `ROLE_VIEW`, `STRUCTURES_PUBLISH`, `REPORTS_EXPORT`, `AUDIT_VIEW`), nombre, descripción y módulo asociado.
