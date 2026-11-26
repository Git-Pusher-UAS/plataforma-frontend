# SAI — Pantallas y endpoints del MVP

**Versión:** 0.1
**Base:** `ENDPOINTS_SAI_MVP` v1.1 (41 operaciones, API-001 a API-041) y `01_SRS_A_MVP`
**Complementa:** `FLUJO_PANTALLAS_SAI_MVP.md`, que describe cómo se mueve la persona entre pantallas. Este archivo dice **qué llama cada pantalla**, con qué encabezados y con qué validaciones.

Sirve para comprobar la coherencia entre frontend y contrato: cada pantalla enumera sus endpoints y cada endpoint está asignado a una pantalla. Si cambia un endpoint en el contrato, se actualiza aquí.

Las rutas se escriben con el prefijo común `/api/v1` omitido.

---

## 1. Qué llama cada pantalla

### Acceso y sesión

| Pantalla | Endpoints | Cuándo se llaman | Detalles |
|---|---|---|---|
| **P-01** Acceso | API-002 `GET /auth/csrf-token`<br>API-003 `POST /auth/login`<br>API-039 `GET /institutional-contacts` | Token al abrir la pantalla. Login al enviar. Directorio solo si se abre el enlace de ayuda | Login responde `202` con `challengeId` y `next`: `"totp"` o `"enroll"`. Errores: 401 credenciales, 429 con `Retry-After` |
| **P-02** Configurar segundo factor | API-004 `POST /auth/mfa/enrollments`<br>API-005 `POST /auth/mfa/verify`<br>API-002 | Enrolamiento al entrar. Verificación al enviar el primer código | El enrolamiento devuelve `otpauthUri`, que se muestra una sola vez. `verify` lleva `enrollmentId`. 409 si ya estaba enrolado |
| **P-03** Verificar código | API-005 `POST /auth/mfa/verify`<br>API-002<br>API-006 `GET /users/me`<br>API-015 `GET /catalogs` | Verificación al enviar. Después, renovar CSRF, cargar cuenta y catálogos | `verify` responde `200` con `actor` y `expiresAt`. Código inválido, vencido o repetido: 401 |
| **P-04** Sesión vencida | Ninguno | Se muestra al recibir 401 en cualquier llamada | Conserva solo la ruta. Lleva a P-01 |
| **P-05** Inicio | API-006 `GET /users/me` (ya cargado)<br>API-032 `GET /referrals?direction=incoming&status=pendiente&limit=1` | Al abrir. La segunda solo si el actor tiene bandeja | Solo atajos por rol y un aviso si hay canalizaciones pendientes. No hay endpoint de conteos |

### Cuenta

| Pantalla | Endpoints | Cuándo se llaman | Detalles |
|---|---|---|---|
| **P-06** Mi cuenta | API-006 `GET /users/me`<br>API-007 `POST /auth/logout` | Lectura al abrir. Logout al pulsar Salir de sesión | Logout responde `204` y expira la cookie |
| **P-07** Mis sesiones | API-008 `GET /users/me/sessions`<br>API-009 `DELETE /users/me/sessions/{sessionId}` | Lectura al abrir. Borrado al revocar una fila | Revocar la sesión actual equivale a cerrar sesión: llevar a P-01 |

### Expedientes

