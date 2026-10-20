# ZDeptos API — Rama `feature/auth-sso-session`

- **Carpeta de rama:** `feature__auth-sso-session`
- **Rama Git destino:** `feature/auth-sso-session`
- **Rama base:** `main` (`backendZDeptos-main`)
- **Alcance de la rama:** Autenticación Corporativa SSO con Microsoft Entra ID (JWKS / RS256), Sesión Deslizante (`keep-alive`), Cierre de Sesión con Blacklist (`jti`), Estado Multi-pestaña, Respuesta `403 AUTH_INSUFFICIENT_PERMISSIONS` y Auditoría de Accesos (**HU-01 a HU-06** / **HU-001 a HU-003**).

---

## 📂 Mapa de Carpetas y Trazabilidad por Historia de Usuario (HU)

```text
feature__auth-sso-session/
├── src/
│   ├── modules/
│   │   ├── auth/                              <-- [PROPIO DE ESTA RAMA] HU-01 a HU-06 (HU-001 a HU-003)
│   │   │   ├── application/                   <-- HU-02, HU-03, HU-04, HU-06 (Lógica de sesión, keep-alive, logout y auditoría)
│   │   │   ├── presentation/                  <-- HU-02, HU-03, HU-06 (Controlador /api/v1/auth/* y DTOs)
│   │   │   │   └── dto/                       <-- HU-02, HU-03 (Contratos KeepAliveDto y LogoutDto)
│   │   │   └── tests/                         <-- HU-01 a HU-06 (Pruebas unitarias de sesión y SSO)
│   │   ├── audit/                             <-- [SOPORTE AUDITORÍA] HU-04 (HU-001 / HU-003)
│   │   │   ├── domain/enums/                  <-- HU-04 (Acciones AUTH_LOGIN, AUTH_LOGOUT, AUTH_FORBIDDEN)
│   │   │   └── infrastructure/                <-- HU-04 (Repositorio de escritura en bitácora zd_audit.audit_event)
│   │   ├── roles/                             <-- [BASE MAIN] HU-54, HU-56, HU-57 (HU-007, HU-008, HU-011, HU-012)
│   │   └── permissions/                       <-- [BASE MAIN] HU-54 (HU-007: Catálogo de permisos)
│   ├── shared/
│   │   ├── security/                          <-- [MODIFICADO EN ESTA RAMA] HU-01, HU-03, HU-05 (JWKS RS256, Blacklist jti y 403)
│   │   └── http/                              <-- [MODIFICADO EN ESTA RAMA] HU-01, HU-06 (Contexto claims JWT e inactividad)
│   ├── health/                                <-- [BASE MAIN] Monitoreo técnico GET /api/v1/health
│   └── common/auth/                           <-- [BASE MAIN] Decorador @Public()
├── openapi/                                   <-- [BASE MAIN] Especificación OpenAPI base
└── BRANCH.md                                  <-- Especificación técnica, commits y posibles conflictos de merge
```

---

## 📋 Detalle de Carpetas, Archivos e Historias de Usuario

### 1. Carpetas Propias / Modificadas por la Rama (`feature/auth-sso-session`)

