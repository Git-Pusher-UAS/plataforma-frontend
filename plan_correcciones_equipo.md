# Plan de Correcciones y Mejoras — Trabajo por Ramas

Documento de planificación técnica para dividir las correcciones solicitadas (incluidos los botones de volver faltantes de la auditoría previa) en categorías independientes, permitiendo al equipo implementarlas en ramas paralelas sin conflictos de merge (siguiendo `CONTRIBUTING.md`).

---

## Mapa General de Ramas

| Categoría | Rama sugerida | Pantallas / Módulos | Archivos principales | Orden sugerido |
| :--- | :--- | :--- | :--- | :--- |
| **1. Flujo de Inicio** | `feat/inicio-bienvenida` | `/` y `/u` (`BienvenidaPage`) | `src/app/routes.tsx`, `src/app/pages.tsx`, `src/app/App.test.tsx`, `e2e/humo.spec.ts` | 1° |
| **2. Portal de Empresas** | `fix/empresas-acceso-registro` | `/e`, `/e/codigo`, `/e/registro`, `/e/vacantes/nueva` | `src/features/bolsa/Empresa.tsx`, `src/index.css` | 2° (Paralela) |
| **3. Acceso del Personal** | `fix/identidad-acceso-personal` | `/acceso` y `MarcoAcceso` | `src/features/identidad/AccesoPersonal.tsx`, `src/index.css` | 2° (Paralela) |
| **4. Layout y Panel Admin** | `feat/admin-layout-y-espaciado` | `Layout` y vistas de Administración | `src/app/Layout.tsx`, `src/features/administracion/pages.tsx`, `src/index.css` | 2° (Paralela) |
| **5. Botones de Volver Faltantes** | `fix/navegacion-botones-volver` | Expedientes, Portal Usuarias, Ayuda y Capacitación | `NuevoExpediente.tsx`, `EncuestasPages.tsx`, `AccesoUsuaria.tsx`, `AyudaUsuaria.tsx`, `capacitacion/pages.tsx` | 2° (Paralela) |

> **Convención de trabajo (`CONTRIBUTING.md`):**
> - Formato de rama: `tipo/modulo-descripcion`
> - Formato de commits: `tipo(modulo): descripción`
> - Validación antes de abrir PR: `make check`

---

## Decisiones Pendientes Antes de Codificar

Antes de que el equipo comience a implementar cada rama, conviene definir estos puntos:

1. **Comportamiento de `/` con sesión de personal (`feat/inicio-bienvenida`):** ¿Al visitar `/` sin sesión debe mostrar `BienvenidaPage` y cuando un miembro del personal ya inició sesión mostrar el panel (`HomePage`), o prefieres mover el panel del personal a `/panel` y que `/` sea *siempre* Bienvenida?
2. **Caracteres permitidos en RFC (`fix/empresas-acceso-registro`):** El RFC oficial ante el SAT contempla `Ñ` y `&` (en personas morales). Si el input bloquea todo símbolo para aceptar solo mayúsculas y alfanuméricos, ¿se mantiene la `Ñ` o únicamente `A-Z` y `0-9`? Habrá que ajustar la expresión regular `RFC` acorde a esa decisión.
3. **Texto del Aviso de Privacidad (`fix/empresas-acceso-registro`):** Actualmente no existe el texto ni una ruta para el Aviso de Privacidad en el proyecto. ¿Se entregará el texto legal para abrirlo en un modal (`<Dialogo>`) sobre el mismo formulario (recomendado para no perder datos capturados) o en una página `/aviso-privacidad`?
4. **Botón `"Salida rápida"` (`QuickExitButton`) en Administración (`feat/admin-layout-y-espaciado`):** Al quitar `"Necesito ayuda"` en las pantallas de administración, ¿se conserva el botón `"Salida rápida"` en la barra superior o también se oculta para administración?
5. **Ubicación de `"Directorio de ayuda · Portal de usuarias"` (`fix/identidad-acceso-personal`):** En `MarcoAcceso` (`/acceso`, `/acceso/verificacion`, `/sesion-vencida`) ese texto queda pegado hasta el fondo. ¿Deseas incluir enlaces equivalentes también en `/e` o solo ajustar las pantallas que usan `MarcoAcceso`?
6. **Alcance de botones de volver faltantes (`fix/navegacion-botones-volver`):**
   - En **`MantenerPage` (`/u/ayuda`)**, la barra inferior se oculta deliberadamente por seguridad/foco. ¿Confirmas agregar un enlace discreto de regreso a `/u/inicio` en caso de toque accidental?
   - En **`NuevoCursoPage` (`/capacitacion/cursos/nuevo`)** y **`NuevaVacanteEmpresaPage` (`/e/vacantes/nueva`)**, ya existe un botón inferior `"Cancelar"`. ¿Se agrega también el enlace superior estándar (`← Cursos` / `<Volver />`) para uniformidad visual?

