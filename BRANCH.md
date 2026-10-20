# Especificación de Rama — `feature/auth-sso-session`

- **Nombre de la rama:** `feature/auth-sso-session`
- **Carpeta simulada:** `/ramas/feature__auth-sso-session`
- **Rama base:** `main` (`backendZDeptos-integrado`)
- **Dominio funcional:** 1. Autenticación Corporativa SSO, Sesiones y Seguridad de Acceso

---

## 1. Historias de Usuario Implementadas

| ID Técnico | ID Documental | Caso de Uso / Regla | Título | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **HU-01** | **HU-001** | `CU-SEC-001` / `RN-041` | Autenticación Corporativa mediante SSO (JWKS de Microsoft Entra ID) | Terminada |
| **HU-02** | **HU-002** | `CU-SEC-001 FA-04` / `CU-SEC-007 FA-01` | Control de Inactividad y Expiración de Sesión (`keep-alive` y TTL) | Terminada |
| **HU-03** | **HU-003** | `CU-SEC-007` | Cierre de Sesión Seguro y Destrucción de Contexto (Blacklist de tokens) | Terminada |
| **HU-04** | **HU-001, HU-003** | `CU-SEC-001` / `CU-SEC-007` | Auditoría de Eventos de Autenticación (`zd_audit.audit_event`) | Terminada |
| **HU-05** | **HU-005** | `CU-SEC-001 FE-07` / `RN-055` | Bloqueo de Navegación Directa sin Permiso (`403 Forbidden` + trazabilidad) | Terminada |
| **HU-06** | **HU-003** | `CU-SEC-007 FA-02` | Invalidación de Sesión en Múltiples Pestañas (`sessionId` compartido) | Terminada |

---

## 2. Changelog Simulado de Commits

```text
feat(HU-01): implementar validacion de JWT Entra ID con JWKS RSA-SHA256, claims (aud, iss, tid, scp, groups/overage) y endpoint POST /api/v1/auth/sso/callback
feat(HU-02): implementar control de inactividad de sesion (SESSION_IDLE_TIMEOUT_MS) y endpoint POST /api/v1/auth/session/keep-alive
feat(HU-03): implementar cierre de sesion seguro POST /api/v1/auth/logout con revocacion en blacklist (revoked_tokens)
feat(HU-04): agregar acciones de auditoria de autenticacion en AuditAction y persistencia en zd_audit.audit_event sin exponer tokens
feat(HU-05): reforzar PermissionsGuard con rechazo 403 Forbidden y registro auditable de intentos no autorizados (CU-SEC-001 FE-07)
feat(HU-06): implementar endpoint GET /api/v1/auth/session e invalidacion sincronizada multi-pestana por sessionId/tokenHash
test(auth): agregar suites unitarias para AuthController, AuthService, ApiKeyGuard Bearer SSO y PermissionsGuard
```

---

## 3. Archivos Creados o Modificados

