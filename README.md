# Web de la boda · Leti y Pablo · 10 de abril de 2027

Web estática de una sola página con la información de la boda y el formulario de confirmación.
Las respuestas caen en una hoja de Google Sheets a través de Google Apps Script.

## Archivos

- `index.html` — la página entera (secciones, formulario).
- `styles.css` — estilos (estilo «Mar»: fondo azul del mar de la portada, todo el texto en un solo crudo). Colores y tipografías en las variables del principio.
- `app.js` — cuenta atrás, portada, revelado al hacer scroll, formulario. **La configuración está arriba del todo, en `CONFIG`.**
- `404.html` y `404.css` — la página que sale cuando alguien escribe mal la dirección.
- `_reserva/mapa.js` — el mapa de hoteles incrustado que tuvo la web. No se carga ni se publica; está guardado por si se recupera (las instrucciones van al principio del fichero).
- `../apps-script/Code.gs` — el script que recibe las respuestas y las escribe en la hoja de cálculo. Está fuera de `web/` a propósito: esta carpeta se publica entera y el script lleva vuestro email.
- `assets/portada-900.jpg`, `portada-1200.jpg`, `portada.jpg` (1400 px), `portada-1900.jpg` y `portada-2600.jpg` — la foto de portada, cuadrada, en cinco tamaños; el navegador elige según la pantalla. `portada-v-675.jpg`, `-900`, `-1100` y `-1425` son el recorte vertical (3:4, el centro de la misma foto) que se sirve a móviles y tabletas en vertical: pesa una cuarta parte menos. Ocupa la pantalla entera y se recorta sola (`object-fit: cover`). El original está fuera de esta carpeta, en `../IMG_0171.HEIC` (las anteriores, en `../portada-original-v2.jpeg` y `../portada-original.jpg`).
- `assets/og.jpg` (1200×630, <300 KB) — la imagen que muestran WhatsApp y compañía al compartir el enlace. Sale de la misma foto.
- `assets/boda.ics` — el archivo de "Añadir al calendario". En iPhone, iPad y Mac el enlace lo abre directamente en Calendario; en Android y el resto, `calendario()` de `app.js` cambia el enlace por Google Calendar con el evento ya relleno. Es un fichero fijo: si cambia la hora o el sitio, edítalo a mano (DTSTART, LOCATION, DESCRIPTION), sube la fecha de DTSTAMP **y cambia también los datos de `calendario()` en `app.js`**.
- `assets/foto-poio-*.jpg` y `assets/foto-senorans-*.jpg` — las fotos de las sedes en varios anchos. La del monasterio llega a 1600 px, que es lo que mide el original; la del pazo a 1269 px porque la foto llegó por WhatsApp: con el original del pazo se podría añadir un tamaño mayor para ordenadores.
- Tipografías: Cormorant Garamond y Jost, autoalojadas en `assets/fonts/` (tres ficheros, subconjunto latino). La web no pide nada a Google Fonts. En la misma carpeta está la del plano dibujado.
- `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png` — icono de la pestaña y de la pantalla de inicio del móvil (silueta de Ons en crudo sobre el azul de la web). Los PNG y el ICO salen de `favicon.svg`.

## Datos por rellenar

Busca los corchetes en `index.html`:

```bash
grep -n "\[" index.html
```

