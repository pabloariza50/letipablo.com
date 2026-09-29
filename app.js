/* Configuración de la web. Todo lo que cambia con el tiempo está aquí. */
const CONFIG = {
  // URL del despliegue de Google Apps Script (ver README). Vacía = modo prueba, no envía nada.
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzD9ExNa2x0NAVxkk-8x96N9LctgR0NvQOPPBwYUcq01jw3tw1gIPMnC26i2lJikpCj/exec',

  fecha: '2027-04-10',

  // Puntos del recorrido donde puede parar el autobús, en el orden del recorrido. El formulario añade siempre
  // «Aún no lo sé» y «Otro sitio». Si cambias esta lista, cambia también PARADAS en apps-script/Code.gs.
  paradasBus: ['Sanxenxo', 'Raxó', 'Samieira', 'Combarro', 'Poio (después de la ceremonia)', 'Pontevedra'],
  // Paradas que no tienen sentido para quien solo quiere la vuelta
  paradasSoloIda: ['Poio (después de la ceremonia)'],

  // Solo números, con prefijo: '34600000000'. Vacío = se deja el enlace tal cual está en el HTML.
  whatsappLeti: '34634275463',
  whatsappPablo: '34660812140',

  // Número de cuenta para regalos. Vacío = no aparece. Se muestra en su propia sección, después de la confirmación.
  iban: 'ES32 1544 7889 7466 5198 1272',
  // Titular de la cuenta, tal como figura en el banco (los bancos comprueban que el nombre coincide con el número).
  // Vacío = no se muestra. Ejemplo: 'A nombre de Nombre Apellido Apellido'
  titular: '',

  // Secciones que se pueden esconder: pon false para ocultar una.
  secciones: { llegar: true, alojamiento: true },

  // Envío: tiempo máximo de espera por intento (ms) y número de reintentos si no llega respuesta.
  // Reintentar es seguro: cada envío lleva un identificador y el servidor no lo guarda dos veces.
  envioTimeout: 30000,
  envioReintentos: 2,

  // Tope de acompañantes por respuesta (= MAX.acompanantes en Code.gs)
  maxAcompanantes: 10,
};

const SUAVE = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
  secciones();
  cuentaAtras();
  portada();
  revelar();
  abrirFormulario();
  contacto();
  calendario();
  cuenta();
  codigos();
  formulario();
  plano();
});

/* Secciones que se esconden desde CONFIG.secciones. En el HTML van visibles: sin JavaScript se ven todas */
function secciones() {
  Object.entries(CONFIG.secciones || {}).forEach(([nombre, visible]) => {
    document.querySelectorAll(`[data-seccion="${nombre}"]`).forEach(el => { el.hidden = !visible; });
  });
}

/* Plano ilustrado de Cómo llegar: se incrusta el SVG en la página para que use las fuentes de la web.
   Si falla la descarga se queda la <img> (mismo dibujo con las fuentes del sistema). */
function plano() {
  const figura = document.querySelector('[data-plano]');
  const img = figura && figura.querySelector('img');
  if (!img) return;
  fetch(img.getAttribute('src'))
    .then(r => (r.ok ? r.text() : Promise.reject()))
    .then(svg => {
      figura.innerHTML = svg;
      figura.scrollLeft = (figura.scrollWidth - figura.clientWidth) / 2;   // en móvil (se desliza de lado) empieza centrado
    })
    .catch(() => {});
}

/* Días que faltan para la boda (negativo si ya ha pasado) */
function diasQueFaltan() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const boda = new Date(CONFIG.fecha + 'T00:00:00');
  return Math.round((boda - hoy) / 86400000);
}

/* Cuenta atrás. Desde el día de la boda ya no se puede confirmar: se quitan el botón, el atajo y el formulario */
function cuentaAtras() {
  const dias = diasQueFaltan();
  let texto;
  if (dias > 1) texto = `Faltan ${dias} días`;
  else if (dias === 1) texto = 'Falta un día';
  else if (dias === 0) texto = 'Es hoy';
  else texto = 'Ya nos hemos casado';
  document.querySelectorAll('[data-cuenta-atras]').forEach(el => { el.textContent = texto; });
  if (dias > 0) return;
  document.documentElement.classList.add('ya-es');
  document.querySelectorAll('[data-abrir-formulario], [data-atajo], #formulario').forEach(el => { el.hidden = true; });
  document.querySelectorAll('[data-ir-formulario]').forEach(a => a.replaceWith(document.createTextNode(a.textContent)));
  const titulo = document.querySelector('[data-confirmar-titulo]');
  if (titulo && dias < 0) titulo.textContent = 'Gracias por venir';
}

