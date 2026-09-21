/* Configuración de la web. Todo lo que cambia con el tiempo está aquí. */
const CONFIG = {
  // URL del despliegue de Google Apps Script (ver README). Vacía = modo prueba, no envía nada.
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzD9ExNa2x0NAVxkk-8x96N9LctgR0NvQOPPBwYUcq01jw3tw1gIPMnC26i2lJikpCj/exec',

  fecha: '2027-04-10',

  // Puntos del recorrido donde puede parar el autobús. El formulario añade siempre "Vivo en otro sitio".
  // Si cambias esta lista, cambia también PARADAS en apps-script/Code.gs.
  paradasBus: ['Sanxenxo', 'Samieira', 'Raxó', 'Combarro', 'Poio (me subo después de la ceremonia)', 'Pontevedra'],

  // Solo números, con prefijo: '34600000000'. Vacío = se deja el enlace tal cual está en el HTML.
  whatsappLeti: '34634275463',
  whatsappPablo: '34660812140',

  // Número de cuenta para regalos. Vacío = no aparece. Se muestra en el pie, entre el nombre y la fecha.
  iban: 'ES32 1544 7889 7466 5198 1272',

  // Secciones que todavía no se enseñan. Pon true para mostrarlas (también aparece su enlace en el menú).
  secciones: { llegar: false, alojamiento: true },

  // Mapa de hoteles en Alojamiento. Pega aquí el enlace de vuestro mapa de Google My Maps
  // (el que sale en Compartir, o el de la barra del navegador). Vacío = no aparece ningún mapa.
  mapa: { myMaps: 'https://www.google.com/maps/d/edit?mid=1GJ3R7VtR8RsSp5BetnM8vyCLKNIT3Eo' },

  // Envío: tiempo máximo de espera por intento (ms) y número de reintentos si no llega respuesta.
  envioTimeout: 45000,
  envioReintentos: 1,
};

document.addEventListener('DOMContentLoaded', () => {
  secciones();
  cuentaAtras();
  menuMovil();
  paradas();
  contacto();
  cuenta();
  formulario();
  mapa();
});

/* Secciones ocultas en el HTML hasta que se activan en CONFIG.secciones */
function secciones() {
  Object.entries(CONFIG.secciones || {}).forEach(([nombre, visible]) => {
    if (!visible) return;
    document.querySelectorAll(`[data-seccion="${nombre}"]`).forEach(el => { el.hidden = false; });
  });
}

/* Mapa de hoteles: Google My Maps incrustado como imagen fija (no se puede tocar: Google abriría sus fichas
   y su cabecera con el autor). Se mueve con botones de zona, que recargan el mapa centrado donde toca. */
function mapa() {
  const figura = document.querySelector('[data-mapa]');
  const id = ((CONFIG.mapa && CONFIG.mapa.myMaps) || '').match(/(?:[?&]mid=|^)([\w-]{20,})(?:&|$)/);
  if (!figura || !id) return;
  const base = `https://www.google.com/maps/d/embed?mid=${id[1]}`;
  const marco = document.createElement('iframe');
  marco.src = base;
  marco.title = 'Mapa de los alojamientos, el monasterio de Poio y el pazo de Señoráns';
  marco.loading = 'lazy';
  marco.referrerPolicy = 'no-referrer';
  marco.tabIndex = -1;
  figura.querySelector('[data-mapa-marco]').appendChild(marco);
  figura.querySelector('[data-mapa-enlace]').href = `https://www.google.com/maps/d/viewer?mid=${id[1]}`;

  // Centro y zoom de cada zona (zoom para pantalla ancha y para móvil). Sin centro = el encuadre general de Google.
  const zonas = [
    { nombre: 'Todo' },
    { nombre: 'Sanxenxo', centro: [42.4008, -8.8030], zoom: [14, 13] },
    { nombre: 'Raxó y Samieira', centro: [42.4143, -8.7408], zoom: [14, 13] },
    { nombre: 'Meis', centro: [42.5110, -8.7450], zoom: [12, 11] },
    { nombre: 'Pontevedra', centro: [42.4297, -8.6413], zoom: [15, 15] },
  ];
  const botones = figura.querySelector('[data-mapa-zonas]');
  zonas.forEach((z, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = z.nombre; b.setAttribute('aria-pressed', String(i === 0));
    b.addEventListener('click', () => {
      const zoom = z.centro && z.zoom[marco.offsetWidth >= 520 ? 0 : 1];
      marco.src = z.centro ? `${base}&ll=${z.centro[0]},${z.centro[1]}&z=${zoom}` : base;
      botones.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    });
    botones.appendChild(b);
  });
  figura.hidden = false;
}

