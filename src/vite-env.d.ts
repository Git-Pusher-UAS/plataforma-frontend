/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** 'true' para forzar datos simulados en dev; 'false' para forzar API real en pruebas. */
  readonly VITE_DATOS_SIMULADOS?: string
  /** Prefijo base de las rutas del backend (por defecto '/api'). */
  readonly VITE_API_PREFIX?: string
}
