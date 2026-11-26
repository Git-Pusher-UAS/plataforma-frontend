# SAI — Flujo de pantallas del MVP

**Versión:** 0.1 — diseño del flujo del frontend
**Base:** `01_SRS_A_MVP` (RF-01 a RF-14, RNF y reglas de negocio), `ENDPOINTS_SAI_MVP` v1.1 (41 operaciones) y, para la Parte B, `Paso1_Definicion_Proyecto_v2`
**Alcance:** las secciones 1 a 7 (**Parte A**) cubren al personal de la Secretaría dentro del contrato del MVP A. Las secciones 8 a 12 (**Parte B**) registran las pantallas que el Paso 1 pide y ese contrato no cubre: el portal de la usuaria y funciones adicionales del personal. **Las pantallas de la Parte B todavía no tienen endpoints.**
**Archivo complementario:** `PANTALLAS_ENDPOINTS_SAI_MVP.md` (qué endpoint llama cada pantalla, headers, formularios y validaciones).

Este documento registra **cómo se mueve una persona por la aplicación**. Los nombres de pantalla y las rutas del cliente son propuestas del frontend; las rutas de la API son las del documento de endpoints y no se modifican aquí. Prefijos: `P-xx` pantallas del personal en el MVP A, `U-xx` portal de la usuaria y `E-xx` extensiones del personal (Parte B).

---

## 1. Principios que gobiernan el flujo

Salen del SRS y condicionan cada pantalla:

1. **Ocultar no es autorizar.** El menú y los botones se derivan del rol y los permisos del actor (`GET /users/me`), pero quien decide es el servidor en cada petición (RNF-01).
2. **No hay copia local de expedientes.** Sin conexión solo se pueden usar el directorio de ayuda y los borradores de notas cifrados. Nada de datos de negocio en caché ni en `localStorage` (RF-11, RF-12, RNF-07).
3. **Un solo "no disponible".** Un expediente ajeno y uno inexistente llevan a la misma pantalla y el mismo texto; la interfaz nunca los distingue (AT-02).
4. **Lo que no te corresponde no se anuncia.** Las secciones de otras áreas no se muestran con conteos ni candados que confirmen que hay notas (SRS §10).
5. **La sesión vence.** Por inactividad (15 min) o por duración máxima (8 h). Al vencer, el contenido se oculta y se pide autenticarse; nunca se sigue autorizando con datos locales (RNF-04).
6. **Lo sensible tiene costo.** Revelar un dato oculto exige motivo y queda auditado; consultar la bitácora también queda auditado, y la pantalla lo avisa.
7. **Reintentar no duplica.** Todo formulario que crea algo genera su `Idempotency-Key` al abrirse y la conserva en cada reintento.
8. **La ayuda no promete.** El botón abre el marcador del teléfono; la interfaz nunca dice que la llamada se completó ni que alguien acudirá (RF-12).
9. **Salida rápida siempre visible**, incluso en la pantalla de acceso. Lleva a una página neutra y no promete borrar rastros del dispositivo.
10. **Textos neutros.** La aplicación se instala como "Agenda"; títulos, íconos y notificaciones no deben delatar su propósito.
11. **Adaptable desde 360 px**, controles táctiles de 48 px, foco visible y estados que no dependan solo del color (RNF-08).

---

## 2. Mapa de navegación

```mermaid
flowchart TD
  A["P-01 Acceso"] --> B["P-03 Verificar código"]
  A --> A2["P-02 Configurar segundo factor"]
  A2 --> B
  B --> C["P-05 Inicio según rol"]

  C --> E["Expedientes"]
  C --> F["Canalizaciones"]
  C --> G["Solicitudes de acceso"]
  C --> H["Auditoría"]
  C --> I["Analítica"]
  C --> J["Administración de personal"]
  C --> K["Pendientes sin conexión"]
  C --> L["Mi cuenta"]

  E --> E1["P-10 Lista"]
  E1 --> E2["P-14 Resumen"]
  E2 --> E3["P-15 Línea de tiempo"]
  E2 --> E4["P-16 Notas del área"]
  E2 --> E5["P-17 Consentimientos"]
  E1 --> E6["P-11 Nuevo expediente"]

  F --> F1["P-30 Canalizaciones"]
  G --> G1["P-20 Solicitudes de acceso"]
  H --> H1["P-70 Bitácora"]
  H --> H2["P-71 Alertas"]
  I --> I1["P-72 Indicadores"]
  I --> I2["P-73 Mapa por sector"]
  J --> J1["P-60 Personal"]
  K --> K1["P-41 Borradores"]
  L --> L1["P-06 Mi cuenta"]
  L --> L2["P-07 Mis sesiones"]
```

Presentes en **todas** las pantallas autenticadas: botón **Necesito ayuda** (P-51), botón **Salir** (salida rápida) y aviso de estado de conexión. En la pantalla de acceso solo están la salida rápida y el enlace al directorio de ayuda (P-50), que es público.

### Menú por rol

El menú se construye con el rol; si algo requiere un permiso adicional (bitácora, bandeja de canalizaciones, ayuda), se muestra solo cuando el actor lo trae.

| Rol | Opciones de menú |
|---|---|
| **TrabajoSocial** | Inicio · Expedientes · Nuevo expediente · Canalizaciones · Pendientes · Ayuda · Mi cuenta |
| **Psicología** | Inicio · Expedientes (asignados) · Canalizaciones* · Pendientes · Ayuda · Mi cuenta |
| **Jurídico** | Inicio · Expedientes (asignados) · Canalizaciones* · Pendientes · Ayuda · Mi cuenta |
| **Coordinación** | Inicio · Solicitudes de acceso · Canalizaciones* · Auditoría* · Analítica · Ayuda · Mi cuenta |
| **Dirección** | Inicio · Auditoría* · Analítica · Ayuda · Mi cuenta |
| **AdministradorTI** | Inicio · Administración de personal · Ayuda · Mi cuenta |
| **AdministraciónAnalítica** | Inicio · Analítica · Ayuda · Mi cuenta |

\* Requiere el permiso correspondiente además del rol.

