# backend-apis-liverpool-completo

# ZDeptos API Unificada — Liverpool (Backend Integrado)
**Plataforma de Misión Crítica para Estructuras Organizacionales, Seguridad, Auditoría, Planificación y Reportes**

Sistema backend de misión crítica desarrollado en **NestJS 11 + TypeORM + PostgreSQL (`zdeptos`)**, con arquitectura modular limpia, validación exhaustiva de contratos (DTOs con `class-validator` y `class-transformer`), seguridad por roles y tramos de control (`SearchScopeEnforcer`), control de concurrencia optimista (`If-Match` / `version`), bitácora inmutable de auditoría y soporte para exportaciones de alto volumen.

---

## 🚀 Inicio Rápido

```bash
# 1. Configurar variables de entorno (usar .env.example como base)
cp .env.example .env

# 2. Instalar dependencias
npm install

# 3. Validar tipos TypeScript y ejecutar pruebas unitarias
npm run typecheck
npm test -- --runInBand

# 4. Compilar proyecto
npm run build

# 5. Iniciar servidor en modo desarrollo
npm run start:dev
```

* **Swagger UI Interactivo:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
* **Health Check Oficial:** `GET http://localhost:3000/api/v1/health`
* **Header de Autenticación de Desarrollo:** `x-dev-api-key: dev-api-key-zdeptos-2026`
* **Prefijo Global de APIs:** `/api/v1`

---

## 🏛️ Arquitectura de Features y Esquemas de Base de Datos

| Feature | Dominio Funcional | Módulos NestJS | Esquemas PostgreSQL |
| :--- | :--- | :--- | :--- |
| **Feature 01** | Autenticación SSO, Sesión, Roles, Permisos y Excepciones | `AuthModule`, `HomeSearchModule`, `RolesModule`, `AccessManagementModule` | `zd_security`, `zd_audit` |
| **Feature 02** | Geografía, Estructura Comercial (6 niveles), Grupos P-02, Secciones Ancla y Drag & Drop | `GeographyModule`, `StructuresModule` | `zd_core`, `zd_ref`, `zd_plan` |
| **Feature 02-B** | Estructuras Corporativas (Compras / PAC), Suburbia y Sincronización Employee Central | `StructuresModule` (compras-pac, integrations/ec) | `zd_core`, `zd_ref`, `zd_integration` |
| **Feature 02-C** | Planeación de Mes Futuro (Copy-on-Write), Cambios Programados y Corte Operativo | `StructuresModule` (planning, future-draft, calendar) | `zd_plan`, `zd_core`, `zd_audit` |
| **Feature 03** | Reportes Dinámicos por Rol/General, Modelos de Compensaciones y Exportación CSV/TXT | `ReportsModule` | `zd_reporting`, `zd_core`, `zd_plan` |
| **Feature 03-B** | Bitácora Inmutable de Auditoría (ERF §7) con visor Before/After | `AuditModule` | `zd_audit` |
| **Feature 03-C** | Carga Masiva Transaccional (CU-CIN-001) con modo prueba (dryRun) | `BatchImportModule` | `zd_core`, `zd_audit` |

---

## 📦 Catálogo Completo de APIs (Explicación por Endpoint y Feature)

---

### 1. Feature 01 — Autenticación SSO, Sesión y Bienvenida

#### `POST /api/v1/auth/sso/token`
* **Feature / Historia:** Feature 01 | `HU-01`, `HU-02`, `HU-04` (`HU-001`, `HU-002`)
* **Propósito:** Intercambio seguro del `idToken` emitido por Microsoft Entra ID. Valida la firma criptográfica RS256 contra las JWKS oficiales de Microsoft, extrae los claims del colaborador, inicializa la sesión en base de datos (`zd_security.session_registry`) y registra el evento de auditoría `AUTH_LOGIN_SUCCESS`.
* **Payload:** `{ "idToken": "eyJhbGciOiJSUzI1NiIsIn..." }`
* **Respuesta Exitosa (200 OK):** Token de sesión JWT propio de ZDeptos con identificador único de sesión (`jti`), tiempo de expiración y perfil básico del usuario.

