# Auditoría: Botones de Volver en Pantallas (`src/features/`)

Documento generado a partir de la revisión de todas las pantallas de `src/features/`.

## Criterio aplicado
> *Una pantalla debería tener botón de volver si no es home `/` ni una pantalla principal.*

---

## 1. Pantallas que NO TIENEN botón de volver (Acción requerida)

Son pantallas secundarias (pasos de formularios, autenticación o vistas de detalle) que actualmente no ofrecen un mecanismo para regresar:

| Pantalla | Archivo | Ruta | Detalle / Situación actual |
| :--- | :--- | :--- | :--- |
| **`ComprobarCurpPage`** | `src/features/expedientes/NuevoExpediente.tsx` | `/expedientes/nuevo` | Primer paso del alta de expediente. No tiene enlace ni botón para regresar a `/expedientes`. |
| **`PendientesUsuariaPage`** | `src/features/portal/EncuestasPages.tsx` | `/u/pendientes` | Pantalla de encuestas pendientes. No forma parte del menú inferior y carece de botón para regresar a `/u/inicio` o `/u/perfil`. |
| **`CrearCuentaPage`** | `src/features/portal/AccesoUsuaria.tsx` | `/u/crear-cuenta` | Registro de cuenta. Solo enlaza a *"Ya tengo cuenta"* (`/u/entrar`), sin enlace para volver a la bienvenida (`/u`). |
| **`CodigoPage`** | `src/features/portal/AccesoUsuaria.tsx` | `/u/codigo` | Verificación de SMS. Solo tiene *"No me llegó el código"*; falta un *"Volver"* explícito hacia `/u/entrar` si se ingresó un dato erróneo. |
| **`CodigoEmpresaPage`** | `src/features/bolsa/Empresa.tsx` | `/e/codigo` | Verificación de empresa. Solo tiene *"No me llegó el código"*; no tiene botón *"Volver"* a `/e`. |
| **`MantenerPage`** | `src/features/ayuda/AyudaUsuaria.tsx` | `/u/ayuda` | Oculta la barra de navegación del portal (`enAyuda = true`). Si la usuaria entró por error, no tiene enlace para regresar al portal (`/u/inicio`). |

---

## 2. Pantallas con "Cancelar" inferior pero SIN botón superior estándar

Cuentan con un botón secundario al pie del formulario, pero no con el enlace/botón superior estándar (`enlace-volver` o `<Volver />`) presente en otras vistas secundarias:

| Pantalla | Archivo | Ruta | Detalle / Situación actual |
| :--- | :--- | :--- | :--- |
| **`NuevoCursoPage`** | `src/features/capacitacion/pages.tsx` | `/capacitacion/cursos/nuevo` | Tiene `<Link to="/capacitacion/cursos">Cancelar</Link>` al pie del formulario, pero carece de botón de retorno superior. |
| **`NuevaVacanteEmpresaPage`** | `src/features/bolsa/Empresa.tsx` | `/e/vacantes/nueva` | Tiene `cancelarA="/e/vacantes"` en el formulario, pero carece del componente superior `<Volver a="/e/vacantes" texto="Mis vacantes" />`. |

---

## 3. Pantallas secundarias que SÍ TIENEN botón de volver (Correctas)

