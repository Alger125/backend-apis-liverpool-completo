# Módulo: Batch Import
**Vertical:** `Feature 03: Reportes Dinámicos, Auditoría Histórica y Cargas Masivas`  
**Casos de Uso:** `CU-CIN-001` (Carga Masiva Inicial de Estructuras)  
**Historias de Usuario:** `HU-69` (Técnico) / `HU-067` a `HU-069` (Funcional)  
**Dominio:** Catálogo Dominio 10 (Operaciones Masivas y Migración)

---

## Propósito del Módulo
Permite la migración e inicialización masiva de estructuras comerciales, grupos y asignaciones de secciones hacia ZDeptos desde archivos CSV o interfaces batch.
Cuenta con un modo de **simulación (`dryRun: true`)** para validar formato de layout, existencia de tiendas, unicidad y consistencia de datos sin persistir cambios, y un modo de **ejecución transaccional (`dryRun: false`)** que aplica los cambios atómicamente y genera un registro de auditoría.

## Endpoints Expuestos
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/batch-import/layout` | `BATCH_IMPORT_EXECUTE` | Descarga de la plantilla oficial (.csv) con encabezados obligatorios y filas de ejemplo. |
| `POST` | `/api/v1/admin/batch-import` | `BATCH_IMPORT_EXECUTE` | Procesamiento de carga masiva con validación estricta de layout y soporte para `dryRun` (simulación previa). |