Coordinación, Dirección, AdministradorTI y AdministraciónAnalítica **no tienen la opción Expedientes**: la jerarquía no concede lectura de expedientes ni de notas.

---

## 3. Inventario de pantallas

| ID | Pantalla | Ruta del cliente | Quién la usa |
|---|---|---|---|
| P-01 | Acceso (usuario y contraseña) | `/acceso` | Anónimo |
| P-02 | Configurar segundo factor (primer ingreso) | `/acceso/configurar-mfa` | Preautenticado |
| P-03 | Verificar código | `/acceso/verificacion` | Preautenticado |
| P-04 | Sesión vencida (contenido oculto) | `/sesion-vencida` | Cualquier rol |
| P-05 | Inicio | `/` | Cualquier rol |
| P-06 | Mi cuenta | `/cuenta` | Cualquier rol |
| P-07 | Mis sesiones | `/cuenta/sesiones` | Cualquier rol |
| P-10 | Lista de expedientes | `/expedientes` | TrabajoSocial, Psicología, Jurídico |
| P-11 | Nuevo expediente: comprobar duplicado | `/expedientes/nuevo` | TrabajoSocial |
| P-12 | Nuevo expediente: datos, origen y consentimiento | `/expedientes/nuevo/datos` | TrabajoSocial |
| P-13 | Persona ya registrada: solicitar acceso | `/expedientes/nuevo/existente` | TrabajoSocial |
| P-14 | Expediente: resumen | `/expedientes/:recordId` | Asignados |
| P-15 | Expediente: línea de tiempo | `/expedientes/:recordId/linea-de-tiempo` | Asignados |
| P-16 | Expediente: notas de un área | `/expedientes/:recordId/areas/:departmentId/notas` | Asignados al caso y al área |
| P-17 | Expediente: consentimientos | `/expedientes/:recordId/consentimientos` | Asignados |
| P-20 | Solicitudes de acceso | `/solicitudes-acceso` | Coordinación |
| P-30 | Canalizaciones (entrantes y salientes) | `/canalizaciones` | Origen asignado o receptor con permiso |
| P-40 | Crear o desbloquear PIN local | `/pin` | Personal con borradores |
| P-41 | Borradores pendientes | `/pendientes` | TrabajoSocial, Psicología, Jurídico |
| P-50 | Directorio de ayuda | `/ayuda` | Público (sin sesión) |
| P-51 | Hoja "Necesito ayuda" | Superposición global | Personal autenticado |
| P-60 | Administración de personal | `/administracion/personal` | AdministradorTI |
| P-70 | Bitácora | `/auditoria` | Dirección, Coordinación |
| P-71 | Alertas de acceso | `/auditoria/alertas` | Dirección, Coordinación |
| P-72 | Indicadores | `/analitica` | AdministraciónAnalítica, Dirección, Coordinación |
| P-73 | Mapa por sector | `/analitica/mapa` | AdministraciónAnalítica, Dirección, Coordinación |
| P-90 | Recurso no disponible | `*` | Cualquiera |
| P-91 | Sin conexión | Estado global | Cualquiera |

Diálogos (no tienen ruta propia): editar datos generales, revelar dato oculto, nueva nota o corrección, registrar consentimiento, revocar consentimiento, canalizar, asignar personal, crear o editar cuenta, motivos de acciones.

---

## 4. Flujos

### 4.1 Acceso y sesión (RF-01, RF-02)

**Objetivo:** iniciar una sesión completa solo después de contraseña **y** segundo factor.

```mermaid
flowchart TD
  A["P-01 Acceso"] -->|"credenciales válidas, 202"| B{"¿Primer ingreso?"}
  A -->|"401 credenciales inválidas"| A
  A -->|"429 bloqueo temporal"| A3["Mostrar espera según Retry-After"]
  A3 --> A
  B -->|"sí"| C["P-02 Configurar segundo factor"]
  B -->|"no"| D["P-03 Verificar código"]
  C -->|"se escanea el código y se escribe el primer código"| D
  D -->|"código válido, 200"| E["Cargar cuenta y catálogos"]
  D -->|"401 inválido, vencido o repetido"| D
  D -->|"429 exceso de intentos"| A3
  E --> F["P-05 Inicio según rol"]
```

Pasos:

1. P-01 obtiene el token CSRF al abrirse y envía usuario y contraseña. La respuesta indica si sigue configurar o verificar el segundo factor.
2. **P-02** (solo primer ingreso): muestra el código para la app autenticadora **una sola vez** y pide el primer código de 6 dígitos.
3. **P-03**: pide el código de 6 dígitos. Un código ya usado se rechaza.
4. Al completar, se renueva el token CSRF, se consulta la cuenta y se cargan los catálogos. Desde aquí el menú depende del rol.
5. Una contraseña correcta sin segundo factor nunca da acceso a una pantalla de negocio (AT-01): si alguien escribe la ruta de un expediente con la sesión parcial, vuelve a P-01.

**Sesión vencida:**

```mermaid
flowchart TD
  A["Cualquier pantalla"] -->|"respuesta 401"| B["P-04 Sesión vencida"]
  B -->|"contenido oculto, se conserva solo la ruta"| C["P-01 Acceso"]
  C --> D["P-03 Verificar código"]
  D -->|"misma cuenta"| E["Regresar a la ruta"]
  D -->|"otra cuenta"| F["P-05 Inicio, sin restos de la sesión anterior"]
```

- Al recibir 401, el contenido de la pantalla se oculta de inmediato.
- Si vuelve a entrar **la misma cuenta**, regresa a la ruta donde estaba. Si entra **otra**, se descarta todo.
- Cerrar sesión desde el menú: si hay borradores pendientes, avisa que se eliminarán al salir, **sin impedir la salida inmediata** (SRS §5, regla 11). Después limpia datos locales y vuelve a P-01.

### 4.2 Alta o vinculación de un expediente (RF-03, RF-04)

**Quién:** TrabajoSocial. **Objetivo:** crear el expediente sin duplicar a la persona.