#### `POST /api/v1/auth/session/keep-alive`
* **Feature / Historia:** Feature 01 | `HU-02` (`HU-002`)
* **Propósito:** Ventana deslizante de inactividad (30 minutos). Permite al frontend renovar la vigencia del token activo mientras el usuario realiza actividades en la plataforma, evitando cierres de sesión intempestivos durante la edición de estructuras o captura de roles.
* **Respuesta Exitosa (200 OK):** `{ "refreshed": true, "expiresInSeconds": 1800 }`.

#### `GET /api/v1/auth/session/status`
* **Feature / Historia:** Feature 01 | `HU-02`, `HU-06` (`HU-003`)
* **Propósito:** Verificación de vigencia y sincronización multi-pestaña. Valida si el `jti` de la sesión actual ha sido revocado en lista negra (`zd_security.revoked_token`) debido a un logout realizado en otra pestaña del navegador o por un administrador.
* **Respuesta Exitosa (200 OK):** `{ "active": true, "sessionAgeSeconds": 450 }`.

#### `POST /api/v1/auth/logout`
* **Feature / Historia:** Feature 01 | `HU-03`, `HU-04`, `HU-06` (`HU-003`)
* **Propósito:** Cierre explícito de sesión. Agrega el `jti` del token a la tabla inmutable de lista negra con TTL, marca la sesión como cerrada e inserta el registro `AUTH_LOGOUT` en `zd_audit.audit_event`.
* **Respuesta Exitosa (200 OK):** `{ "message": "Sesión finalizada exitosamente." }`.

---

### 2. Feature 01 — Inicio, Perfil y Buscador Global Predictivo

#### `GET /api/v1/me/profile`
* **Feature / Historia:** Feature 01 | `HU-07` (`HU-004`)
* **Propósito:** Obtiene el perfil de bienvenida personalizado (`"Hola, [Nombre]"`), las iniciales para el avatar, la lista de roles activos, excepciones vigentes y el resumen de tramo de control organizacional asignado.
* **Respuesta Exitosa (200 OK):** Objeto con `userId`, `greeting`, `avatarInitials`, `roles`, `activeExceptions` y `effectiveScope`.

#### `GET /api/v1/me/modules`
* **Feature / Historia:** Feature 01 | `HU-08` (`HU-005`)
* **Propósito:** Retorna las tarjetas de módulos del sistema (`Estructuras`, `Roles y Permisos`, `Reportes`, `Auditoría`), indicando para cada una si está habilitada (`enabled: true/false`), la ruta en el frontend y el motivo de deshabilitación si carece de permisos.
* **Respuesta Exitosa (200 OK):** Arreglo de módulos con permisos requeridos y estado habilitado.

#### `GET /api/v1/search`
* **Feature / Historia:** Feature 01 | `HU-09` a `HU-12` (`HU-006` / `RN-006`)
* **Propósito:** Búsqueda predictiva global unificada (departamentos, colaboradores y secciones). Aplica obligatoriamente el servicio `SearchScopeEnforcer` para asegurar que el usuario jamás visualice nodos fuera de su tramo de control (`ZONE`, `STORE`, `DEPT`, `GROUP`) y retorna fragmentos de texto resaltados con etiquetas `<mark>`.
* **Query Params:** `query` (mínimo 2 caracteres), `limit`.

#### `GET /api/v1/search/departments`
* **Feature / Historia:** Feature 01 | `HU-09`, `HU-12` (`HU-006`)
* **Propósito:** Búsqueda específica de departamentos y grupos comerciales dentro del alcance del usuario, con rutas de navegación listas para el frontend.

#### `GET /api/v1/search/collaborators`
* **Feature / Historia:** Feature 01 | `HU-10`, `HU-12` (`HU-006`)
* **Propósito:** Búsqueda predictiva de colaboradores por nombre, puesto o número de empleado (`EMP-XXXX`), verificando pertenencia al tramo de control.

