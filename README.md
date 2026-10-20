# ZDeptos API — Rama `feature/home-and-global-search`

- **Carpeta de rama:** `feature__home-and-global-search`
- **Rama Git destino:** `feature/home-and-global-search`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Alcance de la rama:** Pantalla de Inicio Dinámica por Rol (`profile` y `modules`), Buscador Global y Específico de Departamentos, Colaboradores y Secciones con Resaltado `<mark>` y Recorte Automático por Alcance Operativo `SearchScopeEnforcerService` (**HU-07 a HU-12** / **HU-004 a HU-006**).

---

## 📂 Mapa de Carpetas y Trazabilidad por Historia de Usuario (HU)

```text
feature__home-and-global-search/
├── src/
│   ├── modules/
│   │   ├── home-search/                       <-- [PROPIO DE ESTA RAMA] HU-07 a HU-12 (HU-004 a HU-006)
│   │   │   ├── application/                   <-- HU-07 a HU-12 (HomeSearchService + SearchScopeEnforcerService)
│   │   │   ├── presentation/                  <-- HU-07 a HU-12 (Controlador /api/v1/me/* y /api/v1/search/*)
│   │   │   │   └── dto/                       <-- HU-09 a HU-12 (DTOs de búsqueda, paginación y filtros)
│   │   │   └── tests/                         <-- HU-07 a HU-12 (Pruebas unitarias de Home y Buscador)
│   │   ├── roles/                             <-- [BASE MAIN] HU-54, HU-56, HU-57 (HU-007, HU-008, HU-011, HU-012)
│   │   ├── permissions/                       <-- [BASE MAIN] HU-54 (HU-007: Catálogo de permisos)
│   │   └── audit/                             <-- [BASE MAIN] Repositorio base de auditoría para RolesModule
│   ├── shared/
│   │   ├── security/                          <-- [BASE MAIN] Guards de autenticación y permisos
│   │   └── http/                              <-- [BASE MAIN] Tipado de request autenticado
│   └── health/                                <-- [BASE MAIN] Monitoreo técnico GET /api/v1/health
├── openapi/                                   <-- [BASE MAIN] Especificación OpenAPI base
└── BRANCH.md                                  <-- Especificación técnica, commits y posibles conflictos de merge
```

---

## 📋 Detalle de Carpetas, Archivos e Historias de Usuario

### 1. Carpetas Propias / Modificadas por la Rama (`feature/home-and-global-search`)

| Carpeta / Ruta | Archivos Principales | Historias (Original / Homologada) | Qué implementa |
| :--- | :--- | :--- | :--- |
| `src/modules/home-search/` | `home-search.module.ts` | **HU-07 a HU-12** (`HU-004 a HU-006`) | Módulo NestJS que registra los servicios de Home, Búsqueda Global y el enforcer de alcance organizacional. |
| `src/modules/home-search/presentation/` | `home-search.controller.ts` | **HU-07 a HU-12** (`HU-004 a HU-006`) | Expone `GET /api/v1/me/profile` (**HU-07**), `GET /api/v1/me/modules` (**HU-08**), `GET /api/v1/search/global` (**HU-09 a HU-11**), `GET /api/v1/search/departments` (**HU-09**), `GET /api/v1/search/collaborators` (**HU-10**) y `GET /api/v1/search/sections` (**HU-11**). |
| `src/modules/home-search/presentation/dto/` | `home-search.dto.ts` | **HU-09 a HU-12** (`HU-005, HU-006`) | Valida el término de búsqueda `q` (mínimo 2 caracteres), filtros opcionales `formatCode`, `zoneCode`, `locationId`, `departmentCode`, `scopeLocationIds` y `limit`. |
| `src/modules/home-search/application/` | `home-search.service.ts` | **HU-07 a HU-11** (`HU-004, HU-005`) | Construye el perfil del usuario autenticado (**HU-07**), filtra las tarjetas de módulos según permisos efectivos (**HU-08**) y ejecuta búsquedas sobre Departamentos (**HU-09**), Colaboradores (**HU-10**) y Secciones (**HU-11**) con resaltado `<mark>` y sugerencias cuando hay `0` coincidencias. |
| `src/modules/home-search/application/` | `search-scope-enforcer.service.ts` | **HU-12** (`HU-006` / `RN-006`) | Aplica el recorte automático por tramo de control (`GLOBAL` vs `SCOPED`) para que ningún usuario visualice tiendas, departamentos, colaboradores ni secciones fuera de sus ubicaciones autorizadas. |
| `src/modules/home-search/tests/` | `home-search.controller.spec.ts` | **HU-07 a HU-12** (`HU-004 a HU-006`) | Pruebas unitarias de perfil, módulos dinámicos, búsqueda con resaltado `<mark>` y aislamiento por alcance `SearchScopeEnforcerService`. |