```mermaid
flowchart TD
  A["P-10 Lista de expedientes"] -->|"Nuevo expediente"| B["P-11 Comprobar duplicado por CURP"]
  B -->|"CURP inválida, 422"| B
  B -->|"429 exceso de consultas"| B
  B -->|"no existe"| C["P-12 Datos, origen y consentimiento"]
  B -->|"ya existe"| D["P-13 Persona ya registrada"]
  C -->|"Guardar, 201"| E["P-14 Expediente creado"]
  C -->|"409 la persona ya existe"| B
  D -->|"Solicitar acceso con motivo, 201"| F["Solicitud enviada a Coordinación"]
  D -->|"410 el enlace venció"| B
  F --> A
```

Pasos:

1. **P-11:** una sola entrada, la CURP. Se normaliza (mayúsculas, sin espacios) y se valida el formato antes de enviarla. La CURP **nunca va en la URL**, solo en el cuerpo de la consulta, y no se conserva al salir de la pantalla.
2. **Resultado "no existe":** pasa a P-12 con la CURP ya capturada, en memoria.
3. **P-12** reúne en un solo formulario lo que la API crea en una transacción: datos de la persona, origen del contacto y consentimiento. Si algo falla, no queda un alta parcial.
4. **Resultado "ya existe":** P-13 muestra únicamente que existe y qué departamento lo lleva. **No muestra nombre, notas ni identificador.** Permite pedir acceso con un motivo; el enlace de la consulta dura poco y, si vence, hay que repetir la consulta.
5. **Conflicto 409 al guardar:** otra persona dio de alta a la misma CURP en ese momento. Se vuelve a P-11 y el resultado de la nueva consulta lleva a P-13. No se muestra información del otro expediente.
6. **Sin CURP:** no hay formulario de alta. P-11 muestra un aviso: la atención urgente no depende del alta y el procedimiento de solicitud asistida se gestiona fuera de esta pantalla (ver límites en §6). Se ofrece el acceso al directorio de ayuda.
7. **Consentimiento en P-12:** la persona puede registrar "aceptado" o "rechazado". Un rechazo no se transforma en consentimiento. Si el aviso vigente cambia mientras se llena el formulario, el servidor responde conflicto y se pide revisar la versión.

### 4.3 Resolver solicitudes de acceso (RF-03, RF-06)

**Quién:** Coordinación. **Objetivo:** dar acceso a quien lo pidió, sin leer el expediente.

```mermaid
flowchart TD
  A["P-20 Solicitudes de acceso"] -->|"filtrar por estado"| A
  A -->|"Asignar"| B["Diálogo asignar personal"]
  B -->|"Confirmar, 201"| C["La solicitud se actualiza"]
  B -->|"409 asignación repetida"| B
  B -->|"422 rol y departamento incompatibles"| B
```

- La lista muestra solo **metadatos**: solicitante, departamento, motivo y estado. Nunca datos de identidad ni notas.
- El diálogo exige el motivo (10 a 500 caracteres) y lleva el identificador de la solicitud que se está resolviendo.
- Asignar no abre el expediente para Coordinación; solo le da acceso a la persona asignada.
- Esta pantalla **no tiene botón "Rechazar"**: el contrato no define esa operación (ver §6).

### 4.4 Atención de un caso (RF-05, RF-07, RF-08, RF-14)

**Quién:** TrabajoSocial, Psicología y Jurídico, solo sobre casos asignados.

```mermaid
flowchart TD
  A["P-10 Lista de expedientes"] --> B["P-14 Resumen"]
  B --> C["P-15 Línea de tiempo"]
  B --> D["P-16 Notas del área"]
  B --> E["P-17 Consentimientos"]
  B -->|"Mostrar dato oculto"| F["Diálogo con motivo"]
  F -->|"200, el dato se ve unos segundos"| B
  F -->|"403, se audita la negativa"| B
  B -->|"Editar datos generales"| G["Formulario con control de versión"]
  G -->|"200"| B
  G -->|"412 el registro cambió"| H["Recargar datos y reintentar"]
  H --> G
  B -->|"Canalizar"| I["Diálogo de canalización"]
  D -->|"Nueva nota o corrección"| J["Editor de nota"]
  J -->|"201"| D
  J -->|"sin conexión"| K["P-41 Borrador cifrado"]
```

**P-10 Lista.** Muestra los expedientes asignados con alias neutro, estado, área y fechas. Filtros: estado, rango de fechas y departamento. **No hay buscador por nombre o CURP**, porque la API no lo ofrece a propósito. Paginada, con 20 por página.

**P-14 Resumen.** Datos generales permitidos. El domicilio, la CURP y el teléfono aparecen enmascarados y, junto a cada uno, un botón **Mostrar**:
- Pide un motivo (10 a 500 caracteres).
- Si el servidor lo concede, muestra el valor unos segundos y vuelve a ocultarlo. No se guarda en el estado de la aplicación.
- Si lo deniega, avisa sin dar detalles. La denegación queda en bitácora.

La edición de datos generales (solo TrabajoSocial asignado) carga el registro con su versión. Si la versión es antigua (412) se recargan los datos y la persona decide si reaplica su cambio. Cambiar el estado sigue la secuencia `abierto → en_seguimiento → cerrado`; **reabrir un cerrado exige motivo**.

**P-15 Línea de tiempo.** Solo eventos de las áreas del actor. Sin conteos de secciones prohibidas.

**P-16 Notas del área.**
- El selector de área ofrece solo las áreas autorizadas para el actor. Las demás no aparecen ni se sugiere que existan.
- Las notas son inmutables: **corregir** crea una nota nueva que referencia a la anterior, y la pantalla muestra ambas encadenadas. No hay botones de editar ni borrar.
- El texto va de 1 a 10 000 caracteres. La hora que se envía es la del dispositivo y se presenta como "hora declarada"; la hora de registro la pone el servidor.
- Si no hay conexión, el editor ofrece guardar un borrador cifrado (ver 4.6).

**P-17 Consentimientos.** TrabajoSocial ve el historial completo y puede registrar uno nuevo o revocar finalidades opcionales. Los profesionales ven solo las vigencias que necesitan. La revocación no borra la decisión original: el historial sigue visible.

### 4.5 Canalización interna (RF-09)

