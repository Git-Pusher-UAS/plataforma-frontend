/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** 'false' para llamar a la API real en lugar de los datos simulados. */
  readonly VITE_DATOS_SIMULADOS?: string
}