| Pantalla | Endpoints | Cuándo se llaman | Detalles |
|---|---|---|---|
| **P-10** Lista | API-020 `GET /case-files`<br>API-015 (para filtros) | Al abrir y al cambiar filtros o página | Filtros `status`, `from`, `to`, `departmentId`. `limit` 20 por defecto, máximo 100, con `cursor` |
| **P-11** Comprobar duplicado | API-016 `POST /case-files/duplicate-checks` | Al enviar la CURP | Cuerpo `{curp}`. Respuesta `{exists, department?, linkToken?}`. 422 CURP inválida, 429 exceso |
| **P-12** Datos, origen y consentimiento | API-017 `POST /case-files`<br>API-015 | Catálogos al abrir. Alta al guardar | Requiere `Idempotency-Key` y `operationId` iguales. `201` con `Location` y `ETag`. 409 persona ya existente |
| **P-13** Persona ya registrada | API-018 `POST /case-access-requests` | Al solicitar acceso | Cuerpo `{linkToken, motivo}`. `201` con `requestId` y estado `pendiente`. 410 enlace vencido |
| **P-14** Resumen | API-021 `GET /case-files/{recordId}`<br>API-022 `PATCH /case-files/{recordId}`<br>API-028 `POST /case-files/{recordId}/disclosures`<br>API-033 `POST /case-files/{recordId}/referrals` | Lectura al abrir. Las demás desde diálogos | La lectura devuelve `ETag`. `PATCH` exige `If-Match`. Revelar exige `motivo`. Canalizar exige `Idempotency-Key` |
| **P-15** Línea de tiempo | API-023 `GET /case-files/{recordId}/timeline` | Al abrir y al paginar | Solo eventos de las áreas del actor |
| **P-16** Notas del área | API-026 `GET /case-files/{recordId}/departments/{departmentId}/notes`<br>API-027 `POST` (misma ruta) | Lectura al abrir. Alta desde el editor | Alta con `Idempotency-Key` y `operationId`. Corrección con `correctsNoteId`. 409 clave reutilizada con otro contenido o corrección de otra área |
| **P-17** Consentimientos | API-029 `GET /case-files/{recordId}/consents`<br>API-030 `POST` (misma ruta)<br>API-031 `POST /case-files/{recordId}/consents/{consentId}/revocations` | Lectura al abrir. Las otras desde diálogos | Registro con `Idempotency-Key`. 409 versión de aviso obsoleta o propósito ya revocado. 422 propósito no revocable |

### Coordinación

| Pantalla | Endpoints | Cuándo se llaman | Detalles |
|---|---|---|---|
| **P-20** Solicitudes de acceso | API-019 `GET /case-access-requests`<br>API-024 `POST /case-files/{recordId}/assignments` | Lectura al abrir y al filtrar por `status`. Asignación desde el diálogo | Asignar lleva `{staffId, departmentId, linkRequestId, motivo}`. 409 asignación vigente repetida. 422 rol y departamento incompatibles |
| (sin pantalla definida) | API-025 `POST /case-files/{recordId}/assignments/{assignmentId}/revocations` | Pendiente de resolver el origen de `assignmentId` | Ver límite 3 en el flujo. Responde `204` |

### Canalizaciones

| Pantalla | Endpoints | Cuándo se llaman | Detalles |
|---|---|---|---|
| **P-30** Canalizaciones | API-032 `GET /referrals`<br>API-034 `POST /referrals/{referralId}/transitions` | Lectura al abrir, al cambiar de pestaña o filtrar. Transición desde cada acción | Lectura con `direction` obligatorio (`incoming` o `outgoing`) y `status` opcional. Transición con `If-Match` tomado de `versionTag`. Acciones `accept`, `reject`, `complete`, `cancel` |

### Sin conexión

| Pantalla | Endpoints | Cuándo se llaman | Detalles |
|---|---|---|---|
| **P-40** PIN local | Ninguno | Es local al dispositivo | Cifra y descifra la cola. No viaja al servidor |
| **P-41** Borradores | API-041 `POST /notes/sync` | Al volver la conexión y al pulsar Reintentar | Lote de 1 a 20 notas. Cada una con su `operationId`. Responde `200` con un resultado por nota. 401 invalida todo el lote |

### Ayuda