- **Esconder secciones.** "Cómo llegar" y "Alojamiento" van visibles en el HTML (así se ven también sin JavaScript). Para esconder una: `CONFIG.secciones` en `app.js`, poner `llegar: false` o `alojamiento: false`, y subir el número de `app.js?v=` en `index.html`.
- Horarios de autobús: la sección "Cómo llegar" lleva ahora solo una línea; cuando haya horarios, se añaden ahí. Las paradas del desplegable se cambian en `CONFIG.paradasBus` (y en `PARADAS` de `Code.gs`), en el orden del recorrido. El formulario añade siempre «Aún no lo sé» y «Otro sitio». Las de `CONFIG.paradasSoloIda` no se ofrecen a quien pide «Solo vuelta».
- Teléfonos: están en el HTML (sección Contacto y `<noscript>`) y en `CONFIG.whatsappLeti` / `whatsappPablo` (solo dígitos con prefijo). Si cambian, cambiar en los dos sitios.
- Número de cuenta: se pone en `CONFIG.iban` y aparece en su propia sección, después de la confirmación. Al tocarlo se copia. Vacío = no aparece. **Titular:** `CONFIG.titular` está vacío; al rellenarlo (por ejemplo `'A nombre de …'`, tal como figura en el banco) aparece una línea bajo el número. Los bancos comprueban que el nombre del beneficiario coincide con el de la cuenta.
- Hora de la ceremonia: en `index.html` (rótulo sobre la foto del monasterio) y en `assets/boda.ics`.
- Formulario: está plegado bajo el botón «Dinos si vienes»; quien entra por `letipablo.com/#confirmar` lo encuentra abierto (también valen `#rsvp` y `#formulario`). En los recordatorios conviene compartir siempre `letipablo.com/#confirmar`.
- Desde el día de la boda la web quita sola el botón, el atajo y el formulario, y la cuenta atrás pasa a «Es hoy» y después a «Ya nos hemos casado».

## Qué guarda la web en el navegador del invitado

No hay cookies ni se manda nada a terceros. En el propio navegador se guardan dos cosas, para no perder lo escrito:

- **Borrador** (`sessionStorage`, clave `boda-borrador`): lo que lleva escrito en el formulario. Vuelve si recarga la página y se borra al enviar o al cerrar la pestaña.
- **Respuesta enviada** (`localStorage`, clave `boda-respuesta`): lo que contestó. Al volver a entrar ve «Nos contestaste el…» con su resumen y el enlace «Cambiar mi respuesta».

## Política de seguridad de contenido

`index.html` lleva una etiqueta `<meta http-equiv="Content-Security-Policy">`: la página solo carga ficheros propios y solo habla con Google Apps Script. Dos consecuencias:

- El único script escrito dentro del HTML es `document.documentElement.classList.add('js');`, autorizado por su huella `sha256-…`. **Si se cambia una sola letra de ese script hay que recalcular la huella** o la web se queda sin revelado:

  ```bash
  printf '%s' "document.documentElement.classList.add('js');" | openssl dgst -sha256 -binary | openssl base64
  ```

- No se pueden poner estilos ni scripts en línea (`style="…"`, `onclick="…"`), ni cargar nada de otro dominio, sin añadirlo antes a esa etiqueta.

## Mapa de hoteles

Alojamiento enlaza al My Maps «Boda Leti y Pablo · Dónde dormir» con «Ver en el mapa»; los hoteles van en una lista por zonas (`<details class="zona">`). **El My Maps se edita aparte, en mymaps.google.com: cada vez que cambie la lista de hoteles de la web hay que cambiarlo también allí**, o las dos dicen cosas distintas.

El mapa incrustado que tuvo la web (Google Maps por API con fichas propias) está guardado en `_reserva/mapa.js`, con las instrucciones para recuperarlo. Mientras siga en reserva, el despliegue no inyecta la clave de Google Maps y la clave puede estar desactivada en Google Cloud. Los minutos en coche de cada hotel están en `assets/mapa/datos.json` (`"Nombre": [lat, lon, min a Poio, min al pazo]`), y de ahí salen los rótulos de cada zona.

## Foto de portada

Para cambiar la foto hacen falta los cinco tamaños cuadrados de `assets/portada*.jpg` (900, 1200, 1400, 1900 y 2600 px de lado), los cuatro verticales `assets/portada-v-*.jpg` (el 75 % central del ancho del cuadrado, a 900, 1200, 1467 y 1900 px de alto) y `assets/og.jpg`, a partir de un recorte cuadrado del original. Al cambiar `og.jpg` hay que subir el número de `og.jpg?v=` en `index.html`, o WhatsApp seguirá enseñando la foto anterior. Con una foto vertical, el recorte se hace quitando cielo por arriba. Si el original es HEIC de iPhone, conviértelo antes a JPEG en sRGB y con la orientación ya aplicada (`sips` no la aplica al recortar).

El encuadre dentro de la pantalla se ajusta con `object-position` de `.hero__foto` en `styles.css` (ahora `50% 18%`: centrada y tirando hacia arriba, para que las caras queden por encima del rótulo).

## Conectar el formulario a Google Sheets