/* Portada: la foto se desplaza más despacio que la página. Si la foto no carga, se quita y queda el azul */
function portada() {
  const foto = document.querySelector('[data-portada]');
  if (!foto) return;
  const quitar = () => (foto.closest('picture') || foto).remove();
  if (foto.complete && !foto.naturalWidth) { quitar(); return; }
  foto.addEventListener('error', quitar);
  if (!SUAVE()) return;
  addEventListener('scroll', () => {
    if (scrollY > innerHeight * 1.2) return;   // ya no se ve
    foto.style.transform = `scale(1.08) translateY(${scrollY * 0.24}px)`;
  }, { passive: true });
}

/* Los bloques con la clase «reveal» aparecen al entrar en pantalla */
function revelar() {
  const bloques = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { bloques.forEach(el => el.classList.add('visible')); return; }
  const io = new IntersectionObserver(entradas => {
    entradas.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  bloques.forEach(el => io.observe(el));
  addEventListener('beforeprint', () => bloques.forEach(el => el.classList.add('visible')));
}

/* El botón «Dinos si vienes» despliega el formulario debajo y desaparece. Quien llega con #confirmar en el enlace
   (o #rsvp, o #formulario) lo encuentra abierto; los enlaces [data-ir-formulario] de la página también lo abren */
function abrirFormulario() {
  const btn = document.querySelector('[data-abrir-formulario]');
  const caja = document.getElementById('formulario');
  if (!btn || !caja || diasQueFaltan() <= 0) return;
  const abrir = () => {
    if (!caja.hidden) return;
    caja.hidden = false;
    btn.hidden = true;
    btn.setAttribute('aria-expanded', 'true');
  };
  btn.addEventListener('click', () => {
    abrir();
    caja.focus({ preventScroll: true });   // el botón desaparece: el foco pasa al formulario
    caja.scrollIntoView({ behavior: SUAVE() ? 'smooth' : 'auto', block: 'start' });
  });
  document.querySelectorAll('[data-ir-formulario]').forEach(a => a.addEventListener('click', abrir));
  const porEnlace = () => {
    const ancla = location.hash.toLowerCase();
    if (!['#confirmar', '#rsvp', '#formulario'].includes(ancla)) return;
    abrir();
    if (ancla !== '#confirmar' || location.hash !== ancla) document.getElementById('confirmar').scrollIntoView();
  };
  addEventListener('hashchange', porEnlace);
  porEnlace();
}

/* Enlaces de WhatsApp: el número se ve siempre, con prefijo (hay invitados de fuera) */
function contacto() {
  const pon = (sel, num, quien) => {
    const a = document.querySelector(sel);
    if (!a || !num) return;
    a.href = `https://wa.me/${num}`;
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = formatoTelefono(num);
    a.setAttribute('aria-label', `${a.textContent}, WhatsApp de ${quien}`);
  };
  pon('[data-wa-leti]', CONFIG.whatsappLeti, 'Leti');
  pon('[data-wa-pablo]', CONFIG.whatsappPablo, 'Pablo');
}

function formatoTelefono(num) {
  const n = String(num).replace(/^34/, '');
  return '+34 ' + n.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

/* «Añadir al calendario» abre el calendario con el evento ya relleno, sin descargar nada a la vista.
   - iPhone, iPad y Mac: el enlace va al fichero assets/boda.ics, que el sistema abre en Calendario.
   - Android y el resto: Google Calendar con el evento listo para guardar.
   Si cambia la hora o el sitio hay que cambiarlo aquí y en assets/boda.ics. */
function calendario() {
  const enlaces = document.querySelectorAll('[data-calendario]');
  if (!enlaces.length || /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)) return;
  const datos = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Boda de Leti y Pablo',
    dates: '20270410T123000/20270411T020000',
    ctz: 'Europe/Madrid',
    location: 'Monasterio de Poio, Poio, Pontevedra',
    details: 'Ceremonia a las 12:30 en el Monasterio de Poio. Después celebramos en el Pazo de Señoráns (Vilanoviña, Meis). Toda la información en https://letipablo.com',
  });
  enlaces.forEach(a => {
    a.href = 'https://calendar.google.com/calendar/render?' + datos;
    a.target = '_blank'; a.rel = 'noopener';
    a.removeAttribute('type');
  });
}

