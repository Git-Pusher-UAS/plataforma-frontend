# SAI · Endpoints que necesitan las pantallas

**Versión:** 1.0 · 26 de noviembre de 2026
**Complemento de:** `FLUJO_PANTALLAS_SAI.md`

Lista de cada operación que llaman las 51 pantallas, con su estado frente al contrato. Todas las rutas van bajo `/api/v1`. En el código, cada una está en el `api.ts` de su módulo, con un comentario que nombra la ruta, y responde con datos simulados hasta que exista.

## Estados

| Marca | Significado |
|---|---|
| ✅ **En contrato** | Ya existe en `contract/openapi.yaml` |
| 🟡 **Documentada** | Está en `ENDPOINTS_SAI_MVP` v1.1 (código API-xxx) y en `PANTALLAS_ENDPOINTS_SAI_MVP.md`, pero **todavía no está en `openapi.yaml`** |
| 🔴 **Falta** | No existe en ningún documento. El frontend propone la ruta; el backend decide la definitiva |

**Resumen:** el contrato actual solo tiene `GET /health`. De las 58 operaciones que usan las pantallas, ninguna está en el contrato, 32 están documentadas (3 de ellas hay que ampliarlas) y 26 faltan.

Las rutas 🔴 siguen la convención de `PANTALLAS_ENDPOINTS_SAI_MVP.md` §6 (recursos en inglés, en plural y con guiones). También mantienen **separada** la identidad de la usuaria (`/portal/...`) de la del personal (`/auth/...`). Son una propuesta para empezar la discusión.

## Transversal

| Operación | Estado | Usada en | Nota |
|---|---|---|---|
| `GET /health` | ✅ En contrato | Ninguna pantalla (monitoreo) | El documento de endpoints la llama `/health/live` (API-001) |

## Acceso y cuenta del personal

| Operación | Estado | Pantallas | Qué espera la pantalla |
|---|---|---|---|
| `GET /auth/csrf-token` | 🟡 API-002 | P-01, P-03 | Token en memoria (ya lo maneja `api/client.ts`) |
| `POST /auth/login` | 🟡 API-003 | P-01 | `{ username, password }` → `202 { challengeId, next }` |
| `POST /auth/mfa/verify` | 🟡 API-005 | P-03 | `{ challengeId, code }` → `200 { actor }`. El simulado devuelve el actor con `rol` |
| `GET /users/me` | 🟡 API-006 | P-03, P-06, menú por rol | `{ usuario, nombre, rol, permisos }` |
| `POST /auth/logout` | 🟡 API-007 | P-06 | `204` |
| `GET /users/me/sessions` | 🟡 API-008 | P-06 | Lista `{ id, dispositivo, ultimoUso, actual }` |

## Expedientes

| Operación | Estado | Pantallas | Qué espera la pantalla |
|---|---|---|---|
| `GET /case-files?status&from&to&limit` | 🟡 API-020 | P-05, P-10 | Lista de `{ id, alias, estado, areas, abierto, actualizado }`. Sin búsqueda por nombre ni CURP |
| `GET /case-files/{recordId}` | 🟡 API-021 | P-14 a P-17 | Datos generales, campos ocultos **ya enmascarados** y `version`. Ajeno o inexistente: `404` igual |
| `PATCH /case-files/{recordId}` | 🟡 API-022 | P-14 | Cambio de estado con `If-Match`; reabrir lleva `motivo` |
| `POST /case-files/{recordId}/disclosures` | 🟡 API-028 | P-14b | `{ field, motivo }` → `{ valor }`. Se muestra 20 s y no se guarda |
| `POST /case-files/duplicate-checks` | 🟡 API-016 | P-11 | `{ curp }` en el cuerpo → `{ exists, department?, linkToken? }` |
| `POST /case-files` | 🟡 API-017 | P-12 | Alta atómica con `operationId` (Idempotency-Key). `409` lleva a P-13 |
| `POST /case-access-requests` | 🟡 API-018 | P-13 | `{ linkToken, motivo }`. `410` si venció |
| `GET /case-files/{recordId}/timeline` | 🟡 API-023 | P-15 | Eventos `{ id, fecha, area, texto }` de las áreas del actor |
| `GET /case-files/{recordId}/departments/{departmentId}/notes` | 🟡 API-026 | P-16 | Notas `{ id, autor, horaDeclarada, registrada, texto, corrigeA? }` |
| `POST /case-files/{recordId}/departments/{departmentId}/notes` | 🟡 API-027 | P-16 | `{ text, declaredAt, correctsNoteId?, operationId }` |
| `GET /case-files/{recordId}/consents` | 🟡 API-029 | P-17 | Historial `{ finalidad, decision, fecha, version, revocable }` |
| `POST /case-files/{recordId}/consents/{consentId}/revocations` | 🟡 API-031 | P-17 | `204`. El historial conserva la decisión original |
| `POST /notes/sync` | 🟡 API-041 | P-41 | Lote de hasta 20 → resultado por borrador (`applied`, `blocked`, `conflict`, `retryable`) |

