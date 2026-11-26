import { Navigate, type RouteObject } from 'react-router'
import { Layout } from '@/app/Layout'
import { HomePage, NotFoundPage, RequiereRol } from '@/app/pages'
import { BitacoraPage, OpinionPage, PersonalPage, ReportesPage, SolicitudesPage } from '@/features/administracion/pages'
import { AyudaActivadaPage, CancelarAlertaPage, MantenerPage } from '@/features/ayuda/AyudaUsuaria'
import { DirectorioPage } from '@/features/ayuda/Directorio'
import { PaginaNeutra } from '@/features/ayuda/PaginaNeutra'
import { CanalizacionesPage, CanalizarPage } from '@/features/canalizacion/CanalizacionesPage'
import { BolsaPage, CalendarioPage, CursosPage, NuevaVacantePage, NuevoCursoPage, PasarListaPage, VisitasPage } from '@/features/capacitacion/pages'
import { BorradoresPage } from '@/features/expedientes/Borradores'
import {
  CanalizacionesExpedientePage,
  ConsentimientosPage,
  ExpedienteLayout,
  LineaTiempoPage,
  NotasPage,
  ResumenPage,
} from '@/features/expedientes/Expediente'
import { ExpedientesPage } from '@/features/expedientes/ExpedientesPage'
import { ComprobarCurpPage, DatosExpedientePage, NuevoExpedienteLayout, PersonaRegistradaPage } from '@/features/expedientes/NuevoExpediente'
import { AccesoPage, MiCuentaPage, SesionVencidaPage, VerificacionPage } from '@/features/identidad/AccesoPersonal'
import { BienvenidaPage, CodigoPage, CrearCuentaPage, EntrarPage } from '@/features/portal/AccesoUsuaria'
import { PendientesUsuariaPage, PreguntaPage } from '@/features/portal/EncuestasPages'
import { DetalleCursoPage, DetalleVacantePage, EmpleoPage, ForoPage } from '@/features/portal/ForoEmpleo'
import { InicioUsuariaPage } from '@/features/portal/InicioUsuaria'
import { PerfilPage } from '@/features/portal/PerfilPage'
import { PortalLayout, RequiereUsuaria } from '@/features/portal/PortalLayout'

const ATENCION = ['trabajo-social', 'psicologia', 'juridico'] as const

