# ZDeptos API — Rama `feature/roles-segmentation-and-exceptions`

- **Carpeta de rama:** `feature__roles-segmentation-and-exceptions`
- **Rama Git destino:** `feature/roles-segmentation-and-exceptions`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Alcance de la rama:** Clonación de Roles (**HU-009**), Segmentación de Roles (**HU-55 / HU-010**), Asignaciones de Rol con Alcance Operativo (**HU-58, HU-59 / HU-013 a HU-016**), Excepciones de Rol Individuales y Masivas (**HU-60, HU-017 / HU-019**), Cálculo de Permisos Efectivos con Unión Aditiva sin `DENY` (**HU-61 / HU-018**) y Seed de los 12 Perfiles Base del Anexo 8.2 (**HU-069**).

---

## 📂 Mapa de Carpetas y Trazabilidad por Historia de Usuario (HU)

```text
feature__roles-segmentation-and-exceptions/
├── src/
│   ├── modules/
│   │   ├── roles/                             <-- [EXTENDIDO EN ESTA RAMA] HU-009, HU-55 (HU-010), HU-069 (+ base HU-54, 56, 57)
│   │   │   ├── application/                   <-- HU-009 (cloneRole), HU-55 (getSegmentation/updateSegmentation), HU-069 (seedTestProfiles)
│   │   │   ├── domain/                        <-- [BASE MAIN] Entidad RoleEntity y errores de dominio
│   │   │   ├── presentation/                  <-- HU-009, HU-55, HU-069 (Endpoints /clone, /segmentation, /seed-test-profiles)
│   │   │   │   └── dto/                       <-- HU-009, HU-55 (CloneRoleRequest, UpdateRoleSegmentationRequest)
│   │   │   └── tests/                         <-- HU-009, HU-55, HU-069 (Pruebas unitarias de clonación, segmentación y 12 perfiles)
│   │   ├── access-management/                 <-- [PROPIO DE ESTA RAMA] HU-58, HU-59, HU-60, HU-017, HU-61 (HU-013 a HU-019)
│   │   │   ├── access-management.controller.ts <-- Endpoints de access-scopes, role-assignments, role-exceptions, bulk y effective-permissions
│   │   │   ├── access-management.repository.ts <-- Lógica de asignaciones, excepciones masivas (HU-017) y unión aditiva sin DENY (HU-61)
│   │   │   ├── dto.ts                         <-- DTOs de asignaciones, excepciones individuales y BulkCreateExceptionDto (HU-017)
│   │   │   └── dto.spec.ts                    <-- Pruebas unitarias de validación, alta masiva y permisos efectivos
│   │   ├── permissions/                       <-- [BASE MAIN] HU-54 (HU-007: Catálogo de permisos)
│   │   └── audit/                             <-- [BASE MAIN] Repositorio de auditoría para trazabilidad de roles
│   ├── shared/
│   │   ├── security/                          <-- [BASE MAIN] Guards de autenticación y permisos
│   │   └── http/                              <-- [BASE MAIN] Tipado de request autenticado
│   └── health/                                <-- [BASE MAIN] Monitoreo técnico GET /api/v1/health
├── openapi/                                   <-- [BASE MAIN] Especificación OpenAPI base
└── BRANCH.md                                  <-- Especificación técnica, commits y posibles conflictos de merge
```

---

## 📋 Detalle de Carpetas, Archivos e Historias de Usuario

### 1. Carpetas Propias / Modificadas por la Rama (`feature/roles-segmentation-and-exceptions`)

| Carpeta / Ruta | Archivos Principales | Historias (Original / Homologada) | Qué implementa |
| :--- | :--- | :--- | :--- |
| `src/modules/roles/presentation/` | `roles.controller.ts`, `dto/roles.dto.ts` | **HU-009, HU-55, HU-069** (`HU-009, HU-010, HU-069`) | Agrega `POST /api/v1/roles/:roleId/clone` (**HU-009**), `GET/PUT /api/v1/roles/:roleId/segmentation` (**HU-55 / HU-010**), `GET /api/v1/roles/test-profiles/catalog` y `POST /api/v1/roles/seed-test-profiles` (**HU-069**). |
| `src/modules/roles/application/` | `roles.service.ts` | **HU-009, HU-55, HU-069** (`HU-009, HU-010, HU-069`) | Duplicación de permisos hacia un nuevo rol con validación de nombre único (**HU-009**), reglas de segmentación por `LOCATION`, `JOB_POSITION`, `ORG_UNIT` y `DEPARTMENT` (**HU-55**), y catálogo/seed idempotente de los 12 perfiles base del Anexo 8.2 (**HU-069**). |
| `src/modules/roles/tests/` | `roles.controller.spec.ts` | **HU-009, HU-55, HU-069** | Pruebas unitarias de clonación, segmentación y carga de los 12 roles base. |
| `src/modules/access-management/` | `access-management.controller.ts`, `access-management.repository.ts`, `dto.ts`, `dto.spec.ts` | **HU-58, HU-59, HU-60, HU-017, HU-61** (`HU-013 a HU-019`) | Gestión de alcances (`GET /access-scopes`), asignaciones de rol con vigencia y alcance (`GET/POST/PUT /role-assignments`, `revoke`, `impact`, **HU-58/59**), excepciones individuales (**HU-60**) y masivas por lote (`POST /role-exceptions/bulk`, **HU-017**), y cálculo de permisos efectivos con unión estrictamente aditiva sin `DENY` (`GET /users/:userId/effective-permissions`, **HU-61 / HU-018**). |