/* Copia un texto al portapapeles. Devuelve si lo ha conseguido */
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = texto; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove();
    return ok;
  }
}

/* Número de cuenta: se ve como texto y al tocarlo se copia */
function cuenta() {
  const btn = document.querySelector('[data-cuenta]');
  if (!btn) return;
  const iban = CONFIG.iban.replace(/\s+/g, '').toUpperCase();
  if (!iban) return;
  // El lector de pantalla lee el número: lo que se ve forma parte del nombre del botón
  const oculto = t => { const s = document.createElement('span'); s.className = 'sr'; s.textContent = t; return s; };
  btn.textContent = '';
  btn.append(oculto('Número de cuenta: '), iban.replace(/(.{4})/g, '$1 ').trim(), oculto('. Toca para copiarlo'));
  btn.hidden = false;
  const frase = btn.closest('[data-regalo]');
  if (frase) frase.hidden = false;
  const titular = document.querySelector('[data-cuenta-titular]');
  if (titular && CONFIG.titular) { titular.textContent = CONFIG.titular; titular.hidden = false; }
  const aviso = document.querySelector('[data-cuenta-aviso]');
  let t;
  btn.addEventListener('click', async () => {
    const ok = await copiar(iban);
    if (!aviso) return;
    aviso.textContent = ok ? 'Número de cuenta copiado' : 'Mantén pulsado el número para copiarlo';
    clearTimeout(t);
    t = setTimeout(() => { aviso.textContent = ''; }, 5500);
  });
}

/* Códigos de descuento de los hoteles: se copian al tocarlos, como el número de cuenta */
function codigos() {
  document.querySelectorAll('[data-copiar]').forEach(btn => {
    const aviso = btn.parentElement.querySelector('[data-copiado]');
    let t;
    btn.addEventListener('click', async () => {
      const ok = await copiar(btn.dataset.copiar);
      if (!aviso) return;
      aviso.textContent = ok ? 'Copiado' : '';
      clearTimeout(t);
      t = setTimeout(() => { aviso.textContent = ''; }, 5500);
    });
  });
}

/* Guardar y leer del navegador sin romper nada si está bloqueado (modo privado, etc.) */
const almacen = {
  leer(donde, clave) { try { return JSON.parse(window[donde].getItem(clave)); } catch (e) { return null; } },
  guardar(donde, clave, valor) { try { window[donde].setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin sitio o bloqueado */ } },
  borrar(donde, clave) { try { window[donde].removeItem(clave); } catch (e) { /* nada */ } },
};
const BORRADOR = 'boda-borrador';     // sessionStorage: lo escrito a medias, por si se recarga la página
const RESPUESTA = 'boda-respuesta';   // localStorage: lo que ya se envió desde este navegador

function idEnvio() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