#### `GET /api/v1/search/sections`
* **Feature / Historia:** Feature 01 | `HU-11`, `HU-12` (`HU-006`)
* **Propósito:** Búsqueda de secciones de catálogo (asignadas y disponibles), indicando código SAP, nombre, estatus de ancla (`isAnchor: true/false`) y departamento asignado.

---

### 3. Feature 01 — Roles, Permisos, Asignaciones y Excepciones

#### `GET /api/v1/roles`
* **Feature / Historia:** Feature 01 | `HU-54` (`HU-007`)
* **Propósito:** Consulta paginada o lista completa del catálogo de roles del sistema, con soporte de filtros por texto (`search`), estado (`status: ACTIVE, INACTIVE, DELETED`) y ordenamiento multi-columna.
* **Respuesta (200 OK):** `{ items: RoleDto[], total: number, page: number, limit: number }`.

#### `POST /api/v1/roles`
* **Feature / Historia:** Feature 01 | `HU-54` (`HU-008`)
* **Propósito:** Creación de un nuevo rol con matriz de permisos transaccional. Valida unicidad del nombre (`409 ROLE_NAME_ALREADY_EXISTS`) y existencia de códigos de permiso en el catálogo.

#### `GET /api/v1/roles/:roleId`
* **Feature / Historia:** Feature 01 | `HU-54` (`HU-007`)
* **Propósito:** Obtiene el detalle completo del rol especificado, incluyendo su versión actual, estado, atributos de segmentación y todos los permisos asignados.

#### `PUT /api/v1/roles/:roleId`
* **Feature / Historia:** Feature 01 | `HU-56` (`HU-011`)
* **Propósito:** Edición de rol con control estricto de concurrencia optimista (`id + version`). Si otro administrador modificó el rol previamente, rechaza con código HTTP `409 Conflict` (`ROLE_VERSION_CONFLICT`), previniendo sobreescrituras silenciosas.

#### `DELETE /api/v1/roles/:roleId`
* **Feature / Historia:** Feature 01 | `HU-57` (`HU-012`)
* **Propósito:** Baja lógica de un rol (`status = DELETED`). Bloquea con `409 PROTECTED_ROLE` si el rol es protegido (sistema), y revoca automáticamente las asignaciones activas asociadas.

#### `GET /api/v1/roles/:roleId/impact`
* **Feature / Historia:** Feature 01 | `HU-57` (`HU-012`)
* **Propósito:** Análisis de impacto previo a la modificación o eliminación de un rol. Retorna la cantidad exacta de colaboradores activos afectados (`affectedUsersCount`) y los módulos impactados.

#### `POST /api/v1/roles/:roleId/clone`
* **Feature / Historia:** Feature 01 | `HU-009`
* **Propósito:** Clona un rol existente duplicando su matriz de permisos y reglas de segmentación hacia un nuevo código y nombre, facilitando la creación de roles derivados.

#### `PUT /api/v1/roles/:roleId/segmentation`
* **Feature / Historia:** Feature 01 | `HU-55` (`HU-010`)
* **Propósito:** Configura los atributos de segmentación automática del rol (Ubicaciones `locationCodes`, Departamentos `departmentCodes`, Puestos `jobFunctionCodes`) para el Paso 2 del formulario de roles en el frontend.

#### `POST /api/v1/roles/seed-test-profiles`
* **Feature / Historia:** Feature 01 | `HU-069`
* **Propósito:** Semilla idempotente que inicializa en base de datos los 12 roles base oficiales de Liverpool y Suburbia (Administrador, Gestor de Estructura, Director Comercial, Gerente de Tienda, Jefe de Departamento, etc.).

#### `GET /api/v1/permissions`
* **Feature / Historia:** Feature 01 | `HU-54`
* **Propósito:** Catálogo plano de los 54 permisos granulares del sistema ZDeptos con clave, descripción y módulo asociado.

#### `GET /api/v1/permissions/grouped`
* **Feature / Historia:** Feature 01 | `HU-54`
* **Propósito:** Catálogo de permisos agrupados por categoría funcional (`Estructura`, `Seguridad`, `Reportes`, `Auditoría`), listo para renderizar la matriz de permisos (`PermissionMatrix.tsx`) en el frontend.