## Canalizaciones

| Operación | Estado | Pantallas | Qué espera la pantalla |
|---|---|---|---|
| `GET /referrals?direction&status` | 🟡 API-032 | P-05, P-30 | `{ id, expedienteId, alias, tipo, origen, destino, resumen, estado, fecha, versionTag }` |
| `GET /referrals?recordId=` | 🔴 Falta (filtro nuevo de API-032) | P-14, pestaña Canalizaciones | Las canalizaciones de un expediente |
| `POST /referrals/{referralId}/transitions` | 🟡 API-034 | P-30 | `{ action, motivo? }` con `If-Match` = `versionTag` |
| `POST /case-files/{recordId}/referrals` | 🟡 API-033, 🔴 falta el tipo externo | P-30b | `{ tipo: 'interna' \| 'externa', destino, resumen, operationId }`. El tipo externo y el catálogo de instituciones son nuevos (E-05 de la Parte B) |

## Ayuda

| Operación | Estado | Pantallas | Qué espera la pantalla |
|---|---|---|---|
| `GET /institutional-contacts` | 🟡 API-039 | U-16, P-51, `/ayuda`, `/directorio` | Pública. `{ id, nombre, descripcion, telefono, horario, prioritario }` |
| `POST /help-events` | 🟡 API-040 | P-51 | `{ contactId, action: 'dialer_opened', occurredAt, operationId }` |
| `POST /help-alerts` | 🔴 Falta | U-05, U-06 | `{ lat?, lon?, operationId }` → `{ id, estado }`. Alerta de la usuaria a la agente 24/7 |
| `POST /help-alerts/{id}/trusted-contacts` | 🔴 Falta | U-07 | Avisa solo a contactos autorizados antes |
| `POST /help-alerts/{id}/cancellation` | 🔴 Falta | U-08 | `{ motivo }` |

## Portal de usuarias: identidad y perfil

| Operación | Estado | Pantallas | Qué espera la pantalla |
|---|---|---|---|
| `POST /portal/auth/login` | 🔴 Falta | U-02 | `{ identificador }` (CURP o nombre completo) → envía código por mensaje → `{ challengeId, telefonoMascara }`. La CURP identifica, no es contraseña |
| `POST /portal/auth/verify` | 🔴 Falta | U-03 | `{ challengeId, code }` → `{ alias }` y cookie de sesión propia de la usuaria |
| `POST /portal/accounts` | 🔴 Falta | U-04 | `{ nombre, curp, telefono, aceptaAviso }`. Origen «autorregistro» |
| `GET /portal/me` | 🔴 Falta | U-09 | `{ alias, telefonoMascara, contactosConfianza[], silenciarAvisos, compartirUbicacion, nombreDiscreto }` |
| `PATCH /portal/me` | 🔴 Falta | U-09 | `{ silenciarAvisos?, compartirUbicacion? }` |

## Cursos, charlas y visitas

| Operación | Estado | Pantallas | Qué espera la pantalla |
|---|---|---|---|
| `GET /courses?type=` | 🔴 Falta | U-10, K-01, K-02, K-04 | `{ id, tipo, titulo, descripcion, fecha, hora, lugar, cupo, inscritas, inscrita? }` |
| `GET /courses/{id}` | 🔴 Falta | U-11, K-05 | Un evento |
| `POST /courses` | 🔴 Falta | K-03 | Crea y publica en el foro |
| `POST /courses/{id}/enrollments` | 🔴 Falta | U-11 | Inscripción de la usuaria |
| `GET /courses/{id}/attendance` | 🔴 Falta | K-05 | `{ id, alias, presente }`. Solo alias |
| `PUT /courses/{id}/attendance` | 🔴 Falta | K-05 | `[{ enrollmentId, presente }]` |
| `GET /outreach-visits` | 🔴 Falta | K-01, K-06 | `{ id, sector, fecha, tema, responsable, estado }` |
| `POST /outreach-visits` | 🔴 Falta | K-06 | `{ sector, fecha, tema }` |