/* Cuenta atrás */
function cuentaAtras() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const boda = new Date(CONFIG.fecha + 'T00:00:00');
  const dias = Math.round((boda - hoy) / 86400000);
  let texto;
  if (dias > 1) texto = `Faltan ${dias} días`;
  else if (dias === 1) texto = 'Falta un día';
  else if (dias === 0) texto = 'Es hoy';
  else texto = 'Ya nos hemos casado';
  document.querySelectorAll('[data-cuenta-atras]').forEach(el => {
    el.textContent = texto;
    if (dias <= 0) el.parentElement.textContent = texto;
  });
}

/* Menú en móvil */
function menuMovil() {
  const nav = document.querySelector('.nav');
  const btn = nav.querySelector('.nav__toggle');
  btn.addEventListener('click', () => {
    const abierto = nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(abierto));
    btn.textContent = abierto ? 'Cerrar' : 'Menú';
  });
  nav.querySelectorAll('.nav__links a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Menú';
  }));
}

/* Paradas de autobús en el desplegable del formulario */
function paradas() {
  const lista = CONFIG.paradasBus;
  const select = document.querySelector('select[name="parada"]');
  if (select) {
    select.innerHTML = '<option value="">Elige una parada</option>' +
      lista.map(p => `<option value="${escapar(p)}">${escapar(p)}</option>`).join('') +
      '<option value="Otro">Vivo en otro sitio</option>';
  }
}

/* Enlaces de WhatsApp: el número se ve siempre (hay quien no usa WhatsApp) */
function contacto() {
  const pon = (sel, num) => {
    const a = document.querySelector(sel);
    if (!a || !num) return;
    a.href = `https://wa.me/${num}`;
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'WhatsApp · ' + formatoTelefono(num);
  };
  pon('[data-wa-leti]', CONFIG.whatsappLeti);
  pon('[data-wa-pablo]', CONFIG.whatsappPablo);
}

function formatoTelefono(num) {
  const n = String(num).replace(/^34/, '');
  return n.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

/* Número de cuenta en el pie: se ve como texto y al tocarlo se copia */
function cuenta() {
  const btn = document.querySelector('[data-cuenta]');
  if (!btn) return;
  const iban = CONFIG.iban.replace(/\s+/g, '').toUpperCase();
  if (!iban) return;
  const texto = iban.replace(/(.{4})/g, '$1 ').trim();
  btn.textContent = texto;
  btn.hidden = false;
  const frase = btn.closest('[data-regalo]');
  if (frase) frase.hidden = false;
  let t;
  btn.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(iban); ok = true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = iban; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
    }
    if (!ok) return;
    btn.textContent = 'Copiado';
    clearTimeout(t);
    t = setTimeout(() => { btn.textContent = texto; }, 1200);
  });
}