| Carpeta / Ruta | Archivos Principales | Historias (Original / Homologada) | Qué implementa |
| :--- | :--- | :--- | :--- |
| `src/shared/security/` | `security.ts`, `security.spec.ts` | **HU-01, HU-03, HU-05** (`HU-001, HU-002, HU-003`) | Validación de JWT de Microsoft Entra ID con firma `RS256` contra `JWKS`, validación de `iss`, `aud` y `exp` (**HU-01**), bloqueo inmediato de tokens revocados en `RevokedTokenRegistry` por `jti` (**HU-03**) y respuesta estándar `403 Forbidden` con código `AUTH_INSUFFICIENT_PERMISSIONS` (**HU-05**). |
| `src/shared/http/` | `authenticated-request.ts` | **HU-01, HU-02, HU-06** (`HU-001, HU-003`) | Extiende el contexto de `AuthenticatedUser` con `jti`, `tokenExp`, `tenantId`, `scopes`, `sessionExpiresAt` e `idleTimeoutSeconds`. |
| `src/modules/auth/` | `auth.module.ts` | **HU-01 a HU-06** (`HU-001 a HU-003`) | Módulo NestJS que ensambla el controlador y servicio de sesión SSO e integra `AuditModule`. |
| `src/modules/auth/presentation/` | `auth.controller.ts` | **HU-02, HU-03, HU-06** (`HU-001, HU-003`) | Expone los endpoints `GET /api/v1/auth/session/status` (**HU-06**), `POST /api/v1/auth/session/keep-alive` (**HU-02**) y `POST /api/v1/auth/logout` (**HU-03**). |
| `src/modules/auth/presentation/dto/` | `auth.dto.ts` | **HU-02, HU-03** (`HU-003`) | DTOs validados `KeepAliveRequestDto` (`clientTimestamp`, `tabId`) y `LogoutRequestDto` (`reason: MANUAL \| INACTIVITY \| FORCED`). |
| `src/modules/auth/application/` | `auth.service.ts` | **HU-02, HU-03, HU-04, HU-06** (`HU-001, HU-002, HU-003`) | Cálculo de ventana deslizante de inactividad (**HU-02**), revocación de `jti` en lista negra (**HU-03**), sincronización de estado entre pestañas (**HU-06**) y registro en bitácora de `AUTH_LOGIN`, `AUTH_LOGOUT` y `AUTH_FORBIDDEN` (**HU-04**). |
| `src/modules/auth/tests/` | `auth.controller.spec.ts` | **HU-01 a HU-06** (`HU-001 a HU-003`) | Pruebas unitarias de estado de sesión, `keep-alive`, `logout` y auditoría de acceso denegado. |
| `src/modules/audit/domain/enums/` | `audit-action.enum.ts`, `audit-event-category.enum.ts` | **HU-04** (`HU-001, HU-003`) | Agrega la categoría `AUTHENTICATION` y las acciones `AUTH_LOGIN`, `AUTH_LOGOUT`, `AUTH_SESSION_EXPIRED` y `AUTH_FORBIDDEN`. |

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
| `POST /api/v1/auth/sso/token` | `HU-01`, `HU-02`, `HU-04` | `src/mocks/handlers/authentication.handlers.ts`<br>`src/shared/auth/auth-storage.ts`<br>`src/shared/auth/auth.types.ts` | Reemplaza el mock `/api/auth/login`. Recibe el `idToken` de Microsoft Entra ID, valida RS256/JWKS y devuelve el token de sesión + perfil + permisos efectivos para guardarlos en `auth-storage.ts`. |
| `POST /api/v1/auth/session/keep-alive` | `HU-02` | `src/shared/layout/AuthenticatedLayout.tsx` / `src/app/layout/AppLayout.tsx` | Extiende la ventana deslizante de sesión (30 min) mientras el usuario interactúa con la aplicación. |
| `GET /api/v1/auth/session/status` | `HU-02`, `HU-06` | `src/shared/auth/session-events.ts` (`emitUnauthorized`, `onUnauthorized`) | Verifica si el `jti` del token sigue activo o si fue cerrado en otra pestaña (`HU-06`), disparando el cierre inmediato en todas las pestañas abiertas. |
| `POST /api/v1/auth/logout` | `HU-03`, `HU-04`, `HU-06` | `src/shared/components/LogoutButton.tsx`<br>`src/app/layout/AppHeader.tsx` (prop `onSignOut`) | Se invoca al hacer clic en **"Cerrar sesión"** en el header. Revoca el `jti` en lista negra y audita `AUTH_LOGOUT`. |
| Respuesta `403 AUTH_INSUFFICIENT_PERMISSIONS` | `HU-05` | `src/shared/feedback/ForbiddenState.tsx`<br>`src/shared/permissions/RoutePermissionGuard.tsx` | Activa el componente `<ForbiddenState />` cuando el usuario intenta acceder a una ruta o acción sin permiso, sin cerrar su sesión. |