#### `GET /api/v1/access-scopes`
* **Feature / Historia:** Feature 01 | `HU-58` (`HU-013`)
* **Propósito:** Catálogo de alcances operacionales (`GLOBAL`, `ZONE`, `STORE`, `DEPARTMENT`, `COMMERCIAL_GROUP`) para asignaciones de roles.

#### `POST /api/v1/role-assignments`
* **Feature / Historia:** Feature 01 | `HU-58` (`HU-014` a `HU-016`)
* **Propósito:** Asigna un rol a un colaborador vinculándolo a uno o varios alcances operacionales específicos, delimitando las tiendas o departamentos que podrá consultar o gestionar.

#### `POST /api/v1/role-exceptions`
* **Feature / Historia:** Feature 01 | `HU-59`, `HU-60` (`HU-017`)
* **Propósito:** Otorga permisos aditivos temporales por excepción individual a un colaborador, con fecha de expiración obligatoria (`expiresAt`) y motivo justificado.

#### `POST /api/v1/role-exceptions/bulk`
* **Feature / Historia:** Feature 01 | `HU-017`
* **Propósito:** Asignación o revocación masiva de excepciones de permisos a múltiples colaboradores en una sola transacción ACID.

#### `GET /api/v1/users/:personId/effective-permissions`
* **Feature / Historia:** Feature 01 | `HU-61` (`HU-018`)
* **Propósito:** Calcula y retorna la unión aditiva real de permisos del usuario (`Permisos de Roles Base ∪ Excepciones Vigentes`), garantizando el principio de gobernanza sin reglas `DENY`.

---

### 4. Feature 02 — Geografía y Estructuras Comerciales (Operaciones / Tiendas)

#### `GET /api/v1/geography/zones`
* **Feature / Historia:** Feature 02 | `HU-13`, `HU-14` (`HU-024`)
* **Propósito:** Lista las zonas geográficas operativas (ej. `Zona 1 Centro`, `Zona 2 Norte`, `Zona 3 Occidente`) para los filtros en cascada de la pantalla de Operaciones.

#### `GET /api/v1/geography/zones/:zoneId/locations`
* **Feature / Historia:** Feature 02 | `HU-13`, `HU-15` (`HU-024`)
* **Propósito:** Lista los almacenes/tiendas correspondientes a la zona seleccionada, clasificadas por formato comercial (`LIVERPOOL` o `SUBURBIA`).

#### `GET /api/v1/structures/locations/:locationId/summary`
* **Feature / Historia:** Feature 02 | `HU-22` (`HU-025`)
* **Propósito:** Encabezado con totales consolidados de la tienda seleccionada: nombre oficial, formato, dirección, total de gerencias, total de departamentos comerciales y grupos activos.

#### `GET /api/v1/structures/tree`
* **Feature / Historia:** Feature 02 | `HU-16` a `HU-27`, `HU-50` (`HU-026` a `HU-030`, `HU-048`)
* **Propósito:** Árbol jerárquico completo de 6 niveles (`Tienda -> Subdirección -> Gerencia -> Departamento -> Grupo -> Secciones/Colaboradores`). Incluye soporte para mancuernas (0..2 líderes titulares), detección de vacantes y bandera `isReadOnly: true` si se consulta un mes histórico o cerrado.
* **Query Params:** `locationId` (obligatorio), `period` (`YYYY-MM`).

#### `GET /api/v1/structures/departments/:departmentId/groups`
* **Feature / Historia:** Feature 02 | `HU-28`, `HU-31` (`HU-031`)
* **Propósito:** Lista los grupos comerciales (`Grupo 001`, `Grupo 002`, etc.) administrados dentro del departamento comercial para alimentar la columna izquierda de `DepartmentGroupsPage.tsx`.

#### `POST /api/v1/structures/departments/:departmentId/groups`
* **Feature / Historia:** Feature 02 | `HU-28` a `HU-30` (`HU-031`, `HU-032`)
* **Propósito:** Creación de un nuevo grupo comercial en el departamento. Aplica autonumeración atómica concurrente (`SELECT FOR UPDATE` con formato `Grupo 00X` según regla `P-02`) y valida que no exista un grupo activo con el mismo nombre (`409 Conflict`).