```mermaid
flowchart TD
  A["P-14 Resumen: Canalizar"] -->|"destino y resumen, 201"| B["P-30 Salientes: pendiente"]
  B -->|"Cancelar con motivo"| X["Cancelada"]
  C["P-30 Entrantes: pendiente"] -->|"Aceptar"| D["Aceptada y asignación creada"]
  C -->|"Rechazar con motivo"| Y["Rechazada"]
  D -->|"Completar"| Z["Completada"]
  D --> E["Abrir expediente del área destino"]
```

- **Crear:** el profesional asignado elige el departamento destino y escribe un resumen de hasta 2 000 caracteres. El destino no puede ser su propio departamento y no puede haber otra canalización activa equivalente.
- **P-30** tiene dos pestañas, **Entrantes** y **Salientes**, y un filtro de estado. Cada elemento muestra un resumen mínimo, nunca notas de otras áreas.
- **Acciones según estado y quién:**
  - Entrante pendiente: Aceptar o Rechazar (el rechazo exige motivo de 10 a 500).
  - Entrante aceptada: Completar.
  - Saliente pendiente: Cancelar (exige motivo).
- Cada acción lleva la versión del elemento tal como vino del listado. Si cambió, se recarga la lista.
- **Aceptar** crea al mismo tiempo la asignación del área destino. Solo después de aceptar aparece el enlace **Abrir expediente**; antes el receptor no puede abrir nada.

### 4.6 Notas sin conexión (RF-11)

```mermaid
flowchart TD
  A["Abrir la aplicación"] --> B{"¿Hay PIN local?"}
  B -->|"no, y se necesita guardar un borrador"| C["P-40 Crear PIN"]
  B -->|"sí"| D["P-40 Desbloquear"]
  C --> E["Editor de nota"]
  D --> E
  E -->|"Guardar sin conexión"| F["P-41 Borradores: pendiente"]
  F -->|"vuelve la conexión"| G{"¿Sesión vigente?"}
  G -->|"no"| H["P-04 Sesión vencida y nueva autenticación"]
  H --> I["Enviar lote"]
  G -->|"sí"| I
  I --> J["Resultado por borrador"]
  J -->|"applied o replayed"| K["Se quita de la cola"]
  J -->|"blocked"| L["Bloqueada: ya no tienes acceso"]
  J -->|"conflict"| M["Conflicto: revisar"]
  J -->|"retryable"| N["Se reintenta con la misma clave"]
```

- **Solo se guardan borradores de notas propias.** Nada de expedientes completos.
- El PIN local cifra la cola; no es la contraseña ni el segundo factor. Se crea la primera vez que hace falta y se pide al abrir la aplicación si hay borradores.
- Al volver la conexión se envían hasta 20 borradores por lote. Cada borrador se resuelve por separado y **solo se elimina el que el servidor confirma**.
- **Bloqueada** significa que se retiró la asignación antes de sincronizar. La nota no se incorpora, el autor no cambia y la interfaz lo explica. La persona decide si descarta el borrador.
- Si la sesión venció, primero se vuelve a autenticar y luego se envía con las mismas claves.
- Cerrar sesión elimina la cola y las claves locales.

**P-41 Borradores** muestra por cada uno: expediente (alias), área, hora declarada y estado (pendiente, enviando, bloqueada, conflicto, reintentable). Acciones: reintentar y descartar.

### 4.7 Ayuda y directorio (RF-12)

```mermaid
flowchart TD
  A["Cualquier pantalla"] -->|"botón Necesito ayuda"| B["P-51 Hoja de ayuda"]
  B -->|"mantener 2 segundos, o confirmar con el botón alternativo"| C["Contactos del directorio"]
  C -->|"tocar un contacto"| D["Se abre el marcador del teléfono"]
  D --> E["Se registra la apertura si hay conexión y permiso"]
  F["P-01 Acceso"] -->|"enlace Directorio"| G["P-50 Directorio de ayuda"]
```

- El botón **Necesito ayuda** está en todas las pantallas autenticadas. Se activa **manteniendo presionado 2 segundos** o, para quien no pueda hacerlo, con una confirmación accesible por teclado y lector de pantalla.
- La hoja lista los contactos prioritarios del directorio institucional con un enlace de llamada por cada uno. No se supone un número por defecto.
- El texto de la hoja aclara que la aplicación **abre el marcador** y no confirma la llamada ni la atención.
- **Sin conexión** funciona igual, con la copia del directorio guardada en el dispositivo.
- Registrar la apertura es opcional y posterior: solo si hay conexión y el actor tiene el permiso de ayuda. Si no se puede registrar, no se guarda en el dispositivo (la cola local admite solo notas) y no se avisa como error.
- **P-50** es pública y no necesita sesión. La primera vez que hay conexión guarda una copia versionada del directorio para uso sin conexión.

### 4.8 Administración del personal (RF-02)

**Quién:** AdministradorTI.

```mermaid
flowchart TD
  A["P-60 Personal"] -->|"Nueva cuenta"| B["Diálogo crear cuenta"]
  B -->|"201"| C["Mostrar activación de un solo uso"]
  C --> A
  A -->|"Editar rol, departamento o estado"| D["Diálogo con aviso de cierre de sesiones"]
  D -->|"200"| A
  D -->|"403 autoelevación"| D
  D -->|"409 último administrador activo"| D
  A -->|"Cerrar sesiones"| E["Diálogo con motivo"]
  E -->|"204"| A
  A -->|"Restablecer segundo factor"| F["Diálogo con motivo y verificación presencial"]
  F -->|"202"| A
```

- La lista muestra solo identidad laboral: usuario, nombre laboral, rol, departamento y estado. Con búsqueda por texto y paginación. **Nunca** datos de personas atendidas.
- **Crear cuenta:** usuario, nombre laboral, rol y departamento. La respuesta trae los datos de activación de un solo uso, que se muestran **una única vez** con la indicación de entregarlos de forma presencial.
- **Editar:** cambiar rol, departamento o suspender cierra todas las sesiones de esa cuenta, y el diálogo lo advierte antes de confirmar. La fila de la propia cuenta del administrador no ofrece editar rol ni estado.
- **Restablecer segundo factor:** pide motivo y marcar que la verificación presencial se hizo. Al responder, la pantalla dice que el restablecimiento quedó **solicitado** y que la persona deberá volver a configurar su segundo factor; no afirma que el proceso terminó.

