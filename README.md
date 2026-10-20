# ZDeptos API — Rama `feature/structures-compras-pac-and-ec-sync`

- **Carpeta de rama:** `feature__structures-compras-pac-and-ec-sync`
- **Rama Git destino:** `feature/structures-compras-pac-and-ec-sync`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Alcance de la rama:** Configuración Dinámica de Departamentos Base para Compras y PAC (**HU-022 / DEC-15**), Navegación de Estructuras de Compras (sin requerir grupos operativos, `DEC-01`) y PAC con Exclusión de Áreas No Comerciales (**HU-020, HU-021, HU-023**), Nodo Intermedio Suburbia `70051507` (**HU-19 / HU-028 / DEC-16**), Consulta de "Secciones que administra" por Colaborador (**HU-41 / HU-029**) e Integración Bidireccional con Employee Central (Eventos Entrantes **HU-45 / HU-044** y Outbox `P-01` **HU-44 / HU-045**).

---

## 📂 Mapa de Carpetas y Trazabilidad por Historia de Usuario (HU)

```text
feature__structures-compras-pac-and-ec-sync/
├── src/
│   ├── modules/
│   │   ├── structures/                        <-- [PROPIO DE ESTA RAMA] HU-020..023, HU-19 (HU-028), HU-41 (HU-029), HU-44, HU-45
│   │   │   ├── application/                   <-- Lógica Compras/PAC, Suburbia 70051507, managed-sections y Outbox EC P-01
│   │   │   ├── presentation/                  <-- Controlador /api/v1/structures/* (8 endpoints exclusivos de esta rama)
│   │   │   │   └── dto/                       <-- DTOs de base-departments, compras-pac/tree, suburbia-advisors y eventos EC
│   │   │   └── tests/                         <-- Pruebas unitarias de los 8 endpoints de Compras/PAC, Suburbia y EC
│   │   ├── audit/                             <-- [SOPORTE AUDITORÍA] HU-022, HU-44, HU-45 (Acciones BASE_DEPARTMENTS y EC_SYNC)
│   │   │   ├── domain/enums/                  <-- Enum AuditAction extendido con eventos de Compras/PAC y Employee Central
│   │   │   └── infrastructure/                <-- Repositorio de escritura en bitácora zd_audit.audit_event
│   │   ├── roles/                             <-- [BASE MAIN] HU-54, HU-56, HU-57 (HU-007, HU-008, HU-011, HU-012)
│   │   └── permissions/                       <-- [BASE MAIN] HU-54 (HU-007: Catálogo de permisos)
│   ├── shared/
│   │   ├── security/                          <-- [BASE MAIN] Guards de autenticación y permisos
│   │   └── http/                              <-- [BASE MAIN] Tipado de request autenticado
│   └── health/                                <-- [BASE MAIN] Monitoreo técnico GET /api/v1/health
├── openapi/                                   <-- [BASE MAIN] Especificación OpenAPI base
└── BRANCH.md                                  <-- Especificación técnica, commits y posibles conflictos de merge
```

---

## 📋 Detalle de Carpetas, Archivos e Historias de Usuario

### 1. Carpetas Propias / Modificadas por la Rama (`feature/structures-compras-pac-and-ec-sync`)