#### `PUT /api/v1/structures/groups/:groupId`
* **Feature / Historia:** Feature 02 | `HU-32` (`HU-033`)
* **Propósito:** Renombra un grupo comercial existente verificando la unicidad del nombre dentro del departamento.

#### `DELETE /api/v1/structures/groups/:groupId`
* **Feature / Historia:** Feature 02 | `HU-33`, `HU-34` (`HU-034`)
* **Propósito:** Baja lógica de un grupo comercial. Bloquea la operación (`400` / `409`) si es el único grupo del departamento, si contiene secciones ancla activas o colaboradores asignados.

#### `GET /api/v1/structures/departments/:departmentId/available-sections`
* **Feature / Historia:** Feature 02 | `HU-36` (`HU-035`)
* **Propósito:** Catálogo de secciones disponibles no asignadas pertenecientes al departamento, filtradas según el formato de la tienda (Liverpool o Suburbia) para la columna derecha de drag & drop.

#### `POST /api/v1/structures/groups/:groupId/sections`
* **Feature / Historia:** Feature 02 | `HU-37` (`HU-036`)
* **Propósito:** Asigna una sección del catálogo disponible a un grupo comercial del departamento, garantizando unicidad (una sección no puede pertenecer a dos grupos en la misma tienda).

#### `DELETE /api/v1/structures/groups/:groupId/sections/:sectionId`
* **Feature / Historia:** Feature 02 | `HU-38`, `HU-39` (`HU-037`, `HU-038`)
* **Propósito:** Desasigna una sección de un grupo comercial devolviéndola al catálogo disponible. **Protección Crítica:** Si la sección es una **Sección Ancla (`isAnchor: true`)**, el sistema bloquea con código HTTP `422 Unprocessable Entity` (`ANCHOR_SECTION_IMMUTABLE`).

#### `PATCH /api/v1/structures/departments/:departmentId/sections/move`
* **Feature / Historia:** Feature 02 | `HU-35`, `HU-39`, `HU-47` (`HU-039`, `HU-042`)
* **Propósito:** Operación de **Drag & Drop** para reasignar una sección entre grupos dentro del mismo departamento, con validación de cabecera de control de concurrencia `If-Match`.

#### `GET /api/v1/structures/departments/:departmentId/aggregated-sections`
* **Feature / Historia:** Feature 02 | `HU-40` (`HU-040`)
* **Propósito:** Cálculo y consolidación sumatoria ascendente de secciones desde los grupos comerciales hacia el departamento, gerencia y tienda.

#### `GET /api/v1/structures/calendar/operational-cutoff`
* **Feature / Historia:** Feature 02 | `HU-50`, `HU-51` (`HU-048`)
* **Propósito:** Consulta el calendario operativo de corte mensual (`zd_plan.operational_cutoff_calendar`). Informa si el periodo se encuentra dentro de la ventana de edición permitida o si ha entrado en bloqueo operativo.

#### `POST /api/v1/structures/departments/:departmentId/publish`
* **Feature / Historia:** Feature 02 | `HU-42` a `HU-48`, `HU-52`, `HU-53` (`HU-041` a `HU-043`)
* **Propósito:** Publicación atómica de la estructura del departamento. Valida que no existan secciones ancla huérfanas (`422`), verifica la versión contra `If-Match` (`412 Precondition Failed` si otro usuario publicó simultáneamente) y persiste el evento en auditoría.

---

### 5. Feature 02-B — Estructuras Corporativas (Compras / PAC), Suburbia y Employee Central

#### `GET /api/v1/structures/config/base-departments`
* **Feature / Historia:** Feature 02-B | `HU-020` (`DEC-15`)
* **Propósito:** Consulta los departamentos raíz base configurados dinámicamente para las estructuras corporativas de `COMPRAS` o `PAC`.

#### `PUT /api/v1/structures/config/base-departments`
* **Feature / Historia:** Feature 02-B | `HU-020` (`DEC-15`)
* **Propósito:** Actualiza la lista de departamentos base corporativos sin necesidad de modificar código fuente o desplegar el backend.

