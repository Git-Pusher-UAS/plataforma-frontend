# pwa/

Registro del service worker y aviso de actualización.

Reglas:

- El service worker solo precarga archivos estáticos de la compilación.
- Las rutas `/api/` nunca se guardan en caché ni pasan por el service worker
  (ver `vite.config.ts`: sin `runtimeCaching` y con `navigateFallbackDenylist`).
- Las actualizaciones se anuncian y se aplican cuando la persona lo confirma.
- Todo cambio en esta carpeta requiere revisión de seguridad (ver CODEOWNERS).