| Carpeta / Ruta | Archivos Principales | Historias (Original / Homologada) | Qué implementa |
| :--- | :--- | :--- | :--- |
| `src/modules/structures/presentation/` | `structures.controller.ts` | **HU-020 a HU-023, HU-19, HU-41, HU-44, HU-45** (`HU-020..023, HU-028, HU-029, HU-044, HU-045`) | Expone los 8 endpoints exclusivos de esta rama: `GET/PUT /config/base-departments`, `GET /compras-pac/tree`, `GET /suburbia-advisors`, `GET /collaborators/:employeeId/managed-sections`, `POST /integrations/ec/events`, `POST /integrations/ec/sync-managed-sections` y `GET /integrations/ec/outbox`. |
| `src/modules/structures/presentation/dto/` | `structures.dto.ts` | **HU-020 a HU-023, HU-19, HU-44, HU-45** | DTOs validados `GetComprasPacTreeQueryDto`, `BaseDepartmentConfigItemDto`, `UpdateBaseDepartmentsConfigDto`, `SuburbiaAdvisorsQueryDto`, `EcInboundEventDto` y `SyncManagedSectionsRequestDto`. |
| `src/modules/structures/application/` | `structures.service.ts` | **HU-020 a HU-023, HU-19, HU-41, HU-44, HU-45** | Configuración sin cambios de código de departamentos raíz Compras/PAC (**HU-022 / DEC-15**), navegación Compras sin requerir grupos operativos (**HU-020 / DEC-01**), navegación PAC (**HU-021**), filtrado de unidades administrativas/RH (**HU-023**), soporte al puesto Suburbia `70051507` (**HU-19 / DEC-16**), cálculo de sección ancla + secciones heredadas (**HU-41**), webhook de eventos EC (**HU-45**) y Outbox bajo contrato `P-01` (**HU-44**). |
| `src/modules/structures/tests/` | `structures.controller.spec.ts` | **HU-020 a HU-023, HU-19, HU-41, HU-44, HU-45** | Pruebas unitarias de los 8 endpoints de la rama. |
| `src/modules/audit/domain/enums/` | `audit-action.enum.ts` | **HU-022, HU-44, HU-45** | Agrega `BASE_DEPARTMENTS_CONFIG_UPDATED`, `EC_EVENT_PROCESSED` y `EC_MANAGED_SECTIONS_SYNCED`. |

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
| `GET /api/v1/structures/config/base-departments?domain=COMPRAS\|PAC` | `HU-020` (`DEC-15`) | `src/features/gestion-estructuras/pages/CorporativoPage.tsx`<br>`src/features/gestion-estructuras/components/EstructurasFilters.tsx` (selector `Estructura`: `PAC` / `Compras`) | Devuelve los departamentos raíz configurados dinámicamente para el dominio seleccionado (`PAC` o `COMPRAS`) en `CorporativoPage.tsx`. |
| `PUT /api/v1/structures/config/base-departments` | `HU-020` (`DEC-15`) | Configuración administrativa de estructuras corporativas | Permite actualizar los departamentos base de Compras o PAC sin modificar código (`DEC-15`). |
| `GET /api/v1/structures/compras-pac/tree?domain=COMPRAS\|PAC&period=YYYY-MM` | `HU-021`, `HU-022`, `HU-023` | `src/features/gestion-estructuras/pages/CorporativoPage.tsx`<br>`src/features/gestion-estructuras/components/StructureTreeTable.tsx`<br>`src/features/gestion-estructuras/components/StructureTreeRow.tsx` | **Reemplaza `MOCK_CORPORATIVO`** (`gestionEstructuras.mocks.ts`). Devuelve el árbol corporativo sin nivel de grupos en Compras (`DEC-01`) y excluyendo funciones no comerciales en PAC (`HU-023`). |
| `GET /api/v1/structures/locations/:locationId/suburbia-advisors` | `HU-19` (`HU-028`) | `src/features/gestion-estructuras/components/EstructurasTable.tsx` (formato `Suburbia`) | Agrupa a los colaboradores con puesto de Asesor (`jobCode = 70051507`) bajo el nodo intermedio **"Asesores Suburbia"** (`DEC-16`). |
| `GET /api/v1/structures/collaborators/:personId/managed-sections` | `HU-41` (`HU-029`) | Detalle de colaborador en `EstructurasTable.tsx` / `StructureTreeRow.tsx` | Consulta las secciones gestionadas directamente por un colaborador específico. |
| `PUT /api/v1/structures/collaborators/:personId/managed-sections` | `HU-41` (`HU-029`) | Modal/acción de edición en `StructureActions.tsx` (`mode="corporate"`) | Actualiza las secciones asignadas directamente a un colaborador. |
| `POST /api/v1/structures/integrations/ec/events` | `HU-44` (`HU-045`) | Integración entrante de SuccessFactors Employee Central | Procesa altas, bajas, transferencias y cambios de puesto provenientes de EC para mantener actualizados los responsables en la UI. |
| `POST /api/v1/structures/integrations/ec/sync-managed-sections` | `HU-45` (`HU-044`) | Acción de sincronización con EC | Encola en el Outbox `P-01` el envío de secciones gestionadas hacia Employee Central. |
| `GET /api/v1/structures/integrations/ec/outbox` y `POST .../outbox/:outboxId/ack` | `HU-45` (`HU-044`) | Monitoreo de integración EC (`P-01`) | Permite consultar y confirmar el estado de sincronización (`PENDING`, `SENT`, `FAILED`) de los mensajes enviados a Employee Central. |