/* Formulario de confirmación */
function formulario() {
  const form = document.getElementById('rsvp');
  if (!form) return;
  const detalles = form.querySelector('[data-detalles]');
  const bloque = form.querySelector('[data-acompanantes-bloque]');
  const cont = form.querySelector('[data-acompanantes]');
  const tpl = document.getElementById('tpl-acomp');
  const parada = form.querySelector('[data-parada]');
  const otra = form.querySelector('[data-parada-otra]');
  const plazas = form.querySelector('[data-plazas]');
  const msg = form.querySelector('[data-form-msg]');
  const btn = form.querySelector('button[type="submit"]');

  // El Apps Script tarda en "despertar" (entre 4 y 20 s en frío). En cuanto alguien toca el formulario
  // le mandamos una petición vacía para que, cuando pulse Enviar, el servidor ya esté caliente.
  form.addEventListener('focusin', calentarServidor, { once: true });
  form.addEventListener('pointerdown', calentarServidor, { once: true });

  const personas = () => 1 + [...cont.querySelectorAll('[data-acomp-nombre]')].filter(i => i.value.trim()).length;

  const actualizarPlazas = () => {
    if (form.bus.value === 'No') { plazas.hidden = true; return; }
    const n = personas();
    plazas.textContent = n === 1 ? 'Te reservamos una plaza.' : `Os reservamos ${n} plazas.`;
    plazas.hidden = false;
  };

  const anadirFila = () => {
    const fila = tpl.content.firstElementChild.cloneNode(true);
    fila.querySelector('[data-acomp-quitar]').addEventListener('click', () => { fila.remove(); actualizarPlazas(); });
    fila.querySelector('[data-acomp-nombre]').addEventListener('input', actualizarPlazas);
    cont.appendChild(fila);
    return fila;
  };

  form.querySelectorAll('input[name="asiste"]').forEach(r => r.addEventListener('change', () => {
    detalles.hidden = form.asiste.value !== 'si';
  }));

  form.querySelectorAll('input[name="acompanado"]').forEach(r => r.addEventListener('change', () => {
    const si = form.acompanado.value === 'si';
    bloque.hidden = !si;
    if (si && !cont.children.length) anadirFila().querySelector('[data-acomp-nombre]').focus();
    if (!si) cont.innerHTML = '';
    actualizarPlazas();
  }));

  form.querySelector('[data-add-acomp]').addEventListener('click', () => {
    anadirFila().querySelector('[data-acomp-nombre]').focus();
  });

  form.querySelectorAll('input[name="bus"]').forEach(r => r.addEventListener('change', () => {
    parada.hidden = form.bus.value === 'No';
    if (parada.hidden) otra.hidden = true;
    actualizarPlazas();
  }));

  form.parada.addEventListener('change', () => {
    otra.hidden = form.parada.value !== 'Otro';
    if (!otra.hidden) form.paradaOtra.focus();
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    msg.className = 'form__msg';
    const datos = leer(form);
    const error = validar(datos, form);
    if (error) { msg.textContent = error; msg.classList.add('is-error'); return; }

    btn.disabled = true;
    msg.textContent = 'Enviando. Puede tardar unos segundos';
    msg.classList.add('is-sending');
    try {
      if (!CONFIG.appsScriptUrl) {
        console.warn('CONFIG.appsScriptUrl está vacía: la respuesta NO se ha enviado.', datos);
        await new Promise(r => setTimeout(r, 600));
      } else {
        const json = await enviar(datos);
        datos.acuse = json.acuse ? json.email : '';
        // En un reintento, "sustituye" solo significa que el primer intento sí llegó: no se le cuenta al invitado.
        datos.sustituye = !!json.sustituye && !json.reintento;
        datos.revisar = !!json.revisar;
      }
      msg.className = 'form__msg'; msg.textContent = '';
      gracias(form, datos);
    } catch (e) {
      console.error(e);
      btn.disabled = false;
      msg.className = 'form__msg is-error';
      msg.textContent = 'No hemos podido confirmar que se haya enviado. Puede que lo hayamos recibido igualmente: ' +
        'si has puesto tu email te llegará un correo en unos minutos. Si no te llega, vuelve a enviarlo dentro de un rato ' +
        '(nos quedamos con lo último) o escríbenos por WhatsApp.';
    }
  });
}

let servidorCaliente = false;
function calentarServidor() {
  if (servidorCaliente || !CONFIG.appsScriptUrl) return;
  servidorCaliente = true;
  fetch(CONFIG.appsScriptUrl, { method: 'GET', mode: 'no-cors', cache: 'no-store', keepalive: true }).catch(() => {});
}

/* Envía la respuesta. Reintenta si no llega respuesta o si llega algo que no es JSON (Apps Script a veces
   devuelve una página HTML de error aunque haya guardado la fila; el reintento sustituye la anterior). */