| Pantalla | Archivo | Destino / Implementación |
| :--- | :--- | :--- |
| **`DatosExpedientePage`** | `src/features/expedientes/NuevoExpediente.tsx` | Botón `Atrás` hacia `/expedientes/nuevo` |
| **`PersonaRegistradaPage`** | `src/features/expedientes/NuevoExpediente.tsx` | Botón `Volver a expedientes` hacia `/expedientes` |
| **`ResumenPage`** | `src/features/expedientes/Expediente.tsx` | Enlace cabecera `← Expedientes` en `ExpedienteLayout` |
| **`LineaTiempoPage`** | `src/features/expedientes/Expediente.tsx` | Enlace cabecera `← Expedientes` en `ExpedienteLayout` |
| **`NotasPage`** | `src/features/expedientes/Expediente.tsx` | Enlace cabecera `← Expedientes` en `ExpedienteLayout` |
| **`ConsentimientosPage`** | `src/features/expedientes/Expediente.tsx` | Enlace cabecera `← Expedientes` en `ExpedienteLayout` |
| **`CanalizacionesExpedientePage`** | `src/features/expedientes/Expediente.tsx` | Enlace cabecera `← Expedientes` en `ExpedienteLayout` |
| **`CanalizarPage`** | `src/features/canalizacion/CanalizacionesPage.tsx` | `← Expedientes` en layout y botón `Cancelar` a `/expedientes/:id` |
| **`PasarListaPage`** | `src/features/capacitacion/pages.tsx` | Enlace `← Calendario` hacia `/capacitacion/calendario` |
| **`NuevaVacantePage`** | `src/features/bolsa/Capacitacion.tsx` | `<Volver a="/capacitacion/bolsa" texto="Bolsa de trabajo" />` |
| **`RevisarVacantePage`** | `src/features/bolsa/Capacitacion.tsx` | `<Volver a="/capacitacion/bolsa" texto="Bolsa de trabajo" />` |
| **`VerificacionPage`** | `src/features/identidad/AccesoPersonal.tsx` | Enlace `Volver` hacia `/acceso` |
| **`SesionVencidaPage`** | `src/features/identidad/AccesoPersonal.tsx` | Botón `Entrar de nuevo` hacia `/acceso` |
| **`EntrarPage`** | `src/features/portal/AccesoUsuaria.tsx` | Enlace `Volver` hacia `/u` |
| **`DirectorioPage`** | `src/features/ayuda/Directorio.tsx` | Botón `Volver` parametrizado según la ruta de entrada |
| **`CancelarAlertaPage`** | `src/features/ayuda/AyudaUsuaria.tsx` | Botón `No, mantener la alerta` hacia `/u/ayuda/:alertaId` |
| **`DetalleCursoPage`** | `src/features/portal/ForoEmpleo.tsx` | `<Volver a="/u/foro" texto="Foro" />` |
| **`DetalleVacantePage`** | `src/features/bolsa/Usuaria.tsx` | `<Volver a="/u/empleo" texto="Vacantes" />` |
| **`MiPostulacionPage`** | `src/features/bolsa/Usuaria.tsx` | `<Volver a="/u/empleo/postulaciones" texto="Mis postulaciones" />` |
| **`EditarCvPage`** | `src/features/bolsa/Usuaria.tsx` | `<Volver ... />` hacia vacante o `/u/empleo/cv` |
| **`PreguntaPage`** | `src/features/portal/EncuestasPages.tsx` | Botón `Anterior` (paso > 0) y enlace `Contestar después` hacia `/u/pendientes` |
| **`RegistroEmpresaPage`** | `src/features/bolsa/Empresa.tsx` | `<Volver a="/e" texto="Entrar" />` |
| **`CorregirSolicitudPage`** | `src/features/bolsa/Empresa.tsx` | `<Volver a="/e/solicitud" texto="Mi solicitud" />` |
| **`VacanteEmpresaPage`** | `src/features/bolsa/Empresa.tsx` | `<Volver a="/e/vacantes" texto="Mis vacantes" />` |
| **`EditarVacanteEmpresaPage`** | `src/features/bolsa/Empresa.tsx` | `<Volver a={/e/vacantes/:id} texto="Vacante" />` |
| **`PostulantePage`** | `src/features/bolsa/Empresa.tsx` | `<Volver a={/e/vacantes/:id} texto="Postulantes" />` |

---

## 4. Homes y Pantallas Principales (No requieren botón de volver por criterio)

Cuentan con acceso directo mediante la barra lateral o inferior persistente:

- **Homes raíz y accesos:**
  - `InicioAtencionPage` / `InicioCapacitacionPage` / `InicioAdministracionPage` (`/`)
  - `BienvenidaPage` (`/u`)
  - `InicioUsuariaPage` (`/u/inicio`)
  - `AccesoPage` (`/acceso`)
  - `EntrarEmpresaPage` (`/e`)
- **Secciones principales de Personal (`Layout`):**
  - `ExpedientesPage` (`/expedientes`)
  - `CanalizacionesPage` (`/canalizaciones`)
  - `BorradoresPage` (`/pendientes`)
  - `MiCuentaPage` (`/cuenta`)
  - `CursosPage` (`/capacitacion/cursos`)
  - `CalendarioPage` (`/capacitacion/calendario`)
  - `VisitasPage` (`/capacitacion/visitas`)
  - `BolsaPage` (`/capacitacion/bolsa`) y sub-pestañas (`PorRevisarPage`, `EmpresasPage`, `ContratacionesPage`)
  - `ReportesPage` (`/administracion/reportes`)
  - `TableroPage` (`/administracion/mapa`)
  - `SolicitudesPage` (`/administracion/solicitudes`)
  - `BitacoraPage` (`/administracion/bitacora`)
  - `PersonalPage` (`/administracion/personal`)
  - `OpinionPage` (`/administracion/opinion`)
- **Secciones principales de Usuarias (`PortalLayout`):**
  - `ForoPage` (`/u/foro`)
  - `EmpleoPage` (`/u/empleo`) y sub-pestañas (`MisPostulacionesPage`, `MiCvPage`)
  - `PerfilPage` (`/u/perfil`)
- **Secciones principales de Empresas (`EmpresaLayout`):**
  - `VacantesEmpresaPage` (`/e/vacantes`)
  - `SolicitudEmpresaPage` (`/e/solicitud`)
- **Seguridad intencional:**
  - `PaginaNeutra` (`/recetas`): Pantalla de camuflaje que intencionalmente no tiene enlaces de regreso a la aplicación para seguridad de la usuaria.