---

## Categoría 1: Pantalla de Inicio (Bienvenida como raíz `/`)

**Rama sugerida:** `feat/inicio-bienvenida`

### Qué se busca
Que la pantalla inicial al entrar al sitio (`/`) sea la de **Bienvenida** (*"Estamos para acompañarte"*), en lugar de redirigir al login del personal (`/acceso`).

### Causa actual
- En `src/app/routes.tsx`, `/` apunta a `<Layout />` con `<HomePage />`.
- `Layout` (`src/app/Layout.tsx`) redirige a `/acceso` si `personal` no ha iniciado sesión.
- `BienvenidaPage` (`src/features/portal/AccesoUsuaria.tsx`) está montada únicamente en `/u`.

### Tareas de implementación
- **Opción A (Recomendada — menor impacto en el panel):**
  - En `src/app/routes.tsx` (apoyándose en un componente en `src/app/pages.tsx`), evaluar en `/`:
    - Sin sesión de `personal` -> renderizar `<PortalLayout />` con `<BienvenidaPage />`.
    - Con sesión de `personal` -> renderizar `<Layout />` con `<HomePage />`.
  - Mantener `/u` funcionando como ruta válida para no romper enlaces existentes (`PortalLayout` puede apuntar el logo sin sesión a `/`).
- **Opción B (Rutas separadas):**
  - Dejar `/` siempre con `<PortalLayout />` + `<BienvenidaPage />` y mover el inicio del personal a `/panel` (requiere actualizar `src/app/nav.ts`, `src/app/Layout.tsx`, `src/features/identidad/AccesoPersonal.tsx`, `src/shared/ui/NoDisponible.tsx` y `src/app/routes.tsx`).
- **Actualizar pruebas automatizadas:**
  - `src/app/App.test.tsx` (actualmente espera `'Entrar'` en `/`).
  - `e2e/humo.spec.ts` (actualmente espera `'Entrar'` al ir a `/`).

---

## Categoría 2: Portal de Empresas (`/e`, `/e/codigo`, `/e/registro` y `/e/vacantes/nueva`)

**Rama sugerida:** `fix/empresas-acceso-registro`

> *(Se integran aquí `CodigoEmpresaPage` y `NuevaVacanteEmpresaPage` de la auditoría de botones faltantes porque comparten `src/features/bolsa/Empresa.tsx`, evitando conflictos entre ramas).*

### 2.1 Pantalla `/e` (`EntrarEmpresaPage`)
- **Problema actual:** Usa `.angosta` (`max-width: 44rem`) dentro de `.empresa-pagina` (`max-width: 64rem; margin: 0 auto`), pero `.angosta` no tiene `margin-inline: auto`, por lo que el bloque se alinea a la izquierda en escritorio. Tampoco tiene botón de volver.
- **Tareas:**
  1. Centrar `.angosta` dentro de `.empresa-pagina` (en `/e` y `/e/codigo` usar un ancho compacto centrado, ej. `width: min(30rem, 100%); margin: 2rem auto;`).
  2. Agregar `<Volver a="/" texto="Volver" />` al inicio de `EntrarEmpresaPage` (para regresar a Bienvenida).

