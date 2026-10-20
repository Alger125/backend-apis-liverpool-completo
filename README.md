# ZDeptos API - Backend Integrado (Liverpool) 1.0.0
**OAS 3.0**

## ZDeptos: Sistema de Gestión de Departamentos Comerciales
Plataforma transaccional de misión crítica que integra:
* **Feature 01 (Seguridad y Gobernanza):** Catálogo de permisos, administración de roles, matriz de impacto y asignaciones con alcance operativo (access scopes).
* **Feature 02 (Estructura Comercial y Grupos):** Selectores de geografía comercial, árbol jerárquico de 6 niveles, autonumeración atómica de grupos (P-02), protección de secciones ancla 🔒 (RN-030), Drag & Drop de secciones virtuales, corte operativo y publicación departamental.
* **Feature 03 (Reportes, Historial y Cargas Masivas):** Vistas previas dinámicas por rol y general, exportación CSV y TXT delimitado por pipes (|), consulta inmutable de auditoría (ERF §7) y validación/ejecución transaccional de cargas masivas iniciales (CU-CIN-001).

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

## 📦 Mapa Exhaustivo de APIs (Documentación Oficial Swagger OAS 3.0)

---

### [0. Sistema y Monitoreo (Health Check)]
*Sondas de disponibilidad y verificación de salud de la aplicación.*

* `GET /api/v1/health` — `HealthController_getHealth`
  * **Descripción:** Verifica el estado operativo del servicio y la conectividad activa con PostgreSQL.

---

### [Feature 01: Autenticación SSO y Gestión de Sesiones (HU-01 a HU-06)]
*Flujos de autenticación federada, prolongación de sesión y revocación.*

* `POST /api/v1/auth/sso/callback` — `AuthController_ssoCallback`
  * **Descripción:** Intercambio y validación de token SSO Corporativo Entra ID (HU-01 / HU-001 / CU-SEC-001). Valida firma RS256/JWKS y emite token de sesión con auditoría.
* `POST /api/v1/auth/session/keep-alive` — `AuthController_keepAlive`
  * **Descripción:** Renovar sesión activa y validar límite de inactividad (HU-02 / HU-002 / CU-SEC-001 FA-04). Extiende la ventana de 30 minutos.
* `POST /api/v1/auth/logout` — `AuthController_logout`
  * **Descripción:** Cierre de sesión seguro, destrucción de contexto e invalidación multi-pestaña (HU-03, HU-04, HU-06 / CU-SEC-007). Agrega `jti` a lista negra inmutable.
* `GET /api/v1/auth/session` — `AuthController_getSession`
  * **Descripción:** Consultar estado de sesión activa y sincronización multi-pestaña (HU-02, HU-06 / CU-SEC-007 FA-02).

---

### [Feature Home & Search: Identidad, Módulos por Rol y Buscador Global (HU-07 a HU-12)]
*Experiencia de bienvenida, tarjetas dinámicas de módulos y motor de búsqueda con SearchScopeEnforcer.*

* `GET /api/v1/users/me/profile` — `HomeSearchController_getMyProfile`
  * **Descripción:** Obtener identidad de bienvenida personalizada y contexto de sesión (HU-07 / HU-004 / CU-HOM-001). Retorna saludo `"Hola, [Nombre]"`, iniciales, roles y excepciones vigentes.
* `GET /api/v1/users/me/modules` — `HomeSearchController_getMyModules`
  * **Descripción:** Obtener módulos y acciones habilitados según permisos efectivos del usuario (HU-08 / HU-005 / CU-HOM-002).
* `GET /api/v1/search/departments` — `HomeSearchController_searchDepartments`
  * **Descripción:** Búsqueda global de Departamentos Comerciales y Grupos en el alcance del usuario (HU-09, HU-12 / HU-006 / CU-HOM-003).
* `GET /api/v1/search/employees` — `HomeSearchController_searchEmployees`
  * **Descripción:** Búsqueda global de Colaboradores por nombre o ID de empleado en el alcance (HU-10, HU-12 / HU-006 / CU-HOM-003).
