# Módulo: Geography
**Vertical:** `Feature 02: Estructura Comercial, Árbol de 6 Niveles, Grupos y Secciones`  
**Casos de Uso:** `UC-004` (Filtros de Selección en Cascada)  
**Historias de Usuario:** `HU-13` (Técnico) / `HU-019` a `HU-021` (Funcional)  
**Dominio:** Catálogo Dominio 3 (Geografía y Selectores)

---

## Propósito del Módulo
Proporciona los catálogos y selectores en cascada para la navegación organizacional de Liverpool y Suburbia: Formato comercial, Zonas geográficas operativas y Tiendas / Almacenes.

## Endpoints Expuestos
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/geography/zones` | `GEOGRAPHY_VIEW` | Listado de todas las zonas comerciales activas (Metro, Norte, Occidente, Golfo, etc.). |
| `GET` | `/api/v1/geography/zones/:zoneId/locations` | `GEOGRAPHY_VIEW` | Tiendas/almacenes pertenecientes a una zona geográfica específica. |
| `GET` | `/api/v1/geography/locations/:locationId` | `GEOGRAPHY_VIEW` | Detalle específico de un almacén (código, nombre, formato, zona). |