| Pantalla | Endpoints | Cuándo se llaman | Detalles |
|---|---|---|---|
| **P-50** Directorio | API-039 `GET /institutional-contacts` | Al abrir con conexión | Pública. Admite `version`. Se guarda una copia versionada en el dispositivo; no la guarda el service worker |
| **P-51** Hoja "Necesito ayuda" | API-039 (copia local)<br>API-040 `POST /help-events` | Contactos desde la copia local. Registro después de abrir el marcador | Registro con `Idempotency-Key`, `operationId`, `occurredAt` y `action: "dialer_opened"`. Solo con permiso de ayuda. No se encola sin conexión |

### Administración

| Pantalla | Endpoints | Cuándo se llaman | Detalles |
|---|---|---|---|
| **P-60** Personal | API-010 `GET /users`<br>API-011 `POST /users`<br>API-012 `PATCH /users/{userId}`<br>API-013 `POST /users/{userId}/session-revocations`<br>API-014 `POST /users/{userId}/mfa-resets` | Lectura al abrir y al buscar. Las demás desde diálogos | `PATCH` con `If-Match` tomado de `versionTag`. Errores: 403 autoelevación, 409 último administrador activo o usuario repetido. `mfa-resets` responde `202` |

### Auditoría y analítica

| Pantalla | Endpoints | Cuándo se llaman | Detalles |
|---|---|---|---|
| **P-70** Bitácora | API-035 `GET /audit-logs` | Al abrir y al filtrar | Filtros `actorId`, `recordId`, `action`, `from`, `to`. La consulta se audita |
| **P-71** Alertas | API-036 `GET /audit-alerts` | Al abrir y al filtrar por `status` | Paginada |
| **P-72** Indicadores | API-037 `GET /analytics/summary` | Al abrir y al cambiar filtros | Filtros `from`, `to`, `sectorId`, `type`, `status`. Respuesta con corte, métrica y supresión |
| **P-73** Mapa | API-038 `GET /analytics/heatmap` | Al abrir y al cambiar filtros | Filtros `from`, `to`, `type`. Sectores con nivel, `count` nulo y `suppressed` |

### Sin pantalla propia

| Endpoint | Uso |
|---|---|
| API-001 `GET /health/live` | Monitoreo y verificación del entorno. La interfaz no lo muestra |

---

## 2. Cobertura de los 41 endpoints

