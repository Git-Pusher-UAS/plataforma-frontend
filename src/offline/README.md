# offline/

Todo lo que se guarda en el dispositivo vive aquí y solo aquí.

Reglas:

- Nada de `localStorage` ni `sessionStorage` (lo impide ESLint). Se usa IndexedDB.
- Todo lo almacenado va cifrado con Web Crypto (AES-GCM). La clave se deriva de un PIN local
  (PBKDF2) y se mantiene en memoria como no extraíble.
- Se guarda lo mínimo: identificador de la operación, contenido necesario y hora. Nada de CURP,
  nombres ni narrativas completas si no hace falta.
- Cada elemento de la cola lleva un UUID generado en el dispositivo, para que el servidor
  reconozca los reenvíos y no cree duplicados.
- Al cerrar sesión, o tras varios intentos fallidos de PIN, se borra todo lo local.
- Todo cambio en esta carpeta requiere revisión de seguridad (ver CODEOWNERS).
