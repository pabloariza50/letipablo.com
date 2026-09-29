/* EN RESERVA: este fichero NO se carga en la web ni se publica (el despliegue borra la carpeta _reserva).
   Es el mapa de hoteles incrustado que tuvo la web hasta el 28 de septiembre de 2026: Google Maps por API con
   fichas propias y, de reserva, el My Maps como imagen fija. Desde el estilo «Mar», Alojamiento solo enlaza al
   My Maps («Ver en el mapa»).

   Para recuperarlo:
   1. Volver a poner en Alojamiento la figura [data-mapa] (está en el historial: git show 97872cd:index.html).
   2. Adaptar los selectores de la lista de hoteles, que aquí son los del diseño anterior (.fold, .rows dt a, .subhead);
      ahora son details.zona, .zona li > a y .zona h3.
   3. Cargar este fichero desde index.html, después de app.js, y llamar a mapa() al arrancar.
   4. Devolver al despliegue (.github/workflows/publicar.yml) el paso que sustituye __CLAVE_GOOGLE_MAPS__ por el
      secreto GOOGLE_MAPS_KEY, apuntando a este fichero, y reactivar la clave en Google Cloud.
   5. Quitar <meta name="referrer" content="no-referrer"> o la clave, restringida por dominio, será rechazada;
      y añadir maps.googleapis.com y maps.gstatic.com a la política de seguridad de contenido de index.html. */

const MAPA = {
  // apiKey: NO escribir aquí la clave de Google Maps: la pone el despliegue.
  apiKey: '__CLAVE_GOOGLE_MAPS__',
  myMaps: 'https://www.google.com/maps/d/viewer?mid=1GJ3R7VtR8RsSp5BetnM8vyCLKNIT3Eo',
  rutas: true,   // false quita del mapa por API los recorridos y paradas de autobús
};

/* Mapa de hoteles. Con CONFIG.mapa.apiKey: Google Maps por API, arrastrable y con fichas propias (mapaGoogle).
   Sin clave, o si Google la rechaza: el My Maps incrustado como imagen fija (mapaFijo). */
function mapa() {
  const figura = document.querySelector('[data-mapa]');
  const cfg = Object.assign({}, MAPA);
  if (/^__/.test(cfg.apiKey || '')) cfg.apiKey = '';   // marcador sin sustituir: en local no hay clave
  const id = (cfg.myMaps || '').match(/(?:[?&]mid=|^)([\w-]{20,})(?:&|$)/);
  if (!figura || (!cfg.apiKey && !id)) return;
  const enlace = figura.querySelector('[data-mapa-enlace]');
  if (id) enlace.href = `https://www.google.com/maps/d/viewer?mid=${id[1]}`;
  else enlace.parentElement.hidden = true;
  const fijo = () => { if (id) mapaFijo(figura, id[1]); else figura.hidden = true; };
  figura.hidden = false;   // antes de medir: oculta, su posición sería 0 y el mapa se cargaría nada más abrir la página
  if (cfg.apiKey) mapaGoogle(figura, cfg, fijo);
  else fijo();
  document.querySelectorAll('#alojamiento .fold').forEach(fold => fold.addEventListener('toggle', () => zonaDelDesplegable(fold)));
}


