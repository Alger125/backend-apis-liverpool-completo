# Módulo: Audit
**Vertical:** `Feature 03: Reportes Dinámicos, Auditoría Histórica y Cargas Masivas`  
**Casos de Uso:** `CU-HIS-001` (Consulta de Historial y Bitácora)  
**Historias de Usuario:** `HU-68` (Técnico) / `HU-064` a `HU-066` (Funcional)  
**Dominio:** Catálogo Dominio 10 (Auditoría e Integridad)  
**Regla de Arquitectura:** `ERF §7` (Inmutabilidad estricta y No Modificación)

---

## Propósito del Módulo
Garantiza la trazabilidad y rendición de cuentas (Compliance) de todas las operaciones realizadas en ZDeptos. Mantiene la tabla centralizada `zd_audit.audit_event` con diseño **Append-Only** (sólo inserción). Ningún endpoint de este módulo permite mutar, alterar o borrar registros históricos.

## Endpoints Expuestos
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/audit/logs` | `AUDIT_VIEW` | Consulta paginada y filtrada del historial de movimientos (rango de fechas `from`/`to`, acción, categoría, usuario, tienda). |
| `GET` | `/api/v1/audit/logs/:eventId` | `AUDIT_VIEW` | Detalle exhaustivo de un evento de auditoría específico (payload antes/después, snapshot, metadata). |
| `GET` | `/api/v1/audit/actions` | `AUDIT_VIEW` | Catálogo de acciones de auditoría registradas en el sistema. |
| `GET` | `/api/v1/audit/modules` | `AUDIT_VIEW` | Catálogo de módulos/categorías del sistema para filtros de auditoría. |
