# SAI — Frontend

Cliente web del **Sistema de Atención Integral (SAI)** de la Secretaría de Mujeres (Ahome): aplicación **React + TypeScript + Vite**, empaquetada como aplicación web progresiva (**PWA**) con una sola base de código para teléfono y computadora.

El backend, la base de datos, el contrato oficial de la API (`api/openapi.yaml`) y el proxy principal viven en el repositorio del backend (`Hackathon-app`). Este repositorio consume ese contrato y aporta la imagen estática del cliente.

## Stack tecnológico

- **UI y estado:** React 19, TypeScript 5.9, React Router 8, TanStack Query 5
- **Formularios y validación:** React Hook Form + Zod
- **Íconos y tipografía local:** Lucide React, `@fontsource/cormorant-garamond`, `@fontsource/nunito-sans` (sin CDN ni recursos externos)
- **Compilación y PWA:** Vite 8 + `vite-plugin-pwa` (Workbox)
- **Calidad y pruebas:** ESLint, Vitest + Testing Library, Playwright
- **Producción:** Caddy 2 (`caddy:2-alpine`) sirviendo archivos estáticos compilados en `dist/`

## Portales, roles y punto de entrada (`/`)

### Detección automática en `/`
- **Con sesión de personal activa:** abre el panel de inicio correspondiente al rol.
- **Sin sesión en PC** (detección por `Sec-CH-UA-Mobile` y `User-Agent`, tanto en el cliente React como en `Caddyfile`): redirige a `/acceso`.
- **Sin sesión en móvil:** muestra la bienvenida (*«Estamos para acompañarte»*).

### Espacios de la aplicación
- **Portal de usuarias (`/u`):** bienvenida, acceso y autorregistro (celular, CURP o correo + código SMS), inicio con mapa de espacios de atención, botón de ayuda, salida rápida, foro de cursos, bolsa de trabajo/CV/postulaciones, encuestas pendientes (`/u/pendientes`) y perfil.
- **Portal de empresas aliadas (`/e`):** acceso, registro y seguimiento/corrección de solicitud, publicación de vacantes y revisión de postulantes (sin exponer teléfonos antes de autorización).
- **Panel del personal (`/acceso` y panel autenticado):** autenticación con segundo factor (MFA), cierre automático por inactividad (15 minutos), salida rápida y vistas diferenciadas por rol:
  - `trabajo-social`
  - `psicologia`
  - `juridico`
  - `capacitacion`
  - `administracion`

## Requisitos

- **Node.js** `>= 22` (se recomienda **Node 24**, la misma versión usada en el `Dockerfile`) y `npm`.
- **Make** (en Windows: Git Bash, WSL o `choco install make`).
- **Docker** (opcional, para construir y probar la imagen de producción con Caddy).

## Variables de entorno

Copia `.env.example` a `.env` si todavía no existe:

```sh
cp .env.example .env
```

| Variable | Valor por defecto (`.env.example`) | Descripción |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | Destino del proxy `/api` en `vite dev`/`vite preview` (`http://localhost:3001` para Docker Compose del backend, `http://localhost:4010` para Prism mock) |
| `VITE_API_PREFIX` | `/api` | Prefijo base de las peticiones HTTP al backend |
| `VITE_DATOS_SIMULADOS` | `false` | `true` para trabajar en memoria sin backend; `false` para usar la API real |

> Ninguna variable `VITE_*` debe contener secretos, tokens ni credenciales.

## Primeros pasos

```sh
npm ci            # instala exactamente las versiones fijadas en package-lock.json
make dev          # servidor de desarrollo en http://localhost:5173 (solo localhost)
```

Opciones de trabajo sin backend completo:

- **Datos simulados en memoria (sin backend ni servidor mock):**
  ```sh
  make dev-simulado
  ```
- **Servidor simulado desde el contrato OpenAPI (Prism):**
  ```sh
  make mock         # terminal 1: servidor simulado en http://localhost:4010
  make dev-mock     # terminal 2: cliente apuntando al servidor simulado
  ```

## Comandos

Ejecuta `make help` para ver la lista completa:

| Comando | Qué hace |
|---|---|
| `make dev` | Servidor de desarrollo Vite con recarga en caliente (`http://localhost:5173`) |
| `make dev-simulado` | Servidor de desarrollo con datos simulados en memoria (`VITE_DATOS_SIMULADOS=true`) |
| `make mock` / `make dev-mock` | Levanta Prism desde `contract/openapi.yaml` / cliente apuntando a él |
| `make test` | Pruebas unitarias y de componentes (Vitest) |
| `make lint` | ESLint, incluidas las reglas de seguridad del proyecto |
| `make typecheck` | Verificación de tipos (`tsc -b`) |
| `make sec` | Auditoría de dependencias (`npm audit --audit-level=high`) |
| `make build` | Compila la aplicación en `dist/` (`tsc -b && vite build`) |
| `make e2e` | Pruebas de extremo a extremo con Playwright (`escritorio` y `movil`) |
| `make check` | `lint`, `typecheck`, `test`, `sec` y `gen-check` (integración continua) |
| `make sync-contract` | Sincroniza `contract/openapi.yaml` desde el backend y regenera tipos |
| `make verify-contract` | Verifica que `contract/` coincide con `CONTRACT_REF` del backend |

Notas sobre pruebas locales:
- Si tu `.env` define `VITE_DATOS_SIMULADOS=false`, ejecuta las pruebas unitarias simuladas con:
  ```sh
  VITE_DATOS_SIMULADOS=true npm test
  ```
