# Módulo: Structures
**Vertical:** `Feature 02: Estructura Comercial, Árbol de 6 Niveles, Grupos y Secciones`  
**Casos de Uso:** `CU-EST-001`, `CU-ADM-001` a `CU-ADM-008`, `UC-006` a `UC-009`  
**Historias de Usuario:** `HU-14` a `HU-53` (Técnico) / `HU-022` a `HU-054` (Funcional)  
**Dominio:** Catálogo Dominios 4 al 8 (Estructura, Grupos, Secciones, Mancuernas y Calendario)

---

## Propósito del Módulo
Representa el corazón operativo y funcional de ZDeptos para piso de venta:
1. **Árbol Jerárquico de 6 Niveles:** Cadena ➔ Formato ➔ Zona ➔ Tienda/Almacén ➔ Gerencia Comercial ➔ Departamento Comercial.
2. **Grupos Comerciales:** Autonumeración atómica basada en patrón P-02 (`Grupo 001`, `Grupo 002`, etc.) al interior de cada departamento.
3. **Secciones Ancla (🔒 ANCHOR):** Vinculadas contractualmente al vendedor desde Employee Central. Protección inviolable contra reasignación, desasignación o eliminación (Regla RN-030).
4. **Secciones Virtuales (MANUAL / INITIAL_LOAD):** Reubicables mediante Drag & Drop entre grupos del mismo departamento y desasignables al catálogo de disponibles.
5. **Corte Operativo y Calendario:** Detección de bloqueos según fecha límite de quincena/mes.
6. **Publicación Departamental:** Versionamiento con cabecera `If-Match` para concurrencia optimista, disparando eventos a la bitácora de auditoría.

## Endpoints Expuestos
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/structures/tree` | `STRUCTURES_VIEW` | Árbol jerárquico recursivo de la tienda filtrado por zona o departamento. |
| `GET` | `/api/v1/structures/locations/:locationId/summary` | `STRUCTURES_VIEW` | Resumen de conteos (gerencias, departamentos, grupos, secciones). |
| `GET` | `/api/v1/structures/departments/:departmentId/aggregated-sections` | `STRUCTURES_VIEW` | Suma consolidada de secciones asignadas en todos los grupos del departamento. |
| `GET` | `/api/v1/structures/departments/:departmentId/available-sections` | `STRUCTURES_VIEW` | Catálogo de secciones sin asignar (disponibles para Drag & Drop). |
| `POST` | `/api/v1/structures/departments/:departmentId/groups` | `GROUPS_MANAGE` | Creación atómica de grupo comercial con autonumeración P-02 (`Grupo 001`, etc.). |
| `PUT` | `/api/v1/structures/groups/:groupId` | `GROUPS_MANAGE` | Actualización de nombre descriptivo del grupo. |
| `DELETE` | `/api/v1/structures/groups/:groupId` | `GROUPS_MANAGE` | Eliminación de grupo (validando que no contenga secciones ancla ni colaboradores). |
| `POST` | `/api/v1/structures/groups/:groupId/sections` | `SECTIONS_MANAGE` | Asignación de sección virtual a un grupo. |
| `DELETE` | `/api/v1/structures/groups/:groupId/sections/:sectionId` | `SECTIONS_MANAGE` | Desasignación de sección virtual (si es ancla, devuelve `422 Unprocessable Entity` con código `ANCHOR_SECTION_PROTECTED`). |
| `PATCH` | `/api/v1/structures/departments/:departmentId/sections/move` | `SECTIONS_MANAGE` | Movimiento (Drag & Drop) de sección entre grupos. |
| `GET` | `/api/v1/structures/calendar/operational-cutoff` | `STRUCTURES_VIEW` | Consulta de estatus del corte operativo (período abierto o cerrado). |
| `POST` | `/api/v1/structures/departments/:departmentId/publish` | `STRUCTURES_PUBLISH` | Publicación formal de la estructura del departamento con concurrencia optimista (`If-Match`). |