* `GET /api/v1/search/sections` — `HomeSearchController_searchSections`
  * **Descripción:** Búsqueda global de Secciones Comerciales por código o nombre en el alcance (HU-11, HU-12 / HU-006 / CU-HOM-003).
* `GET /api/v1/search` — `HomeSearchController_searchGlobal`
  * **Descripción:** Búsqueda global unificada de estructura comercial acotada al alcance (HU-09 a HU-12 / HU-006 / CU-HOM-003) con resaltado `<mark>`.

---

### [Feature 01: Gestión de Roles y Permisos (HU-54 a HU-61)]
*Creación, edición con concurrencia optimista, clonación, matriz de impacto y baja lógica de roles.*

* `GET /api/v1/roles` — `RolesController_search`
  * **Descripción:** Consulta paginada o simple del catálogo de roles con filtros por texto y estado (`ACTIVE`, `INACTIVE`, `DELETED`).
* `POST /api/v1/roles` — `RolesController_create`
  * **Descripción:** Creación transaccional de un nuevo rol con matriz de permisos y validación de unicidad de nombre (409 Conflict).
* `GET /api/v1/roles/test-profiles/catalog` — `RolesController_getTestProfilesCatalog`
  * **Descripción:** Consultar catálogo de los 12 perfiles estándar de pruebas funcionales (HU-069 / DEC-07, DEC-08, DEC-09).
* `POST /api/v1/roles/seed-test-profiles` — `RolesController_seedTestProfiles`
  * **Descripción:** Preparar e inicializar perfiles representativos para pruebas funcionales (HU-069).
* `POST /api/v1/roles/{roleId}/clone` — `RolesController_clone`
  * **Descripción:** Crear un nuevo rol reutilizando la configuración de un rol existente (HU-009 / CU-SEC-002 FA-03).
* `GET /api/v1/roles/{roleId}/segmentation` — `RolesController_getSegmentation`
  * **Descripción:** Consultar reglas de segmentación y alcance operativo de un rol (HU-55 / HU-010).
* `PUT /api/v1/roles/{roleId}/segmentation` — `RolesController_updateSegmentation`
  * **Descripción:** Configurar reglas de segmentación organizacional y alcance de un rol (HU-55 / HU-010 / RN-054).
* `GET /api/v1/roles/{roleId}/impact` — `RolesController_impact`
  * **Descripción:** Análisis de impacto de usuarios activos afectados (`affectedUsersCount`) antes de modificar o eliminar un rol.
* `GET /api/v1/roles/{roleId}` — `RolesController_get`
  * **Descripción:** Detalle completo de un rol, versión y permisos asociados.
* `PUT /api/v1/roles/{roleId}` — `RolesController_update`
  * **Descripción:** Edición con control de concurrencia optimista (`id + version` -> 409 `ROLE_VERSION_CONFLICT`).
* `DELETE /api/v1/roles/{roleId}` — `RolesController_delete`
  * **Descripción:** Baja lógica del rol bloqueando si es un rol protegido del sistema (409).
* `GET /api/v1/permissions` — `PermissionsController_list`
  * **Descripción:** Catálogo plano de los 54 permisos granulares del sistema.
* `GET /api/v1/permissions/grouped` — `PermissionsController_grouped`
  * **Descripción:** Catálogo de permisos agrupados por categoría funcional para la matriz de permisos.

---

### [Feature 01: Asignaciones de Roles y Alcance Operativo (HU-58 a HU-61)]
*Asignaciones de roles con segmentación geográfica (tiendas/zonas) y excepciones.*

* `GET /api/v1/users` — `AccessManagementController_users`
  * **Descripción:** Lista colaboradores del sistema con sus roles y asignaciones activas.
* `GET /api/v1/users/{userId}` — `AccessManagementController_user`
  * **Descripción:** Detalle de un usuario y sus asignaciones operativas.
* `GET /api/v1/users/{userId}/effective-permissions` — `AccessManagementController_effectivePermissions`
  * **Descripción:** Calcular fusión aditiva y acumulativa de permisos y alcances vigentes de un colaborador (HU-61 / HU-018 / DEC-12).