### 4.9 Auditoría e indicadores (RF-10, RF-13)

**Bitácora (P-70)**
- Lista de eventos con filtros: actor, expediente, acción y rango de fechas. No hay búsqueda por CURP.
- Un aviso fijo recuerda que **esta consulta también queda registrada**.
- Solo lectura: no hay ninguna acción de editar o borrar.

**Alertas (P-71)**
- Lista de alertas por volumen de consultas, con filtro de estado: actor, ventana, umbral y nivel.

**Indicadores (P-72)**
- Filtros: periodo, sector, tipo y estatus. Los periodos son discretos.
- Cada indicador muestra su corte, su metodología y su denominador.
- Los valores **suprimidos** se muestran con un guion y una leyenda de privacidad ("menos de 5 casos"). Los totales que permitirían deducir una celda suprimida aparecen como no disponibles.

**Mapa (P-73)**
- Sectores con escala violeta de 1 a 5, leyenda, periodo y corte. Los sectores suprimidos se muestran con un patrón distinto y no por color solamente.
- Nunca puntos individuales ni coordenadas.

---

## 5. Estados transversales de pantalla

Estados que toda pantalla con datos debe resolver:

| Estado | Qué muestra la pantalla |
|---|---|
| Cargando | Esqueleto o indicador, sin contenido anterior de otra cuenta |
| Vacío | Texto neutro sin sugerir que hay información oculta (por ejemplo "No tienes expedientes asignados") |
| Sin conexión (P-91) | Aviso global. Las pantallas de datos de negocio indican que no están disponibles sin conexión y ofrecen ir a Pendientes o al directorio |
| Error | Mensaje genérico con el `requestId` para soporte, nunca detalles técnicos |

Respuestas de la API y su tratamiento en la interfaz:

| Respuesta | Tratamiento |
|---|---|
| 401 | Ocultar el contenido y llevar a P-04 |
| 403 | "No tienes permiso para esta acción." Sin explicar la causa. Si el permiso falta globalmente, se oculta esa opción en adelante |
| 404 | P-90 con el texto único "Recurso no disponible." Igual para ajeno e inexistente |
| 409 | Depende de la operación: duplicado, transición inválida, conflicto de clave o reintento vencido. Cada pantalla define su mensaje (ver `PANTALLAS_ENDPOINTS_SAI_MVP.md`) |
| 410 | Enlace temporal vencido: volver al paso anterior |
| 412 | El registro cambió: recargar y permitir reintentar |
| 422 | Marcar el campo con error. Si es un cursor o un filtro inválido, reiniciar la lista |
| 428 | Error de programación del cliente (falta la versión): no debe llegar a la persona |
| 429 | Deshabilitar la acción y mostrar la espera indicada por `Retry-After` |
| 500 / 503 | Mensaje genérico con `requestId`; sin reintentos automáticos en operaciones que escriben |

---

## 6. Límites del contrato que afectan a las pantallas

Estos puntos no están resueltos en el documento de endpoints. **No se deben inventar rutas** para resolverlos en el frontend: hay que cerrarlos en el contrato OpenAPI antes de construir la pantalla afectada.

| # | Situación | Efecto en pantallas |
|---|---|---|
| 1 | Coordinación necesita elegir a quién asignar, pero `GET /users` es solo de AdministradorTI y los catálogos no incluyen personal | El diálogo de asignar de P-20 no puede ofrecer selector de personal hasta definir de dónde sale la lista |
| 2 | Aceptar una canalización admite `assignedStaffId` opcional, con la misma falta de lista de personal | P-30 no ofrece selector; envía la aceptación sin ese campo |
| 3 | No hay endpoint que liste asignaciones ni forma de obtener `assignmentId` | La revocación de asignaciones no tiene pantalla asignable hasta definir cómo obtener ese identificador |
| 4 | No existe operación para rechazar una solicitud de acceso | P-20 sin botón de rechazo |
| 5 | No hay `GET` individual de nota, canalización ni cuenta | El detalle se arma con los datos de los listados, incluidos `versionTag` y el ETag |
| 6 | No hay ruta de activación de primer acceso ni de **cambio de contraseña** | Sin pantalla "Primer acceso" ni "Cambiar contraseña". El primer ingreso usa el flujo normal con la contraseña temporal entregada de forma presencial |
| 7 | La solicitud asistida sin CURP (SRS §5, regla 2) no tiene endpoint | P-11 solo informa y deriva al directorio |
| 8 | `GET /catalogs` debe devolver también sectores y propósitos de consentimiento (los DTO los piden como claves de catálogo), y no está listado | P-12 y P-17 no pueden poblar esos campos hasta confirmarlo |
| 9 | No están definidas las claves de `Actor.permissions` (bitácora, bandeja, ayuda) | El menú por permiso se implementa cuando OpenAPI las nombre |
| 10 | El formato de la geometría de sectores del mapa no está definido | P-73 no puede dibujar el mapa hasta cerrar ese formato |
| 11 | La respuesta de activación de cuenta (DTO) de la creación de usuarios está por cerrar | El diálogo posterior a crear cuenta se termina de diseñar con ese DTO |

---

## 7. Orden sugerido para construir las pantallas

Alineado con los cuatro días del SRS (sección 12):

| Día | Pantallas | Resultado |
|---|---|---|
| 1 | Estructura general (menú por rol, salida rápida, aviso de conexión), P-01, P-02, P-03, P-04, P-05, P-90 | Sesión completa separada de la preautenticación |
| 2 | P-10, P-11, P-12, P-13, P-14, P-20 | Alta atómica, duplicados, lista y resumen del expediente |
| 3 | P-15, P-16, P-17, P-30, P-40, P-41, P-50, P-51, P-70, P-72 | Notas, canalización, offline, ayuda, bitácora e indicadores mínimos |
| 4 | P-60, P-06, P-07, P-71, P-73, ajustes de accesibilidad y ensayo en teléfono | Pantallas de apoyo, pruebas y congelamiento del alcance |