/* Formulario de confirmación */
function formulario() {
  const form = document.getElementById('rsvp');
  if (!form || diasQueFaltan() <= 0) return;
  const detalles = form.querySelector('[data-detalles]');
  const bloque = form.querySelector('[data-acompanantes-bloque]');
  const cont = form.querySelector('[data-acompanantes]');
  const tpl = document.getElementById('tpl-acomp');
  const anadir = form.querySelector('[data-add-acomp]');
  const tope = form.querySelector('[data-acomp-tope]');
  const parada = form.querySelector('[data-parada]');
  const otra = form.querySelector('[data-parada-otra]');
  const plazas = form.querySelector('[data-plazas]');
  const msg = form.querySelector('[data-form-msg]');
  const btn = form.querySelector('[data-enviar]');
  let envio = idEnvio();   // identificador de este envío: se mantiene en los reintentos y cambia tras enviar

  // El Apps Script tarda en "despertar" (entre 4 y 20 s en frío). En cuanto alguien toca el formulario
  // le mandamos una petición vacía para que, cuando pulse Enviar, el servidor ya esté caliente.
  form.addEventListener('focusin', calentarServidor, { once: true });
  form.addEventListener('pointerdown', calentarServidor, { once: true });

  const filas = () => [...cont.querySelectorAll('.acomp')];
  const personas = () => 1 + (form.acompanado.value === 'si' ? filas().filter(f => f.querySelector('[data-acomp-nombre]').value.trim()).length : 0);

  const actualizarPlazas = () => {
    if (form.bus.value === 'No') { plazas.hidden = true; return; }
    const n = personas();
    plazas.textContent = n === 1 ? 'Te reservamos una plaza.' : `Os reservamos ${n} plazas.`;
    plazas.hidden = false;
  };

  // Cada fila dice qué acompañante es, también al lector de pantalla
  const numerar = () => {
    filas().forEach((fila, i) => {
      const nombre = fila.querySelector('[data-acomp-nombre]').value.trim();
      fila.querySelector('[data-acomp-rotulo]').textContent = `Acompañante ${i + 1} · nombre y apellidos`;
      fila.querySelector('[data-acomp-quitar]').setAttribute('aria-label', `Quitar a ${nombre || 'acompañante ' + (i + 1)}`);
    });
    const lleno = filas().length >= CONFIG.maxAcompanantes;
    anadir.hidden = lleno;
    tope.hidden = !lleno;
  };

  const anadirFila = (datos) => {
    const fila = tpl.content.firstElementChild.cloneNode(true);
    if (datos) {
      fila.querySelector('[data-acomp-nombre]').value = datos.nombre || '';
      fila.querySelector('[data-acomp-tipo]').value = datos.tipo === 'Niño' ? 'Niño' : 'Adulto';
      fila.querySelector('[data-acomp-alergias]').value = datos.alergias || '';
    }
    fila.querySelector('[data-acomp-quitar]').addEventListener('click', () => {
      fila.remove(); numerar(); actualizarPlazas(); guardarBorrador();
      (cont.querySelector('[data-acomp-nombre]') || anadir).focus();
    });
    fila.querySelector('[data-acomp-nombre]').addEventListener('input', () => { numerar(); actualizarPlazas(); });
    cont.appendChild(fila);
    numerar();
    return fila;
  };

  // Paradas del desplegable. Con «Solo vuelta» no se ofrece la de subirse en Poio tras la ceremonia
  const pintarParadas = () => {
    const elegida = form.parada.value;
    const lista = CONFIG.paradasBus.filter(p => form.bus.value !== 'Solo vuelta' || !CONFIG.paradasSoloIda.includes(p));
    form.parada.innerHTML = '<option value="">Elige una parada</option>' +
      lista.map(p => `<option value="${escapar(p)}">${escapar(p)}</option>`).join('') +
      '<option value="Aún no lo sé">Aún no lo sé</option><option value="Otro">Otro sitio</option>';
    form.parada.value = [...form.parada.options].some(o => o.value === elegida) ? elegida : '';
  };

  // Pone cada bloque según lo que de verdad hay marcado. Se llama también al cargar y al volver atrás,
  // porque el navegador restaura los valores de los campos pero no los bloques que estaban desplegados
  const sincronizar = () => {
    detalles.hidden = form.asiste.value !== 'si';
    const conGente = form.acompanado.value === 'si';
    bloque.hidden = !conGente;
    if (conGente && !filas().length) anadirFila();
    pintarParadas();
    parada.hidden = form.bus.value === 'No';
    otra.hidden = parada.hidden || form.parada.value !== 'Otro';
    numerar();
    actualizarPlazas();
  };

  form.querySelectorAll('input[name="asiste"]').forEach(r => r.addEventListener('change', sincronizar));
  form.querySelectorAll('input[name="acompanado"]').forEach(r => r.addEventListener('change', () => {
    // Al marcar «No, solo yo» las filas se esconden pero no se borran: si fue un toque equivocado, siguen ahí
    const nuevas = form.acompanado.value === 'si' && !filas().length;
    sincronizar();
    if (nuevas) cont.querySelector('[data-acomp-nombre]').focus();
  }));
  anadir.addEventListener('click', () => {
    if (filas().length >= CONFIG.maxAcompanantes) return;
    anadirFila().querySelector('[data-acomp-nombre]').focus();
  });
  form.querySelectorAll('input[name="bus"]').forEach(r => r.addEventListener('change', sincronizar));
  form.parada.addEventListener('change', () => {
    otra.hidden = form.parada.value !== 'Otro';
    if (!otra.hidden) form.paradaOtra.focus();
  });

  // Intro en un campo no envía el formulario a medias: pasa al campo siguiente (o cierra el teclado en el último)
  form.addEventListener('submit', ev => ev.preventDefault());
  form.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' || ev.isComposing || !(ev.target instanceof HTMLInputElement)) return;
    ev.preventDefault();
    if (['radio', 'checkbox'].includes(ev.target.type)) return;
    const campos = [...form.querySelectorAll('input, select, textarea')]
      .filter(c => c.tabIndex >= 0 && !c.disabled && c.offsetParent !== null);
    const siguiente = campos[campos.indexOf(ev.target) + 1];
    if (siguiente) siguiente.focus(); else ev.target.blur();
  });

  // Borrador: lo escrito se guarda en esta pestaña y vuelve si se recarga la página
  const CAMPOS = ['nombre', 'telefono', 'email', 'alergias', 'paradaOtra', 'comentarios'];
  const estado = () => ({
    campos: Object.fromEntries(CAMPOS.map(c => [c, form[c].value])),
    asiste: form.asiste.value, acompanado: form.acompanado.value, bus: form.bus.value,
    parada: form.parada.value, alojamiento: form.alojamiento.checked,
    acomp: filas().map(f => ({
      nombre: f.querySelector('[data-acomp-nombre]').value,
      tipo: f.querySelector('[data-acomp-tipo]').value,
      alergias: f.querySelector('[data-acomp-alergias]').value,
    })),
  });
  const rellenar = e => {
    if (!e) return;
    CAMPOS.forEach(c => { form[c].value = (e.campos && e.campos[c]) || ''; });
    const marca = (nombre, valor) => form.querySelectorAll(`input[name="${nombre}"]`).forEach(r => { r.checked = r.value === valor; });
    marca('asiste', e.asiste || ''); marca('acompanado', e.acompanado || ''); marca('bus', e.bus || 'No');
    form.alojamiento.checked = !!e.alojamiento;
    cont.innerHTML = '';
    (e.acomp || []).slice(0, CONFIG.maxAcompanantes).forEach(a => anadirFila(a));
    pintarParadas();
    form.parada.value = e.parada || '';
    sincronizar();
  };
  let tBorrador;
  function guardarBorrador() {
    clearTimeout(tBorrador);
    tBorrador = setTimeout(() => almacen.guardar('sessionStorage', BORRADOR, estado()), 300);
  }
  form.addEventListener('input', ev => { quitarError(form, ev.target); guardarBorrador(); });
  form.addEventListener('change', ev => { quitarError(form, ev.target); guardarBorrador(); });

  pintarParadas();
  rellenar(almacen.leer('sessionStorage', BORRADOR));
  sincronizar();
  addEventListener('pageshow', sincronizar);

  // Mientras se envía: el botón lo dice, los campos no se tocan y el mensaje cambia si tarda
  const ocupado = si => {
    btn.disabled = si;
    btn.textContent = si ? 'Enviando…' : 'Enviar';
    form.setAttribute('aria-busy', String(si));
    form.querySelectorAll('fieldset').forEach(f => { f.inert = si; });
  };

  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    msg.className = 'form__msg'; msg.textContent = '';
    const datos = leer(form);
    datos.envio = envio;
    const error = validar(datos, form);
    if (error) { mostrarError(form, error, msg); return; }

    ocupado(true);
    msg.textContent = 'Enviando';
    msg.classList.add('is-sending');
    const tLargo = setTimeout(() => { msg.textContent = 'Sigue enviándose, no cierres la página'; }, 10000);
    try {
      if (!CONFIG.appsScriptUrl) {
        console.warn('CONFIG.appsScriptUrl está vacía: la respuesta NO se ha enviado.', datos);
        await new Promise(r => setTimeout(r, 600));
      } else {
        const json = await enviar(datos, () => { msg.textContent = 'Lo estamos intentando otra vez'; });
        datos.acuse = json.acuse ? json.email : '';
        datos.sustituye = !!json.sustituye;
        datos.revisar = !!json.revisar;
      }
      msg.className = 'form__msg'; msg.textContent = '';
      clearTimeout(tBorrador);   // que un guardado pendiente no resucite el borrador
      almacen.borrar('sessionStorage', BORRADOR);
      const guardado = Object.assign({}, datos, { hp: undefined, fecha: new Date().toISOString(), estado: estado() });
      almacen.guardar('localStorage', RESPUESTA, guardado);
      envio = idEnvio();
      gracias(form, datos);
    } catch (e) {
      console.error(e);
      msg.className = 'form__msg is-error';
      msg.textContent = '';
      const wa = (quien, num) => {
        const a = document.createElement('a');
        a.href = `https://wa.me/${num}`; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = `${quien} ${formatoTelefono(num)}`;
        return a;
      };
      msg.append('No sabemos si nos ha llegado. Vuelve a enviarlo en un rato o escríbenos por WhatsApp: ',
        wa('Leti', CONFIG.whatsappLeti), ' · ', wa('Pablo', CONFIG.whatsappPablo));
      msg.scrollIntoView({ behavior: SUAVE() ? 'smooth' : 'auto', block: 'nearest' });
    } finally {
      clearTimeout(tLargo);
      ocupado(false);
    }
  });

  // Desde la pantalla de gracias: cambiar lo enviado
  const caja = document.querySelector('[data-gracias]');
  const volver = () => {
    sincronizar();
    caja.hidden = true;
    form.hidden = false;
    document.getElementById('confirmar').classList.remove('es-no', 'ya-contestado');
    document.getElementById('formulario').hidden = false;
    form.nombre.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: SUAVE() ? 'smooth' : 'auto', block: 'start' });
  };
  caja.querySelector('[data-cambiar]').addEventListener('click', () => {
    const previa = almacen.leer('localStorage', RESPUESTA);
    if (previa && previa.estado && !form.nombre.value) rellenar(previa.estado);
    volver();
  });

  // Quien ya contestó desde este navegador lo ve al volver, con lo que dijo
  const previa = almacen.leer('localStorage', RESPUESTA);
  if (previa && previa.nombre && previa.asiste && !almacen.leer('sessionStorage', BORRADOR)) {
    gracias(form, previa, { recordado: true });
  }
}

