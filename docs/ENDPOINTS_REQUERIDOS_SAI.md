# SAI · Endpoints requeridos: contrato completo entre frontend y backend

**Versión:** 2.0 · 26 de noviembre de 2026
**Reemplaza a:** la versión 1.0 de este archivo (solo listaba rutas).
**Frontend:** `plataforma-frontend`, rama `feat/pantallas-sai` (69 pantallas). Cada endpoint está en el `api.ts` de su módulo con un comentario que nombra la ruta.
**Backend:** `backend-hackathon` (Go + Fiber). Rutas en `cmd/main.go`.
**Complementos:** `C:\Hackathon-app\docs\FLUJOS_PANTALLAS_Y_ENDPOINTS.md` (qué hace cada pantalla) y `docs/FLUJO_BOLSA_TRABAJO_SAI.md` (máquinas de estado de la bolsa).

Este documento es **el contrato**: dice exactamente qué recibe y qué devuelve cada operación. Donde el backend ya existe, se respeta su forma y el frontend se adapta; donde no existe, la forma es la que ya consumen las pantallas. Cuando ambos lados implementen algo distinto, se cambia aquí primero.

---

## Índice

0. [Resumen y estado](#0-resumen-y-estado)
1. [Reglas generales (aplican a todo)](#1-reglas-generales)
2. [Identidad del personal](#2-identidad-del-personal)
3. [Cuentas del personal (TI)](#3-cuentas-del-personal)
4. [Catálogos y salud](#4-catálogos-y-salud)
5. [Expedientes](#5-expedientes)
6. [Notas, consentimientos y sincronización](#6-notas-consentimientos-y-sincronización)
7. [Solicitudes de acceso](#7-solicitudes-de-acceso)
8. [Canalizaciones](#8-canalizaciones)
9. [Ayuda y alertas](#9-ayuda-y-alertas)
10. [Portal de usuarias: identidad y perfil](#10-portal-de-usuarias)
11. [Cursos, charlas y visitas](#11-cursos-charlas-y-visitas)
12. [Encuestas](#12-encuestas)
13. [Bitácora y analítica](#13-bitácora-y-analítica)
14. [Bolsa de trabajo: usuaria](#14-bolsa-de-trabajo-usuaria)
15. [Bolsa de trabajo: empresa](#15-bolsa-de-trabajo-empresa)
16. [Bolsa de trabajo: Capacitación](#16-bolsa-de-trabajo-capacitación)
17. [Roles y permisos](#17-roles-y-permisos)
18. [Catálogo de códigos de error](#18-catálogo-de-códigos-de-error)
19. [Cómo conectar una pantalla cuando el endpoint exista](#19-cómo-conectar-una-pantalla)

---

## 0. Resumen y estado

| Marca | Significado |
|---|---|
| ✅ | Existe en el backend y sirve como está. El frontend ajusta nombres de campos |
| ⚠️ | Existe, pero hay que cambiar lo que se indica en «Cambios en el backend» |
| 🔴 | Falta |

| Sección | Total | ✅ | ⚠️ | 🔴 |
|---|---|---|---|---|
| 2. Identidad del personal | 8 | 6 | 2 | 0 |
| 3. Cuentas del personal | 5 | 3 | 2 | 0 |
| 4. Catálogos y salud | 2 | 1 | 0 | 1 |
| 5. Expedientes (incluye revocar asignación) | 9 | 4 | 5 | 0 |
| 6. Notas, consentimientos y sincronización | 6 | 5 | 0 | 1 |
| 7. Solicitudes de acceso | 3 | 0 | 0 | 3 |
| 8. Canalizaciones | 3 | 0 | 1 | 2 |
| 9. Ayuda y alertas | 5 | 0 | 0 | 5 |
| 10. Portal de usuarias | 6 | 0 | 0 | 6 |
| 11. Cursos, charlas y visitas | 8 | 0 | 0 | 8 |
| 12. Encuestas | 4 | 0 | 0 | 4 |
| 13. Bitácora y analítica | 3 | 0 | 0 | 3 |
| 14 a 16. Bolsa de trabajo | 31 | 0 | 0 | 31 |
| **Total** | **93** | **19** | **10** | **64** |

---

## 1. Reglas generales

### 1.1 Base y versiones

- Todo bajo **`/api/v1`**. Hoy `login`, `mfa`, `csrf-token` y `logout` viven en `/api/auth/*`: **moverlos a `/api/v1/auth/*`** con el formato de error de §1.4. Se puede dejar `/api/auth/*` como alias temporal.
- `Content-Type: application/json; charset=utf-8` en peticiones y respuestas con cuerpo.
- Respuestas sin cuerpo: **`204 No Content`**.

### 1.2 Tres sesiones separadas

| Sesión | Se obtiene en | Cookie | Vida | Puede llamar |
|---|---|---|---|---|
| **Personal** | `POST /auth/mfa/verify` | `sai_staff` | 8 h, 15 min de inactividad | `/auth/*`, `/users/*`, `/case-files/*`, `/referrals/*`, `/case-access-requests/*`, `/notes/*`, `/help-events`, `/courses*` (Capacitación), `/outreach-visits`, `/surveys/results`, `/audit-logs`, `/analytics/*`, `/admin/*` |
| **Usuaria** | `POST /portal/auth/verify` | `sai_portal` | 30 días, se renueva al usar | `/portal/*`, `/help-alerts*`, `GET /courses*`, `POST /courses/{id}/enrollments`, `/surveys/pending`, `/surveys/{id}*`, `GET /jobs*`, `POST /jobs/{id}/applications` |
| **Empresa** | `POST /employers/auth/verify` | `sai_employer` | 7 días | `/employers/*`, `/employer/*` |

- **Recomendación firme: cookie `HttpOnly; Secure; SameSite=Strict; Path=/api`**, puesta por el backend. El frontend **no guarda tokens** (`credentials: 'same-origin'`). Hoy el backend devuelve un JWT en el cuerpo: si se mantiene, el frontend lo tendrá solo en memoria y la persona tendrá que entrar de nuevo al recargar.
- Un token de un tipo de sesión **nunca** sirve en rutas de otro: responder `401`.

### 1.3 CSRF

- Toda petición `POST`, `PUT`, `PATCH`, `DELETE` con sesión lleva `X-CSRF-Token`.
- El token se entrega en la respuesta que crea la sesión (`csrfToken`) y en `GET /auth/csrf-token`. El frontend lo guarda **solo en memoria**.
- Falta o no coincide: `403 {"error": {"code": "csrf_invalid"}}`.
- Excepción: las rutas públicas sin sesión (`/auth/login`, `/portal/auth/*`, `/portal/accounts`, `/employers/registrations`, `/employers/auth/login|verify`).

### 1.4 Formato de error (uno solo)

```json
{
  "error": {
    "code": "invalid_transition",
    "message": "Texto para soporte, nunca se muestra tal cual a la persona",
    "requestId": "01JD3K…",
    "fields": { "rfc": "formato_invalido" }
  }
}
```

- `code`: estable, en `snake_case`, del catálogo de §18. La pantalla decide el texto según el `code`.
- `fields`: solo en `422`, con el campo y un código por campo.
- `requestId`: el mismo que el encabezado `X-Request-Id`. La pantalla lo muestra como «Folio para soporte».
- **Nunca** incluir trazas, SQL, nombres de tablas, ni confirmar si existe una persona, cuenta, CURP o teléfono.

### 1.5 Códigos HTTP que usa el frontend

| Código | Cuándo | Qué hace la pantalla |
|---|---|---|
| `200`, `201`, `202`, `204` | Éxito | — |
| `400` | JSON mal formado | Error genérico |
| `401` | Sin sesión o sesión vencida | Personal: P-04. Usuaria: U-02. Empresa: E-01 |
| `403` | Sin permiso para la **acción** (CSRF, rol) | Error genérico |
| `404` | No existe **o es ajeno** (misma respuesta) | P-90 «Recurso no disponible» |
| `409` | Conflicto de estado o duplicado | Mensaje según `code` |
| `410` | Enlace o reto vencido | Mensaje según `code` |
| `412` | `If-Match` no coincide | «Alguien más cambió esto. Recarga» |
| `422` | Validación | Marca los campos de `fields` |
| `428` | Falta `If-Match` donde se exige | Error genérico (es un error del frontend) |
| `429` | Límite de intentos | Usa `Retry-After` (segundos) |
| `503` | Cifrado no configurado o mantenimiento | «Servicio no disponible» |

### 1.6 Listas y paginación

- Toda lista que pueda crecer responde **`{"items": [...], "nextCursor": "…" | null}`** (ya lo hace el backend con `Page[T]`).
- Parámetros: `limit` (por defecto 20, máximo 100) y `cursor` (opaco, firmado).
- Listas cortas y acotadas responden un arreglo directo y se indica en cada caso: catálogos, contactos institucionales, sesiones propias, asistencia, resultados de encuestas.

### 1.7 Concurrencia e idempotencia

- Recursos editables devuelven **`ETag`** (y `versionTag` en el cuerpo). Las escrituras sobre ellos exigen **`If-Match`**; si falta, `428`; si no coincide, `412`.
- Toda operación que **crea** algo acepta **`Idempotency-Key`** (uuid v4). Repetirla con la misma clave en 24 h devuelve **la misma respuesta** sin duplicar. Con la misma clave y otro cuerpo: `409 idempotency_mismatch`.
- Donde el cuerpo lleva `operationId`, debe ser igual al `Idempotency-Key`.

### 1.8 Fechas, números y textos

- Fecha y hora: **ISO 8601 en UTC con `Z`**: `"2026-11-26T17:42:05Z"`. La pantalla la convierte a hora de Los Mochis.
- Solo fecha: `"AAAA-MM-DD"`. Solo hora: `"HH:MM"` (24 h).
- Identificadores: uuid en texto. El **folio legible** (si existe) va aparte: `folio`.
- Nombres de campos en JSON: **camelCase en español**, como ya usa el backend (`alias`, `fechaNacimiento`, `ocurridoEn`). Valores de enumeraciones: **snake_case en español** (`en_seguimiento`, `no_seleccionada`).
- Cifras suprimidas por privacidad (menos de 5): **`null`**, nunca `0`.
- Datos sensibles que la pantalla solo muestra enmascarados: el backend **los envía ya enmascarados** (`"•• •••• 42"`). El frontend nunca recibe el valor completo salvo en `disclosures`.

### 1.9 Privacidad y bitácora

- **Ajeno = inexistente:** un expediente, nota, postulación o vacante que el actor no puede ver responde `404`, no `403`.
- **Mínimo necesario:** cada respuesta trae solo los campos de este contrato. No agregar campos «por si acaso».
- Se registran en la bitácora (actor, acción, recurso, resultado, `requestId`): todo login, revelar datos, asignar, revocar, canalizar, consultar la bitácora, aprobar o rechazar empresas y vacantes, decisiones sobre postulaciones y **entregar contacto**.
- Encabezados en todas las respuestas con datos: `Cache-Control: no-store` (ya existe `NoStore`).

---

## 2. Identidad del personal

### 2.1 `POST /auth/login` ⚠️

Primer paso del acceso (P-01). **Nunca** inicia sesión por sí solo.

**Petición** (sin sesión, sin CSRF)

```json
{ "usuario": "lramos", "password": "••••••••••••" }
```

**Respuesta `202`**

```json
{ "challengeId": "c1f6…", "next": "totp", "expiresAt": "2026-11-26T17:47:05Z" }
```

`next`: `"totp"` si ya tiene segundo factor (va a P-03) o `"enroll"` si no (va a P-02).

**Errores:** `401 invalid_credentials` (genérico, no revela si existe el usuario) · `403 account_suspended` · `429 too_many_attempts` con `Retry-After` (5 fallos en 15 min).

**Cambios en el backend:** hoy responde `200` con el token si la cuenta no tiene MFA, y `403 {error, challenge_token}` si lo tiene. Debe responder siempre `202` como arriba: **nadie entra sin segundo factor**.

### 2.2 `POST /auth/mfa/enrollments` ✅

Configurar el segundo factor (P-02, pendiente en el frontend). Con el `challengeId` de `next: "enroll"`.

**Petición**: `{ "challengeId": "c1f6…" }`
**Respuesta `201`**: `{ "enrollmentId": "e9…", "otpauthUri": "otpauth://totp/SAI:lramos?secret=…&issuer=SAI" }`. Se muestra una sola vez.
**Errores:** `409 mfa_already_enrolled` · `410 challenge_expired`.

### 2.3 `POST /auth/mfa/verify` ⚠️

Segundo paso (P-03) o confirmar el enrolamiento (P-02).

**Petición**

```json
{ "challengeId": "c1f6…", "code": "123456", "enrollmentId": "e9…" }
```

(`enrollmentId` solo al confirmar un enrolamiento.)

**Respuesta `200`** + cookie `sai_staff`

```json
{
  "csrfToken": "k3…",
  "expiresAt": "2026-11-27T01:42:05Z",
  "idleExpiresAt": "2026-11-26T17:57:05Z",
  "usuario": {
    "id": "5a1…",
    "usuario": "lramos",
    "nombreLaboral": "Lucía Ramos",
    "rol": "TrabajoSocial",
    "departamentoId": "d1…",
    "permisos": ["casefile.read", "casefile.write", "casefile.consent", "casefile.refer"],
    "requiereCambioPassword": false
  }
}
```

**Errores:** `401 invalid_code` (incorrecto, vencido o repetido) · `410 challenge_expired` · `429 too_many_attempts`.

**Cambios en el backend:** hoy recibe `challenge_token` y devuelve un JWT en el cuerpo. Aceptar `challengeId`, poner la cookie y devolver `csrfToken` y `usuario` como arriba.

### 2.4 `GET /users/me` ✅

Cuenta actual y permisos (P-03, P-06, menú). Ya existe.

**Respuesta `200`**

```json
{
  "actor": { "id": "5a1…", "rol": "TrabajoSocial", "departmentId": "d1…", "displayName": "Lucía Ramos", "permissions": ["casefile.read", "…"] },
  "expiresAt": "2026-11-27T01:42:05Z",
  "idleExpiresAt": "2026-11-26T17:57:05Z"
}
```

El frontend arma el menú con `rol` y `permissions` (ver §17).

### 2.5 `GET /auth/csrf-token` ✅

**Respuesta `200`**: `{ "csrfToken": "k3…" }`. La pantalla lo pide al recargar una sesión viva.

### 2.6 `GET /users/me/sessions` ✅ y `DELETE /users/me/sessions/{sessionId}` ✅

P-06 «Mi cuenta». Arreglo directo (máximo 10).

```json
[
  { "id": "s1…", "createdAt": "2026-11-26T15:00:00Z", "lastActivityAt": "2026-11-26T17:40:00Z", "expiresAt": "2026-11-26T23:00:00Z", "deviceLabel": "Chrome en Windows", "current": true }
]
```

`DELETE` responde `204`. Revocar la sesión actual equivale a cerrar sesión.

### 2.7 `POST /auth/logout` ✅

**Respuesta `204`** y la cookie expirada (`Max-Age=0`).

---

## 3. Cuentas del personal

Pantalla D-06 (Administración, permiso `admin`) y D-04 (elegir a quién asignar).

### 3.1 `GET /users?q=&role=&status=&limit=&cursor=` ⚠️

**Respuesta `200`** (paginada)

```json
{
  "items": [
    { "id": "5a1…", "usuario": "lramos", "nombreLaboral": "Lucía Ramos", "rol": "TrabajoSocial", "departamentoId": "d1…", "estado": "activo", "ultimoAcceso": "2026-11-26T17:40:00Z", "versionTag": "u7" }
  ],
  "nextCursor": null
}
```

**Cambios en el backend:** agregar filtros `q` (usuario o nombre, sin distinguir acentos) y `role`; agregar `ultimoAcceso`. Permitir que quien tenga `caseaccess.review` (Coordinación) liste **solo personal de atención activo**, para asignar en D-04.

### 3.2 `POST /users` ⚠️

**Petición**

```json
{ "usuario": "mperez", "nombreLaboral": "Mario Pérez", "rol": "Psicología", "departamentoId": "d2…" }
```

**Respuesta `201`**

```json
{
  "cuenta": { "id": "7c2…", "usuario": "mperez", "nombreLaboral": "Mario Pérez", "rol": "Psicología", "departamentoId": "d2…", "estado": "activo", "ultimoAcceso": null, "versionTag": "u1" },
  "activacion": { "codigo": "K7P2-9QX4", "expiresAt": "2026-11-29T17:42:05Z" }
}
```

El código de activación se muestra **una sola vez**; con él la persona elige su contraseña y configura su segundo factor.

**Errores:** `409 username_taken` · `422`.

**Cambios en el backend:** hoy pide `password` en la petición. Que la persona de TI **no conozca** la contraseña de nadie: generar el código de activación de un solo uso.

### 3.3 `PATCH /users/{userId}` ✅

**Petición** (con `If-Match`): `{ "rol": "Jurídico" }` o `{ "estado": "suspendido" }`.
**Respuesta `200`**: la cuenta. **Cerrar todas las sesiones** de la cuenta al cambiar rol, departamento o estado.

### 3.4 `POST /users/{userId}/session-revocations` ✅ · `POST /users/{userId}/mfa-resets` ✅

Ya existen. Cuerpo: `{ "motivo": "…" }` (y `verificacionPresencial: true` en el reinicio de MFA). Responden `204`. Falta el botón en D-06.

---

## 4. Catálogos y salud

### 4.1 `GET /catalogs` 🔴

Una sola llamada al entrar (P-03) y al abrir el portal. Arreglo de opciones por catálogo. Cacheable (`ETag`, `Cache-Control: private, max-age=3600`).

**Respuesta `200`**

```json
{
  "departamentos": [{ "id": "d1…", "codigo": "trabajo_social", "nombre": "Trabajo social" }],
  "sectores": [{ "id": "s1…", "nombre": "Sector 12", "tipo": "sector", "ageb": "2501000010123" }],
  "origenesContacto": [{ "codigo": "presencial", "nombre": "Presencial" }, { "codigo": "linea_atencion", "nombre": "Línea de atención" }],
  "institucionesOrigen": [{ "id": "i1…", "nombre": "Fiscalía" }],
  "institucionesDestino": [{ "id": "i2…", "nombre": "Refugio estatal", "telefono": "6680000000" }],
  "tiposCaso": [{ "id": "t1…", "nombre": "Violencia familiar" }],
  "finalidadesConsentimiento": [{ "id": "f1…", "nombre": "Atención", "obligatoria": true }, { "id": "f2…", "nombre": "Estadística anónima", "obligatoria": false }],
  "motivosRevelacion": ["Verificar identidad para canalizar", "Contacto de seguimiento", "Trámite jurídico en curso"],
  "vacantes": {
    "sector": ["Servicios", "Comercio", "Agroindustria", "Salud", "Educación"],
    "horario": ["Matutino", "Vespertino", "Mixto"],
    "tipoEmpleo": ["Tiempo completo", "Medio tiempo", "Temporal"],
    "ubicacion": ["Los Mochis", "Higuera de Zaragoza", "Topolobampo", "Ahome"],
    "escolaridad": ["Sin estudios", "Primaria", "Secundaria", "Preparatoria", "Carrera técnica", "Licenciatura"],
    "habilidades": ["Atención a clientes", "Limpieza", "Cocina", "Ventas", "Caja y cobro", "Computadora básica", "Cuidado de personas", "Costura", "Campo y empaque", "Manejo de redes sociales", "Organización y archivo", "Trabajo en equipo"],
    "tiempoExperiencia": ["Menos de 1 año", "1 a 3 años", "Más de 3 años"],
    "inicio": ["De inmediato", "En 2 semanas", "En 1 mes"],
    "motivosNoSeleccion": ["El perfil no coincide", "La vacante se cubrió", "No respondió a la entrevista", "Otro"]
  }
}
```

Con sesión de usuaria o empresa, devolver **solo** `vacantes` y `sectores` (sin AGEB).

### 4.2 `GET /health` ✅

Monitoreo. Hoy en `/health`. Sin cambios.

---

## 5. Expedientes

Permisos: `casefile.read`, `casefile.write`, `casefile.disclose`, `casefile.assign`. Solo personal de atención y Coordinación/Dirección según §17.

### 5.1 `GET /case-files?status=&from=&to=&limit=&cursor=` ⚠️

P-05 y P-10. Solo los expedientes **asignados** al actor. Sin búsqueda por nombre ni CURP, a propósito.

**Respuesta `200`**

```json
{
  "items": [
    {
      "id": "e12…",
      "alias": "Caso Jacaranda",
      "estado": "en_seguimiento",
      "origenContacto": "linea_atencion",
      "areas": ["trabajo_social", "psicologia"],
      "createdAt": "2026-10-02T16:00:00Z",
      "updatedAt": "2026-11-25T19:10:00Z",
      "closedAt": null,
      "versionTag": "v14"
    }
  ],
  "nextCursor": "eyJ…"
}
```

`estado`: `abierto` · `en_seguimiento` · `cerrado`. `from`/`to` filtran por `updatedAt`.

**Cambios en el backend:** agregar `areas` (códigos de los departamentos con asignación vigente).

### 5.2 `POST /case-files/duplicate-checks` ⚠️

P-11. La CURP va **en el cuerpo**, nunca en la URL.

**Petición**: `{ "curp": "XEXX010101MSLXXX07" }`

**Respuesta `200`** si no existe: `{ "exists": false }`
**Respuesta `200`** si existe:

```json
{ "exists": true, "department": "Trabajo social", "linkToken": "lt_9f…", "linkExpiresAt": "2026-11-26T18:12:05Z" }
```

`linkToken`: de un solo uso, 30 min, sirve para pedir acceso en P-13 **sin volver a enviar la CURP**.

**Errores:** `422 curp_invalid` · `429`.

**Cambios en el backend:** hoy responde `{ "duplicate": true }`. Cambiar a la forma de arriba.

### 5.3 `POST /case-files` ✅

P-12. Alta atómica de persona + expediente + consentimiento. Encabezado `Idempotency-Key`.

**Petición** (forma actual del backend)

```json
{
  "alias": "Caso Jacaranda",
  "nombre": "Nombre Apellido Apellido",
  "curp": "XEXX010101MSLXXX07",
  "fechaNacimiento": "1990-05-14",
  "telefono": "6680000081",
  "domicilio": null,
  "sectorId": "s1…",
  "origenContacto": "linea_atencion",
  "institucionOrigenId": null,
  "tipoCasoId": "t1…",
  "consentimiento": { "decision": "aceptado", "modalidad": "presencial", "propositoIds": ["f1…"], "capturadoEn": "2026-11-26T17:30:00Z" }
}
```

**Respuesta `201`** con `Location: /api/v1/case-files/{id}` y `ETag`: el mismo objeto de §5.4.

**Errores:** `409 person_exists` **con `linkToken`** en el cuerpo (`{"error": {...}, "linkToken": "lt_…", "department": "Psicología"}`) para ir a P-13 sin pedir la CURP otra vez · `422`.

### 5.4 `GET /case-files/{recordId}` ⚠️

P-14 a P-17 (encabezado común y Resumen). Devuelve `ETag`.

**Respuesta `200`**

```json
{
  "id": "e12…",
  "alias": "Caso Jacaranda",
  "estado": "en_seguimiento",
  "origenContacto": "linea_atencion",
  "tipoCasoId": "t1…",
  "sector": "Sector 12",
  "edad": 36,
  "areas": ["trabajo_social", "psicologia"],
  "ocultos": {
    "curp": "•••• •••••••••07",
    "telefono": "•• •••• 81",
    "domicilio": "Col. •••••",
    "nombre": "N•••• A•••••"
  },
  "createdAt": "2026-10-02T16:00:00Z",
  "updatedAt": "2026-11-25T19:10:00Z",
  "closedAt": null,
  "versionTag": "v14"
}
```

`edad`: calculada a partir de `fechaNacimiento` (no enviar la fecha). `ocultos`: ya enmascarados; si un campo no existe, `null`.

**Errores:** `404` si no existe **o no está asignado**.

**Cambios en el backend:** hoy devuelve solo el resumen de §5.1. Agregar `sector`, `edad`, `areas` y `ocultos`.

### 5.5 `PATCH /case-files/{recordId}` ✅

P-14 (cerrar o reabrir). Con `If-Match`.

**Petición**: `{ "estado": "cerrado", "motivo": "Concluyó la atención" }`. Reabrir exige `motivo` (10 a 500).
**Respuesta `200`**: el objeto de §5.4 con su nuevo `ETag`.
**Errores:** `412` · `409 invalid_transition` · `422`.

### 5.6 `POST /case-files/{recordId}/disclosures` ⚠️

P-14b «Mostrar dato oculto». Permiso `casefile.disclose`.

**Petición**: `{ "campo": "telefono", "motivo": "Contacto de seguimiento" }`
`campo`: `nombre` · `curp` · `fechaNacimiento` · `telefono` · `domicilio`. `motivo`: 10 a 500 caracteres.

**Respuesta `200`**: `{ "campo": "telefono", "valor": "6680000081" }` con `Cache-Control: no-store`. La pantalla lo muestra 20 s y lo borra.

**Errores:** `403` sin permiso · `404` · `422 motivo_required`.

**Cambios en el backend:** hoy solo recibe `campo`. **Exigir `motivo`** y guardarlo en la bitácora con el campo revelado (nunca el valor).

### 5.7 `GET /case-files/{recordId}/timeline?limit=&cursor=` ✅

P-15. Solo eventos de las áreas del actor.

```json
{ "items": [{ "id": "ev1…", "tipo": "nota", "departamentoId": "d2…", "actorId": "5a1…", "resumen": "Primera sesión de valoración", "ocurridoEn": "2026-11-20T16:00:00Z" }], "nextCursor": null }
```

`tipo`: `alta`, `nota`, `correccion`, `canalizacion`, `consentimiento`, `asignacion`, `cambio_estado`. El frontend traduce `departamentoId` con `/catalogs`.

### 5.8 `POST /case-files/{recordId}/assignments` ⚠️

D-04 «Asignar» (Coordinación). Con `Idempotency-Key`.

**Petición**

```json
{ "personalId": "7c2…", "departamentoId": "d2…", "motivo": "Solicitud de Psicología aprobada", "solicitudId": "sa3…" }
```

**Respuesta `201`**: `{ "id": "as9…", "personalId": "7c2…", "departamentoId": "d2…", "inicio": "2026-11-26T17:42:05Z", "fin": null }`

**Cambios en el backend:** aceptar `solicitudId` (opcional) y, si viene, marcar esa solicitud como `aprobada` en la misma transacción. **Quien asigna no obtiene acceso** al contenido del expediente.

> `POST /case-files/{recordId}/assignments/{assignmentId}/revocations` ✅ existe; aún no tiene pantalla.

---

## 6. Notas, consentimientos y sincronización

### 6.1 `GET /case-files/{recordId}/departments/{departmentId}/notes?limit=&cursor=` ✅

P-16. Solo si el actor pertenece a ese departamento; si no, `404`.

```json
{
  "items": [
    { "id": "n1…", "episodioId": "ep1…", "autorId": "5a1…", "autor": "Ana Castro", "texto": "…", "ocurridoEn": "2026-11-25T16:00:00Z", "corrigeNotaId": null, "createdAt": "2026-11-25T16:20:00Z" }
  ],
  "nextCursor": null
}
```

**Cambio menor:** agregar `autor` (nombre laboral) para no pedir cada cuenta por separado.

### 6.2 `POST /case-files/{recordId}/departments/{departmentId}/notes` ✅

P-16. Con `Idempotency-Key`. Las notas son **inmutables**: corregir crea otra nota con `corrigeNotaId`.

**Petición**: `{ "texto": "…", "ocurridoEn": "2026-11-26T16:00:00Z", "corrigeNotaId": null }`
**Respuesta `201`**: la nota (forma de §6.1).
**Errores:** `404` · `409 already_corrected` (esa nota ya tiene corrección) · `422` (texto 1 a 10 000).

### 6.3 `GET /case-files/{recordId}/consents` ✅

P-17. Arreglo directo.

```json
[
  { "consentId": "co1…", "propositoId": "f2…", "decision": "aceptado", "vigente": true, "revocado": false, "decididoEn": "2026-10-02T16:05:00Z", "revocadoEn": null }
]
```

El frontend muestra el nombre de la finalidad con `/catalogs` y permite revocar si `vigente` y la finalidad no es `obligatoria`.

### 6.4 `POST /case-files/{recordId}/consents` ✅

Registrar una nueva decisión (falta el botón en P-17). Cuerpo igual al `consentimiento` de §5.3. `201`.

### 6.5 `POST /case-files/{recordId}/consents/{consentId}/revocations` ✅

**Petición**: `{ "propositoIds": ["f2…"], "motivo": "La persona lo pidió" }` · **Respuesta `204`**. La decisión original se conserva en el historial.
**Errores:** `409 purpose_mandatory` si intenta revocar una obligatoria.

### 6.6 `POST /notes/sync` 🔴

P-41. Envía hasta 20 borradores escritos sin conexión.

**Petición**

```json
{
  "notes": [
    { "operationId": "1b7…", "recordId": "e12…", "departmentId": "d2…", "texto": "…", "ocurridoEn": "2026-11-25T09:10:00Z", "corrigeNotaId": null, "baseVersionTag": "v14" }
  ]
}
```

**Respuesta `200`** (siempre 200; cada borrador se resuelve por separado)

```json
{
  "results": [
    { "operationId": "1b7…", "result": "applied", "noteId": "n9…" },
    { "operationId": "2c8…", "result": "blocked", "reason": "assignment_revoked" },
    { "operationId": "3d9…", "result": "conflict", "reason": "record_closed" },
    { "operationId": "4e0…", "result": "retryable" }
  ]
}
```

`result`: `applied` (se guardó o ya estaba) · `blocked` (ya no tiene acceso; el borrador se descarta) · `conflict` (el expediente cambió de forma incompatible; la persona decide) · `retryable` (error temporal).

---

## 7. Solicitudes de acceso

Cuando Trabajo social intenta registrar a alguien que ya existe en otra área (P-13), pide acceso; Coordinación decide en D-04 **sin ver el expediente**.

### 7.1 `POST /case-access-requests` 🔴

**Petición**: `{ "linkToken": "lt_9f…", "motivo": "La persona acudió hoy y pide atención psicológica" }` (motivo 10 a 500). Con `Idempotency-Key`.
**Respuesta `201`**: `{ "requestId": "sa3…", "estado": "pendiente" }`
**Errores:** `410 link_expired` · `409 request_exists` (ya hay una pendiente del mismo actor) · `422`.

### 7.2 `GET /case-access-requests?status=&limit=&cursor=` 🔴

D-01 (conteo) y D-04. Solo **metadatos**.

```json
{
  "items": [
    { "id": "sa3…", "expedienteId": "e12…", "expedienteAlias": "Caso Jacaranda", "solicitante": { "id": "5a1…", "nombreLaboral": "Lucía Ramos" }, "departamento": "Psicología", "departamentoId": "d2…", "motivo": "…", "fecha": "2026-11-26T15:00:00Z", "estado": "pendiente" }
  ],
  "nextCursor": null
}
```

`estado`: `pendiente` · `aprobada` · `rechazada`.

### 7.3 `POST /case-access-requests/{id}/rejection` 🔴

**Petición**: `{ "motivo": "…" }` · **Respuesta `204`**. Avisa al solicitante. Aprobar se hace con §5.8 (`solicitudId`).
**Errores:** `409 request_not_pending`.

---

## 8. Canalizaciones

### 8.1 `POST /case-files/{recordId}/referrals` ⚠️

P-30b. Con `Idempotency-Key`.

**Petición interna**: `{ "tipo": "interna", "destinoId": "d3…", "resumen": "Requiere asesoría para denuncia" }`
**Petición externa**: `{ "tipo": "externa", "institucionId": "i2…", "resumen": "…" }`

**Respuesta `201`**: la canalización (forma de §8.2).

**Cambios en el backend:** hoy solo acepta `{destinoId, resumen}` (interna). Agregar `tipo` y el caso externo con institución de `/catalogs.institucionesDestino`. La externa nace `pendiente` y se completa manualmente.

### 8.2 `GET /referrals?direction=&status=&recordId=&limit=&cursor=` 🔴

P-05 (`direction=incoming&status=pendiente&limit=1`), P-30 y la pestaña Canalizaciones del expediente (`recordId`).

```json
{
  "items": [
    {
      "id": "r4…",
      "expedienteId": "e12…",
      "alias": "Caso Jacaranda",
      "tipo": "interna",
      "origen": { "departamentoId": "d1…", "nombre": "Trabajo social" },
      "destino": { "departamentoId": "d3…", "institucionId": null, "nombre": "Jurídico" },
      "resumen": "Requiere asesoría para denuncia",
      "estado": "pendiente",
      "motivo": null,
      "createdAt": "2026-11-25T18:00:00Z",
      "versionTag": "r1"
    }
  ],
  "nextCursor": null
}
```

`direction`: `incoming` (a mis áreas) · `outgoing` (de mis áreas). `estado`: `pendiente` · `aceptada` · `rechazada` · `completada` · `cancelada`.

### 8.3 `POST /referrals/{referralId}/transitions` 🔴

P-30. Con `If-Match` = `versionTag`.

**Petición**: `{ "accion": "aceptar" }` · `{ "accion": "rechazar", "motivo": "…" }` · `{ "accion": "completar" }` · `{ "accion": "cancelar", "motivo": "…" }`

| Acción | Quién | De → a |
|---|---|---|
| `aceptar` | Destino | `pendiente` → `aceptada` (y crea la asignación del área destino) |
| `rechazar` | Destino | `pendiente` → `rechazada` (motivo obligatorio) |
| `completar` | Destino | `aceptada` → `completada` |
| `cancelar` | Origen | `pendiente` → `cancelada` (motivo obligatorio) |

**Respuesta `200`**: la canalización actualizada. **Errores:** `409 invalid_transition` · `412`.

---

## 9. Ayuda y alertas

### 9.1 `GET /institutional-contacts` 🔴 (público)

U-16, P-50, P-51 y el directorio del panel. Arreglo directo. Cacheable 1 h.

```json
[
  { "id": "ic1", "nombre": "Emergencias", "descripcion": "Si estás en peligro inmediato", "telefono": "911", "horario": "24 horas", "prioritario": true },
  { "id": "ic2", "nombre": "Línea mujer", "descripcion": "Orientación y acompañamiento", "telefono": "6680000000", "horario": "24 horas", "prioritario": true }
]
```

Orden: prioritarios primero.

### 9.2 `POST /help-events` 🔴 (personal)

P-51: registra que el personal abrió el marcador. Con `Idempotency-Key`.

**Petición**: `{ "contactId": "ic2", "accion": "dialer_opened", "ocurridoEn": "2026-11-26T17:42:00Z", "operationId": "…" }` · **Respuesta `204`**.

### 9.3 `POST /help-alerts` 🔴 (usuaria)

U-05 y U-06: la usuaria mantuvo 2 s el botón. Con `Idempotency-Key`.

**Petición**: `{ "lat": 25.7905, "lon": -108.9859, "precision": 30, "operationId": "…" }` (`lat`/`lon` solo si ella lo permite y tiene `compartirUbicacion`).

**Respuesta `201`**

```json
{ "id": "al1…", "estado": "recibida", "ubicacionCompartida": true, "contactosAvisados": false, "creadaEn": "2026-11-26T17:42:05Z" }
```

`estado`: `enviada` (aún no la toma una agente) · `recibida` (una agente la está viendo) · `cancelada`.

**Reglas:** la alerta llega a la agente de la línea 24/7 (canal por definir: tabla de alertas + notificación). No se guarda la ubicación más de 72 h salvo que se vuelva parte de un expediente.

### 9.4 `POST /help-alerts/{id}/trusted-contacts` 🔴 (usuaria)

U-07 «Avisar a mis contactos de confianza». Sin cuerpo. **Respuesta `200`**: la alerta con `contactosAvisados: true`. Solo a contactos que ella autorizó antes (§10.4). SMS neutro.

### 9.5 `POST /help-alerts/{id}/cancellation` 🔴 (usuaria)

U-08. **Petición**: `{ "motivo": "Fue por error" }` · **Respuesta `200`**: la alerta con `estado: "cancelada"`.

---

## 10. Portal de usuarias

### 10.1 `POST /portal/accounts` 🔴 (público)

U-04 «Crear mi cuenta». Origen `autorregistro`.

**Petición**: `{ "nombre": "María López Pérez", "curp": "XEXX010101MSLXXX07", "telefono": "6681234567", "correo": "maria@ejemplo.mx", "aceptaAviso": true }`

`correo` es **opcional**; si viene, sirve para entrar (§10.2). Guardarlo en minúsculas y con índice único (por HMAC).

**Respuesta `202`** (igual exista o no): `{ "challengeId": "uc2…", "telefonoMascara": "•• •••• 67" }` y se envía un SMS con el código.

**Reglas:** si la CURP, el celular o el correo ya están registrados, **no lo digas**: responde igual y manda el código al celular registrado de esa cuenta. **Errores:** `422` (CURP, teléfono de 10 dígitos, `aceptaAviso` debe ser `true`) · `429`.

### 10.2 `POST /portal/auth/login` 🔴 (público)

U-02. La usuaria elige cómo identificarse: **celular, CURP o correo**. **No se usa el nombre completo**, porque varias personas pueden llamarse exactamente igual.

**Petición con celular**: `{ "tipo": "telefono", "telefono": "6681234567" }`
**Petición con CURP**: `{ "tipo": "curp", "curp": "XEXX010101MSLXXX07" }`
**Petición con correo**: `{ "tipo": "correo", "correo": "maria@ejemplo.mx" }`

**Respuesta `202` siempre**: `{ "challengeId": "uc1…", "telefonoMascara": "•• •••• 67" }`

**Reglas:**
- El código va **siempre al celular registrado** de la cuenta; el número que se escribe solo sirve para buscarla.
- Normalizar antes de buscar: celular a 10 dígitos (quitar `+52`/`52`), CURP en mayúsculas sin espacios, correo en minúsculas sin espacios.
- **Celular, CURP y correo son únicos por cuenta** y se buscan por HMAC (como ya se hace con la CURP), sin descifrar.
- `422 validation_failed` solo si el **formato** es inválido (celular sin 10 dígitos, CURP que no cumple el patrón, correo sin `@`). Nunca por no existir.
- Si no existe la cuenta: máscara falsa y un reto que nunca valida.
- Límites: 3 SMS por celular y por IP cada 15 min (`429` con `Retry-After`).

### 10.3 `POST /portal/auth/verify` 🔴 (público)

U-03. **Petición**: `{ "challengeId": "uc1…", "code": "123456" }`

**Respuesta `200`** + cookie `sai_portal`: `{ "alias": "María", "csrfToken": "p8…" }`

**Errores:** `401 invalid_code` · `410 challenge_expired` · `429` (5 intentos invalidan el reto).

### 10.4 `GET /portal/me` 🔴 · `PATCH /portal/me` 🔴

U-09 «Mi perfil».

```json
{
  "alias": "María",
  "telefonoMascara": "•• •••• 67",
  "contactosConfianza": [{ "id": "ct1", "nombre": "Hermana", "telefonoMascara": "•• •••• 17" }],
  "silenciarAvisos": false,
  "compartirUbicacion": true,
  "nombreDiscreto": "Agenda"
}
```

`PATCH` acepta `{ "silenciarAvisos"?: boolean, "compartirUbicacion"?: boolean }` y responde el perfil completo. Los contactos de confianza los registra Trabajo social con la usuaria (fuera del portal, por seguridad).

### 10.5 `POST /portal/auth/logout` 🔴

U-09 «Cerrar sesión». **Respuesta `204`** y la cookie `sai_portal` expirada.

---

## 11. Cursos, charlas y visitas

### 11.1 `GET /courses?type=&from=&to=&limit=&cursor=` 🔴

U-10 (usuaria), K-01, K-02 y K-04 (Capacitación). `type`: `curso` · `charla` · `conferencia`.

```json
{
  "items": [
    { "id": "cu1…", "tipo": "curso", "titulo": "Finanzas para tu negocio", "descripcion": "…", "fecha": "2026-12-12", "hora": "17:00", "lugar": "Sala 2, Los Mochis", "cupo": 25, "inscritas": 18, "inscrita": false }
  ],
  "nextCursor": null
}
```

`inscrita`: solo con sesión de usuaria. A la usuaria solo se le muestran eventos con `fecha` ≥ hoy.

### 11.2 `GET /courses/{id}` 🔴

U-11, K-05. El mismo objeto. `404` si no existe.

### 11.3 `POST /courses` 🔴 (Capacitación)

K-03. **Petición**: `{ "tipo": "curso", "titulo": "…", "descripcion": "…", "fecha": "2026-12-12", "hora": "17:00", "lugar": "…", "cupo": 25 }` · **Respuesta `201`**: el curso. Se publica en el foro de inmediato.
**Errores:** `422` (fecha pasada, cupo < 1).

### 11.4 `POST /courses/{id}/enrollments` 🔴 (usuaria)

U-11. Sin cuerpo. **Respuesta `201`**: `{ "enrollmentId": "in1…", "inscrita": true }`. Programa un recordatorio neutro un día antes.
**Errores:** `409 course_full` · `409 already_enrolled` · `410 course_past`.

### 11.5 `GET /courses/{id}/attendance` 🔴 · `PUT /courses/{id}/attendance` 🔴 (Capacitación)

K-05 «Pasar lista». Arreglo directo. **Solo alias**, nunca nombre ni teléfono.

```json
[{ "enrollmentId": "in1…", "alias": "Participante 01", "presente": true }]
```

`PUT` recibe `[{ "enrollmentId": "in1…", "presente": true }]` y responde `204`.

### 11.6 `GET /outreach-visits?status=` 🔴 · `POST /outreach-visits` 🔴 (Capacitación)

K-01, K-06.

```json
{ "items": [{ "id": "vi1…", "sectorId": "s12…", "sector": "Sector 12", "fecha": "2026-12-03", "tema": "Prevención de la violencia en el noviazgo", "responsable": "Capacitación", "estado": "planeada" }], "nextCursor": null }
```

`POST` recibe `{ "sectorId": "s12…", "fecha": "2026-12-03", "tema": "…" }` y responde `201` con la visita. `estado`: `planeada` · `realizada`.

---

## 12. Encuestas

### 12.1 `GET /surveys/pending` 🔴 (usuaria)

U-05 (insignia) y U-14. Arreglo directo. Títulos **neutros** (no mencionar violencia).

```json
[
  {
    "id": "en1…",
    "titulo": "¿Cómo te atendimos?",
    "minutos": 2,
    "preguntas": [
      { "id": "p1", "texto": "¿Qué tan fácil fue usar la app?", "tipo": "escala" },
      { "id": "p2", "texto": "¿Volverías a usarla?", "tipo": "opcion", "opciones": ["Sí", "No", "No sé"] },
      { "id": "p3", "texto": "¿Algo que mejorar?", "tipo": "abierta" }
    ]
  }
]
```

`escala`: de 1 a 5.

### 12.2 `GET /surveys/{id}` 🔴

U-15. El mismo objeto. `404` si no está asignada a ella o ya respondió.

### 12.3 `POST /surveys/{id}/responses` 🔴

U-15. Con `Idempotency-Key`.

**Petición**: `{ "respuestas": { "p1": 4, "p2": "Sí", "p3": "Más cursos" }, "operationId": "…" }` · **Respuesta `204`**.
**Errores:** `409 already_answered` · `422`. Guardar las respuestas **desvinculadas** de la usuaria (solo la marca de «respondida»).

### 12.4 `GET /surveys/results` 🔴 (Administración)

D-07. Arreglo directo. Solo agregados; `null` si hay menos de 5 respuestas.

```json
[
  {
    "encuestaId": "en1…",
    "titulo": "¿Cómo te atendimos?",
    "respuestas": 37,
    "preguntas": [
      { "id": "p1", "texto": "…", "tipo": "escala", "promedio": 4.3 },
      { "id": "p2", "texto": "…", "tipo": "opcion", "conteo": [{ "opcion": "Sí", "total": 30 }, { "opcion": "No", "total": null }] },
      { "id": "p3", "texto": "…", "tipo": "abierta" }
    ]
  }
]
```

Las respuestas abiertas **no** se devuelven aquí.

---

## 13. Bitácora y analítica

### 13.1 `GET /audit-logs?actorId=&recordId=&action=&from=&to=&limit=&cursor=` 🔴

D-05. La consulta misma se registra en la bitácora.

```json
{
  "items": [
    { "id": "lg1…", "fecha": "2026-11-26T17:42:05Z", "actor": { "id": "5a1…", "nombreLaboral": "Lucía Ramos" }, "rol": "TrabajoSocial", "accion": "casefile.disclose", "expedienteId": "e12…", "resultado": "exito", "detalle": "Reveló teléfono. Motivo: Contacto de seguimiento", "requestId": "01JD…" }
  ],
  "nextCursor": null
}
```

`resultado`: `exito` · `denegado` · `error` (enum existente).

### 13.2 `GET /analytics/summary?period=` 🔴

D-01 y D-02. `period`: `30d` · `6m` · `12m`. Cifras de menos de 5: `null`.

```json
{
  "corte": "2026-11-26T06:00:00Z",
  "metodologia": "Expedientes abiertos en el periodo. Cifras menores a 5 se suprimen.",
  "indicadores": [
    { "clave": "abiertos", "titulo": "Expedientes abiertos", "valor": 128, "detalle": "+12 vs. periodo anterior" },
    { "clave": "canalizaciones", "titulo": "Canalizaciones", "valor": null, "detalle": "Suprimido", "suprimido": true }
  ],
  "porMes": [{ "etiqueta": "2026-06", "valor": 18 }],
  "porOrigen": [{ "etiqueta": "linea_atencion", "valor": 40 }],
  "porArea": [{ "etiqueta": "psicologia", "valor": 55 }]
}
```

### 13.3 `GET /analytics/heatmap?period=` 🔴

D-03 y K-06. Un nivel por AGEB.

```json
{ "corte": "2026-11-26T06:00:00Z", "sectores": [{ "ageb": "2501000010123", "nivel": 3 }, { "ageb": "2501000010138", "nivel": "suprimido" }] }
```

`nivel`: 1 a 5 por quintiles, o `"suprimido"` (menos de 5 casos). Nunca el conteo exacto.

---

## 14. Bolsa de trabajo: usuaria

Máquinas de estado y reglas completas: `docs/FLUJO_BOLSA_TRABAJO_SAI.md`.

**Objeto `Vacante`** (usado en 14, 15 y 16)

```json
{
  "id": "va1…",
  "empresaId": "em1…",
  "empresa": "Empresa aliada A",
  "puesto": "Auxiliar administrativa",
  "sector": "Servicios",
  "horario": "Matutino",
  "tipoEmpleo": "Tiempo completo",
  "ubicacion": "Los Mochis",
  "sueldo": "$8,500 al mes",
  "descripcion": "Apoyo en captura, archivo y atención a clientes.",
  "requisitos": ["Secundaria terminada"],
  "estado": "publicada",
  "publicadaEn": "2026-11-18",
  "motivoCambios": null,
  "actualizada": "2026-11-24",
  "postulada": false,
  "postulaciones": 6,
  "nuevas": 1
}
```

`estado`: `en_revision` · `cambios` · `publicada` · `pausada` · `cerrada`. `publicadaEn` (AAAA-MM-DD) lo pone el **servidor** la primera vez que la vacante pasa a `publicada` y no cambia después; `null` si nunca se publicó. Las tarjetas muestran «Publicada el 18 de nov». `postulada` solo para la usuaria; `postulaciones` y `nuevas` solo para empresa y Capacitación.

**Objeto `Cv`**

```json
{
  "escolaridad": "Secundaria",
  "experiencia": [{ "puesto": "Ventas por catálogo", "tiempo": "1 a 3 años" }],
  "habilidades": ["Atención a clientes", "Ventas"],
  "horarios": ["Matutino"],
  "inicio": "De inmediato",
  "sobreMi": "Soy puntual",
  "actualizado": "2026-11-26"
}
```

`experiencia` vacía = primer empleo (válido). Límites: experiencia 0 a 3, habilidades 1 a 15, horarios 1 a 3, `sobreMi` ≤ 140.

**Objeto `Postulacion`** (vista de la usuaria)

```json
{
  "id": "po5…",
  "folio": "BT-0105",
  "vacanteId": "va2…",
  "puesto": "Cajera",
  "empresa": "Empresa aliada B",
  "estado": "entrevista",
  "enviada": "2026-11-21",
  "historial": [{ "estado": "enviada", "fecha": "2026-11-21" }, { "estado": "en_revision", "fecha": "2026-11-22" }, { "estado": "entrevista", "fecha": "2026-11-24" }],
  "entrevista": { "fecha": "2026-12-01", "hora": "16:30", "modalidad": "Presencial", "lugar": "Sucursal Gabriel Leyva", "respuesta": null },
  "contactoEntregado": false
}
```

`estado`: `enviada` · `en_revision` · `entrevista` · `aceptada` · `no_seleccionada` · `retirada`. `entrevista.respuesta`: `null` · `confirmada` · `otra_fecha`. **El motivo de no selección nunca se envía a la usuaria.**

| # | Operación | Petición | Respuesta | Errores | Pantalla |
|---|---|---|---|---|---|
| 14.1 | `GET /jobs?sector&schedule&type&location&limit&cursor` 🔴 | — | Página de `Vacante` (solo `publicada`) | — | U-12 |
| 14.2 | `GET /jobs/{id}` 🔴 | — | `Vacante` | `404` si no está publicada | U-13 |
| 14.3 | `GET /portal/me/cv` 🔴 | — | `Cv` o `null` | — | U-13, U-20, U-21 |
| 14.4 | `PUT /portal/me/cv` 🔴 | `Cv` sin `actualizado` | `Cv` | `422` | U-21 |
| 14.5 | `POST /jobs/{id}/applications` 🔴 | — (Idempotency-Key) | `201 Postulacion` | `404`, `409 already_applied`, `422 cv_required` | U-13, U-21 |
| 14.6 | `GET /portal/me/applications` 🔴 | — | Página de `Postulacion` | — | U-05, U-18 |
| 14.7 | `GET /portal/me/applications/{id}` 🔴 | — | `Postulacion` | `404` | U-19 |
| 14.8 | `POST /portal/me/applications/{id}/interview-response` 🔴 | `{ "respuesta": "confirmada" \| "otra_fecha" }` | `Postulacion` | `409 invalid_transition` | U-19 |
| 14.9 | `POST /portal/me/applications/{id}/withdrawal` 🔴 | — | `Postulacion` | `409 invalid_transition` | U-19 |

Reglas: al postularse se guarda una **copia congelada** del CV; 20 postulaciones por usuaria al día.

---

## 15. Bolsa de trabajo: empresa

**Objeto `Empresa`** (vista propia y de Capacitación)

```json
{ "id": "em5…", "nombre": "Taller Industrial Norte", "rfc": "TIN030303EE5", "sector": "Servicios", "contacto": "Marco Ruiz", "correo": "contacto@taller-norte.test", "telefono": "6681000005", "estado": "rechazada", "solicitada": "2026-11-18", "motivo": "No pudimos verificar el RFC en el SAT." }
```

`estado`: `en_revision` · `aprobada` · `rechazada` · `suspendida`.

**Objeto `Postulante`** (vista de la empresa: `Postulacion` + CV **sin contacto**)

```json
{
  "…campos de Postulacion…": "",
  "cv": { "nombre": "Karla", "escolaridad": "Secundaria", "experiencia": [], "habilidades": ["Caja y cobro"], "horarios": ["Matutino"], "inicio": "De inmediato", "sobreMi": null, "actualizado": "2026-11-10" },
  "vista": true,
  "telefono": null
}
```

`cv.nombre`: solo el **nombre de pila**. `telefono`: `null` hasta que Capacitación entregue el contacto (§16). Lista blanca: nunca apellidos, CURP, dirección, correo ni nada del expediente.

| # | Operación | Petición | Respuesta | Errores | Pantalla |
|---|---|---|---|---|---|
| 15.1 | `POST /employers/registrations` 🔴 público | `{ nombre, rfc, sector, contacto, correo, telefono, aceptaAviso: true }` | `201 { "id", "estado": "en_revision" }` | `409 rfc_taken`, `409 email_taken`, `422` | E-03 |
| 15.2 | `POST /employers/auth/login` 🔴 público | `{ "correo": "…" }` | `202 { "challengeId", "correoMascara": "c•••@taller-norte.test" }` siempre | `429` | E-01 |
| 15.3 | `POST /employers/auth/verify` 🔴 público | `{ "challengeId", "code" }` | `200 { "id", "nombre", "estado", "csrfToken" }` + cookie `sai_employer` (**limitada** si `estado ≠ aprobada`) | `401 invalid_code`, `410` | E-02 |
| 15.4 | `POST /employers/auth/logout` 🔴 | — | `204` | — | Barra |
| 15.5 | `GET /employers/me/registration` 🔴 cualquier estado | — | `Empresa` | — | E-08, E-09 |
| 15.6 | `PUT /employers/me/registration` 🔴 solo `rechazada` | `{ nombre, rfc, sector, contacto, telefono }` (el correo no cambia) | `200 { "estado": "en_revision" }` | `409 not_rejected`, `409 rfc_taken`, `409 too_many_resubmissions`, `422` | E-09 |
| 15.7 | `GET /employer/jobs` 🔴 | — | Página de `Vacante` con conteos | `403 employer_not_approved` | E-04 |
| 15.8 | `POST /employer/jobs` 🔴 | `{ puesto, sector, horario, tipoEmpleo, ubicacion, sueldo?, descripcion, requisitos[] }` | `201 Vacante` (`en_revision`) | `422` | E-05 |
| 15.9 | `GET /employer/jobs/{id}` 🔴 | — | `Vacante` | `404` | E-05b, E-06 |
| 15.10 | `PATCH /employer/jobs/{id}` 🔴 (If-Match) | Datos (vuelve a `en_revision`) **o** `{ "estado": "pausada" \| "publicada" \| "cerrada" }` | `Vacante` | `409 invalid_transition`, `412` | E-05b, E-06 |
| 15.11 | `GET /employer/jobs/{id}/applications?status=` 🔴 | — | Página de `Postulante` (sin retiradas) | `404` | E-06 |
| 15.12 | `GET /employer/applications/{id}` 🔴 | — | `Postulante`. **La primera lectura** pasa `enviada` → `en_revision` | `404` | E-07 |
| 15.13 | `POST /employer/applications/{id}/interview` 🔴 | `{ "fecha", "hora", "modalidad": "Presencial" \| "Llamada" \| "Videollamada", "lugar" }` | `Postulante` (`respuesta` vuelve a `null`) | `409`, `422` (fecha pasada) | E-07 |
| 15.14 | `POST /employer/applications/{id}/decision` 🔴 | `{ "decision": "aceptada" }` o `{ "decision": "no_seleccionada", "motivo": "El perfil no coincide" }` | `Postulante` | `409 invalid_transition`, `422` | E-07 |

Con sesión limitada (empresa no aprobada), toda ruta `/employer/*` responde `403 employer_not_approved`. Cerrar una vacante pasa a `no_seleccionada` todas las postulaciones abiertas.

---

## 16. Bolsa de trabajo: Capacitación

| # | Operación | Petición | Respuesta | Errores | Pantalla |
|---|---|---|---|---|---|
| 16.1 | `GET /admin/jobs?status=` 🔴 | — | Página de `Vacante` con conteos | — | K-01, K-07, K-09 |
| 16.2 | `GET /admin/jobs/{id}` 🔴 | — | `Vacante` + `"porEstado": { "enviada": 1, "en_revision": 1, "entrevista": 1, "aceptada": 0, "no_seleccionada": 0, "retirada": 0 }` | `404` | K-12 |
| 16.3 | `POST /admin/jobs` 🔴 | Datos de vacante + `empresaId` | `201 Vacante` (`publicada`) | `409 employer_not_approved`, `422` | K-08 |
| 16.4 | `POST /admin/jobs/{id}/review` 🔴 | `{ "aprobar": true }` o `{ "aprobar": false, "motivo": "…" }` | `Vacante` | `409 invalid_transition`, `422 motivo_required` | K-12 |
| 16.5 | `GET /admin/employers?status=` 🔴 | — | Página de `Empresa` | — | K-08, K-09, K-10 |
| 16.6 | `POST /admin/employers/{id}/review` 🔴 | `{ "estado": "aprobada" }` o `{ "estado": "rechazada" \| "suspendida", "motivo": "…" }` | `Empresa` | `409`, `422 motivo_required` | K-09, K-10 |
| 16.7 | `GET /admin/hires` 🔴 | — | Arreglo de `{ postulacionId, folio, nombre, puesto, empresa, fecha, contactoEntregado }` | — | K-07, K-11 |
| 16.8 | `POST /admin/applications/{id}/contact-release` 🔴 | — | `204` | `409 not_accepted`, `409 contact_blocked` | K-11 |

Suspender una empresa pausa sus vacantes publicadas y revoca sus sesiones. Antes de entregar un contacto, revisar si el expediente de la usuaria tiene alerta de riesgo: si la tiene, `409 contact_blocked`. Toda entrega queda en la bitácora y no se puede deshacer.

---

## 17. Roles y permisos

El backend autoriza siempre. El frontend usa `rol` y `permisos` de `GET /users/me` solo para mostrar el menú.

| Rol (backend) | Menú del frontend | Permisos |
|---|---|---|
| `TrabajoSocial` | Atención + «Nuevo» | `casefile.read`, `casefile.write`, `casefile.consent`, `casefile.refer`, `casefile.disclose`¹, `caseaccess.request`, `referral.read`, `referral.transition`, `notes.sync` |
| `Psicología` | Atención | Igual que Trabajo social, sin alta de expediente |
| `Jurídico` | Atención | `casefile.read`, `casefile.write`, `casefile.refer`, `referral.*`, `notes.sync` |
| **`Capacitación`** (nuevo) | Capacitación | `courses.manage`, `outreach.manage`, `jobs.review`, `employers.review`, `hires.release`, `analytics.heatmap` |
| `Coordinación` | Administración: Inicio, Solicitudes | `casefile.assign`, `caseaccess.review`, `users.read_attention` |
| `Dirección` | Administración: Inicio, Reportes, Mapa, Bitácora | `analytics.read`, `analytics.heatmap`, `auditlog.read` |
| `AdministradorTI` | Administración: Inicio, Personal, Bitácora | `admin`, `auditlog.read` |
| `AdministraciónAnalítica` | Administración: Inicio, Reportes, Mapa, Opinión | `analytics.read`, `analytics.heatmap`, `surveys.results` |

¹ Hoy el seed da `casefile.disclose` solo a Coordinación y Dirección. Decidir si Trabajo social puede revelar datos (P-14b lo necesita) o si el botón solo aparece a quien tenga el permiso.

---

## 18. Catálogo de códigos de error

| `code` | HTTP | Dónde |
|---|---|---|
| `invalid_credentials` | 401 | Login del personal |
| `invalid_code` | 401 | Cualquier verificación de código |
| `session_expired` | 401 | Cualquier ruta con sesión |
| `account_suspended` | 403 | Login del personal |
| `csrf_invalid` | 403 | Escrituras |
| `forbidden` | 403 | Sin permiso para la acción |
| `employer_not_approved` | 403 | `/employer/*` con sesión limitada |
| `not_found` | 404 | Inexistente o ajeno |
| `person_exists` | 409 | `POST /case-files` (con `linkToken`) |
| `invalid_transition` | 409 | Expedientes, canalizaciones, postulaciones, vacantes |
| `already_corrected` | 409 | Notas |
| `purpose_mandatory` | 409 | Consentimientos |
| `request_exists`, `request_not_pending` | 409 | Solicitudes de acceso |
| `course_full`, `already_enrolled` | 409 | Cursos |
| `already_answered` | 409 | Encuestas |
| `already_applied` | 409 | Postulaciones |
| `rfc_taken`, `email_taken`, `username_taken` | 409 | Registros y cuentas |
| `not_rejected`, `too_many_resubmissions` | 409 | Solicitud de empresa |
| `not_accepted`, `contact_blocked` | 409 | Entrega de contacto |
| `mfa_already_enrolled` | 409 | MFA |
| `idempotency_mismatch` | 409 | Cualquier creación |
| `link_expired`, `challenge_expired`, `course_past` | 410 | — |
| `precondition_failed` | 412 | `If-Match` |
| `precondition_required` | 428 | Falta `If-Match` |
| `validation_failed` | 422 | Con `fields` |
| `cv_required`, `motivo_required`, `curp_invalid` | 422 | — |
| `too_many_attempts` | 429 | Con `Retry-After` |
| `encryption_unavailable` | 503 | Sin llaves de cifrado |

---

## 19. Cómo conectar una pantalla

Cuando el backend publique un endpoint:

1. Que aparezca en `docs/swagger.yaml` del backend (y en `contract/openapi.yaml`).
2. En el frontend, abrir el `api.ts` del módulo (cada función nombra la ruta en su comentario), ajustar los nombres de campos a este contrato y tipar con el esquema generado.
3. Probar con datos simulados apagados: `VITE_DATOS_SIMULADOS=false npm run dev`.
4. Cambiar su marca aquí a ✅.

Diferencias de nombres que el frontend debe ajustar al conectar (el contrato manda):

| Módulo del frontend | Hoy envía o espera | Contrato |
|---|---|---|
| `identidad` | `{username, password}`; `{challengeId, code}` → `{usuario, nombre, rol}` | §2.1 y §2.3 |
| `expedientes` | `status` en PATCH, `field` en disclosures, `text`/`declaredAt`/`correctsNoteId` en notas, arreglos sin paginar | `estado`, `campo`, `texto`/`ocurridoEn`/`corrigeNotaId`, `{items, nextCursor}` |
| `expedientes` (alta) | `{curp, nombre, edad, telefono, sector, origen, consentimiento}` | §5.3 (`fechaNacimiento`, `sectorId`, objeto `consentimiento`) |
| `canalizacion` | `{tipo, destino, resumen}`; acciones `accept`/`reject`/`complete`/`cancel`; `origen`/`destino` como texto | §8.1 y §8.3 (`destinoId`/`institucionId`, `aceptar`…, objetos) |
| `administracion` | `{staffId, linkRequestId, motivo}`; `Cuenta.estado` `activa`/`suspendida` | §5.8 (`personalId`, `departamentoId`, `solicitudId`); `activo`/`suspendido` |
| `ayuda` | `action`, `occurredAt` en help-events | `accion`, `ocurridoEn` |
| `capacitacion` | Visita con `sector` texto | `sectorId` + `sector` |
