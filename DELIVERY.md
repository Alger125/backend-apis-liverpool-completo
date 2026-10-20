# Pull Request: Feature 01 — Roles y Permisos (Base)

Implementa el vertical Roles y Permisos conforme al OpenAPI 1.0.0: validación estricta, permisos por endpoint, TypeORM, concurrencia optimista atómica, baja lógica, revocación en cascada de asignaciones y excepciones, y catálogo de permisos simple/agrupado.

## Corrección aplicada: Concurrencia Atómica

- `PUT /api/v1/roles/:roleId` ejecuta UPDATE condicionado por `id + version`.
- La versión se incrementa en la misma sentencia SQL.
- La validación de permisos y el reemplazo de `role_permission` usan el mismo `EntityManager` transaccional.
- Una versión obsoleta devuelve 409 con code `ROLE_VERSION_CONFLICT` y `currentVersion`.
- `HealthModule` registrado en `AppModule` con prueba Jest.
- `.env` excluido del repositorio; `.env.example` contiene placeholders limpios.

## Verificación Ejecutada

- `npm run typecheck`: OK
- `npm test -- --runInBand`: OK
- `npm run build`: OK
