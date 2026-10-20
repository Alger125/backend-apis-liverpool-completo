# Especificación de Rama — `feature/home-and-global-search`

- **Nombre de la rama:** `feature/home-and-global-search`
- **Carpeta simulada:** `/ramas/feature__home-and-global-search`
- **Rama base:** `main` (`backendZDeptos-integrado`)
- **Dominio funcional:** 2. HomePage, Bienvenida Personalizada, Módulos Dinámicos y Búsqueda Global Acotada

---

## 1. Historias de Usuario Implementadas

| ID Técnico | ID Documental | Caso de Uso / Regla | Título | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **HU-07** | **HU-004** | `CU-HOM-001` / `RN-042` | Bienvenida Personalizada y Contexto de Usuario (`GET /api/v1/users/me/profile`) | Terminada |
| **HU-08** | **HU-005** | `CU-HOM-002` / `RN-043`, `RN-055`, `RN-060` | Renderizado Dinámico de Módulos según Rol (`GET /api/v1/users/me/modules`) | Terminada |
| **HU-09** | **HU-006** | `CU-HOM-003` / `RN-046` | Búsqueda Global de Departamentos Comerciales y Grupos (`GET /api/v1/search/departments`) | Terminada |
| **HU-10** | **HU-006** | `CU-HOM-003` / `RN-046` | Búsqueda Global de Colaboradores por Nombre o ID de Empleado (`GET /api/v1/search/employees`) | Terminada |
| **HU-11** | **HU-006** | `CU-HOM-003` / `RN-046` | Búsqueda Global de Secciones Comerciales por Código o Nombre (`GET /api/v1/search/sections`) | Terminada |
| **HU-12** | **HU-006** | `CU-HOM-003` (`FA-04`, `FA-06`, `FE-01`, `FE-03`, `FE-05`) | Delimitación Estricta de Resultados por Alcance (`SearchScopeEnforcer` + `GET /api/v1/search`) | Terminada |

---

## 2. Changelog Simulado de Commits

```text
feat(HU-07): implementar endpoint GET /api/v1/users/me/profile con saludo personalizado, iniciales, roles activos y excepciones vigentes
feat(HU-08): implementar endpoint GET /api/v1/users/me/modules filtrando modulos y acciones CRUD segun permisos efectivos
feat(HU-12): crear SearchScopeEnforcer para resolver alcance efectivo (roles base + excepciones vigentes) y validar consultas de busqueda
feat(HU-09): implementar endpoint GET /api/v1/search/departments con busqueda insensible a acentos y enlace a reportes segun permiso
feat(HU-10): implementar endpoint GET /api/v1/search/employees por numero de empleado o nombre acotado al tramo de control
feat(HU-11): implementar endpoint GET /api/v1/search/sections con estado de asignacion (ASIGNADA / DISPONIBLE) y bandera isAnchor
feat(HU-09,HU-10,HU-11,HU-12): agregar endpoint unificado GET /api/v1/search y registrar HomeSearchModule en AppModule
test(home-search): agregar suite unitaria completa para HomeSearchController, HomeSearchService y SearchScopeEnforcer
```

---

## 3. Archivos Creados o Modificados