### 2.2 Pantalla `/e/registro` (`RegistroEmpresaPage` y `FormEmpresa`)
- **Problemas actuales y causas raíz:**
  1. **Formulario desalineado a la izquierda:** Misma falta de centrado en `.angosta`.
  2. **Inputs desfasados y de distinto tamaño (*Nombre de la empresa* vs *RFC*):** En `<div className="rejilla-2">`, *"Nombre"* tiene 2 elementos (`label` + `input`) y *"RFC"* tiene 3 (`label` + `input` + `.campo-ayuda`). Como `.campo` (`src/index.css`) usa `display: grid` sin `align-content: start`, CSS Grid estira las filas de *"Nombre"* para igualar la altura de la celda de *"RFC"*, desalineando ambos inputs.
  3. **RFC sin límite ni filtro al teclear:** Falta `maxLength={13}`, permite minúsculas y símbolos al escribir.
  4. **Checkbox de privacidad como botón completo:** Usa `<label className="opcion">`, que estiliza todo el bloque como una tarjeta clicable con borde, impidiendo alojar un hipervínculo independiente dentro.
  5. **Texto de retorno:** Dice `<Volver a="/e" texto="Entrar" />`.
- **Tareas:**
  1. Centrar el contenedor de registro (`margin-inline: auto`).
  2. Añadir `align-content: start;` a `.campo`, `align-items: start;` a `.rejilla-2` y `width: 100%; min-width: 0;` a los inputs/selects para que todos los campos tengan exactamente la misma altura y alineación horizontal.
  3. En el input de **RFC**:
     - Limpiar entrada en `onChange`: `.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13)` (ajustar si se permite `Ñ`).
     - Añadir `minLength={12}`, `maxLength={13}`, `autoCapitalize="characters"`.
     - Ajustar la regex de validación `RFC` al formato acordado (12 o 13 caracteres, solo mayúsculas y alfanuméricos sin símbolos).
  4. En el **checkbox de aviso de privacidad**:
     - Reemplazar la clase `.opcion` por una clase simple sin borde/fondo de botón (checkbox + texto en línea).
     - Hacer que *"aviso de privacidad"* sea un enlace/botón interactivo (`<button type="button" className="enlace-boton">`) que abra un `<Dialogo>` con el texto legal (evitando perder los datos llenados en el formulario), o enlace a una nueva ruta `/aviso-privacidad`.
  5. Cambiar `<Volver a="/e" texto="Entrar" />` por `<Volver a="/e" texto="Volver" />`.

### 2.3 Botones de volver faltantes en Empresas (de la auditoría)
1. **`CodigoEmpresaPage` (`/e/codigo`):** Solo tiene el enlace `"No me llegó el código"`; agregar `<Volver a="/e" texto="Volver" />` al inicio de la sección.
2. **`NuevaVacanteEmpresaPage` (`/e/vacantes/nueva`):** Tiene botón `"Cancelar"` al pie del formulario, pero carece del enlace superior estándar; agregar `<Volver a="/e/vacantes" texto="Mis vacantes" />` antes de `<Encabezado>`.

---

## Categoría 3: Acceso del Personal (`/acceso` y `MarcoAcceso`)

**Rama sugerida:** `fix/identidad-acceso-personal`

### Qué se busca
Actualizar el título institucional, acercar el pie de enlaces a la tarjeta y añadir un control estándar y robusto para ver/ocultar contraseña.

### Tareas en `src/features/identidad/AccesoPersonal.tsx` y `src/index.css`
1. **Actualizar texto institucional en `AccesoPage`:**
   - Cambiar `"Personal de la Secretaría"` a `"Personal de la Secretaría de Mujeres"`.
2. **Subir `"Directorio de ayuda · Portal de usuarias"` (en `MarcoAcceso`):**
   - Actualmente `.acceso` usa `grid-template-rows: auto 1fr auto`, lo que empuja `.acceso-pie` hasta el borde inferior de la ventana en `/acceso`, `/acceso/verificacion` y `/sesion-vencida`.
   - Agrupar `.acceso-tarjeta` y `.acceso-pie` en un mismo contenedor centrado dentro de la fila `1fr`, logrando que *"Directorio de ayuda · Portal de usuarias"* aparezca justo debajo de la tarjeta en todas esas pantallas.
3. **Implementar botón estándar y accesible de "Ver contraseña":**
   - Agregar estado `const [mostrar, setMostrar] = useState(false)`.
   - Contenedor `.campo-contrasena` (`position: relative; display: flex; align-items: center;`) con `padding-right: 3rem` en el `<input>`.
   - Alternar `type={mostrar ? 'text' : 'password'}`.
   - Botón `type="button"` interno con `Eye` / `EyeOff` (`lucide-react`), `aria-label` dinámico y `aria-pressed={mostrar}`.
   - En CSS agregar `input[type="password"]::-ms-reveal { display: none; }` para evitar duplicidad de icono en Microsoft Edge.