Si el tiempo no alcanza, el orden de recorte es: P-73, P-71, P-60 (se usan cuentas sembradas), P-07. El recorrido de demostración exige: P-01 a P-03, P-11 a P-14, P-16, P-30, P-41, P-70 y P-72.

---

# Parte B — Pantallas fuera del contrato del MVP A

## 8. Qué pide el Paso 1 y qué cubre ya la Parte A

El Paso 1 define dos tipos de usuario: **personal** y **usuaria**. La Parte A cubre al personal dentro del contrato del MVP A. Esta parte registra lo demás: el portal de la usuaria y las funciones del personal que el Paso 1 menciona pero que el SRS A difiere (citas, tareas, canalización externa, exportaciones) o no recoge (órdenes de protección).

> **Ninguna pantalla de esta parte tiene endpoints en el contrato actual.** El documento de endpoints prohíbe registrar rutas de portal, agenda, cursos, empleo, encuestas, avisos y exportaciones en el MVP A (§11.1). Las capacidades que habría que definir están en `PANTALLAS_ENDPOINTS_SAI_MVP.md`, sección 6.

### 8.1 Correspondencia entre el Paso 1 y las pantallas

| Elemento del Paso 1 | Pantalla(s) | Parte | Estado en el contrato A |
|---|---|---|---|
| Gestión de usuarios y roles (HU-19) | P-60 | A | Cubierto |
| Expediente único y secciones por departamento | P-14, P-15, P-16 | A | Cubierto |
| Ver solo lo que corresponde (HU-01) | P-10, P-14 | A | Cubierto |
| Duplicados por CURP (HU-02) | P-11, P-13 | A | Cubierto |
| Consentimiento informado (HU-03) | P-12, P-17 | A | Cubierto |
| Datos sensibles ocultos (HU-04) | P-14 (enmascarado y revelar) | A | Cubierto |
| Bitácora y alertas (HU-05) | P-70, P-71 | A | Cubierto |
| Acceso seguro del personal (HU-06) | P-01 a P-04 | A | Cubierto |
| Canalizar a otro departamento (HU-07) | P-14, P-30 | A | Cubierto |
| Notas sin conexión (HU-08) | P-40, P-41 | A | Cubierto |
| Protección web y del dispositivo (HU-09, HU-10) | Transversal, sin pantalla propia | A | Cubierto |
| Tablero y mapa de calor (HU-15, HU-16) | P-72, P-73 | A | Cubierto |
| Buscar y filtrar expedientes (HU-18) | P-10 | A | Parcial: filtros sí, búsqueda por texto no |
| Directorio y rutas de atención sin conexión (HU-21) | P-50, P-51 | A | Cubierto |
| Recursos y teléfonos de apoyo para la usuaria (HU-22) | P-50 (pública, sin sesión) y U-06 | A / B | Cubierto: reutiliza API-039 |
| Tareas, citas y recordatorios; recordatorios de casos sin contacto (HU-17) | E-01, E-02, E-03 | B | Diferido en el SRS A |
| Canalizar a una instancia externa (HU-07) | E-05 | B | Diferido en el SRS A |
| Seguimiento de órdenes de protección (HU-14) | E-04 | B | No aparece en el SRS A |
| Exportar reportes anonimizados (HU-20) | E-06 | B | Diferido en el SRS A |
| Acceso de la usuaria a su información (HU-11) | U-01 a U-05, U-12 | B | Diferido: portal |
| Pedir ayuda sin iniciar sesión (HU-12) | U-07, U-08 y E-07 | B | La Parte A solo cubre el botón del **personal** (P-51) |
| Discreción en el dispositivo de la usuaria (HU-13) | Transversal en el portal y U-04 | B | Diferido: portal |
| Comunicación discreta con la usuaria | E-11 y U-03 | B | Diferido |
| Encuestas de seguimiento (HU-23) | U-11, E-10 | C | Diferido |
| Cursos y vacantes (HU-24) | U-09, U-10, E-08, E-09 | C | Diferido |

**Diferencias entre el Paso 1 y el SRS A** que el equipo tiene que decidir: el Paso 1 pone tareas, citas, recordatorios y canalización externa dentro del **núcleo**, pero el SRS A los difiere. Mientras no se resuelva, este documento los trata como Parte B.

### 8.2 Inventario de pantallas de la Parte B

**Portal de la usuaria** (rutas bajo `/portal`, identidad y sesión separadas de las del personal)

| ID | Pantalla | Ruta | Origen |
|---|---|---|---|
| U-01 | Activación presencial (primer uso) | `/portal/activar` | HU-11 |
| U-02 | Acceso | `/portal/acceso` | HU-11 |
| U-03 | Inicio | `/portal` | HU-11 |
| U-04 | Mi perfil y preferencias | `/portal/perfil` | HU-11, HU-13 |
| U-05 | Mis citas | `/portal/citas` | HU-11 |
| U-06 | Recursos y teléfonos de apoyo | `/portal/recursos` | HU-22 |
| U-07 | Pedir ayuda | `/portal/ayuda` | HU-12 |
| U-08 | Mis contactos de confianza | `/portal/ayuda/contactos` | HU-12 |
| U-09 | Cursos y charlas | `/portal/cursos` | HU-24 |
| U-10 | Empleo | `/portal/empleo` | HU-24 |
| U-11 | Encuestas | `/portal/encuestas` | HU-23 |
| U-12 | Recuperar acceso | `/portal/recuperar` | HU-11 |

**Extensiones del personal**