| Ruta del Archivo | Acción | Descripción Corta |
| :--- | :--- | :--- |
| `src/modules/home-search/home-search.module.ts` | **Creado** | Módulo NestJS que registra y exporta `HomeSearchController`, `HomeSearchService` y `SearchScopeEnforcer`. |
| `src/modules/home-search/presentation/home-search.controller.ts` | **Creado** | Controlador REST con los 6 endpoints de Home (`/users/me/profile`, `/users/me/modules`) y Buscador Global (`/search/*`). |
| `src/modules/home-search/presentation/dto/home-search.dto.ts` | **Creado** | DTOs de entrada y salida documentados con `@nestjs/swagger` y validados con `class-validator`. |
| `src/modules/home-search/application/home-search.service.ts` | **Creado** | Lógica de negocio de bienvenida, cálculo de módulos autorizados y búsqueda de departamentos, colaboradores y secciones. |
| `src/modules/home-search/application/search-scope-enforcer.service.ts` | **Creado** | Servicio transversal que resuelve los `authorizedLocationIds` del usuario (incluyendo excepciones) y filtra resultados fuera de alcance. |
| `src/modules/home-search/tests/home-search.controller.spec.ts` | **Creado** | Suite de pruebas unitarias para `HU-07` a `HU-12` (incluyendo exclusión de tiendas fuera de alcance y validación `FE-05`). |
| `src/app.module.ts` | **Modificado** | Se importó y registró `HomeSearchModule` en el arreglo `imports` de `AppModule`. |

---

## 4. Endpoints Nuevos

| Método | Ruta Completa | Historia / Caso de Uso | Descripción |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me/profile` | `HU-07` (`HU-004` / `CU-HOM-001`) | Retorna identidad de bienvenida (`Hola, [Nombre]`), iniciales, rol activo, excepciones vigentes y resumen de alcance. |
| `GET` | `/api/v1/users/me/modules` | `HU-08` (`HU-005` / `CU-HOM-002`) | Retorna únicamente los módulos habilitados (`ESTRUCTURAS`, `ROLES_PERMISOS`, `REPORTES`, `HISTORIAL`) y sus acciones permitidas. |
| `GET` | `/api/v1/search/departments` | `HU-09`, `HU-12` (`HU-006` / `CU-HOM-003`) | Búsqueda global de departamentos y grupos por código o nombre dentro del alcance autorizado. |
| `GET` | `/api/v1/search/employees` | `HU-10`, `HU-12` (`HU-006` / `CU-HOM-003`) | Búsqueda global de colaboradores por número de empleado, puesto o nombre dentro del tramo de control. |
| `GET` | `/api/v1/search/sections` | `HU-11`, `HU-12` (`HU-006` / `CU-HOM-003`) | Búsqueda global de secciones por código o nombre dentro de las tiendas autorizadas, indicando `ASIGNADA`/`DISPONIBLE` y `isAnchor`. |
| `GET` | `/api/v1/search` | `HU-09` a `HU-12` (`HU-006` / `CU-HOM-003`) | Búsqueda global unificada de departamentos, colaboradores y secciones acotada por `SearchScopeEnforcer`. |

---

## 5. Posibles Conflictos de Merge

| Archivo | Otras Ramas que podrían tocarlo | Razón del Conflicto y Cómo Resolverlo |
| :--- | :--- | :--- |
| `src/app.module.ts` | Cualquier otra rama que agregue un módulo de primer nivel en `AppModule` | Se añade `HomeSearchModule` en `imports`. **Resolución:** Conservar `HomeSearchModule` junto con `Feature01RolesModule`, `Feature02EstructurasModule` y `Feature03ReportesAuditoriaModule`. |

---

## 6. Pendientes o Supuestos

1. **Resolución híbrida BD + Semilla en memoria:** Si PostgreSQL tiene inicializadas las tablas `zd_security.app_user`, `user_role_assignment`, `user_role_exception` y `access_scope`, `SearchScopeEnforcer` y `HomeSearchService` leen el alcance directamente de la base de datos; cuando corre en pruebas aisladas sin BD activa, opera sobre el catálogo semilla verificable (con tiendas dentro del alcance como *Liverpool Atizapán*, tiendas por excepción como *Liverpool Santa Fe* y tiendas fuera de alcance como *Liverpool Monterrey*).
2. **Enlace directo a reportes (`reportRoute`):** Conforme a `CU-HOM-003 RN-09`, el campo `reportRoute` en los resultados de departamentos solo se expone cuando el usuario posee permisos de reportes (`REPORTS_VIEW` / `REPORTS_ROLE_VIEW` / `REPORTS_GLOBAL_VIEW`).