async function enviar(datos) {
  let ultimoError;
  for (let intento = 0; intento <= CONFIG.envioReintentos; intento++) {
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
      // Apps Script a veces contesta a un POST con la salida del GET ({ok:true, mensaje}). Eso no confirma que
      // se haya guardado: solo vale la respuesta de doPost, que siempre trae "sustituye".
      if (!('sustituye' in json)) throw new Error('Respuesta que no es de doPost');
      json.reintento = intento > 0;
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
  const acompanantes = conGente ? [...form.querySelectorAll('.acomp')].map(f => ({
    nombre: f.querySelector('[data-acomp-nombre]').value.trim(),
    tipo: f.querySelector('[data-acomp-tipo]').value,
    alergias: f.querySelector('[data-acomp-alergias]').value.trim(),
  })).filter(a => a.nombre) : [];
  return {
    nombre: form.nombre.value.trim().replace(/\s+/g, ' '),
    telefono: form.telefono.value.trim(),
    email: form.email.value.trim(),
    contacto: [form.telefono.value.trim(), form.email.value.trim()].filter(Boolean).join(' · '),
    asiste: form.asiste.value,
    acompanado: viene ? form.acompanado.value : 'no',
    acompanantes,
    alergias: viene ? form.alergias.value.trim() : '',
    bus: viene ? form.bus.value : '',
    parada: viene && form.bus.value !== 'No' ? (form.parada.value === 'Otro' ? 'Otro: ' + form.paradaOtra.value.trim() : form.parada.value) : '',
    alojamiento: viene && form.alojamiento.checked,
    comentarios: form.comentarios.value.trim(),
    hp: form.empresa.value,
    origen: location.hostname,
  };
}

function validar(d, form) {
  if (!d.nombre) return 'Dinos tu nombre, por favor.';
  if (d.nombre.split(' ').length < 2) return 'Escribe tu nombre y al menos un apellido, para no confundirte con otro invitado.';
  if (!d.telefono) return 'Déjanos un teléfono por si tenemos que avisarte.';
  if (d.telefono.replace(/\D/g, '').length < 9) return 'Ese teléfono no parece completo. Revísalo, por favor.';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email)) return 'Ese email no parece correcto. Revísalo o déjalo en blanco.';
  if (!d.asiste) return 'Dinos si vendrás.';
  if (d.asiste === 'si' && !d.acompanado) return 'Dinos si vienes solo/a o con alguien.';
  if (d.acompanado === 'si' && !d.acompanantes.length) return 'Escribe el nombre de quien viene contigo, o marca que vienes solo/a.';
  if (d.asiste === 'si' && d.bus && d.bus !== 'No' && !d.parada) return 'Elige desde dónde cogerás el autobús.';
  if (d.parada === 'Otro: ') return 'Dinos desde dónde vendrías, para ver si podemos poner una parada.';
  return '';
}

function gracias(form, d) {
  const caja = document.querySelector('[data-gracias]');
  const p = caja.querySelector('[data-gracias-texto]');
  const partes = [];
  if (d.revisar) partes.push('Ya teníamos una respuesta con tu nombre pero con otro contacto, así que hemos guardado las dos y lo miramos nosotros.');
  else if (d.sustituye) partes.push('Hemos sustituido tu respuesta anterior.');
  if (d.asiste === 'si') {
    const n = 1 + d.acompanantes.length;
    partes.push(n > 1 ? `Os esperamos a los ${n} el 10 de abril.` : 'Te esperamos el 10 de abril.');
  } else {
    partes.push('Te echaremos de menos. Gracias por avisarnos.');
  }
  if (d.acuse) partes.push(`Te hemos enviado un correo a ${d.acuse} con lo que has respondido.`);
  partes.push('Si algo cambia, vuelve a rellenar el formulario con tu nombre o escríbenos.');
  p.textContent = partes.join(' ');

  // Resumen de lo enviado, para que pueda comprobarlo (con teléfono no hay acuse por correo)
  const resumen = caja.querySelector('[data-gracias-resumen]');
  resumen.innerHTML = '';
  const fila = (k, v) => {
    if (!v) return;
    const div = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    div.append(dt, dd); resumen.appendChild(div);
  };
  if (d.asiste === 'si') {
    const gente = [d.nombre + (d.alergias ? ` (${d.alergias})` : '')]
      .concat(d.acompanantes.map(a => a.nombre + ' (' + a.tipo + (a.alergias ? ', ' + a.alergias : '') + ')'));
    fila(gente.length > 1 ? 'Venís' : 'Vienes', gente.join(' · '));
    fila('Autobús', d.bus && d.bus !== 'No' ? d.bus + (d.parada ? ' desde ' + d.parada.replace(/^Otro: /, '') : '') : 'No');
    fila('Alojamiento', d.alojamiento ? 'Nos pides ayuda con el hotel' : '');
  } else {
    fila('Respuesta', 'No podrás venir');
  }
  fila('Teléfono', d.telefono);
  fila('Email', d.email);
  fila('Comentarios', d.comentarios);
  resumen.hidden = !resumen.children.length;

  form.hidden = true;
  caja.hidden = false;
  const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  caja.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'center' });
}

function escapar(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