export const routes: RouteObject[] = [
  // ---------- A · Portal de usuarias (celular) ----------
  {
    path: '/u',
    element: <PortalLayout />,
    children: [
      { index: true, element: <BienvenidaPage /> }, // U-01
      { path: 'entrar', element: <EntrarPage /> }, // U-02
      { path: 'codigo', element: <CodigoPage /> }, // U-03
      { path: 'crear-cuenta', element: <CrearCuentaPage /> }, // U-04
      { path: 'directorio', element: <DirectorioPage volver="/u" /> }, // U-16
      {
        element: <RequiereUsuaria />,
        children: [
          { path: 'inicio', element: <InicioUsuariaPage /> }, // U-05
          { path: 'ayuda', element: <MantenerPage /> }, // U-06
          { path: 'ayuda/:alertaId', element: <AyudaActivadaPage /> }, // U-07
          { path: 'ayuda/:alertaId/cancelar', element: <CancelarAlertaPage /> }, // U-08
          { path: 'perfil', element: <PerfilPage /> }, // U-09
          { path: 'foro', element: <ForoPage /> }, // U-10
          { path: 'foro/:cursoId', element: <DetalleCursoPage /> }, // U-11
          { path: 'empleo', element: <EmpleoPage /> }, // U-12
          { path: 'empleo/:vacanteId', element: <DetalleVacantePage /> }, // U-13
          { path: 'pendientes', element: <PendientesUsuariaPage /> }, // U-14
          { path: 'pendientes/:encuestaId', element: <PreguntaPage /> }, // U-15
        ],
      },
    ],
  },
  { path: '/recetas', element: <PaginaNeutra /> }, // U-17

  // ---------- B · Personal: pantallas sin sesión ----------
  { path: '/acceso', element: <AccesoPage /> }, // P-01
  { path: '/acceso/verificacion', element: <VerificacionPage /> }, // P-03
  { path: '/sesion-vencida', element: <SesionVencidaPage /> }, // P-04
  { path: '/directorio', element: <main className="pagina"><DirectorioPage volver="/acceso" /></main> }, // P-50

  // ---------- B, C y D · Panel con sesión ----------
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> }, // P-05 · K-01 · D-01
      { path: '/cuenta', element: <MiCuentaPage /> }, // P-06
      { path: '/ayuda', element: <DirectorioPage volver="/" /> },
      {
        element: <RequiereRol roles={[...ATENCION]} />,
        children: [
          { path: '/expedientes', element: <ExpedientesPage /> }, // P-10
          {
            path: '/expedientes/nuevo',
            element: <RequiereRol roles={['trabajo-social']} />,
            children: [
              {
                element: <NuevoExpedienteLayout />,
                children: [
                  { index: true, element: <ComprobarCurpPage /> }, // P-11
                  { path: 'datos', element: <DatosExpedientePage /> }, // P-12
                  { path: 'existente', element: <PersonaRegistradaPage /> }, // P-13
                ],
              },
            ],
          },
          {
            path: '/expedientes/:expedienteId',
            element: <ExpedienteLayout />, // P-14
            children: [
              { index: true, element: <ResumenPage /> }, // P-14 y P-14b
              { path: 'linea-de-tiempo', element: <LineaTiempoPage /> }, // P-15
              { path: 'notas', element: <NotasPage /> }, // P-16
              { path: 'consentimientos', element: <ConsentimientosPage /> }, // P-17
              { path: 'canalizaciones', element: <CanalizacionesExpedientePage /> },
              { path: 'canalizar', element: <CanalizarPage /> }, // P-30b
            ],
          },
          { path: '/canalizaciones', element: <CanalizacionesPage /> }, // P-30
          { path: '/pendientes', element: <BorradoresPage /> }, // P-41
        ],
      },
      {
        path: '/capacitacion',
        element: <RequiereRol roles={['capacitacion']} />,
        children: [
          { index: true, element: <Navigate to="/" replace /> },
          { path: 'cursos', element: <CursosPage /> }, // K-02
          { path: 'cursos/nuevo', element: <NuevoCursoPage /> }, // K-03
          { path: 'calendario', element: <CalendarioPage /> }, // K-04
          { path: 'calendario/:cursoId/lista', element: <PasarListaPage /> }, // K-05
          { path: 'visitas', element: <VisitasPage /> }, // K-06
          { path: 'bolsa', element: <BolsaPage /> }, // K-07
          { path: 'bolsa/nueva', element: <NuevaVacantePage /> }, // K-08
        ],
      },
      {
        path: '/administracion',
        element: <RequiereRol roles={['administracion']} />,
        children: [
          { index: true, element: <Navigate to="/" replace /> },
          { path: 'reportes', element: <ReportesPage /> }, // D-02
          // D-03 · Carga diferida: los polígonos del mapa pesan ~230 KB y solo se usan aquí.
          { path: 'mapa', lazy: () => import('@/features/tablero/TableroPage').then((m) => ({ Component: m.TableroPage })) },
          { path: 'solicitudes', element: <SolicitudesPage /> }, // D-04
          { path: 'bitacora', element: <BitacoraPage /> }, // D-05
          { path: 'personal', element: <PersonalPage /> }, // D-06
          { path: 'opinion', element: <OpinionPage /> }, // D-07
        ],
      },
      { path: '/tablero', element: <Navigate to="/administracion/mapa" replace /> },
      { path: '*', element: <NotFoundPage /> }, // P-90
    ],
  },
]

