# ZDeptos API — Rama `feature/roles-and-permissions`

- **Carpeta de rama:** `feature__roles-and-permissions`
- **Rama Git destino:** `feature/roles-and-permissions` (alias: `feature/roles`)
- **Rama base:** `main` (`backendZDeptos-integrado`)
- **Alcance de la rama:** Catálogo de permisos, administración integral de roles, edición con concurrencia optimista atómica (`id + version` -> 409 `ROLE_VERSION_CONFLICT`), análisis de impacto de usuarios afectados y baja lógica con revocación automática (**HU-54, HU-56, HU-57** / **HU-007, HU-008, HU-011, HU-012**).

---

## 📂 Mapa de Carpetas y Trazabilidad por Historia de Usuario (HU)

```text
feature__roles-and-permissions/
├── src/
│   ├── modules/
│   │   ├── roles/                             <-- [PROPIO DE ESTA RAMA] HU-54, HU-56, HU-57 (HU-007, HU-008, HU-011, HU-012)
│   │   │   ├── application/                   <-- HU-54, HU-56, HU-57 (Lógica transaccional de roles y concurrencia optimista)
│   │   │   ├── domain/                        <-- HU-54, HU-56, HU-57 (Entidad RoleEntity, RoleStatus, errores de dominio)
│   │   │   ├── presentation/                  <-- HU-54, HU-56, HU-57 (Controlador /api/v1/roles/* y DTOs validados)
│   │   │   │   └── dto/                       <-- DTOs CreateRoleRequest, UpdateRoleRequest, SearchRolesQuery
│   │   │   └── tests/                         <-- Pruebas unitarias de roles y reglas de concurrencia
│   │   ├── permissions/                       <-- [PROPIO DE ESTA RAMA] HU-54 (HU-007: Catálogo de permisos)
│   │   │   ├── domain/                        <-- Entidad PermissionEntity (código, nombre, asignable, módulo)
│   │   │   └── permissions.module.ts          <-- Endpoints GET /api/v1/permissions y /grouped
│   │   └── audit/                             <-- [SOPORTE AUDITORÍA] Trazabilidad de creación, edición y baja
│   ├── health/                                <-- Monitoreo técnico GET /api/v1/health
│   ├── shared/                                <-- Guards de seguridad (ApiKeyGuard, PermissionsGuard)
│   └── common/auth/                           <-- Decoradores de autorización (@RequirePermissions, @Public)
├── openapi/                                   <-- Contrato OpenAPI roles.yaml
├── BRANCH.md                                  <-- Especificación técnica de la rama
└── DELIVERY.md                                <-- Notas de entrega y verificación de calidad
```

---

## 📋 Detalle de Endpoints y Trazabilidad

### 1. Gestión de Roles (`/api/v1/roles`)
* **`GET /api/v1/roles`** (`HU-56` / `HU-008`): Consulta paginada o simple del catálogo de roles comerciales con filtros por texto (`search`) y estado (`status: ACTIVE | INACTIVE | DELETED`).
* **`POST /api/v1/roles`** (`HU-54` / `HU-007`): Creación transaccional de un rol con su matriz de permisos asignables. Valida unicidad de nombre y código normalizado (409 Conflict si ya existe).
* **`GET /api/v1/roles/:roleId`** (`HU-56` / `HU-008`): Consulta detallada de la configuración del rol y los permisos activos vinculados.
* **`PUT /api/v1/roles/:roleId`** (`HU-56` / `HU-011`): Modificación de datos y permisos con control estricto de concurrencia optimista. Requiere enviar el campo `version` actual; si la versión en base de datos difiere, aborta la transacción y responde `409 Conflict` (`ROLE_VERSION_CONFLICT`).
* **`DELETE /api/v1/roles/:roleId`** (`HU-57` / `HU-012`): Baja lógica del rol (`status = DELETED`), impidiendo la eliminación física y revocando automáticamente en cascada todas las asignaciones y excepciones activas de los usuarios vinculados.
* **`GET /api/v1/roles/:roleId/impact`** (`HU-57` / `HU-012`): Análisis de impacto en tiempo real que reporta usuarios con asignación directa (`activeAssignments`) y excepciones vigentes (`activeExceptions`).

### 2. Catálogo de Permisos (`/api/v1/permissions`)
* **`GET /api/v1/permissions`** (`HU-54` / `HU-007`): Lista plana de permisos institucionales del sistema para armado de matrices.
* **`GET /api/v1/permissions/grouped`** (`HU-54` / `HU-007`): Catálogo estructurado y agrupado jerárquicamente por módulo funcional.

### 3. Monitoreo del Sistema (`/api/v1/health`)
* **`GET /api/v1/health`**: Verificación técnica de salud operativa y conectividad con la base de datos PostgreSQL.

---

## 🚀 Verificación y Pruebas

```bash
# Instalar dependencias
npm install

# Validar tipos TypeScript
npm run typecheck

# Ejecutar pruebas unitarias
npm test -- --runInBand

# Compilar proyecto
npm run build
```
