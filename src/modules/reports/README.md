# Módulo: Reports
**Vertical:** `Feature 03: Reportes Dinámicos, Auditoría Histórica y Cargas Masivas`  
**Casos de Uso:** `CU-EST-002` (Vistas Previas y Reportes), `CU-EST-003` (Exportación CSV / TXT)  
**Historias de Usuario:** `HU-62` a `HU-67` (Técnico) / `HU-055` a `HU-063` (Funcional)  
**Dominio:** Catálogo Dominio 10 (Reportes y Operación Masiva)  
**Decisiones de Negocio:** `DEC-10`, `DEC-17`

---

## Propósito del Módulo
Genera las consultas de visualización y reporteo de departamentos, grupos y secciones comerciales, adaptando las columnas visibles según el rol del usuario (Director, Comprador, Jefe de Departamento, Finanzas) o permitiendo selecciones generales. Provee el motor de exportación a archivos planos `.csv` y `.txt` delimitados por pipes (`|`), calculando modelos de compensación de colaboradores y registrando eventos de auditoría para cada exportación.

## Endpoints Expuestos
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/metadata/columns` | `REPORTS_VIEW` | Catálogo de columnas seleccionables clasificadas en Datos Generales, Estructura Comercial y Colaboradores. |
| `GET` | `/api/v1/reports/role-based` | `REPORTS_VIEW` | Vista previa dinámica basada en el rol del usuario autenticado (columnas predeterminadas). |
| `GET` | `/api/v1/reports/general` | `REPORTS_VIEW` | Vista previa personalizada con selección explícita de campos a proyectar. |
| `GET` | `/api/v1/reports/compensations` | `REPORTS_VIEW` | Reporte financiero de colaboradores con su modelo de pago (comisión, sueldo base, sección ancla). |
| `GET` | `/api/v1/reports/export/csv` | `REPORTS_EXPORT` | Exportación y descarga directa de archivo `.csv` (Content-Disposition: attachment). |
| `GET` | `/api/v1/reports/export/txt` | `REPORTS_EXPORT` | Exportación y descarga directa de archivo `.txt` delimitado por pipes (`|`) para interfaces heredadas. |