| ID | Pantalla | Ruta | Quién | Origen |
|---|---|---|---|---|
| E-01 | Agenda: citas y tareas | `/agenda` | TrabajoSocial, Psicología, Jurídico | HU-17, núcleo del Paso 1 |
| E-02 | Nueva cita o tarea | Diálogo desde el expediente o la agenda | Los mismos | HU-17 |
| E-03 | Recordatorios y casos sin contacto reciente | Módulo en Inicio y en E-01 | Los mismos | HU-17 |
| E-04 | Órdenes de protección | `/expedientes/:recordId/ordenes-proteccion` | Asignados | HU-14 |
| E-05 | Canalización a instancia externa | Extiende el diálogo Canalizar y P-30 | Profesional asignado | HU-07 |
| E-06 | Reportes y exportaciones | `/reportes` | Coordinación, Dirección, AdministraciónAnalítica | HU-20 |
| E-07 | Bandeja de avisos de ayuda | `/avisos-ayuda` | Receptor de ayuda en turno | HU-12 |
| E-08 | Cursos y visitas | `/capacitacion/cursos` | Capacitación | HU-24 |
| E-09 | Vacantes y postulaciones | `/empleo` | Responsable de empleo | HU-24 |
| E-10 | Encuestas | `/encuestas` | Responsable de encuestas | HU-23 |
| E-11 | Mensajes y recordatorios a la usuaria | Diálogo desde el expediente o la agenda | Personal asignado | Comunicación discreta |

---

## 9. Portal de la usuaria

### 9.1 Reglas propias del portal

1. **Identidad y sesión separadas.** Una sesión del personal no sirve en `/portal`, ni a la inversa. Las dos poblaciones no comparten menú ni cookie.
2. **La usuaria nunca ve el expediente interno.** Ni notas, ni secciones, ni estado clínico. Solo su perfil, sus citas y los recursos.
3. **Validación sencilla**, adecuada para una situación de emergencia y para quien no tiene experiencia técnica (PIN o validación del dispositivo, por definir en la entrevista). La CURP no es contraseña, y la activación es presencial y de un solo uso.
4. **Ayuda sin sesión.** El botón funciona antes de iniciar sesión y sin conexión; abre el marcador del teléfono.
5. **La ayuda no promete.** No se dice que el aviso llegó ni que alguien acudirá. Sin internet no se transmite ubicación. La ubicación y el aviso a contactos se envían solo con permiso previo.
6. **Discreción.** Nombre e ícono neutros, notificaciones de texto genérico con opción de silenciar, salida rápida en todas las pantallas y **ningún historial visible de alertas enviadas** en el dispositivo.
7. **Lenguaje claro.** Texto base de 17 px, controles de 48 px, diseño desde 360 px y frases sin tecnicismos.
8. **Sin conexión** solo funcionan los recursos (copia local) y la llamada. Citas, cursos, empleo y encuestas requieren conexión.

### 9.2 Navegación

En el teléfono, una barra inferior con cinco opciones de nombre neutro; el botón de ayuda es siempre visible.

| Opción | Pantalla |
|---|---|
| Inicio | U-03 |
| Agenda | U-05 |
| Recursos | U-06 |
| Ayuda | U-07 |
| Perfil | U-04 |

Cursos, empleo y encuestas aparecen como atajos en el Inicio si la Secretaría los habilita.

```mermaid
flowchart TD
  A["U-02 Acceso"] --> B["U-03 Inicio"]
  B --> C["U-05 Mis citas"]
  B --> D["U-06 Recursos"]
  B --> E["U-07 Pedir ayuda"]
  B --> F["U-09 Cursos"]
  B --> G["U-10 Empleo"]
  B --> H["U-11 Encuestas"]
  B --> I["U-04 Perfil y preferencias"]
  E --> J["U-08 Contactos de confianza"]
```

### 9.3 Acceso y activación (HU-11)

```mermaid
flowchart TD
  A["U-01 Activación presencial, un solo uso"] -->|"define su validación"| C["U-03 Inicio"]
  B["U-02 Acceso"] -->|"validación correcta"| C
  B -->|"olvidó su acceso"| D["U-12 Recuperar acceso con el personal"]
  B -->|"intentos fallidos"| E["Espera temporal"]
  E --> B
```

- **El alta la hace el personal de forma presencial.** La usuaria recibe una activación de un solo uso y, en el primer uso, define su propia validación (U-01). No hay registro abierto.
- **U-12** es informativa: explica que la recuperación se hace con el personal y muestra el directorio. No hay restablecimiento automático.

### 9.4 Pedir ayuda (HU-12)

```mermaid
flowchart TD
  A["Botón Necesito ayuda, visible en todo el portal y sin sesión"] -->|"mantener 2 a 3 segundos o confirmación alternativa"| B["U-07 Opciones de ayuda"]
  B -->|"Llamar"| C["Se abre el marcador del teléfono"]
  B -->|"Avisar con ubicación, solo con permiso previo"| D["Aviso enviado o en espera"]
  B -->|"Avisar a contactos, solo con consentimiento"| E["Aviso a contactos de confianza"]
  D -->|"sin conexión"| F["Se registra al recuperar la conexión, sin ubicación"]
```

- **Llamar** siempre está disponible y no depende del servidor.
- **Avisar** solo se ofrece si la usuaria dio permiso previo. La interfaz muestra "Aviso enviado" o "En espera de conexión" y, si el sistema lo informa, "Recibido por el equipo". **Nunca** "va en camino" ni "estás a salvo".
- **U-08** es donde la usuaria elige y confirma a quién se puede avisar. Requiere su consentimiento explícito por cada contacto.

### 9.5 Citas, recursos, cursos, empleo y encuestas

- **U-05 Mis citas:** lista de citas propias con fecha, lugar y estado (programada, confirmada, realizada, no asistió). Si el contrato lo permite, confirmar o cancelar una cita programada o confirmada.
- **U-06 Recursos:** mismo contenido que P-50 (directorio institucional con teléfonos, horarios y rutas de atención), con la navegación del portal. Disponible sin conexión.
- **U-09 Cursos:** cursos publicados con calendario, cupo y estado de la inscripción; inscribirse y cancelar la inscripción.
- **U-10 Empleo:** vacantes vigentes con filtros (sector, horario, tipo de empleo, ubicación) y postulación. Las empresas no tienen cuenta ni acceso.
- **U-11 Encuestas:** encuestas asignadas a la usuaria, con redacción neutra y opción de silenciar los avisos. Una respuesta por asignación.
- **U-04 Perfil y preferencias:** sus datos básicos y las preferencias de notificación (silenciar, texto genérico).

---