#### `GET /api/v1/structures/compras-pac/tree`
* **Feature / Historia:** Feature 02-B | `HU-021`, `HU-022`, `HU-023`
* **Propósito:** Árbol jerárquico corporativo con dos variantes de negocio clave:
  * Si `domain=COMPRAS`: Navegación sin nivel de grupos (`Dirección -> Gerencia -> Departamento -> Sección`, regla `DEC-01`).
  * Si `domain=PAC`: Navegación de la estructura PAC con exclusión automática de colaboradores con funciones no comerciales (`HU-023`).

#### `GET /api/v1/structures/locations/:locationId/suburbia-advisors`
* **Feature / Historia:** Feature 02-B | `HU-19` (`HU-028`)
* **Propósito:** En tiendas de formato Suburbia, agrupa automáticamente a los colaboradores con puesto de Asesor (`jobCode = 70051507`) bajo el nodo intermedio **"Asesores Suburbia"** (`DEC-16`).

#### `GET /api/v1/structures/collaborators/:personId/managed-sections`
* **Feature / Historia:** Feature 02-B | `HU-41` (`HU-029`)
* **Propósito:** Consulta la lista de secciones comerciales asignadas o gestionadas directamente por un colaborador específico.

#### `PUT /api/v1/structures/collaborators/:personId/managed-sections`
* **Feature / Historia:** Feature 02-B | `HU-41` (`HU-029`)
* **Propósito:** Actualiza las secciones gestionadas directamente por un colaborador en estructuras corporativas.

#### `POST /api/v1/structures/integrations/ec/events`
* **Feature / Historia:** Feature 02-B | `HU-44` (`HU-045`)
* **Propósito:** Webhook / API entrante para eventos de SAP SuccessFactors Employee Central (altas, bajas, transferencias y cambios de puesto) para mantener actualizados los puestos y titulares en ZDeptos.

#### `POST /api/v1/structures/integrations/ec/sync-managed-sections`
* **Feature / Historia:** Feature 02-B | `HU-45` (`HU-044`)
* **Propósito:** Encola en la tabla Outbox `P-01` la sincronización de secciones gestionadas para ser notificadas a Employee Central.

#### `GET /api/v1/structures/integrations/ec/outbox`
* **Feature / Historia:** Feature 02-B | `HU-45` (`HU-044`)
* **Propósito:** Monitoreo y consulta de eventos salientes hacia Employee Central (`PENDING`, `SENT`, `FAILED`).

#### `POST /api/v1/structures/integrations/ec/outbox/:outboxId/ack`
* **Feature / Historia:** Feature 02-B | `HU-45` (`HU-044`)
* **Propósito:** Confirmación (ACK) de recepción exitosa de un evento de integración por parte de SAP SuccessFactors.

---

### 6. Feature 02-C — Planeación, Ciclo de Vida y Cambios Programados

#### `POST /api/v1/structures/future-draft/init`
* **Feature / Historia:** Feature 02-C | `HU-48 / HU-49` (`HU-047`)
* **Propósito:** Inicialización mediante técnica *Copy-on-Write* de la estructura del mes siguiente (`mes + 1`). Clona la estructura vigente para que los planificadores puedan trabajar en cambios a futuro sin impactar la operación diaria en curso.

#### `GET /api/v1/structures/scheduled-changes`
* **Feature / Historia:** Feature 02-C | `HU-049`, `HU-050`
* **Propósito:** Consulta los cambios estructurales programados para entrar en vigor en un periodo futuro (`PENDING`, `APPLIED`, `CANCELLED`).

#### `POST /api/v1/structures/scheduled-changes`
* **Feature / Historia:** Feature 02-C | `HU-48 / HU-49` (`HU-047`)
* **Propósito:** Registra un cambio programado (creación de grupo, reasignación de sección, nuevo líder) con vigencia programada para el inicio del siguiente periodo mensual.