## Bolsa de trabajo

| Operación | Estado | Pantallas | Qué espera la pantalla |
|---|---|---|---|
| `GET /jobs?sector&schedule&type&location` | 🔴 Falta | U-12, K-01, K-07 | `{ id, puesto, empresa, sector, horario, tipoEmpleo, ubicacion, descripcion, requisitos[], publicadaEn?, actualizada, postulada?, postulaciones? }` |
| `GET /jobs/{id}` | 🔴 Falta | U-13 | Una vacante con `{ ..., publicadaEn?, actualizada, ... }` |
| `POST /jobs` | 🔴 Falta | K-08 | Capacitación publica la vacante; `publicadaEn` lo genera el servidor |
| `POST /jobs/{id}/applications` | 🔴 Falta | U-13 | Postulación. La Secretaría hace de puente con la empresa |

## Encuestas

| Operación | Estado | Pantallas | Qué espera la pantalla |
|---|---|---|---|
| `GET /surveys/pending` | 🔴 Falta | U-05, U-14 | `{ id, titulo, minutos, preguntas[] }` con títulos neutros |
| `GET /surveys/{id}` | 🔴 Falta | U-15 | Preguntas de tipo `escala`, `opcion` o `abierta` |
| `POST /surveys/{id}/responses` | 🔴 Falta | U-15 | `{ respuestas, operationId }`. Una vez por asignación |
| `GET /surveys/results` | 🔴 Falta | D-07 | Solo agregados: promedio por pregunta y conteo por opción, `null` si hay menos de 5 |

## Administración

| Operación | Estado | Pantallas | Qué espera la pantalla |
|---|---|---|---|
| `GET /case-access-requests?status=` | 🟡 API-019 | D-01, D-04 | Solo metadatos `{ id, expedienteId, solicitante, departamento, motivo, fecha, estado }` |
| `POST /case-files/{recordId}/assignments` | 🟡 API-024 | D-04 | `{ staffId, linkRequestId, motivo }` |
| `POST /case-access-requests/{id}/rejection` | 🔴 Falta | D-04 | `{ motivo }`. El flujo del MVP señala que no existe (límite 4) |
| `GET /users?q=&role=` | 🟡 API-010, 🔴 falta el filtro `role` | D-04, D-06 | En D-04 se usa para elegir a quién asignar. Hoy API-010 es solo de AdministradorTI (límite 1 del flujo del MVP) |
| `POST /users` | 🟡 API-011 | D-06 | → `{ cuenta, activacion }`. La activación se muestra una sola vez |
| `PATCH /users/{userId}` | 🟡 API-012 | D-06 | `{ rol?, estado? }`. Cierra las sesiones de la cuenta |
| `GET /audit-logs?actorId&recordId&action&from&to` | 🟡 API-035 | D-05 | `{ id, fecha, actor, rol, accion, expediente?, detalle }`. La consulta se audita |
| `GET /analytics/summary?period=` | 🟡 API-037, 🔴 faltan series | D-01, D-02 | Indicadores, corte y metodología, más series nuevas `porMes`, `porOrigen` y `porArea`. `null` = suprimido |
| `GET /analytics/heatmap` | 🟡 API-038 | D-03, K-06 | Nivel 1 a 5 por AGEB o `suppressed`. **Aún no se llama**: el mapa solo muestra la geometría |

## Qué hacer cuando el backend publique un endpoint

1. Sincronizar el contrato: `make sync-contract REF=contract-vN` y `make gen`.
2. En el `api.ts` del módulo, tipar la respuesta con `src/api/generated/schema.d.ts` y ajustar la forma si cambió.
3. Probar con `make mock` + `make dev-mock`, y después contra el backend con `VITE_DATOS_SIMULADOS=false`.
4. Cambiar su marca en este documento a ✅.
