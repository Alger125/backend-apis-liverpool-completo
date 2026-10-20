# Información de Rama: `feature/structures-compras-pac-and-ec-sync`

- **Nombre de la rama:** `feature/structures-compras-pac-and-ec-sync`
- **Carpeta simulada:** `feature__structures-compras-pac-and-ec-sync`
- **Rama base:** `main` (`backendZDeptos-integrado`)
- **Estado:** Terminada

---

## 1. Historias de Usuario Implementadas

| ID Matriz / Original | ID Homologado | Título | Implementación Backend |
| :--- | :--- | :--- | :--- |
| **HU-020** | **HU-020** | Navegación de estructura Compras (Hardline / Softline) sin requerir grupos operativos (`DEC-01`) | `GET /api/v1/structures/compras-pac/tree?structureType=COMPRAS`: retorna la estructura corporativa de Compras vinculando secciones y compradores directamente bajo el departamento sin obligar la existencia de grupos operativos (`requiresOperationalGroups: false`). |
| **HU-021** | **HU-021** | Navegación de estructura PAC | `GET /api/v1/structures/compras-pac/tree?structureType=PAC`: retorna las unidades comerciales y módulos omnicanal de PAC. |
| **HU-022** | **HU-022** | Configuración parametrizable de departamentos base para Compras y PAC (`DEC-15`) | `GET /api/v1/structures/config/base-departments` y `PUT /api/v1/structures/config/base-departments`: permite consultar y actualizar dinámicamente los departamentos raíz de Compras y PAC sin necesidad de cambios de código, auditando `BASE_DEPARTMENTS_CONFIG_UPDATED`. |
| **HU-023** | **HU-023** | Exclusión automática de áreas administrativas/RH no comerciales | Soportado en `GET /api/v1/structures/compras-pac/tree?excludeNonCommercial=true` (activo por defecto), filtrando unidades de soporte administrativo o RH (`isCommercial: false`). |
| **HU-19** | **HU-028** | Soporte de nodo intermedio Suburbia `70051507` (*Asesor Especializado Experiencia Cliente*, `DEC-16`) | `GET /api/v1/structures/suburbia-advisors`: expone la jerarquía intermedia de Suburbia entre Jefatura de Departamento (`70051506`) y colaboradores de piso bajo la posición `70051507`. |
| **HU-41** | **HU-029 / HU-041** | Consulta de "Secciones que administra" (`managedSections`) por colaborador | `GET /api/v1/structures/collaborators/:employeeId/managed-sections`: devuelve la sección ancla contractual (`🔒`, `ANCHOR_CONTRACT`) más todas las secciones heredadas por pertenencia al grupo operativo (`GROUP_MEMBERSHIP`). |
| **HU-45** | **HU-044** | Procesamiento de eventos entrantes desde SuccessFactors Employee Central (EC) | `POST /api/v1/structures/integrations/ec/events`: procesa eventos `HIRE`, `TERMINATION`, `TRANSFER`, `HEAD_OF_UNIT_CHANGE` y `ANCHOR_SECTION_CHANGE`, recalculando las secciones administradas y encolando la actualización en el Outbox de EC con auditoría `EC_EVENT_PROCESSED`. |
| **HU-44** | **HU-045** | Sincronización de salida hacia Employee Central (Outbox contrato `P-01`) | `POST /api/v1/structures/integrations/ec/sync-managed-sections` y `GET /api/v1/structures/integrations/ec/outbox`: genera y despacha el payload oficial `{ employeeId, effectiveDate, managedSections[] }` hacia el campo *Secciones que administra* de EC con auditoría `EC_MANAGED_SECTIONS_SYNCED`. |

---

## 2. Changelog Simulado de Commits (Conventional Commits)

```text
feat(HU-022): add GET and PUT /api/v1/structures/config/base-departments for dynamic Compras/PAC root config (DEC-15)
feat(HU-020): add GET /api/v1/structures/compras-pac/tree supporting Compras without operational groups (DEC-01) and PAC (HU-021)
feat(HU-023): filter out non-commercial RH and admin units by default in Compras/PAC tree navigation
feat(HU-19): add GET /api/v1/structures/suburbia-advisors for Suburbia intermediate position 70051507 (DEC-16 / HU-028)
feat(HU-41): add GET /api/v1/structures/collaborators/:employeeId/managed-sections for anchor + group-inherited sections
feat(HU-45): add POST /api/v1/structures/integrations/ec/events to handle inbound Employee Central workforce events
feat(HU-44): add POST /api/v1/structures/integrations/ec/sync-managed-sections and GET /outbox for P-01 EC outbound contract
test(structures): add unit tests for Compras/PAC config and tree, Suburbia 70051507, managed sections, and EC sync
```

---

## 3. Archivos Creados o Modificados