---

### 2. Carpetas Heredadas de la Rama Base (`main`)

| Carpeta / Ruta | Historias Base (`main`) | Descripción |
| :--- | :--- | :--- |
| `src/modules/roles/` (base) | **HU-54, HU-56, HU-57** (`HU-007, HU-008, HU-011, HU-012`) | CRUD base de roles y análisis de impacto (`GET/POST /roles`, `GET/PUT/DELETE /roles/:roleId`, `GET /roles/:roleId/impact`). |
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
| `POST /api/v1/roles/:roleId/clone` | `HU-009` | `src/features/access-management/roles/components/RoleTableActions.tsx` | Permite duplicar un rol existente (copiando su matriz de permisos y reglas de segmentación) desde el menú de acciones de la tabla de roles. |
| `PUT /api/v1/roles/:roleId/segmentation` | `HU-55` (`HU-010`) | `src/features/access-management/roles/components/RoleSegmentationStep.tsx`<br>`src/features/access-management/roles/components/RoleForm.tsx` | Conecta el **Paso 2 del Stepper (`RoleSegmentationStep.tsx`: Ubicación `locationCodes`, Departamento `departmentCodes`, Puesto `jobFunctionCodes`)** para guardar quién pertenecerá al rol. |
| `GET /api/v1/access-scopes` | `HU-58` (`HU-013`) | `src/features/access-management/api/scopes.api.ts`<br>`src/features/access-management/roles/components/RoleScopeStep.tsx`<br>`src/features/access-management/shared/components/AccessScopeSelector.tsx` | Alimenta los catálogos del **Paso 4 del Stepper (`RoleScopeStep.tsx`: Negocio, Zona, Ubicación, Ubicaciones gestionadas, Departamento)**, reemplazando las constantes `temporary*` de `RoleForm.tsx`. |
| `POST /api/v1/role-assignments` | `HU-58` (`HU-014..016`) | `src/features/access-management/assignments/pages/RoleAssignmentListPage.tsx`<br>`src/features/access-management/shared/components/OrganizationalScopeFields.tsx` | Conecta la página `/access-management/assignments` para asignar un rol a un colaborador con su alcance organizacional (`ZONE`, `STORE`, `DEPT`, `GROUP`). |
| `POST /api/v1/role-exceptions` | `HU-59`, `HU-60` (`HU-017`) | `src/features/access-management/api/exceptions.api.ts`<br>`src/features/access-management/exceptions/pages/RoleExceptionsPage.tsx`<br>`src/features/access-management/exceptions/components/RoleExceptionForm.tsx` | Conecta el formulario de `/access-management/exceptions` para otorgar permisos adicionales por excepción individual a un colaborador con fecha de vigencia (`expiresAt`). |
| `POST /api/v1/role-exceptions/bulk` | `HU-017` | `src/features/access-management/exceptions/pages/RoleExceptionListPage.tsx`<br>`src/features/access-management/exceptions/components/RoleExceptionList.tsx` | Permite otorgar o revocar excepciones de permisos de forma masiva a múltiples colaboradores en una sola operación. |
| `GET /api/v1/users/:personId/effective-permissions` | `HU-61` (`HU-018`) | `src/app/mockAccess.ts` (`getMockPermissions`)<br>`src/shared/permissions/has-permission.ts` | Calcula y devuelve la **unión aditiva** (`Permisos de Roles Base ∪ Excepciones Vigentes`, sin reglas `DENY`). Reemplaza `getMockPermissions()` en `src/app/router.tsx`. |
| `POST /api/v1/roles/seed-test-profiles` | `HU-069` | Pruebas E2E (`e2e/access-management/*.spec.ts`) | Semilla idempotente de los 12 roles base homologados de Liverpool/Suburbia para pruebas integrales. |
