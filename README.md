# Frontend

Cliente web de la plataforma: React + TypeScript + Vite, empaquetado como aplicación web progresiva (PWA). Una sola base de código para teléfono y computadora.

El backend, el contrato de la API y la orquestación de contenedores viven en el repositorio del backend. Este repositorio consume el contrato y aporta la imagen del cliente.

## Requisitos

- Node.js 22 o superior (se recomienda 24, la misma versión que usa el `Dockerfile`).
- Make (en Windows: usar Git Bash, WSL o `choco install make`).

## Primeros pasos

```sh
npm ci            # instala exactamente lo que dice package-lock.json
make dev          # servidor de desarrollo (http://localhost:5173)
```

`make dev` dirige las rutas `/api` al proxy del backend (`https://localhost:8443`). Si todavía no tienes el backend levantado, usa el servidor simulado:

```sh
make mock         # terminal 1: servidor simulado en el puerto 4010
make dev-mock     # terminal 2: cliente apuntando al servidor simulado
```

## Comandos

Ejecuta `make help` para ver la lista. Los principales:

| Comando | Qué hace |
|---|---|
| `make dev` | Servidor de desarrollo con recarga en caliente |
| `make mock` / `make dev-mock` | Servidor simulado desde el contrato / cliente apuntando a él |
| `make test` | Pruebas unitarias (Vitest) |
| `make lint` | ESLint, incluidas las reglas de seguridad del proyecto |
| `make typecheck` | Verificación de tipos |
| `make sec` | Auditoría de dependencias (falla con severidad alta o crítica) |
| `make e2e` | Pruebas de extremo a extremo con Playwright |
| `make check` | Todo lo que corre la integración continua. **Debe pasar antes de pedir revisión** |
| `make sync-contract` | Trae el contrato del backend (ver más abajo) |

La primera vez que uses `make e2e`: `npx playwright install chromium`.

## Estructura

```
src/
├── main.tsx
├── app/            rutas, proveedores y diseño general
├── api/            cliente HTTP y tipos generados desde el contrato (generated/, no se edita a mano)
├── features/       una carpeta por funcionalidad: identidad, expedientes, canalizacion,
│                   bitacora, tablero y ayuda (botón de salida rápida)
├── offline/        todo lo que se guarda en el dispositivo (cifrado). Ver su README
├── pwa/            aviso de actualización del service worker. Ver su README
├── shared/         solo lo que usan al menos dos funcionalidades
└── test/           configuración de las pruebas
contract/           copia del contrato del backend (NO se edita aquí)
e2e/                pruebas de extremo a extremo
scripts/            sincronización del contrato, generación de tipos y validación de commits
public/             íconos neutros de la PWA
```

Las pruebas unitarias van junto al archivo que prueban (`*.test.ts` / `*.test.tsx`).

## El contrato con el backend

El archivo `api/openapi.yaml` del backend es la única fuente de verdad. Aquí solo hay una copia en `contract/openapi.yaml`, y `contract/CONTRACT_REF` indica de qué etiqueta del backend viene.

Para actualizarla:

```sh
make sync-contract BACKEND_REPO_URL=git@github.com:ORG/REPO-BACKEND.git REF=contract-v1
```

Esto copia el contrato, anota la referencia y regenera `src/api/generated/schema.d.ts`. La solicitud de integración incluye los tres cambios. `make verify-contract` compara la copia con el backend en la referencia anotada.

Reglas:

1. Nunca se edita `contract/` a mano: los cambios de la API empiezan en el backend.
2. Se integra primero el backend y después el frontend. `CONTRACT_REF` nunca apunta a una etiqueta que no exista aún en la rama principal del backend.
3. Mientras el backend no tenga los endpoints, se trabaja con `make mock`.

## Reglas de seguridad del código

ESLint hace cumplir las que se pueden automatizar:

- Prohibido `localStorage` y `sessionStorage`. Lo que se guarda en el dispositivo pasa por `src/offline` y va cifrado.
- Prohibido `dangerouslySetInnerHTML` y `eval`.
- Sin scripts, fuentes ni recursos de terceros: todo se empaqueta en el sitio.
- Las rutas `/api` nunca se guardan en caché del service worker (ver `vite.config.ts`).
- El token anti-CSRF vive solo en memoria (`src/api/client.ts`).
- Cero datos reales en el repositorio: solo datos ficticios.

## PWA

El manifiesto usa un nombre e íconos neutros (`Agenda`) para que la aplicación instalada no delate su propósito; se configuran en `vite.config.ts` y `public/`. El service worker solo precarga archivos estáticos. Para probar instalación y modo sin conexión hace falta HTTPS: usa la composición completa del backend (`make up-preprod` en ese repositorio) y no el servidor de desarrollo.

## Contenedor

El `Dockerfile` compila el cliente y produce una imagen con solo archivos estáticos (Caddy, sin privilegios, puerto 8080). El proxy principal vive en el repositorio del backend.

## Notas

- `.npmrc` fija versiones exactas (`save-exact`) y desactiva los scripts de instalación (`ignore-scripts`), como medida contra código malicioso en dependencias.
- `npm audit` reporta advertencias de severidad moderada en herramientas que solo se usan al compilar (`workbox-build`, que trae `glob` y `minimatch`). No viajan al navegador, y `make sec` solo falla con severidad alta o crítica. Revisar periódicamente con Dependabot.
- Los datos y nombres de este repositorio son siempre ficticios.