| ID | Método y ruta | Pantalla | Requisito |
|---|---|---|---|
| API-001 | `GET /health/live` | Ninguna (monitoreo) | RNF-09 |
| API-002 | `GET /auth/csrf-token` | P-01, P-02, P-03 | RF-01 |
| API-003 | `POST /auth/login` | P-01 | RF-01 |
| API-004 | `POST /auth/mfa/enrollments` | P-02 | RF-01 |
| API-005 | `POST /auth/mfa/verify` | P-02, P-03 | RF-01 |
| API-006 | `GET /users/me` | P-03, P-05, P-06 | RF-01 |
| API-007 | `POST /auth/logout` | P-06, P-04, menú | RF-02 |
| API-008 | `GET /users/me/sessions` | P-07 | RF-02 |
| API-009 | `DELETE /users/me/sessions/{sessionId}` | P-07 | RF-02 |
| API-010 | `GET /users` | P-60 | RF-02 |
| API-011 | `POST /users` | P-60 | RF-02 |
| API-012 | `PATCH /users/{userId}` | P-60 | RF-02 |
| API-013 | `POST /users/{userId}/session-revocations` | P-60 | RF-02 |
| API-014 | `POST /users/{userId}/mfa-resets` | P-60 | RF-02 |
| API-015 | `GET /catalogs` | P-03 (carga), P-10, P-12, P-17, P-60 | RF-04 |
| API-016 | `POST /case-files/duplicate-checks` | P-11 | RF-03 |
| API-017 | `POST /case-files` | P-12 | RF-04 |
| API-018 | `POST /case-access-requests` | P-13 | RF-03 |
| API-019 | `GET /case-access-requests` | P-20 | RF-03 |
| API-020 | `GET /case-files` | P-10 | RF-05 |
| API-021 | `GET /case-files/{recordId}` | P-14 (y encabezado de P-15 a P-17) | RF-05 |
| API-022 | `PATCH /case-files/{recordId}` | P-14 | RF-05 |
| API-023 | `GET /case-files/{recordId}/timeline` | P-15 | RF-07 |
| API-024 | `POST /case-files/{recordId}/assignments` | P-20 | RF-06 |
| API-025 | `POST /case-files/{recordId}/assignments/{assignmentId}/revocations` | Sin pantalla definida (límite 3) | RF-06 |
| API-026 | `GET /case-files/{recordId}/departments/{departmentId}/notes` | P-16 | RF-07 |
| API-027 | `POST /case-files/{recordId}/departments/{departmentId}/notes` | P-16 | RF-07 |
| API-028 | `POST /case-files/{recordId}/disclosures` | P-14 | RF-08 |
| API-029 | `GET /case-files/{recordId}/consents` | P-17 | RF-14 |
| API-030 | `POST /case-files/{recordId}/consents` | P-17 | RF-14 |
| API-031 | `POST /case-files/{recordId}/consents/{consentId}/revocations` | P-17 | RF-14 |
| API-032 | `GET /referrals` | P-30, P-05 | RF-09 |
| API-033 | `POST /case-files/{recordId}/referrals` | P-14 | RF-09 |
| API-034 | `POST /referrals/{referralId}/transitions` | P-30 | RF-09 |
| API-035 | `GET /audit-logs` | P-70 | RF-10 |
| API-036 | `GET /audit-alerts` | P-71 | RF-10 |
| API-037 | `GET /analytics/summary` | P-72 | RF-13 |
| API-038 | `GET /analytics/heatmap` | P-73 | RF-13 |
| API-039 | `GET /institutional-contacts` | P-01 (enlace), P-50, P-51 | RF-12 |
| API-040 | `POST /help-events` | P-51 | RF-12 |
| API-041 | `POST /notes/sync` | P-41 | RF-11 |

---

## 3. Reglas de llamada del cliente

### 3.1 Secuencia de acceso y CSRF

El token CSRF está ligado al contexto de autenticación. **Cada cambio de contexto exige pedir uno nuevo.**

| Paso | Llamada | Contexto resultante |
|---|---|---|
| 1 | API-002 `GET /auth/csrf-token` | Anónimo |
| 2 | API-003 `POST /auth/login` con `X-CSRF-Token` | Preautenticado |
| 3 | API-002 de nuevo | Preautenticado (token nuevo) |
| 4 | Si es primer ingreso: API-004 `POST /auth/mfa/enrollments` | Preautenticado |
| 5 | API-005 `POST /auth/mfa/verify` | Sesión completa |
| 6 | API-002 de nuevo y API-006 `GET /users/me` | Sesión completa |

El token vive **solo en memoria**. Se envía como `X-CSRF-Token` en todo cambio (POST, PATCH, DELETE), incluidos login y logout. Una sesión preautenticada **nunca** sirve para rutas de expedientes.

### 3.2 Encabezados obligatorios

| Encabezado | Dónde es obligatorio | Cómo se obtiene |
|---|---|---|
| `X-CSRF-Token` | Todo cambio | API-002, renovado en cada cambio de contexto |
| `Idempotency-Key` | API-017, API-027, API-030, API-033, API-040 | UUID generado al abrir el formulario o al crear el borrador. **Se conserva en cada reintento** |
| `If-Match` | API-012, API-022, API-034 | API-022: del `ETag` de la lectura (API-021). API-012 y API-034: del `versionTag` del elemento en el listado |

Reglas:

- Si el cuerpo trae `operationId`, debe ser **idéntico** a la `Idempotency-Key`.
- API-041 no usa una sola clave: cada nota lleva su propio `operationId`.
- Misma clave con el mismo contenido: el servidor devuelve el resultado original (`Idempotency-Replayed: true`). Misma clave con otro contenido: 409.
- Un reintento tras respuesta incierta se hace **con la misma clave**. No se generan claves nuevas para "volver a intentar".
- Sin `If-Match`, 428; con versión antigua, 412.

