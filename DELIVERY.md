# Pull Request
Implementa el vertical Roles y Permisos conforme al OpenAPI 1.0.0: validación estricta, permisos por endpoint, TypeORM, concurrencia optimista, baja lógica, revocación de asignaciones y excepciones, y catálogo simple/agrupado.

# Riesgos
La migración física y el filtro de estado predeterminado deben validarse en el repositorio integrador. El guard de API key es solo para desarrollo.

## Correccion aplicada: concurrencia atomica

- PUT /api/v1/roles/:roleId ejecuta UPDATE condicionado por id + version.
- La version se incrementa en la misma sentencia SQL.
- La validacion de permisos y el reemplazo de role_permission usan el mismo EntityManager transaccional.
- Una version obsoleta devuelve 409 con code ROLE_VERSION_CONFLICT y currentVersion.
- Se eliminaron artefactos incompletos y duplicados del intento de arquitectura no conectado.
- Se retiro .env del entregable y .env.example contiene solo placeholders.
- HealthModule fue registrado en AppModule y su prueba usa Jest.

## Verificacion ejecutada

- npm run typecheck: OK
- npm test -- --runInBand: OK
- npm run build: OK

## Pendiente de entorno

Agregar una prueba E2E contra una base PostgreSQL de pruebas aislada que lance dos PUT simultaneos y verifique exactamente un 200 y un 409.