* `GET /api/v1/users/{userId}/role-assignments` — `AccessManagementController_userAssignments`
  * **Descripción:** Roles y alcances asignados actualmente al colaborador.
* `GET /api/v1/users/{userId}/role-exceptions` — `AccessManagementController_userExceptions`
  * **Descripción:** Excepciones individuales vigentes otorgadas al usuario.
* `GET /api/v1/access-scopes` — `AccessManagementController_scopes`
  * **Descripción:** Catálogo de alcances operacionales (`GLOBAL`, `ZONE`, `STORE`, `DEPARTMENT`, `COMMERCIAL_GROUP`).
* `GET /api/v1/role-assignments` — `AccessManagementController_assignments`
  * **Descripción:** Listado general de asignaciones de roles.
* `POST /api/v1/role-assignments` — `AccessManagementController_createAssignment`
  * **Descripción:** Asignación de rol a usuario con alcances organizacionales.
* `GET /api/v1/role-assignments/{assignmentId}` — `AccessManagementController_assignment`
  * **Descripción:** Detalle de una asignación específica.
* `PUT /api/v1/role-assignments/{assignmentId}` — `AccessManagementController_updateAssignment`
  * **Descripción:** Modificar alcances o estatus de una asignación.
* `POST /api/v1/role-assignments/{assignmentId}/revoke` — `AccessManagementController_revokeAssignment`
  * **Descripción:** Revocación explícita de una asignación de rol.
* `POST /api/v1/role-assignments/impact` — `AccessManagementController_assignmentImpact`
  * **Descripción:** Evaluar impacto de una asignación en los permisos del usuario.
* `GET /api/v1/role-exceptions` — `AccessManagementController_exceptions`
  * **Descripción:** Consulta de excepciones de permisos registradas.
* `POST /api/v1/role-exceptions` — `AccessManagementController_createException`
  * **Descripción:** Asignación de excepción de permisos temporal con fecha de expiración obligatoria.
* `POST /api/v1/role-exceptions/bulk` — `AccessManagementController_bulkCreateExceptions`
  * **Descripción:** Asignar el mismo rol excepcional con vigencia a varios colaboradores en lote (HU-017 / CU-SEC-006 FA-05 / PROP-03).
* `GET /api/v1/role-exceptions/{exceptionId}` — `AccessManagementController_exception`
  * **Descripción:** Detalle de una excepción individual.
* `PUT /api/v1/role-exceptions/{exceptionId}` — `AccessManagementController_updateException`
  * **Descripción:** Actualizar vigencia o motivo de una excepción.
* `POST /api/v1/role-exceptions/{exceptionId}/revoke` — `AccessManagementController_revokeException`
  * **Descripción:** Revocar inmediatamente una excepción activa.
* `POST /api/v1/role-exceptions/impact` — `AccessManagementController_exceptionImpact`
  * **Descripción:** Evaluar el impacto de una excepción en los permisos del usuario.

---

### [Feature 02: Geografía Comercial y Filtros en Cascada (UC-004 / HU-13)]
*Catálogos de zonas comerciales y tiendas para filtros de selección.*

* `GET /api/v1/geography/zones` — `GeographyController_getZones`
  * **Descripción:** Listar Zonas Comerciales (UC-004 / HU-13).
* `GET /api/v1/geography/zones/{zoneId}/locations` — `GeographyController_getLocations`
  * **Descripción:** Listar Tiendas (Locations) por Zona (UC-004 / HU-13) clasificadas por formato Liverpool / Suburbia.

---

### [Feature 02: Estructura Comercial, Árbol y Grupos P-02 (CU-EST-001, CU-ADM-001..008 / HU-14..53)]
*Consulta de árbol jerárquico recursivo, gestión de grupos operativos y Drag & Drop de secciones.*

* `GET /api/v1/structures/tree` — `StructuresController_getTree`
  * **Descripción:** Visualizar Árbol Jerárquico Comercial Completo (CU-EST-001 / HU-14 a HU-20) con 6 niveles, mancuernas (0..2 líderes), vacantes y bandera `isReadOnly` para meses cerrados.