- La primera vez que ejecutes `make e2e`, instala Chromium para Playwright:
  ```sh
  npx playwright install chromium
  ```

## Estructura

```text
src/
├── main.tsx
├── index.css
├── app/            rutas, layouts, navegación por rol y detección de dispositivo en /
├── api/            cliente HTTP (cookies + CSRF) y tipos generados (generated/, no editar)
├── features/       módulos por funcionalidad:
│   ├── administracion/   reportes, solicitudes, bitácora, personal y opinión
│   ├── ayuda/            salida rápida, directorio y alertas de ayuda del portal
│   ├── bitacora/         tipos/consultas de bitácora
│   ├── bolsa/            bolsa de trabajo (capacitación, empresas y usuarias)
│   ├── canalizacion/     canalizaciones entre áreas
│   ├── capacitacion/     cursos, calendario, pase de lista y visitas
│   ├── encuestas/        cliente de encuestas y normalización de escalas
│   ├── expedientes/      expedientes, notas, consentimientos y altas
│   ├── identidad/        acceso de personal (MFA) y contexto de sesión
│   ├── portal/           portal de usuarias (/u), encuestas y mapa de atención
│   └── tablero/          mapa de calor por sectores
├── offline/        almacenamiento local cifrado en IndexedDB (ver src/offline/README.md)
├── pwa/            aviso de actualización del service worker (ver src/pwa/README.md)
├── shared/         utilidades y componentes compartidos (incluye dispositivo.ts)
└── test/           configuración global de Vitest
contract/           copia del contrato OpenAPI del backend (NO se edita aquí)
docs/               documentación funcional y técnica del frontend
e2e/                pruebas de humo E2E con Playwright
public/             íconos neutros de la PWA
scripts/            sincronización de contrato, generación de tipos y hooks
```

Las pruebas unitarias viven junto al archivo que prueban (`*.test.ts` / `*.test.tsx`).

## El contrato con el backend

`api/openapi.yaml` en el repositorio del backend es la única fuente de verdad. Aquí solo se conserva una copia en `contract/openapi.yaml` y la etiqueta en `contract/CONTRACT_REF`.

```sh
make sync-contract BACKEND_REPO_URL=git@github.com:ORG/REPO-BACKEND.git REF=contract-v1
```

Reglas:
1. Nunca se edita `contract/` ni `src/api/generated/` a mano: los cambios de API empiezan en el backend.
2. Se integra primero el backend y después el frontend; `CONTRACT_REF` apunta a una etiqueta existente en la rama principal del backend.
3. Si el backend aún no expone algún endpoint, se trabaja contra `make mock` o `make dev-simulado`.

## Seguridad y endurecimiento

- **Reglas automatizadas (ESLint):**
  - Prohibido `localStorage` y `sessionStorage` (todo almacenamiento local pasa por `src/offline` cifrado con Web Crypto + IndexedDB).
  - Prohibido `dangerouslySetInnerHTML` y `eval`.
- **Recursos propios:** sin scripts, fuentes ni recursos de terceros; todo se empaqueta en el sitio.
- **Sesión y CSRF:** autenticación con cookies `HttpOnly` del mismo origen; tokens anti-CSRF gestionados en memoria o cookie legible según dominio (`src/api/client.ts`).
- **Servidores Vite (`vite.config.ts`):** `vite dev` y `vite preview` escuchan únicamente en `localhost`, usan `server.fs.strict: true` y bloquean con `404` genérico el acceso HTTP a dotfiles, archivos de configuración, rutas del filesystem y artefactos internos.
- **Producción (`Caddyfile` + `Dockerfile`):** compilación con `build.sourcemap: false`; Caddy sirve únicamente `dist/` sin privilegios (`USER 1000:1000`), añade `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, oculta `Server`, responde `404` genérico ante rutas ocultas/internas antes de `try_files` y usa `handle_errors` sin detalles internos.
- **Privacidad de datos:** cero datos reales en el repositorio; todos los casos, nombres y teléfonos de prueba son ficticios.

## PWA y despliegue en producción

### PWA
- El manifiesto usa un nombre e íconos neutros (`Agenda`) configurados en `vite.config.ts` y `public/` para no delatar el propósito de la aplicación.
- Workbox solo precarga archivos estáticos de compilación (`dist/`); las rutas `/api/` quedan excluidas de caché (`navigateFallbackDenylist: [/^\/api\//]`, sin `runtimeCaching`).
- Para probar instalación y modo sin conexión completo hace falta HTTPS mediante la composición del backend.

### Contenedor de producción
En cualquier entorno accesible por red debe desplegarse la compilación estática (`dist/`) con el contenedor de producción y nunca `vite dev` ni `vite preview`:

```sh
docker build -t sai-frontend .
docker run --rm -p 8080:8080 sai-frontend
```

## Documentación adicional y notas

- Consulta [docs/](docs/README.md), [CONTRIBUTING.md](CONTRIBUTING.md) y [SECURITY.md](SECURITY.md) para guías de contribución, flujo de pantallas y reporte de vulnerabilidades.
- `.npmrc` fija versiones exactas (`save-exact`) y desactiva scripts de instalación (`ignore-scripts`).
- `npm audit` puede reportar advertencias moderadas en herramientas de compilación (`workbox-build`, que no viajan al navegador); `make sec` falla únicamente con severidad alta o crítica.