### 3.3 Paginación

- `limit` (20 por defecto, máximo 100) y `cursor` opcional.
- La respuesta es `{ items: [], nextCursor }`. El cursor es opaco: **no se parsea ni se modifica**.
- Un cursor incompatible con los filtros o el orden devuelve 422: se reinicia la lista desde la primera página.
- Al cambiar un filtro, se descarta el cursor anterior.

### 3.4 Datos y caché

- Todas las respuestas de identidad y negocio son `no-store`. El cliente **no guarda** sus respuestas fuera de la memoria de la pantalla.
- El service worker no maneja `/api/v1`.
- Lo único que se guarda de forma explícita en el dispositivo: la copia versionada del directorio público (API-039) y los borradores de notas cifrados.
- Fechas: instantes en RFC 3339 con zona; fechas de calendario `YYYY-MM-DD`. Se presentan en `America/Mazatlan`.
- Nada de CURP, notas, domicilios o tokens en URLs.

---

## 4. Formularios y validaciones

Los límites vienen del contrato; el cliente los valida **para ayudar**, no como medida de seguridad: el servidor vuelve a validar todo.

### Acceso

| Campo | Regla |
|---|---|
| Usuario | Texto, de 1 a 100 caracteres |
| Contraseña | De 12 a 128 caracteres |
| Código del segundo factor | Exactamente 6 dígitos |

### Nuevo expediente (P-11 y P-12)

| Campo | Regla |
|---|---|
| CURP | 18 caracteres. Se normaliza a mayúsculas y sin espacios. Se valida formato, que no acredita identidad oficial |
| Nombre | De 1 a 150 caracteres |
| Fecha de nacimiento | Fecha válida, no futura |
| Teléfono | Opcional, de 8 a 20 caracteres |
| Domicilio | Opcional, de 1 a 500 caracteres |
| Sector | Valor del catálogo |
| Origen del contacto | `presencial`, `institucion`, `linea_atencion`, `patrulla_genero` o `emergencia_referida`. El autorregistro está deshabilitado |
| Versión del aviso | Del catálogo, de 1 a 50 caracteres |
| Propósitos del consentimiento | Entre 1 y 10 claves del catálogo |
| Decisión | `aceptado` o `rechazado` |
| Modalidad | `presencial` o `digital` |
| Hora de captura | Fecha y hora con zona |

No hay campo de adjuntos ni de referencia a evidencia: el MVP no los admite y no debe aceptarse un archivo ni un enlace.

### Datos generales y estado (P-14)

| Campo | Regla |
|---|---|
| Nombre, fecha de nacimiento, teléfono, sector | Mismas reglas que el alta; todos opcionales (omitir conserva el valor) |
| Estado | `abierto`, `en_seguimiento` o `cerrado`. Secuencia `abierto → en_seguimiento → cerrado` |
| Motivo | **Obligatorio al reabrir** un expediente cerrado (`cerrado → en_seguimiento`), de 10 a 500 caracteres |

### Revelar dato oculto (P-14)

| Campo | Regla |
|---|---|
| Campo a revelar | `domicilio`, `curp` o `telefono` |
| Motivo | De 10 a 500 caracteres |

### Notas (P-16 y P-41)

| Campo | Regla |
|---|---|
| Texto | De 1 a 10 000 caracteres |
| Hora declarada | Fecha y hora con zona del dispositivo |
| Corrección de | Identificador de una nota del **mismo** expediente y área |

El autor y el área no se envían ni se editan: los determina el servidor.

### Consentimientos (P-17)

| Campo | Regla |
|---|---|
| Registrar | Los mismos campos de consentimiento del alta |
| Revocar: propósitos | Lista de claves de propósitos opcionales |
| Revocar: motivo | De 1 a 500 caracteres |