1. Crea una hoja de cálculo nueva en Google Sheets (por ejemplo "Boda · Respuestas").
2. Menú **Extensiones → Apps Script**. Borra lo que haya y pega el contenido de `../apps-script/Code.gs` (carpeta `Boda/apps-script`). Guarda.
3. Si quieres recibir un email por cada respuesta, pon tu dirección en `AVISAR_A`.
4. **Implementar → Nueva implementación**. Tipo: *Aplicación web*. Ejecutar como: *Yo*. Quién tiene acceso: *Cualquier usuario*. Implementar y autorizar los permisos.
5. Copia la URL que termina en `/exec` y pégala en `CONFIG.appsScriptUrl` de `app.js`.
6. Prueba enviando una confirmación desde la web: debe aparecer una pestaña "Respuestas" con una fila por persona y una pestaña "Resumen" con los totales.

Qué hace el script además de guardar la fila:

- **Reintentos.** Cada envío lleva un identificador (columna `Envío`). Si el formulario reintenta porque no le llegó la respuesta de Google, el segundo intento trae el mismo identificador y el script contesta que ya lo tiene, sin escribir filas ni mandar correos.
- **Respuestas repetidas.** Si la misma persona (mismo nombre sin tildes ni mayúsculas y mismo teléfono o email; del teléfono cuentan las últimas 9 cifras, con o sin prefijo) vuelve a enviar el formulario, sus filas anteriores pasan a `Estado = Sustituida`. Si coincide el nombre pero el contacto es otro, puede ser otra persona que se llama igual: la nueva respuesta se guarda con `Estado = Revisar`, la anterior no se toca y llega un aviso a `AVISAR_A`. Al revisarla, cambiad a mano el Estado a `Vigente` (y la otra a `Sustituida` si era la misma persona). El Resumen cuenta todo lo que no sea `Sustituida`.
- **Aviso por respuesta.** `AVISAR_A` lleva el email que recibe un correo por cada envío.
- **Espera.** El Apps Script tarda entre 4 y 20 segundos en responder cuando lleva un rato sin usarse, y a veces contesta con una página de error aunque haya guardado. La web manda una petición vacía en cuanto alguien toca el formulario para "despertarlo", espera hasta 30 s por intento y reintenta dos veces; si aun así no hay respuesta, lo dice y da los dos WhatsApp.
- **Topes.** El script recorta cada campo (nombre 80, alergias 120, comentarios 500 caracteres), admite 10 acompañantes por respuesta y manda como mucho 40 acuses por hora.
- **Descartadas.** Lo que cae en la trampa antispam o llega desde otra web se apunta en la pestaña `Descartadas`, sin avisos. Conviene mirarla de vez en cuando por si hay algún invitado de verdad.
- **Acuse de recibo.** El email es opcional en el formulario (columna Contacto: "teléfono · email"). Si lo hay, el invitado recibe un correo con lo que ha respondido, remitido por "Leti y Pablo" desde la cuenta que desplegó el script. Con `RESPONDER_A` se elige a qué dirección llegan sus respuestas.
- **Pestaña Resumen.** Se crea sola con la primera respuesta. Son fórmulas sobre "Respuestas" (personas que vienen, adultos y niños, autobús por parada, alergias, hotel, comentarios, noes). Si la borras o la estropeas, menú **Boda → Rehacer resumen** en la hoja de cálculo.

Cada vez que cambies `Code.gs` hay que hacer **Implementar → Gestionar implementaciones → editar → nueva versión** para que la URL use el código nuevo.

Mientras `appsScriptUrl` esté vacía, el formulario funciona en modo prueba: muestra el mensaje de gracias pero no envía nada (lo avisa en la consola del navegador).

## Publicar

La web está en GitHub Pages con el dominio `letipablo.com`. Publicar es hacer `git push` desde esta carpeta: el despliegue (`.github/workflows/publicar.yml`) quita lo que no es de la web (`README.md`, `.gitignore` y `_reserva/`) y publica el resto en medio minuto.

**Orden cuando cambian a la vez la web y `Code.gs`:** primero la nueva versión del Apps Script, después el `git push`. La web nueva con el script antiguo funciona, pero sin la protección contra reintentos.

## Ver en local

```bash
cd web
python3 -m http.server 8000
```

y abrir `http://localhost:8000`.
