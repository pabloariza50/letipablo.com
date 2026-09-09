# Web de la boda · Leti y Pablo · 10 de abril de 2027

Web estática de una sola página con la información de la boda y el formulario de confirmación.
Las respuestas caen en una hoja de Google Sheets a través de Google Apps Script.

## Archivos

- `index.html` — la página entera (secciones, formulario).
- `styles.css` — estilos. Colores y tipografías en las variables del principio.
- `app.js` — cuenta atrás, menú móvil, calendario, formulario. **La configuración está arriba del todo, en `CONFIG`.**
- `../apps-script/Code.gs` — el script que recibe las respuestas y las escribe en la hoja de cálculo. Está fuera de `web/` a propósito: esta carpeta se publica entera y el script lleva vuestro email.
- `assets/portada.jpg` (1400 px) y `assets/portada-900.jpg` (900 px, para móvil) — la foto de portada. Se muestra entera, sin recortes: la columna toma la proporción de la imagen (`aspect-ratio` en `styles.css`). El original a tamaño completo está fuera de esta carpeta, en `../portada-original-v2.jpeg` (la web usa un recorte cuadrado quitando cielo por arriba: `sips -c 3024 3024 --cropOffset 972 0`) (la anterior, en `../portada-original.jpg`).
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` — icono de la pestaña y de la pantalla de inicio del móvil (silueta de Ons).

## Datos por rellenar

Busca los corchetes en `index.html`:

```bash
grep -n "\[" index.html
```

- `[HORA]` — hora de la ceremonia (portada, banda, ceremonia).
- `[HORAS DE VUELTA]`, `[PUNTO DE SALIDA]` — autobuses. Las paradas del desplegable se cambian en `CONFIG.paradasBus`.
- `[DOMINIO]` — en las etiquetas `og:url` y `og:image` de la cabecera, cuando tengáis el dominio (p. ej. `letiypablo.es`). Hasta entonces WhatsApp no mostrará la foto al compartir el enlace.
- `[WHATSAPP LETI]`, `[WHATSAPP PABLO]` — se sustituyen solos al poner los números en `CONFIG.whatsappLeti` / `whatsappPablo` (solo dígitos con prefijo, p. ej. `34600000000`).
- Número de cuenta: se pone en `CONFIG.iban` y aparece en el pie de página, entre el nombre y la fecha. Al tocarlo se copia. Vacío = no aparece.
- Hora de la ceremonia en `CONFIG.horaCeremonia` (`'13:00'`) para que el archivo de calendario lleve hora.

## Foto de portada

Para cambiar la foto, genera las dos versiones a partir del original (la web carga la de 900 px en móvil y la de 1400 px en escritorio):

```bash
sips -s format jpeg -s formatOptions 78 --resampleWidth 1400 original.jpg --out assets/portada.jpg
sips -s format jpeg -s formatOptions 78 --resampleWidth 900 original.jpg --out assets/portada-900.jpg
```

Si la proporción cambia, actualiza el `aspect-ratio` de `.hero__photo` en `styles.css` y los atributos `width`/`height` y `og:image:width/height` de `index.html` con las medidas de la nueva foto de 1400 px.

## Conectar el formulario a Google Sheets

1. Crea una hoja de cálculo nueva en Google Sheets (por ejemplo "Boda · Respuestas").
2. Menú **Extensiones → Apps Script**. Borra lo que haya y pega el contenido de `../apps-script/Code.gs` (carpeta `Boda/apps-script`). Guarda.
3. Si quieres recibir un email por cada respuesta, pon tu dirección en `AVISAR_A`.
4. **Implementar → Nueva implementación**. Tipo: *Aplicación web*. Ejecutar como: *Yo*. Quién tiene acceso: *Cualquier usuario*. Implementar y autorizar los permisos.
5. Copia la URL que termina en `/exec` y pégala en `CONFIG.appsScriptUrl` de `app.js`.
6. Prueba enviando una confirmación desde la web: debe aparecer una pestaña "Respuestas" con una fila por persona y una pestaña "Resumen" con los totales.

Qué hace el script además de guardar la fila:

- **Respuestas repetidas.** Si la misma persona vuelve a enviar el formulario, sus filas anteriores pasan a `Estado = Sustituida` y solo cuentan las `Vigente`. Se compara el nombre sin tildes ni mayúsculas.
- **Acuse de recibo.** Si el contacto contiene un email, el invitado recibe un correo con lo que ha respondido, remitido por "Leti y Pablo" desde la cuenta que desplegó el script. Con `RESPONDER_A` se elige a qué dirección llegan sus respuestas.
- **Pestaña Resumen.** Se crea sola con la primera respuesta. Son fórmulas sobre "Respuestas" (personas que vienen, adultos/niños/bebés, autobús por parada, alergias, hotel, comentarios, noes). Si la borras o la estropeas, menú **Boda → Rehacer resumen** en la hoja de cálculo.

Cada vez que cambies `Code.gs` hay que hacer **Implementar → Gestionar implementaciones → editar → nueva versión** para que la URL use el código nuevo.

Mientras `appsScriptUrl` esté vacía, el formulario funciona en modo prueba: muestra el mensaje de gracias pero no envía nada (lo avisa en la consola del navegador).

## Publicar en GitHub Pages

```bash
cd web
git init
git add .
git commit -m "Web de la boda"
gh repo create boda --private --source=. --push
```

Luego en GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root)**. En un par de minutos la web estará en `https://<usuario>.github.io/boda/`.

Para el dominio propio: en **Settings → Pages → Custom domain** escribe el dominio, y en el panel del registrador crea estos registros DNS:

- `A` con `@` apuntando a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`.
- `CNAME` con `www` apuntando a `<usuario>.github.io`.

Marca "Enforce HTTPS" cuando GitHub lo permita (tarda un rato tras el DNS).

## Ver en local

```bash
cd web
python3 -m http.server 8000
```

y abrir `http://localhost:8000`.