* `GET /api/v1/structures/locations/{locationId}/summary` — `StructuresController_getLocationSummary`
  * **Descripción:** Visualizar Resumen y Encabezado de Tienda (HU-15 / CU-ADM-001).
* `GET /api/v1/structures/departments/{departmentId}/groups` — `StructuresController_getDepartmentGroups`
  * **Descripción:** Consultar Grupos Comerciales de un Departamento (HU-20 / CU-ADM-001).
* `POST /api/v1/structures/departments/{departmentId}/groups` — `StructuresController_createGroup`
  * **Descripción:** Crear Grupo Comercial Operativo (CU-ADM-002 / P-02 / HU-21, HU-22) con autonumeración atómica concurrente `SELECT FOR UPDATE` y unicidad de nombre (409).
* `GET /api/v1/structures/departments/{departmentId}/aggregated-sections` — `StructuresController_getAggregatedSections`
  * **Descripción:** Consultar Secciones Agregadas del Departamento (ERF 4.1 / CU-EST-001).
* `GET /api/v1/structures/departments/{departmentId}/available-sections` — `StructuresController_getAvailableSections`
  * **Descripción:** Consultar Catálogo de Secciones Disponibles (HU-27, HU-28 / CU-ADM-004) por formato de tienda.
* `PUT /api/v1/structures/groups/{groupId}` — `StructuresController_updateGroupName`
  * **Descripción:** Renombrar Grupo Comercial (CU-ADM-002 / HU-23).
* `DELETE /api/v1/structures/groups/{groupId}` — `StructuresController_deleteGroup`
  * **Descripción:** Inactivar / Eliminar Grupo Comercial Elegible (CU-ADM-003 / HU-24, HU-25, HU-26) bloqueando si es único o contiene anclas/colaboradores.
* `PATCH /api/v1/structures/departments/{departmentId}/sections/move` — `StructuresController_moveSection`
  * **Descripción:** Reubicar Sección Virtual entre Grupos / Drag & Drop (CU-ADM-004 / HU-32 a HU-37) con control de concurrencia `If-Match`.
* `POST /api/v1/structures/groups/{groupId}/sections` — `StructuresController_assignSection`
  * **Descripción:** Asignar Sección Disponible a Grupo Comercial (HU-29, HU-30 / CU-ADM-004) con unicidad por tienda.
* `DELETE /api/v1/structures/groups/{groupId}/sections/{sectionId}` — `StructuresController_unassignSection`
  * **Descripción:** Desasignar Sección de Grupo Comercial (HU-34, HU-37 / CU-ADM-004). Bloquea con 422 si es Sección Ancla 🔒.
* `GET /api/v1/structures/calendar/operational-cutoff` — `StructuresController_getOperationalCutoff`
  * **Descripción:** Consultar Corte Operativo y Calendario de Planificación (HU-52 / CU-ADM-005).
* `POST /api/v1/structures/departments/{departmentId}/publish` — `StructuresController_publishDepartment`
  * **Descripción:** Publicar y Confirmar Estructura Departamental (HU-48 / CU-ADM-005) con validación de anclas huérfanas (422) e `If-Match` (412).

---

### [Estructuras Compras, PAC, Suburbia 70051507 y Sincronización EC (HU-020..023, HU-19, HU-41, HU-44, HU-45)]
*Estructuras corporativas sin grupos en Compras, PAC sin funciones no comerciales, nodo Suburbia 70051507 y contrato P-01 de EC.*

* `GET /api/v1/structures/config/base-departments` — `StructuresComprasPacController_getBaseDepartmentsConfig`
  * **Descripción:** Consultar Configuración de Departamentos Base para Compras y PAC (HU-022 / DEC-15).
* `PUT /api/v1/structures/config/base-departments` — `StructuresComprasPacController_updateBaseDepartmentsConfig`
  * **Descripción:** Actualizar Configuración de Departamentos Base para Compras y PAC (HU-022 / DEC-15).