---

## Categoría 4: Layout Global y Pantallas de Administración

**Rama sugerida:** `feat/admin-layout-y-espaciado` *(Opcional: dividir en `fix/layout-menu-y-ayuda-admin` y `style/admin-espaciado` si trabajan dos personas).*

### 4.1 Botón de cerrar menú lateral dentro/fuera según estado (`src/app/Layout.tsx` + `src/index.css`)
- **Problema actual:** En escritorio (`>= 768px`), el botón `.menu-cerrar` dentro de `<nav id="menu-principal">` está oculto por CSS (`display: none`), mientras `.btn-menu-escritorio` queda siempre fuera en la barra superior.
- **Solución:**
  - En escritorio, mostrar `.btn-menu-escritorio` en `.barra` **solo cuando el menú esté cerrado** (`oculto === true`).
  - Cuando el menú esté **abierto** (`!oculto` en escritorio o `abierto` en móvil), mostrar el botón de cerrar **dentro** de `.menu-cabecera` (habilitando `.menu-cerrar` también en escritorio para alternar `setOculto(true)`).

### 4.2 Quitar botón `"Necesito ayuda"` en Administración (`src/app/Layout.tsx`)
- Condicionar `<NecesitoAyudaPersonal />` en `.salida-rapida` para que **no** se renderice cuando `personal.rol === 'administracion'`.
- Agregar prueba en `src/app/App.test.tsx` validando que `administracion` no renderiza el botón `"Necesito ayuda"` y que los demás roles sí lo conservan.

### 4.3 Recomendaciones para los espacios en blanco (General y Administración)

#### Diagnóstico de por qué se ven espacios vacíos hoy
1. `.pagina` limita el ancho máximo a `76rem` (`1216px`), dejando márgenes vacíos en monitores anchos.
2. `.panel` fija `font-size: 15px`, lo que hace ver pequeños los componentes en escritorio.
3. En `InicioAdministracionPage` (`src/features/administracion/pages.tsx`), los 6 accesos rápidos miden apenas `72px` de alto con una sola línea de texto, dejando más de medio monitor vacío debajo.
4. En `ReportesPage` y `OpinionPage`, las 3 gráficas se comprimen en una sola fila con barras delgadas (`14px`).