### Canalización (P-14 y P-30)

| Campo | Regla |
|---|---|
| Departamento destino | Del catálogo; distinto del propio |
| Resumen | De 1 a 2 000 caracteres |
| Transición | `accept`, `reject`, `complete` o `cancel` |
| Motivo | **Obligatorio** al rechazar o cancelar, de 10 a 500 caracteres |

### Asignación (P-20)

| Campo | Regla |
|---|---|
| Personal | Identificador de la cuenta a asignar |
| Departamento | Del catálogo; compatible con el rol de la persona |
| Motivo | De 10 a 500 caracteres |
| Solicitud que se resuelve | Identificador de la solicitud (opcional) |

### Administración de personal (P-60)

| Campo | Regla |
|---|---|
| Usuario | Texto único |
| Nombre laboral | De 1 a 150 caracteres |
| Rol | `TrabajoSocial`, `Psicología`, `Jurídico`, `Coordinación`, `Dirección`, `AdministradorTI` o `AdministraciónAnalítica` |
| Departamento | Del catálogo |
| Estado | `activo` o `suspendido` |
| Cerrar sesiones: motivo | De 10 a 500 caracteres |
| Restablecer segundo factor | Motivo de 10 a 500 caracteres y confirmación de verificación presencial |
| Búsqueda | Texto libre sin datos de personas atendidas |

### Ayuda (P-51)

| Campo | Regla |
|---|---|
| Acción registrada | Solo `dialer_opened` |
| Hora | Fecha y hora con zona |

Límites generales: cuerpo de hasta 256 KiB, sin campos desconocidos ni propiedades duplicadas.

---

## 5. Errores particulares y qué muestra cada pantalla

| Pantalla | Respuesta | Mensaje o comportamiento |
|---|---|---|
| P-01 | 401 | "Usuario o contraseña incorrectos." Mismo texto para ambos casos |
| P-01 | 429 | Espera según `Retry-After`; la acción se deshabilita |
| P-02 | 409 | La cuenta ya tenía el segundo factor: pasar a P-03 |
| P-03 | 401 | "Código incorrecto, vencido o ya usado." |
| P-11 | 422 | "El formato de la CURP no es válido." |
| P-12 | 409 | Otra persona ya registró esta CURP: volver a P-11 |
| P-13 | 410 | "El enlace venció. Vuelve a comprobar." Regresa a P-11 |
| P-14 | 412 | "El expediente cambió. Se cargaron los datos más recientes." |
| P-14 | 409 | Transición de estado inválida: mostrar los estados permitidos |
| P-14 (revelar) | 403 | "No tienes permiso para ver este dato." |
| P-16 | 409 | Clave reutilizada con otro contenido, o corrección de una nota de otra área |
| P-17 | 409 | Versión de aviso obsoleta o propósito ya revocado |
| P-17 | 422 | El propósito no se puede revocar por este flujo |
| P-20 | 409 | Ya existe esa asignación vigente |
| P-20 | 422 | El rol y el departamento no son compatibles |
| P-30 | 409 | Transición inválida: recargar la lista |
| P-30 | 412 | El elemento cambió: recargar la lista |
| P-30 (crear) | 409 / 422 | Ya hay una canalización activa equivalente / el origen es igual al destino |
| P-41 | por borrador | `blocked` (acceso retirado), `conflict` (clave reutilizada) o `retryable` (se reintenta con la misma clave) |
| P-41 | 401 | Vuelve a P-04, se autentica y reenvía con las mismas claves |
| P-60 | 403 | No se puede modificar la propia cuenta |
| P-60 | 409 | Es el último administrador activo, o el usuario ya existe |
| P-60 | 202 (mfa-resets) | "Restablecimiento solicitado." No afirma que terminó |

Todos los demás casos siguen la tabla de estados transversales del archivo de flujo (§5).
