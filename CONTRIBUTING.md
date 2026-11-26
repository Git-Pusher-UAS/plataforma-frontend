# Cómo contribuir

## Flujo

1. Crea una rama corta desde `main` con el formato `tipo/modulo-descripcion`, por ejemplo `feat/expedientes-duplicados` o `fix/sesion-expiracion`. Una rama no debe vivir más de un día de trabajo.
2. Haz commits con el formato de **commits convencionales**: `tipo(modulo): descripción`.
   Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `security`, `build`, `ci`, `perf`, `style`.
   Ejemplo: `feat(expedientes): detectar duplicados por CURP`.
3. Antes de abrir la solicitud de integración, ejecuta `make check`. Debe pasar.
4. Abre la solicitud con la plantilla completa. Un cambio coherente por solicitud, idealmente menos de 400 líneas modificadas.
5. Alguien distinto del autor la revisa. Las rutas sensibles (`src/offline`, `src/pwa`, `Dockerfile`, `Caddyfile`, `.github`) requieren la revisión de la persona de seguridad.
6. Se integra con **fusión por aplastamiento**. No se integra nada con comprobaciones en rojo.

## Funcionalidades que tocan la API

Se usa el **mismo nombre de rama en el repositorio del backend y en este**, y cada solicitud enlaza a la otra (`Depende de: ...`). Se integra primero el backend y después este repositorio, con el contrato sincronizado a la etiqueta correspondiente. Ver README.

## Código asistido por IA

Se indica en la solicitud. Quien la envía responde por el código como si lo hubiera escrito por completo. Reglas:

- Toda dependencia sugerida se confirma contra el registro oficial de npm antes de instalarla, y se fija a una versión exacta.
- Las pruebas de seguridad se verifican rompiendo el código a propósito: se quita la comprobación y se confirma que alguna prueba falla.
- Nunca se pegan secretos, datos reales ni capturas con información personal en una herramienta externa.

## Ganchos locales

Instala [lefthook](https://github.com/evilmartians/lefthook) y ejecuta `lefthook install`. Los ganchos validan el mensaje de commit, buscan secretos (si tienes `gitleaks`) y ejecutan ESLint, tipos y pruebas rápidas. Son una ayuda: la integración continua repite las comprobaciones.

## Secretos

Nada de claves, archivos `.env` ni datos reales en el repositorio. Si un secreto se sube por error, se considera comprometido: se revoca y se rota de inmediato, y solo después se limpia el historial.