#### `PUT /api/v1/structures/scheduled-changes/:changeId`
* **Feature / Historia:** Feature 02-C | `HU-049`
* **Propósito:** Edita los datos o vigencia de un cambio programado mientras su estatus permanezca en `PENDING` (antes de que entre en vigor).

#### `POST /api/v1/structures/scheduled-changes/:changeId/cancel`
* **Feature / Historia:** Feature 02-C | `HU-050`
* **Propósito:** Cancela formalmente un cambio programado (`PENDING -> CANCELLED`) antes de su fecha de activación, registrando la cancelación en la bitácora de auditoría.

#### `POST /api/v1/structures/periods/:periodCode/activate`
* **Feature / Historia:** Feature 02-C | `HU-051`
* **Propósito:** Proceso mensual de activación de periodo. Archiva el periodo vigente en una fotografía histórica inmutable (`zd_reporting.structure_snapshot`, marcándolo `isReadOnly: true`) y activa todos los cambios programados del nuevo periodo.

#### `PUT /api/v1/structures/calendar/operational-cutoff`
* **Feature / Historia:** Feature 02-C | `HU-052`
* **Propósito:** Configuración de la ventana de corte operativo (`windowStartUtc` y `cutoffAtUtc`) para controlar las fechas en que las tiendas pueden registrar cambios cada mes.

---

### 7. Feature 03 — Reportes Dinámicos, Modelos de Compensación y Exportaciones (CU-EST-002, CU-EST-003)

#### `GET /api/v1/reports/metadata/columns`
* **Feature / Historia:** Feature 03 | `HU-62` (`HU-057` / `CU-EST-002`)
* **Propósito:** Retorna el catálogo oficial de columnas seleccionables organizadas en las 3 categorías funcionales (`estructura`, `puestosPersonas` y `relaciones`). Excluye automáticamente las columnas sensibles (`sensitive: true`, ej. `employeeId`) si el usuario carece del permiso `REPORTS_SENSITIVE_VIEW`.

#### `GET /api/v1/reports/metadata/filter-options`
* **Feature / Historia:** Feature 03 | `CU-EST-002` (Regla "Opciones acotadas" y `FA-01`)
* **Propósito:** Devuelve exclusivamente los valores autorizados para los selectores de pantalla (Ubicación, Gerencia, Departamento, Grupo, Sección, Puesto, Función y Centro) según el tramo de control del usuario, e informa si se autoseleccionó una única ubicación autorizada (`autoSelectedSingleLocation: true`, `FA-01`).

#### `GET /api/v1/reports/role-based`
* **Feature / Historia:** Feature 03 | `HU-63`, `HU-64` (`HU-055`, `HU-058` / `CU-EST-002`)
* **Propósito:** Genera la vista previa paginada del reporte por rol. Aplica la intersección estricta de filtros (fechas, alcance, permisos y columnas seleccionadas), autoselección de única ubicación (`FA-01`), recorte de datos parciales por alcance (`FA-05`), rechazo de fechas invertidas (`400`, `FE-02`), rechazo de nodos fuera de alcance (`403`, `CA-09`), bloqueo si no selecciona ningún dato (`400`, `CA-10`) y consulta de fotografías históricas de hasta 5 años sin sustitución silenciosa (`FE-05`). Si no hay datos, retorna el mensaje oficial: `"No se encontraron datos para los filtros seleccionados."` (`FE-03`).

#### `GET /api/v1/reports/general`
* **Feature / Historia:** Feature 03 | `HU-65` (`HU-056` / `CU-EST-003`)
* **Propósito:** Consulta consolidada sobre todo el universo organizacional autorizado. Exige de forma estricta el permiso `REPORTS_GLOBAL_VIEW` (`403 Forbidden` si carece de él).

#### `GET /api/v1/reports/compensations`
* **Feature / Historia:** Feature 03 | `HU-67` (`HU-061` a `HU-063`)
* **Propósito:** Genera reportes especializados para interfaces de nómina, productividad y comisiones según las 6 variantes oficiales de Liverpool:
  1. `JEFES_CON_SECCION`
  2. `GERENTES`
  3. `JEFES`
  4. `PRODUCTIVIDAD_10_COL`
  5. `PRODUCTIVIDAD_FILA`
  6. `OPERACIONES_ZDEPTOS`