/* Google Maps por API: el script de Google y los datos se piden solo cuando la sección se acerca a la pantalla (al hacer scroll) */
function mapaGoogle(figura, cfg, siFalla) {
  const lienzo = figura.querySelector('[data-mapa-lienzo]');
  const botones = figura.querySelector('[data-mapa-zonas]');
  lienzo.hidden = false;
  let fallado = false;
  const fallo = () => {
    if (fallado) return;
    fallado = true; lienzo.hidden = true; botones.textContent = '';
    siFalla();
  };
  window.gm_authFailure = fallo;   // Google llama a esto si la clave no vale para este dominio

  const cargar = () => {
    if (figura.getBoundingClientRect().top > innerHeight + 600) return;
    removeEventListener('scroll', cargar);
    Promise.all([
      fetch('assets/mapa/datos.json').then(r => r.json()),
      new Promise((ok, mal) => {
        window.__mapaListo = ok;
        const js = document.createElement('script');
        js.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(cfg.apiKey)}&v=weekly&loading=async&language=es&region=ES&callback=__mapaListo`;
        js.onerror = mal;
        document.head.appendChild(js);
      }),
    ]).then(([datos]) => { if (!fallado) pintarMapaGoogle(lienzo, botones, datos, cfg); }).catch(fallo);
  };
  addEventListener('scroll', cargar, { passive: true });
  cargar();
}

function pintarMapaGoogle(lienzo, botones, datos, cfg) {
  const G = google.maps;
  // Un dedo desplaza la página y dos mueven el mapa (en ordenador se arrastra con el ratón): así no atrapa el scroll
  const map = new G.Map(lienzo, {
    center: { lat: 42.45, lng: -8.72 }, zoom: 11, minZoom: 10,
    disableDefaultUI: true, zoomControl: true, fullscreenControl: true,
    gestureHandling: 'cooperative', clickableIcons: false, isFractionalZoomEnabled: true,
  });
  const globo = new G.InfoWindow({ maxWidth: 280 });
  const icono = (nombre, lado) => ({ url: `assets/mapa/${nombre}.png`, scaledSize: new G.Size(lado, lado), anchor: new G.Point(lado / 2, lado / 2) });
  const ficha = (marca, html) => marca.addListener('click', () => { globo.setContent(html); globo.open({ map, anchor: marca }); });

  if (cfg.rutas !== false) {
    datos.rutas.forEach(r => {
      const path = r.geo.map(([lat, lng]) => ({ lat, lng }));
      new G.Polyline({ map, path, strokeColor: '#ffffff', strokeWeight: 7, strokeOpacity: 0.85, clickable: false, zIndex: 1 });
      const trazo = r.discontinua
        ? { strokeOpacity: 0, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: '#333333', scale: 3 }, offset: '0', repeat: '11px' }] }
        : { strokeColor: '#333333', strokeWeight: 3.5, strokeOpacity: 1 };
      const linea = new G.Polyline(Object.assign({ map, path, zIndex: 2 }, trazo));
      linea.addListener('click', e => {
        globo.setContent(`<div class="mapa__globo"><h4>${escapar(r.nombre)}</h4><p>${String(r.km).replace('.', ',')} km · unos ${r.min} min</p></div>`);
        globo.setPosition(e.latLng); globo.open({ map });
      });
    });
    datos.paradas.forEach(([nombre, lat, lng]) =>
      new G.Marker({ map, position: { lat, lng }, icon: icono('parada', 14), title: `Parada · ${nombre}`, clickable: false, zIndex: 3 }));
  }

  datos.lugares.forEach(([nombre, que, lat, lng], i) =>
    ficha(new G.Marker({ map, position: { lat, lng }, icon: icono(i === 0 ? 'iglesia' : 'horreo', 40), title: nombre, zIndex: 20 }),
      `<div class="mapa__globo"><h4>${escapar(nombre)}</h4><p>${escapar(que)}</p></div>`));

  // Los hoteles se leen de la lista de la página (un grupo por desplegable); las coordenadas, de datos.json por nombre
  const todo = new G.LatLngBounds();
  datos.lugares.forEach(l => todo.extend({ lat: l[2], lng: l[3] }));
  const zonas = [{ nombre: 'Todo', limites: todo }];
  document.querySelectorAll('#alojamiento .fold').forEach(fold => {
    const limites = new G.LatLngBounds();
    fold.querySelectorAll('.rows > div').forEach(fila => {
      const enlace = fila.querySelector('dt a');
      const sitio = enlace && datos.hoteles[enlace.textContent.trim()];
      if (!sitio) return;
      const [lat, lng, poio, pazo] = sitio;
      const casa = fila.hasAttribute('data-casa'); // casas de alquiler entero: «C» en vez de «H»
      ficha(new G.Marker({ map, position: { lat, lng }, icon: icono(casa ? 'casa-c' : 'hotel-h', 28), title: enlace.textContent, zIndex: 10 }),
        `<div class="mapa__globo"><h4>${escapar(enlace.textContent)}</h4><p>${fila.querySelector('dd').innerHTML}</p>
         <p class="mapa__tiempos">A Poio ${poio} min · Al pazo ${pazo} min en coche</p>
         <a href="${escapar(enlace.href)}" target="_blank" rel="noopener">${casa ? 'Ver la casa' : 'Ver la web del hotel'}</a></div>`);
      limites.extend({ lat, lng }); todo.extend({ lat, lng });
    });
    if (!limites.isEmpty()) zonas.push({ nombre: fold.querySelector('.subhead').textContent.split(',')[0].trim(), limites });
  });

  const encuadrar = limites => {
    globo.close();
    // más margen a la derecha: ahí están los botones de zoom y pantalla completa
    const m = lienzo.offsetWidth < 500 ? 28 : 44;
    map.fitBounds(limites, { top: m, bottom: m + 10, left: m, right: m + 44 });
    G.event.addListenerOnce(map, 'idle', () => { if (map.getZoom() > 15) map.setZoom(15); });
  };
  zonas.forEach((z, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = z.nombre; b.setAttribute('aria-pressed', String(i === 0));
    b.addEventListener('click', () => {
      encuadrar(z.limites);
      botones.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    });
    botones.appendChild(b);
  });
  encuadrar(todo);
  const abierto = document.querySelector('#alojamiento .fold[open]');
  if (abierto) zonaDelDesplegable(abierto);
}

/* Al abrir un desplegable de hoteles, el mapa se acerca a su zona (pulsa su botón, así vale para los dos mapas).
   Al cerrarlo vuelve a otro que siga abierto o, si no queda ninguno, al encuadre general. */
function zonaDelDesplegable(fold) {
  const botones = [...document.querySelectorAll('[data-mapa-zonas] button')];
  const boton = f => botones.find(b => b.textContent === f.querySelector('.subhead').textContent.split(',')[0].trim());
  const suyo = boton(fold);
  if (!suyo) return;
  if (fold.open) { suyo.click(); return; }
  if (suyo.getAttribute('aria-pressed') !== 'true') return;
  const otro = [...document.querySelectorAll('#alojamiento .fold[open]')].pop();
  ((otro && boton(otro)) || botones[0]).click();
}

/* My Maps incrustado como imagen fija (no se puede tocar: Google abriría sus fichas y su cabecera con el autor).
   Se mueve con botones de zona, que recargan el mapa centrado donde toca. */
function mapaFijo(figura, id) {
  figura.querySelector('[data-mapa-marco]').hidden = false;
  const base = `https://www.google.com/maps/d/embed?mid=${id}`;
  const marco = document.createElement('iframe');
  marco.src = base;
  marco.title = 'Mapa de los alojamientos, el monasterio de Poio y el pazo de Señoráns';
  marco.loading = 'lazy';
  marco.referrerPolicy = 'no-referrer';
  marco.tabIndex = -1;
  figura.querySelector('[data-mapa-marco]').appendChild(marco);

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
}