let servidorCaliente = false;
function calentarServidor() {
  if (servidorCaliente || !CONFIG.appsScriptUrl) return;
  servidorCaliente = true;
  fetch(CONFIG.appsScriptUrl, { method: 'GET', mode: 'no-cors', cache: 'no-store', keepalive: true }).catch(() => {});
}

/* Envía la respuesta. Reintenta si no llega respuesta o si llega algo que no es la de doPost (Apps Script a veces
   devuelve una página HTML de error, o la salida de doGet, aunque haya guardado la fila). El reintento lleva el
   mismo identificador de envío, así que el servidor no guarda ni avisa dos veces: contesta que ya lo tiene. */
async function enviar(datos, alReintentar) {
  let ultimoError;
  for (let intento = 0; intento <= CONFIG.envioReintentos; intento++) {
    if (intento > 0) {
      if (alReintentar) alReintentar(intento);
      await new Promise(r => setTimeout(r, 1500));
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CONFIG.envioTimeout);
    try {
      const res = await fetch(CONFIG.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(datos),
        signal: ctrl.signal,
      });
      const texto = await res.text();
      let json;
      try { json = JSON.parse(texto); } catch (e) { throw new Error('Respuesta no JSON (' + res.status + ')'); }
      if (!json.ok) throw new Error(json.error || 'Respuesta no válida');
      // Solo vale la respuesta de doPost, que siempre trae "sustituye"
      if (!('sustituye' in json)) throw new Error('Respuesta que no es de doPost');
      // Con un servidor anterior a los identificadores, un reintento que "sustituye" es el primer intento, que sí llegó
      if (intento > 0 && !json.repetido) json.sustituye = false;
      return json;
    } catch (e) {
      ultimoError = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw ultimoError;
}

function leer(form) {
  const viene = form.asiste.value === 'si';
  const conGente = viene && form.acompanado.value === 'si';
  const filas = conGente ? [...form.querySelectorAll('.acomp')].map(f => ({
    nombre: f.querySelector('[data-acomp-nombre]').value.trim().replace(/\s+/g, ' '),
    tipo: f.querySelector('[data-acomp-tipo]').value,
    alergias: f.querySelector('[data-acomp-alergias]').value.trim(),
    campo: f.querySelector('[data-acomp-nombre]'),
  })) : [];
  const parada = form.parada.value === 'Otro' ? 'Otro: ' + form.paradaOtra.value.trim() : form.parada.value;
  return {
    nombre: form.nombre.value.trim().replace(/\s+/g, ' '),
    telefono: form.telefono.value.trim(),
    email: form.email.value.trim(),
    contacto: [form.telefono.value.trim(), form.email.value.trim()].filter(Boolean).join(' · '),
    asiste: form.asiste.value,
    acompanado: viene ? form.acompanado.value : 'no',
    acompanantes: filas.filter(a => a.nombre).map(a => ({ nombre: a.nombre, tipo: a.tipo, alergias: a.alergias })),
    // Filas con algo escrito pero sin nombre: no se envían sin avisar (se perdería una alergia)
    sinNombre: filas.filter(a => !a.nombre && (a.alergias || a.tipo === 'Niño')).map(a => a.campo),
    alergias: viene ? form.alergias.value.trim() : '',
    bus: viene ? form.bus.value : '',
    parada: viene && form.bus.value !== 'No' ? parada : '',
    alojamiento: viene && form.alojamiento.checked,
    comentarios: form.comentarios.value.trim(),
    hp: form.confirma_web.value,
    origen: location.hostname,
  };
}

// Dominios de correo mal escritos que se ven a menudo
const ERRATAS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
  'iclod.com': 'icloud.com', 'icloud.co': 'icloud.com',
};