#### `GET /api/v1/reports/export/csv`
* **Feature / Historia:** Feature 03 | `HU-66` (`HU-058` / `DEC-10` / `CU-EST-002`)
* **Propósito:** Descarga el reporte en formato CSV delimitado por comas (`text/csv; charset=utf-8` con BOM UTF-8 para compatibilidad directa con Microsoft Excel). Preserva ceros a la izquierda para códigos SAP (`="00123"`), garantiza consistencia total con los filtros de la vista previa y registra la descarga en auditoría. Exige permiso `REPORTS_EXPORT` o `REPORTS_DOWNLOAD_CSV` (`CA-08`).

#### `GET /api/v1/reports/export/txt`
* **Feature / Historia:** Feature 03 | `HU-66` (`HU-059` / `DEC-10` / `CU-EST-002`)
* **Propósito:** Descarga el reporte en archivo plano delimitado por barras verticales (`|`) compatible con interfaces legadas de SAP HCM y nómina. Registra la exportación en la bitácora inmutable de auditoría.

---

### 8. Feature 03-B — Historial y Auditoría Inmutable (ERF §7)

#### `GET /api/v1/audit/logs`
* **Feature / Historia:** Feature 03-B | `HU-68` (`HU-064`, `HU-065`)
* **Propósito:** Consulta paginada de la bitácora inmutable de auditoría con los 9 campos obligatorios del ERF §7 (`actorType`, `userId`, `technicalPrincipal`, `eventCategory`, `action`, `entityType`, `entityId`, `correlationId`, `result`). Soporta filtros por rango de fechas, tienda, acción, usuario y categoría.

#### `GET /api/v1/audit/logs/:eventId`
* **Feature / Historia:** Feature 03-B | `HU-68` (`HU-066`)
* **Propósito:** Detalle exhaustivo del evento de auditoría para visores de cambios (modal de `<HistoryIcon />` en frontend), mostrando el estado previo (`beforeValue`) y el nuevo (`afterValue`) en formato JSON diff estructurado.

---

### 9. Feature 03-C — Cargas Masivas Iniciales (CU-CIN-001)

#### `GET /api/v1/admin/batch-import/layout`
* **Feature / Historia:** Feature 03-C | `HU-69` (`HU-062`)
* **Propósito:** Diccionario de campos oficiales requeridos para la carga inicial y descarga directa de la plantilla oficial en formato CSV o TXT delimitado por pipes (`?format=CSV` o `?format=TXT`).

#### `POST /api/v1/admin/batch-import`
* **Feature / Historia:** Feature 03-C | `HU-69` (`HU-063`, `HU-067`)
* **Propósito:** Carga masiva transaccional de estructuras y asignaciones comerciales:
  * Si `dryRun=true`: Modo prueba que ejecuta todas las validaciones sintácticas, de catálogo y de negocio (regla `RN-010`) retornando el desglose de errores por fila y columna sin modificar la base de datos.
  * Si `dryRun=false`: Ejecuta la carga en una sola transacción ACID todo-o-nada y genera el registro en la bitácora de auditoría.

---

### 10. Monitoreo y Salud del Sistema

#### `GET /api/v1/health`
* **Propósito:** Health check operativo para orquestadores Kubernetes / balanceadores de carga. Valida conectividad activa con PostgreSQL y el estado general de los servicios del backend.

---

## 🛡️ Calidad, Pruebas y Seguridad

* **Pruebas Automatizadas Jest:** 14 suites de prueba pasando al 100% (**75 tests unitarios en verde**).
* **Compilación TypeScript Estricta:** `npm run typecheck` (`tsc --noEmit`) sin advertencias ni tipos `any` inseguros.
* **Seguridad y Control de Acceso:** Guards `ApiKeyGuard`, `PermissionsGuard`, `RequirePermissions` y `SearchScopeEnforcer`.
* **Cumplimiento Gitleaks:** Cero secretos, tokens o credenciales expuestas en el repositorio.