## 10. Extensiones del personal

### 10.1 Agenda, tareas y recordatorios (E-01 a E-03, HU-17)

- **E-01** muestra citas y tareas del día y de la semana, con el expediente asociado (por alias). Estados de una cita: `programada → confirmada → realizada` o `no_asistio`; se cancela desde programada o confirmada. No permite solapamientos.
- **E-02** crea una cita o tarea desde el expediente o la agenda.
- **E-03** reúne los **recordatorios de citas** y los **casos sin contacto reciente**, con plazos configurables. Aparece también en el Inicio.
- La agenda sin conexión se contempla solo con datos mínimos de las citas propias.

### 10.2 Órdenes de protección (E-04, HU-14)

```mermaid
flowchart TD
  A["P-14 Resumen del expediente"] --> B["E-04 Órdenes de protección"]
  B -->|"Registrar o renovar"| C["Formulario con vigencia"]
  C --> B
  B -->|"vigencia próxima a vencer"| D["Aviso en E-03 y en el Inicio"]
  E["P-10 Lista de expedientes"] -->|"casos con orden vigente"| F["Aparecen priorizados"]
```

- Pestaña dentro del expediente: lista de órdenes con vigencia y estado (vigente, por vencer, vencida).
- El aviso se emite con **anticipación configurable**. Los casos con orden vigente se priorizan en P-10.
- Los campos, estados y plazos se definen con la Secretaría: es la pregunta 22 del documento de la entrevista.

### 10.3 Canalización a instancia externa (E-05, HU-07)

```mermaid
flowchart TD
  A["Canalizar: elegir instancia externa"] --> B{"¿Hay consentimiento específico vigente?"}
  B -->|"no"| C["P-17 Registrar consentimiento"]
  C --> B
  B -->|"sí"| D["Enviar resumen mínimo"]
  D --> E["P-30 Estado: enviada, recibida, atendida"]
```

- Extiende el diálogo Canalizar de la Parte A con un catálogo de instancias externas.
- **Compartir con otra instancia exige un consentimiento específico registrado**, salvo lo que la normativa establezca. Si falta, la pantalla lleva a registrarlo antes de enviar.
- Se comparte solo lo necesario para esa instancia. El caso muestra el estatus: enviada, recibida, atendida.
- No hay integración automática con otras instituciones: la comunicación es un registro dentro de la plataforma.

### 10.4 Bandeja de avisos de ayuda (E-07)

```mermaid
flowchart TD
  A["E-07 Bandeja de avisos"] -->|"nuevo aviso con alerta sonora"| B["Acusar recibo"]
  B --> C["En atención"]
  C --> D["Cerrar con nota administrativa"]
  A -->|"sin turno"| E["Sin acceso a la bandeja"]
```

- Solo quien está de turno como receptor ve la bandeja. El permiso no da lectura de expedientes.
- Estados del aviso: `recibida → en_atencion → cerrada`. Cerrar es un acto **administrativo** y no certifica que la persona esté a salvo; la pantalla no lo afirma.
- Una alerta sonora y visual avisa de un aviso nuevo; no depende de que la PWA esté en segundo plano.

### 10.5 Reportes y exportaciones (E-06, HU-20)

- Elegir tipo de reporte, periodo y filtros, con **vista previa** que ya muestra la supresión de celdas pequeñas.
- Exportar solo datos **agregados y anonimizados**; nunca identificadores ni expedientes.
- Cada exportación queda registrada en la bitácora.

### 10.6 Cursos, empleo y encuestas del lado del personal (E-08, E-09, E-10)

- **E-08 Capacitación:** crear, publicar o cancelar cursos y charlas; calendario, cupo, visitas y registro de asistencia mínimo. Sin acceso a expedientes.
- **E-09 Empleo:** crear, publicar y cerrar vacantes de empresas verificadas, con vigencia; revisar postulaciones (`pendiente`, `en_revision`, `canalizada`, `cerrada`). Las empresas no tienen cuenta.
- **E-10 Encuestas:** crear versiones, publicarlas, asignarlas a un caso (solo un profesional autorizado) y ver agregados. Una encuesta publicada no cambia su estructura.

### 10.7 Mensajes y recordatorios a la usuaria (E-11)

- Diálogo que usa **plantillas de redacción neutra** para recordar una cita o pedir una respuesta.
- La notificación que llega al teléfono de la usuaria lleva texto genérico y puede silenciarse.
- Las notificaciones push tienen límites por plataforma (en iOS solo con la PWA instalada); las capacidades reales se confirman al implementarlas.

---

## 11. Capacidades de API que faltan para la Parte B

Ninguna ruta de esta parte existe. En `PANTALLAS_ENDPOINTS_SAI_MVP.md`, sección 6, está la lista de lo que habría que definir pantalla por pantalla. Dos reglas:

1. **No registrar estas rutas en el MVP A**: el documento de endpoints lo prohíbe expresamente.
2. Cuando se definan en OpenAPI, seguir la misma convención (recursos en inglés, plural, guiones, sin prefijo `/staff`) y mantener separadas las identidades del personal y de la usuaria.

Hay una excepción: **U-06 reutiliza API-039**, porque el directorio es público.

---

## 12. Prioridad sugerida para la Parte B

Esta parte queda fuera de los cuatro días del MVP. Si se aborda después, un orden razonable según riesgo y reutilización:

| Orden | Pantallas | Por qué primero |
|---|---|---|
| 1 | U-06 (con P-50) | Ya tiene endpoint público; no exige cuenta de usuaria |
| 2 | U-01, U-02, U-03, U-12 | Sin cuentas de usuaria no hay nada más del portal |
| 3 | U-07, U-08, E-07 | La ayuda es el caso de mayor riesgo, y exige definir antes un receptor con horario y escalamiento |
| 4 | E-01, E-02, E-03, U-05, U-04, E-11 | Citas y recordatorios dependen de la agenda |
| 5 | E-04, E-05, E-06 | Órdenes de protección, canalización externa y exportaciones |
| 6 | U-09, U-10, U-11, E-08, E-09, E-10 | Cursos, empleo y encuestas; solo si la Secretaría los pide |