#### Recomendación: ¿Solo incrementar el tamaño de los elementos o reorganizar?
**Recomendación principal:** **No** conviene únicamente escalar todo con zoom/tamaños grandes de forma aislada, ya que en pantallas de laptop pequeñas (13") se vería desproporcionado. Lo más efectivo —aplicado **exclusivamente a las pantallas de Administración** mediante una clase dedicada (ej. `.admin-pagina`)— es **combinar un ajuste moderado de escala (+10%–15%) con mejor distribución y contenido descriptivo**:

1. **Ajustes moderados de escala (solo Administración):**
   - Ampliar contenedor `.admin-pagina` a `max-width: 90rem`.
   - Subir tipografía base del área de administración a `16px–17px`, padding de tarjetas a `1.5rem–1.75rem` y cifra KPI (`.indicador-valor`) a `2.6rem–2.8rem`.
2. **Mejoras concretas de distribución por vista:**
   - **Inicio (`InicioAdministracionPage`):** Convertir los 6 accesos en tarjetas de `min-height: 115px`, icono de `28px`, título + **descripción breve de 1 línea**, en rejilla de 3 columnas (`repeat(3, 1fr)` en escritorio) formando un bloque simétrico `3 × 2`.
   - **Reportes (`ReportesPage`):** Colocar *"Casos nuevos por mes"* a ancho completo arriba y las otras dos gráficas debajo en 2 columnas (`1fr 1fr`), con barras de `18px–20px` de alto.
   - **Solicitudes, Bitácora y Personal:** Aprovechar el ancho extra de `.admin-pagina` y dar más respiro vertical a las filas de tablas (`padding: .9rem 1.15rem`).
   - **Opinión (`OpinionPage`):** Limitar a máximo 2 columnas (`minmax(26rem, 1fr)`).

---

## Categoría 5: Botones de Volver Faltantes (Auditoría de Navegación)

**Rama sugerida:** `fix/navegacion-botones-volver`

### Qué se busca
Agregar botón o enlace de retorno en todas las pantallas secundarias detectadas sin regreso en `auditoria_botones_volver.md` (excluyendo las de empresa que ya se cubren en la Categoría 2).

### Pantallas faltantes a implementar

| Pantalla | Archivo | Ruta | Situación actual | Qué implementar |
| :--- | :--- | :--- | :--- | :--- |
| **`ComprobarCurpPage`** | `src/features/expedientes/NuevoExpediente.tsx` | `/expedientes/nuevo` | Primer paso de alta; sin enlace para volver a `/expedientes`. | Agregar `<Link to="/expedientes" className="enlace-volver">← Expedientes</Link>` antes de `<Encabezado>`. |
| **`PendientesUsuariaPage`** | `src/features/portal/EncuestasPages.tsx` | `/u/pendientes` | No está en la barra inferior del portal y carece de regreso a `/u/inicio` o `/u/perfil`. | Agregar `<Link to="/u/inicio" className="enlace-volver"><ArrowLeft size={18} aria-hidden="true" /> Inicio</Link>` al inicio. |
| **`CrearCuentaPage`** | `src/features/portal/AccesoUsuaria.tsx` | `/u/crear-cuenta` | Solo enlaza a *"Ya tengo cuenta"* (`/u/entrar`), sin botón *"Volver"* hacia la bienvenida (`/u`). | Agregar `<Link to="/u" className="enlace-discreto">Volver</Link>` al pie del formulario (igual que `EntrarPage`). |
| **`CodigoPage`** | `src/features/portal/AccesoUsuaria.tsx` | `/u/codigo` | Solo tiene *"No me llegó el código"*; falta botón *"Volver"* explícito a `/u/entrar` para corregir datos. | Agregar `<Link to="/u/entrar" className="enlace-discreto">Volver</Link>`. |
| **`MantenerPage`** | `src/features/ayuda/AyudaUsuaria.tsx` | `/u/ayuda` | `PortalLayout` oculta aquí la barra inferior; si entró por error, no tiene enlace para regresar. | Agregar `<Link to="/u/inicio" className="enlace-discreto">Volver al inicio</Link>` al pie (debajo de `NOTA_911`). |
| **`NuevoCursoPage`** *(estandarización)* | `src/features/capacitacion/pages.tsx` | `/capacitacion/cursos/nuevo` | Tiene botón inferior `"Cancelar"`, pero sin enlace superior `enlace-volver`. | Agregar `<Link to="/capacitacion/cursos" className="enlace-volver">← Cursos</Link>` antes de `<Encabezado>`. |

---

## Coordinación para Evitar Conflictos entre Ramas

1. **Archivos `.tsx` totalmente separados por rama:**
   - Rama 1 -> `routes.tsx`, `pages.tsx`, `PortalLayout.tsx`, tests.
   - Rama 2 -> `Empresa.tsx` (incluye los botones de volver faltantes de empresa).
   - Rama 3 -> `AccesoPersonal.tsx`.
   - Rama 4 -> `Layout.tsx`, `administracion/pages.tsx`.
   - Rama 5 -> `NuevoExpediente.tsx`, `EncuestasPages.tsx`, `AccesoUsuaria.tsx`, `AyudaUsuaria.tsx`, `capacitacion/pages.tsx`.
2. **Separación por bloques en `src/index.css`:**
   - **Rama 2:** `.campo`, `.rejilla-2` y bloque `/* Portal de empresas */`.
   - **Rama 3:** Bloque `/* Pantallas de acceso del personal */` y `.campo-contrasena`.
   - **Rama 4:** `.menu-cerrar` / `.btn-menu-escritorio` y bloque nuevo al final `/* Ajustes exclusivos de Administración */`.
   - **Rama 5:** No requiere editar `src/index.css` (reutiliza `.enlace-volver` y `.enlace-discreto`).

---

## Verificación por Rama

Antes de integrar cada PR a `main`:
1. Ejecutar `make check` (`lint`, `typecheck`, `test`, `sec`, `gen-check`).
2. Ejecutar `make e2e` (especialmente importante en la Rama 1).
3. Revisar visualmente en escritorio (`1440px` / `1280px`) y móvil (`375px`).