* `GET /api/v1/structures/compras-pac/tree` — `StructuresComprasPacController_getComprasPacTree`
  * **Descripción:** Navegar Estructura de Compras (Hardline/Softline) sin grupos (DEC-01) y PAC con Exclusión No Comercial (HU-020, HU-021, HU-023).
* `GET /api/v1/structures/suburbia-advisors` — `StructuresComprasPacController_getSuburbiaAdvisors`
  * **Descripción:** Consultar Nodo Intermedio Suburbia 70051507 - Asesor Especializado Experiencia Cliente (HU-19 / DEC-16).
* `GET /api/v1/structures/collaborators/{employeeId}/managed-sections` — `StructuresComprasPacController_getCollaboratorManagedSections`
  * **Descripción:** Consultar Secciones que Administra un Colaborador (Sección Ancla + Secciones Heredadas del Grupo) (HU-41).
* `POST /api/v1/structures/integrations/ec/events` — `StructuresComprasPacController_processEcInboundEvent`
  * **Descripción:** Procesar Evento Entrante de Employee Central (Altas, Bajas, Transferencias, Cambios de Líder y Ancla) (HU-45).
* `POST /api/v1/structures/integrations/ec/sync-managed-sections` — `StructuresComprasPacController_syncManagedSectionsToEc`
  * **Descripción:** Sincronizar 'Secciones que administra' hacia Employee Central bajo contrato P-01 (HU-44).
* `GET /api/v1/structures/integrations/ec/outbox` — `StructuresComprasPacController_getEcOutbox`
  * **Descripción:** Consultar Bandeja de Salida (Outbox P-01) hacia Employee Central (HU-44).

---

### [Planificación Futura, Cambios Programados y Calendario de Corte (HU-48/49, HU-049 a HU-052)]
*Derivación Copy-on-Write, ciclo de vida de cambios programados y activación de periodos.*

* `PUT /api/v1/structures/calendar/operational-cutoff` — `StructuresPlanningController_configureOperationalCutoff`
  * **Descripción:** Configurar Calendario Operativo de Corte y Ventana de Edición / Bloqueo (HU-052 / ERF §7).
* `POST /api/v1/structures/departments/{departmentId}/future-draft/init` — `StructuresPlanningController_initFutureDraft`
  * **Descripción:** Derivar / Clonar Estructura Futura (Copy-on-Write mes + 1) desde Periodo Vigente (HU-48 / HU-49 / HU-047).
* `GET /api/v1/structures/scheduled-changes` — `StructuresPlanningController_listScheduledChanges`
  * **Descripción:** Listar Cambios Estructurales Programados para Periodos Futuros (HU-049).
* `POST /api/v1/structures/scheduled-changes` — `StructuresPlanningController_createScheduledChange`
  * **Descripción:** Programar Cambio Estructural para Periodo Futuro (HU-049).
* `PUT /api/v1/structures/scheduled-changes/{changeId}` — `StructuresPlanningController_updateScheduledChange`
  * **Descripción:** Editar Cambio Programado Antes de su Fecha de Vigencia (HU-049 / CU-ADM-006 A5).
* `POST /api/v1/structures/scheduled-changes/{changeId}/cancel` — `StructuresPlanningController_cancelScheduledChange`
  * **Descripción:** Cancelar Cambio Programado Antes de su Entrada en Vigor con Bitácora (HU-050 / CU-ADM-006 A6).
* `POST /api/v1/structures/periods/{periodCode}/activate` — `StructuresPlanningController_activatePlannedPeriod`
  * **Descripción:** Activar Planificación Publicada del Periodo en su Fecha de Vigencia y Archivar Snapshot Anterior (HU-051).

---

### [Feature 03: Reportes Dinámicos y Exportación CSV / TXT (CU-EST-002, CU-EST-003 / HU-62..67)]
*Vistas previas por rol y general, modelos de compensación y exportación CSV / TXT.*