| Ruta del Archivo | Acción | Descripción Corta |
| :--- | :--- | :--- |
| `src/modules/auth/auth.module.ts` | **Creado** | Módulo NestJS de autenticación SSO y gestión de sesiones que importa `AuditModule`. |
| `src/modules/auth/presentation/auth.controller.ts` | **Creado** | Controlador REST con los endpoints `/api/v1/auth/sso/callback`, `/session/keep-alive`, `/logout` y `/session`. |
| `src/modules/auth/presentation/dto/auth.dto.ts` | **Creado** | DTOs validados con `class-validator` y documentados con `@nestjs/swagger` para login SSO, keep-alive y logout. |
| `src/modules/auth/application/auth.service.ts` | **Creado** | Servicio de negocio que valida JWKS/claims de Entra ID, consulta perfil/roles en PostgreSQL, gestiona TTL de sesión y audita eventos. |
| `src/modules/auth/tests/auth.controller.spec.ts` | **Creado** | Pruebas unitarias exhaustivas de `HU-01` a `HU-06` con firma RSA-SHA256 real y verificación de auditoría. |
| `src/shared/security/security.ts` | **Modificado** | Se agregó `SessionStateStore`, validación de `Authorization: Bearer <token>`, blacklist de tokens revocados, control de TTL de inactividad y auditoría de rechazos `403` en `PermissionsGuard`. |
| `src/shared/security/security.spec.ts` | **Modificado** | Se conservaron las pruebas de `x-dev-api-key` y se añadieron pruebas de Bearer JWT, revocación en logout y bloqueo `403`. |
| `src/shared/http/authenticated-request.ts` | **Modificado** | Se amplió la interfaz `AuthenticatedRequest` con `AuthenticatedUserContext` (`sessionId`, `oid`, `tid`, `roles`, `groups`, `scopes`). |
| `src/modules/audit/domain/enums/audit-action.enum.ts` | **Modificado** | Se añadieron acciones `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, `AUTH_SESSION_REFRESH`, `AUTH_LOGOUT_MANUAL`, `AUTH_LOGOUT_INACTIVITY` y `AUTH_FORBIDDEN_ACCESS`. |
| `src/modules/audit/domain/enums/audit-event-category.enum.ts` | **Modificado** | Se añadió la categoría `AUTHENTICATION`. |
| `src/modules/feature-01-roles/feature-01-roles.module.ts` | **Modificado** | Se registró `AuthModule` dentro de `Feature01RolesModule`. |
| `.env.example` | **Modificado** | Se documentaron las variables `AZURE_TENANT_ID`, `API_CLIENT_ID`, `ALLOWED_GROUPS`, `ALLOWED_GROUP_IDS`, `SESSION_IDLE_TIMEOUT_MS` y `ENTRA_JWKS_FETCH_ENABLED`. |

---

## 4. Endpoints Nuevos

| Método | Ruta Completa | Historia / Caso de Uso | Descripción |
| :---: | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/sso/callback` | `HU-01`, `HU-04`, `HU-05` (`CU-SEC-001`) | Valida el `accessToken` delegado de Entra ID (firma JWKS, audiencia, issuer, tenant, scope `access_as_user` y grupos), crea la sesión activa y registra auditoría. |
| `POST` | `/api/v1/auth/session/keep-alive` | `HU-02`, `HU-04` (`CU-SEC-001 FA-04`) | Renueva el TTL de inactividad de la sesión activa o responde `401` si superó el límite configurado (`SESSION_IDLE_TIMEOUT_MS`). |
| `POST` | `/api/v1/auth/logout` | `HU-03`, `HU-04`, `HU-06` (`CU-SEC-007`) | Invalida el token en la blacklist (`revoked_tokens`), cierra la sesión para todas las pestañas y audita el tipo de cierre (`MANUAL` o `INACTIVITY`). |
| `GET` | `/api/v1/auth/session` | `HU-02`, `HU-06` (`CU-SEC-007 FA-02`) | Consulta el estado vigente de la sesión y permite a otras pestañas verificar si la sesión sigue activa. |

---

## 5. Posibles Conflictos de Merge

| Archivo | Otras Ramas que podrían tocarlo | Razón del Conflicto y Cómo Resolverlo |
| :--- | :--- | :--- |
| `src/modules/audit/domain/enums/audit-action.enum.ts` | `feature/roles-segmentation-and-exceptions`, `feature/structures-compras-pac-and-ec-sync`, `feature/planning-schedule-lifecycle` | Varias ramas agregan nuevas constantes al enum `AuditAction`. **Resolución:** Conservar todas las entradas nuevas de `AuditAction` al hacer merge. |
| `src/modules/feature-01-roles/feature-01-roles.module.ts` | `feature/home-and-global-search` (si se registra en Feature 01 o en `AppModule`) | Registro de `AuthModule` en el arreglo `imports`/`exports`. **Resolución:** Mantener `AuthModule` junto con los demás módulos importados. |
| `src/shared/http/authenticated-request.ts` | `feature/home-and-global-search` | Extensión de campos opcionales en `req.user`. **Resolución:** Conservar la interfaz `AuthenticatedUserContext` completa. |

---

## 6. Pendientes o Supuestos

1. **Almacenamiento de sesiones y blacklist (`SessionStateStore`):** Se implementó en memoria de proceso para no requerir un servidor Redis adicional en el entorno actual, manteniendo la interfaz lista para conectarse a Redis o tabla `zd_security.user_session` en producción.
2. **Descarga remota de JWKS (`ENTRA_JWKS_FETCH_ENABLED`):** Por defecto está en `false` en pruebas locales/CI sin salida a internet y se activa con `ENTRA_JWKS_FETCH_ENABLED=true` para descargar automáticamente las llaves públicas desde `https://login.microsoftonline.com/<AZURE_TENANT_ID>/discovery/v2.0/keys`.
3. **Compatibilidad retroactiva:** `ApiKeyGuard` acepta tanto `Authorization: Bearer <token>` como `x-dev-api-key` (en `development`/`test`) para no romper ninguna de las colecciones de Postman ni pruebas existentes.