/* Devuelve '' si todo está bien o { texto, campo } con el primer fallo y el campo al que hay que ir */
function validar(d, form) {
  const e = (texto, campo) => ({ texto, campo });
  if (!d.nombre) return e('Dinos tu nombre, por favor.', form.nombre);
  if (d.nombre.split(' ').length < 2) return e('Escribe tu nombre y al menos un apellido, para no confundirte con otro invitado.', form.nombre);
  if (!d.telefono) return e('Déjanos un teléfono por si tenemos que avisarte.', form.telefono);
  const cifras = d.telefono.replace(/\D/g, '');
  if (cifras.length < 9 || cifras.length > 15 || /^0+$/.test(cifras)) {
    return e('Ese teléfono no parece completo. Revísalo, por favor. Si es de otro país, ponlo con su prefijo (+31, +33…).', form.telefono);
  }
  if (d.email) {
    const m = d.email.toLowerCase().match(/^[^\s@]+@([^\s@]+\.[a-z]{2,})$/);
    if (!m || m[1].includes('..') || d.email.includes('..')) return e('Ese email no parece correcto. Revísalo o déjalo en blanco.', form.email);
    const bueno = ERRATAS[m[1]] || (/\.con$/.test(m[1]) ? m[1].replace(/\.con$/, '.com') : '');
    if (bueno) return e(`¿Querías decir ${d.email.slice(0, d.email.lastIndexOf('@') + 1)}${bueno}? Corrígelo o déjalo en blanco.`, form.email);
  }
  if (!d.asiste) return e('Dinos si vendrás.', form.querySelector('input[name="asiste"]'));
  if (d.asiste === 'si') {
    if (!form.acompanado.value) return e('Dinos si vienes con alguien.', form.querySelector('input[name="acompanado"]'));
    if (d.sinNombre.length) return e('Falta el nombre de este acompañante. Escríbelo o quita la fila.', d.sinNombre[0]);
    if (d.acompanado === 'si' && !d.acompanantes.length) {
      return e('Escribe el nombre de quien viene contigo, o marca «No, solo yo».', form.querySelector('[data-acomp-nombre]'));
    }
    if (d.bus && d.bus !== 'No' && !d.parada) return e('Elige tu parada. Si todavía no sabes dónde vas a dormir, elige «Aún no lo sé».', form.parada);
    if (d.parada === 'Otro: ') return e('Dinos dónde duermes, para ver si podemos poner una parada.', form.paradaOtra);
  }
  return '';
}

