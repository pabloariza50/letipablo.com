/* Configuración de la web. Todo lo que cambia con el tiempo está aquí. */
const CONFIG = {
  // URL del despliegue de Google Apps Script (ver README). Vacía = modo prueba, no envía nada.
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzD9ExNa2x0NAVxkk-8x96N9LctgR0NvQOPPBwYUcq01jw3tw1gIPMnC26i2lJikpCj/exec',

  fecha: '2027-04-10',
  horaCeremonia: '',            // 'HH:MM' cuando la sepáis. Vacía = evento de día completo en el calendario.
  fechaLimite: '2027-03-01',

  // Puntos del recorrido donde puede parar el autobús. El formulario añade siempre "Vivo en otro sitio".
  paradasBus: ['Sanxenxo', 'Samieira', 'Raxó', 'Combarro', 'Poio (me subo después de la ceremonia)', 'Pontevedra'],

  // Solo números, con prefijo: '34600000000'. Vacío = se muestra el texto entre corchetes.
  whatsappLeti: '',
  whatsappPablo: '',

  mostrarRegalo: false,         // true cuando queráis enseñar la sección de regalo
  iban: '',
};

document.addEventListener('DOMContentLoaded', () => {
  cuentaAtras();
  menuMovil();
  desplegables();
  paradas();
  calendario();
  contacto();
  regalo();
  formulario();
});

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

/* Desplegables: abiertos en escritorio, cerrados en móvil */
function desplegables() {
  const mq = window.matchMedia('(max-width: 860px)');
  const sync = () => document.querySelectorAll('details.fold').forEach(d => { d.open = !mq.matches; });
  sync();
  mq.addEventListener('change', sync);
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

/* Archivo .ics para "Añadir al calendario" */
function calendario() {
  const enlace = document.getElementById('calendario');
  if (!enlace) return;
  const f = CONFIG.fecha.replace(/-/g, '');
  let inicio, fin;
  if (CONFIG.horaCeremonia) {
    const [h, m] = CONFIG.horaCeremonia.split(':');
    inicio = `DTSTART;TZID=Europe/Madrid:${f}T${h}${m}00`;
    fin = `DTEND;TZID=Europe/Madrid:${f}T235900`;
  } else {
    const dia = new Date(CONFIG.fecha + 'T12:00:00'); dia.setDate(dia.getDate() + 1);
    const f2 = [dia.getFullYear(), dia.getMonth() + 1, dia.getDate()].map(n => String(n).padStart(2, '0')).join('');
    inicio = `DTSTART;VALUE=DATE:${f}`;
    fin = `DTEND;VALUE=DATE:${f2}`;
  }
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Leti y Pablo//Boda//ES', 'BEGIN:VEVENT',
    `UID:boda-leti-pablo-${f}@letiypablo`, inicio, fin,
    'SUMMARY:Boda de Leti y Pablo',
    'LOCATION:Monasterio de Poio, Poio, Pontevedra',
    'DESCRIPTION:Ceremonia en el Monasterio de Poio y celebración en el Pazo de Señoráns (Meis).',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  enlace.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
}

/* Enlaces de WhatsApp */
function contacto() {
  const pon = (sel, num) => {
    const a = document.querySelector(sel);
    if (!a || !num) return;
    a.href = `https://wa.me/${num}`;
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'Escribir por WhatsApp';
  };
  pon('[data-wa-leti]', CONFIG.whatsappLeti);
  pon('[data-wa-pablo]', CONFIG.whatsappPablo);
}

/* Sección de regalo: oculta hasta que se active en CONFIG; el IBAN solo se muestra al pulsar */
function regalo() {
  const sec = document.querySelector('[data-regalo]');
  if (!sec) return;
  if (!CONFIG.mostrarRegalo || !CONFIG.iban) return;
  sec.hidden = false;
  const btn = sec.querySelector('[data-mostrar-iban]');
  const p = sec.querySelector('[data-iban]');
  btn.addEventListener('click', () => { p.textContent = CONFIG.iban; p.hidden = false; btn.hidden = true; });
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

    btn.disabled = true; msg.textContent = 'Enviando...';
    try {
      if (!CONFIG.appsScriptUrl) {
        console.warn('CONFIG.appsScriptUrl está vacía: la respuesta NO se ha enviado.', datos);
        await new Promise(r => setTimeout(r, 600));
      } else {
        const res = await fetch(CONFIG.appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(datos),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Respuesta no válida');
        datos.acuse = json.acuse ? json.email : '';
        datos.sustituye = !!json.sustituye;
      }
      gracias(form, datos);
    } catch (e) {
      console.error(e);
      btn.disabled = false;
      msg.textContent = 'No hemos podido enviar la confirmación. Prueba otra vez en un momento o escríbenos por WhatsApp.';
      msg.classList.add('is-error');
    }
  });
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
    nombre: form.nombre.value.trim(),
    contacto: form.contacto.value.trim(),
    asiste: form.asiste.value,
    acompanado: conGente,
    acompanantes,
    alergias: viene ? form.alergias.value.trim() : '',
    bus: viene ? form.bus.value : '',
    parada: viene && form.bus.value !== 'No' ? (form.parada.value === 'Otro' ? 'Otro: ' + form.paradaOtra.value.trim() : form.parada.value) : '',
    alojamiento: viene && form.alojamiento.checked,
    cancion: viene ? form.cancion.value.trim() : '',
    comentarios: form.comentarios.value.trim(),
    hp: form.empresa.value,
    origen: location.hostname,
  };
}

function validar(d, form) {
  if (!d.nombre) return 'Dinos tu nombre, por favor.';
  if (!d.contacto) return 'Déjanos un teléfono o un email por si tenemos que avisarte.';
  if (!d.asiste) return 'Dinos si vendrás.';
  if (d.acompanado && !d.acompanantes.length) return 'Escribe el nombre de quien viene contigo, o marca que vienes solo/a.';
  if (d.asiste === 'si' && d.bus && d.bus !== 'No' && !d.parada) return 'Elige desde dónde cogerás el autobús.';
  if (d.parada === 'Otro: ') return 'Dinos desde dónde vendrías, para ver si podemos poner una parada.';
  return '';
}

function gracias(form, d) {
  const caja = document.querySelector('[data-gracias]');
  const p = caja.querySelector('[data-gracias-texto]');
  const partes = [];
  if (d.sustituye) partes.push('Hemos sustituido tu respuesta anterior.');
  if (d.asiste === 'si') {
    const n = 1 + d.acompanantes.length;
    partes.push(n > 1 ? `Os esperamos a los ${n} el 10 de abril.` : 'Te esperamos el 10 de abril.');
  } else {
    partes.push('Te echaremos de menos. Gracias por avisarnos.');
  }
  if (d.acuse) partes.push(`Te hemos enviado un correo a ${d.acuse} con lo que has respondido.`);
  partes.push('Si algo cambia, vuelve a rellenar el formulario con tu nombre o escríbenos.');
  p.textContent = partes.join(' ');
  form.hidden = true;
  caja.hidden = false;
  const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  caja.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'center' });
}

function escapar(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