| Ruta del Archivo | Acción | Descripción Corta |
| :--- | :--- | :--- |
| `src/modules/audit/domain/enums/audit-action.enum.ts` | Modificado | Agrega `BASE_DEPARTMENTS_CONFIG_UPDATED`, `EC_EVENT_PROCESSED` y `EC_MANAGED_SECTIONS_SYNCED`. |
| `src/modules/structures/presentation/dto/structures.dto.ts` | Modificado | Agrega `GetComprasPacTreeQueryDto`, `BaseDepartmentConfigItemDto`, `UpdateBaseDepartmentsConfigDto`, `SuburbiaAdvisorsQueryDto`, `EcInboundEventDto` y `SyncManagedSectionsRequestDto`. |
| `src/modules/structures/application/structures.service.ts` | Modificado | Implementa `getBaseDepartmentsConfig`, `updateBaseDepartmentsConfig`, `getComprasPacTree`, `getSuburbiaAdvisors`, `getCollaboratorManagedSections`, `processEcInboundEvent`, `syncManagedSectionsToEc` y `getEcOutbox`. |
| `src/modules/structures/presentation/structures.controller.ts` | Modificado | Expone los 8 endpoints nuevos de Compras/PAC, Suburbia `70051507`, secciones administradas e integración Employee Central. |
| `src/modules/structures/tests/structures.controller.spec.ts` | Modificado | Agrega pruebas unitarias para todos los endpoints de la Rama 4. |

---

## 4. Endpoints Nuevos

| Método | Ruta | Permiso / Autenticación | Historia | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/structures/config/base-departments` | `STRUCTURE_VIEW` | HU-022 (DEC-15) | Consulta el catálogo parametrizable de departamentos base para Compras y PAC. |
| `PUT` | `/api/v1/structures/config/base-departments` | `GROUP_UPDATE` | HU-022 (DEC-15) | Actualiza los departamentos base activos de Compras y PAC sin cambios de código. |
| `GET` | `/api/v1/structures/compras-pac/tree` | `STRUCTURE_VIEW` | HU-020, HU-021, HU-023 | Navega la estructura de Compras (sin requerir grupos, `DEC-01`) o PAC excluyendo áreas no comerciales. |
| `GET` | `/api/v1/structures/suburbia-advisors` | `STRUCTURE_VIEW` | HU-19 (HU-028 / DEC-16) | Consulta el nodo intermedio Suburbia `70051507` (*Asesor Especializado Experiencia Cliente*). |
| `GET` | `/api/v1/structures/collaborators/:employeeId/managed-sections` | `SECTION_VIEW` | HU-41 (HU-029) | Devuelve la sección ancla (`🔒`) y las secciones que administra un colaborador por herencia de grupo. |
| `POST` | `/api/v1/structures/integrations/ec/events` | `SECTION_ASSIGN` | HU-45 (HU-044) | Recibe y procesa eventos entrantes de Employee Central (`HIRE`, `TERMINATION`, `TRANSFER`, `HEAD_OF_UNIT_CHANGE`, `ANCHOR_SECTION_CHANGE`). |
| `POST` | `/api/v1/structures/integrations/ec/sync-managed-sections` | `SECTION_ASSIGN` | HU-44 (HU-045 / P-01) | Envía hacia Employee Central el contrato `P-01` `{ employeeId, effectiveDate, managedSections[] }`. |
| `GET` | `/api/v1/structures/integrations/ec/outbox` | `STRUCTURE_VIEW` | HU-44 (HU-045 / P-01) | Consulta los mensajes encolados y enviados en el Outbox de sincronización hacia EC. |

---

## 5. Posibles Conflictos de Merge

1. **`src/modules/audit/domain/enums/audit-action.enum.ts`**:
   - **Razón:** También es modificado en `feature/auth-sso-session` (eventos de sesión SSO) y en `feature/planning-schedule-lifecycle` (eventos de planificación y calendario). Al hacer merge a `main`, se deben conservar todas las entradas del `enum AuditAction`.
2. **`src/modules/structures/presentation/dto/structures.dto.ts`**, **`src/modules/structures/application/structures.service.ts`**, **`src/modules/structures/presentation/structures.controller.ts`** y **`src/modules/structures/tests/structures.controller.spec.ts`**:
   - **Razón:** También se extienden al final del archivo en `feature/planning-schedule-lifecycle` (Rama 5) para las historias de planificación (`HU-48/49`, `HU-049` a `HU-052`). Al integrar ambas ramas en `main`, se deben conservar los bloques de métodos y endpoints de ambas ramas.

---

## 6. Pendientes o Supuestos

- **Transporte CPI / SAP SuccessFactors (`P-01`):** El Outbox `ecOutboxQueue` almacena en memoria y audita los payloads `{ employeeId, effectiveDate, managedSections[] }`, listo para conectarse al cliente HTTP/OData v2 de SAP Cloud Integration (CPI) cuando se habiliten credenciales de ambiente QA/Prod.