/* Lleva al invitado al campo que falla: foco, aviso junto al campo y marca para el lector de pantalla */
function mostrarError(form, error, msg) {
  quitarError(form);
  const campo = error.campo;
  const aviso = document.createElement('p');
  aviso.className = 'campo__error'; aviso.id = 'error-campo'; aviso.textContent = error.texto;
  const grupo = campo.closest('.choices');
  (grupo || campo.closest('label') || campo).insertAdjacentElement('afterend', aviso);
  (grupo ? [...grupo.querySelectorAll('input')] : [campo]).forEach(c => {
    c.setAttribute('aria-invalid', 'true'); c.setAttribute('aria-describedby', 'error-campo');
  });
  msg.className = 'form__msg is-error';
  msg.textContent = error.texto;   // también bajo el botón, que es donde lo anuncia el lector de pantalla
  campo.focus({ preventScroll: true });
  (campo.closest('label') || grupo || campo).scrollIntoView({ behavior: SUAVE() ? 'smooth' : 'auto', block: 'center' });
}

/* Quita el aviso de error. Con un campo, solo si el aviso era suyo */
function quitarError(form, campo) {
  const marcados = [...form.querySelectorAll('[aria-invalid="true"]')];
  if (!marcados.length) return;
  if (campo && !marcados.includes(campo)) return;
  marcados.forEach(c => { c.removeAttribute('aria-invalid'); c.removeAttribute('aria-describedby'); });
  const aviso = form.querySelector('#error-campo');
  if (aviso) aviso.remove();
  const msg = form.querySelector('[data-form-msg]');
  if (msg.classList.contains('is-error')) { msg.className = 'form__msg'; msg.textContent = ''; }
}