---

### 2. Carpetas Heredadas de la Rama Base (`main`)

| Carpeta / Ruta | Historias Base (`main`) | Descripción |
| :--- | :--- | :--- |
| `src/modules/roles/` | **HU-54, HU-56, HU-57** (`HU-007, HU-008, HU-011, HU-012`) | CRUD base de roles y análisis de impacto (`GET/POST /roles`, `GET/PUT/DELETE /roles/:roleId`, `GET /roles/:roleId/impact`). |
| `src/modules/permissions/` | **HU-54** (`HU-007`) | Catálogo institucional de permisos (`GET /permissions`, `GET /permissions/grouped`). |
| `src/health/` | Infraestructura transversal | Endpoint de salud `GET /api/v1/health`. |

---

## 🚀 Comandos de Validación

```bash
npm run typecheck
npm test -- --runInBand
```

---

## 🔗 Relación con el Frontend (`frontZDeptos-estructuras-liz`)

> Ver también la [Guía Maestra de Integración Frontend ↔ Backend](../FRONTEND_INTEGRATION_GUIDE.md).

| Endpoint de esta Rama | HU | Archivo / Componente en `frontZDeptos-estructuras-liz` | Qué hace en la pantalla del Frontend |
| :--- | :---: | :--- | :--- |
| `GET /api/v1/me/profile` | `HU-07` | `src/app/layout/AppHeader.tsx` (prop `displayName`: *"Hola, {displayName}. ¿Qué quieres hacer hoy?"*) | Alimenta el avatar con inicial y el saludo personalizado del encabezado superior, además de informar los roles activos y alcances (`scopes`) del usuario. |
| `GET /api/v1/me/modules` | `HU-08` | `src/features/home/pages/HomePage.tsx`<br>`src/app/layout/AppSidebar.tsx`<br>`src/app/config/navigation.ts` | Devuelve las tarjetas de los módulos del sistema indicando cuáles están habilitados (`enabled: true/false`) según los permisos del usuario para renderizar `HomePage.tsx` y `AppSidebar.tsx`. |
| `GET /api/v1/search` | `HU-09..12` | Buscador global en `HomePage.tsx` / `EstructurasFilters.tsx` | Búsqueda unificada (departamentos, colaboradores y secciones) recortada al tramo de control (`SearchScopeEnforcerService`, `RN-006`) con resaltado `<mark>...</mark>`. |
| `GET /api/v1/search/departments` | `HU-09`, `HU-12` | `src/features/gestion-estructuras/components/SearchInput.tsx` | Búsqueda predictiva de departamentos por clave o nombre dentro del alcance del usuario. |
| `GET /api/v1/search/collaborators` | `HU-10`, `HU-12` | `src/features/access-management/shared/components/CollaboratorSearch.tsx` | Alimenta el componente `CollaboratorSearch.tsx` para buscar colaboradores por nombre, número de empleado o puesto al asignar roles o excepciones. |
| `GET /api/v1/search/sections` | `HU-11`, `HU-12` | Buscador `"Buscar secciones"` en `src/features/gestion-estructuras/pages/DepartmentGroupsPage.tsx` | Busca secciones comerciales por código o descripción con coincidencias resaltadas. |