* `GET /api/v1/reports/metadata/columns` — `ReportsController_getMetadataColumns`
  * **Descripción:** Catálogo de Columnas y Metadatos de Reportes (HU-65 / HU-057) en 3 categorías (`estructura`, `puestosPersonas`, `relaciones`), excluyendo campos sensibles si carece de permiso.
* `GET /api/v1/reports/metadata/filter-options` — `ReportsController_getAuthorizedFilterOptions`
  * **Descripción:** Opciones de Filtros Acotadas al Alcance del Usuario (CU-EST-002 / FA-01).
* `GET /api/v1/reports/role-based` — `ReportsController_getRoleBasedReport`
  * **Descripción:** Generar Vista Previa de Reporte por Rol (CU-EST-002 / HU-63 / HU-055) con validación de fechas (FE-02), alcance (CA-09), autoselección (FA-01), proyección dinámica y fotografías históricas sin sustitución silenciosa (FE-05).
* `GET /api/v1/reports/general` — `ReportsController_getGeneralReport`
  * **Descripción:** Generar Vista Previa de Reporte General (CU-EST-003 / HU-64 / HU-056) exigiendo permiso `REPORTS_GLOBAL_VIEW`.
* `GET /api/v1/reports/compensations` — `ReportsController_getCompensationsReport`
  * **Descripción:** Reportes Especializados para Modelos de Compensaciones y Productividad (HU-67 / HU-061..063) en 6 variantes (`JEFES_CON_SECCION`, `GERENTES`, `JEFES`, `PRODUCTIVIDAD_10_COL`, `PRODUCTIVIDAD_FILA`, `OPERACIONES_ZDEPTOS`).
* `GET /api/v1/reports/export/csv` — `ReportsController_exportCsv`
  * **Descripción:** Exportación de Reporte en formato CSV (CU-EST-002, CU-EST-003 / HU-66 / HU-058 / DEC-10) con BOM UTF-8 y preservación de ceros para SAP (`="00123"`).
* `GET /api/v1/reports/export/txt` — `ReportsController_exportTxt`
  * **Descripción:** Exportación de Reporte en formato TXT delimitado por Pipes (HU-66 / HU-059 / DEC-10 / PROP-04).

---

### [Feature 03: Historial y Bitácora de Auditoría (CU-HIS-001 / HU-68)]
*Bitácora inmutable de movimientos con filtros por fecha, acción, usuario y tienda.*

* `GET /api/v1/audit/logs` — `AuditController_getAuditLogs`
  * **Descripción:** Consultar y filtrar historial de movimientos de auditoría (CU-HIS-001 / HU-68 / HU-065) con los 9 campos obligatorios del ERF §7.
* `GET /api/v1/audit/logs/{eventId}` — `AuditController_getAuditLogById`
  * **Descripción:** Consultar detalle de un movimiento de auditoría (HU-066) con diff JSON `beforeValue` y `afterValue`.

---

### [Feature 03: Cargas Masivas Iniciales y Layout (CU-CIN-001 / HU-69)]
*Plantilla oficial y procesamiento transaccional de cargas iniciales con dryRun.*

* `GET /api/v1/admin/batch-import/layout` — `BatchImportController_getLayout`
  * **Descripción:** Descargar especificación y plantilla de layout vigente (CU-CIN-001 / HU-068).
* `POST /api/v1/admin/batch-import` — `BatchImportController_executeBatchImport`
  * **Descripción:** Validar y ejecutar carga masiva inicial de grupos y secciones (HU-69 / HU-067, HU-068) con modo prueba (`dryRun=true`) y ejecución transaccional ACID (`dryRun=false`).

---

## 🛡️ Calidad, Pruebas y Seguridad

* **Pruebas Automatizadas Jest:** 14 suites de prueba pasando al 100% (**75 tests unitarios en verde**).
* **Compilación TypeScript Estricta:** `npm run typecheck` (`tsc --noEmit`) con 0 errores.
* **Seguridad y Control de Acceso:** Guards `ApiKeyGuard`, `PermissionsGuard`, `RequirePermissions` y `SearchScopeEnforcer`.
* **Cumplimiento Gitleaks:** Cero secretos o credenciales expuestas en el repositorio.
