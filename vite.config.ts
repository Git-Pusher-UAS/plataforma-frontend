import { fileURLToPath, URL } from 'node:url'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const RAIZ_PROYECTO = fileURLToPath(new URL('.', import.meta.url))
const ARCHIVOS_SENSIBLES =
  /(^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig[^/]*\.json|vite\.config[^/]*|eslint\.config[^/]*|playwright\.config[^/]*|lefthook\.yml|Makefile|Dockerfile|Caddyfile|docker-compose[^/]*)($|\/)/i
const DIRECTORIOS_BLOQUEADOS = /^\/(contract|docs|e2e|scripts|home|etc|var|usr|opt|root|proc|sys)(\/|$)/i
const MARKDOWN_RAIZ = /^\/[^/]+\.md$/i
const EXTENSIONES_SENSIBLES = /\.(map|pem|crt|key|log|sql|bak|swp)$/i
const RUTAS_DEV_INTERNAS = /^\/(node_modules|src|@vite|@fs|@id)(\/|$)/i

function esRutaSensible(pathname: string, bloquearFuentesDev: boolean): boolean {
  if (pathname === '/.well-known' || pathname.startsWith('/.well-known/')) return false
  // En desarrollo, Vite sirve dependencias pre-empaquetadas desde /node_modules/.vite/deps.
  if (!bloquearFuentesDev && pathname.startsWith('/node_modules/.vite/')) return false
  if (/(^|\/)\./.test(pathname)) return true
  if (ARCHIVOS_SENSIBLES.test(pathname)) return true
  if (DIRECTORIOS_BLOQUEADOS.test(pathname)) return true
  if (MARKDOWN_RAIZ.test(pathname)) return true
  if (EXTENSIONES_SENSIBLES.test(pathname)) return true
  if (bloquearFuentesDev && RUTAS_DEV_INTERNAS.test(pathname)) return true
  return false
}

function crearMiddlewareBloqueo(bloquearFuentesDev: boolean) {
  return (
    req: { url?: string },
    res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void },
    next: () => void,
  ) => {
    let pathname: string
    try {
      pathname = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')
    } catch {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.end('Not Found')
      return
    }
    if (esRutaSensible(pathname, bloquearFuentesDev)) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.end('Not Found')
      return
    }
    next()
  }
}

function bloquearRutasSensibles(): Plugin {
  return {
    name: 'bloquear-rutas-sensibles',
    configureServer(server) {
      server.middlewares.use(crearMiddlewareBloqueo(false))
    },
    configurePreviewServer(server) {
      server.middlewares.use(crearMiddlewareBloqueo(true))
    },
  }
}

// En desarrollo, las rutas /api se dirigen al proxy del backend (Hackathon-app).
// Local: http://localhost:3000 (Docker Compose: http://localhost:3001).
// Para trabajar contra el servidor simulado: VITE_API_PROXY_TARGET=http://localhost:4010
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = process.env.VITE_API_PROXY_TARGET ?? env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000'
  const proxyApi = {
    '/api': { target: apiTarget, changeOrigin: true, secure: false },
  }

  return {
  plugins: [
    bloquearRutasSensibles(),
    react(),
    VitePWA({
      // Las actualizaciones se anuncian al usuario y se aplican de forma controlada.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        // Nombre e ícono neutros: la aplicación instalada no debe delatar su propósito.
        name: 'Agenda',
        short_name: 'Agenda',
        description: 'Agenda y seguimiento',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FBF6EF',
        theme_color: '#35244F',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo se precargan archivos estáticos de la compilación.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: '/index.html',
        // Las rutas de la API NUNCA pasan por el service worker ni se guardan en caché.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Sin runtimeCaching a propósito: la API es siempre solo red.
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: 'localhost',
    strictPort: true,
    allowedHosts: ['localhost', '127.0.0.1'],
    hmr: { overlay: mode === 'development' },
    fs: {
      strict: true,
      allow: [RAIZ_PROYECTO],
      deny: [
        '.env',
        '.env.*',
        '*.{pem,crt,key}',
        '.git',
        '.git/**',
        '**/.git/**',
        'Makefile',
        'Dockerfile',
        'Caddyfile',
        'docker-compose*.yml',
        'docker-compose*.yaml',
      ],
    },
    proxy: proxyApi,
  },
  preview: {
    host: 'localhost',
    port: 4173,
    strictPort: true,
    allowedHosts: ['localhost', '127.0.0.1'],
    proxy: proxyApi,
  },
  build: { sourcemap: false },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
  }
})