function nombreDePila(nombre) {
  const p = String(nombre || '').trim().split(/\s+/)[0] || '';
  return p ? p.charAt(0).toLocaleUpperCase('es') + p.slice(1) : '';
}

function enLetra(n) {
  return ['', '', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'][n] || String(n);
}

function textoParada(parada) {
  const p = String(parada || '').replace(/^Otro: /, '');
  if (!p) return '';
  return p === 'Aún no lo sé' ? ' · parada por decidir' : ' · parada ' + p;
}

/* Pantalla de gracias. Con { recordado: true } es la de quien vuelve a entrar después de haber contestado */
function gracias(form, d, opciones) {
  const recordado = !!(opciones && opciones.recordado);
  const caja = document.querySelector('[data-gracias]');
  const seccion = document.getElementById('confirmar');
  const viene = d.asiste === 'si';
  const pila = nombreDePila(d.nombre);

  const titulo = caja.querySelector('[data-gracias-titulo]');
  titulo.textContent = (viene ? 'Nos vemos en Poio' : 'Te echaremos de menos') + (pila ? ', ' + pila : '');

  const partes = [];
  if (recordado) {
    const cuando = d.fecha ? new Date(d.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : '';
    partes.push(cuando ? `Nos contestaste el ${cuando}.` : 'Ya nos contestaste.');
  } else {
    partes.push('Gracias, ya lo tenemos.');
    if (d.revisar) partes.push('Ya teníamos una respuesta con tu nombre, pero con otro contacto. Hemos guardado las dos y lo miramos nosotros.');
    else if (d.sustituye) partes.push('Hemos actualizado tu respuesta.');
  }
  if (viene) {
    const n = 1 + (d.acompanantes || []).length;
    partes.push(n > 1 ? `Os esperamos a los ${enLetra(n)} el 10 de abril.` : 'Te esperamos el 10 de abril.');
  }
  if (d.acuse && !recordado) partes.push(`Te hemos enviado un correo a ${d.acuse} con lo que has respondido.`);
  caja.querySelector('[data-gracias-texto]').textContent = partes.join(' ');

  // Resumen de lo enviado, para que pueda comprobarlo (con teléfono no hay acuse por correo)
  const resumen = caja.querySelector('[data-gracias-resumen]');
  resumen.innerHTML = '';
  const fila = (k, v) => {
    if (!v) return;
    const div = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v; dd.translate = false;
    div.append(dt, dd); resumen.appendChild(div);
  };
  if (viene) {
    const detalle = (tipo, alergias) => {
      const p = [tipo === 'Niño' ? 'niño' : '', alergias].filter(Boolean);
      return p.length ? ` (${p.join(', ')})` : '';
    };
    const gente = [d.nombre + detalle('Adulto', d.alergias)]
      .concat((d.acompanantes || []).map(a => a.nombre + detalle(a.tipo, a.alergias)));
    fila(gente.length > 1 ? 'Venís' : 'Vienes', gente.join(' · '));
    fila('Autobús', d.bus && d.bus !== 'No' ? d.bus + textoParada(d.parada) : 'No');
    fila('Alojamiento', d.alojamiento ? 'Nos pides ayuda con el hotel' : '');
  } else {
    fila('Respuesta', 'No podrás venir');
  }
  fila('Teléfono', d.telefono);
  fila('Email', d.email);
  fila('Comentarios', d.comentarios);
  resumen.hidden = !resumen.children.length;
  caja.querySelector('[data-gracias-calendario]').hidden = !viene;

  form.hidden = true;
  caja.hidden = false;
  document.getElementById('formulario').hidden = false;
  seccion.classList.toggle('es-no', !viene);
  seccion.classList.toggle('ya-contestado', true);
  const abrir = document.querySelector('[data-abrir-formulario]');
  if (abrir) abrir.hidden = true;   // ya ha contestado: el botón que despliega el formulario sobra
  const atajo = document.querySelector('[data-atajo]');
  if (atajo) atajo.hidden = true;
  if (recordado) return;            // al volver a entrar no se mueve la página ni el foco
  titulo.focus({ preventScroll: true });   // el lector de pantalla anuncia el agradecimiento
  caja.scrollIntoView({ behavior: SUAVE() ? 'smooth' : 'auto', block: 'center' });
}

function escapar(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
