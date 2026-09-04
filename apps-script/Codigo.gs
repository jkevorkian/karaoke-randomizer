/**
 * Karaoke — backend de la planilla.
 *
 * Regla de oro: este script NUNCA borra ni sobrescribe una fila de datos.
 * Todo lo que pasa en la fiesta se agrega como fila nueva y el estado
 * actual se calcula leyendo el log de atrás para adelante.
 *
 * Lo único que escribe fuera de eso es la fila 1 de encabezados, y solo
 * para agregar una columna que falte. Nunca la quita ni la renombra.
 *
 * Instalación: ver INSTALAR.md en la raíz del repo.
 */

var COLUMNAS = {
  anotaciones: ['id', 'ts', 'fecha', 'persona', 'tema', 'artista',
                'youtube_id', 'youtube_titulo', 'duracion', 'canta_solo', 'cliente_id'],
  eventos:     ['id', 'ts', 'fecha', 'tipo', 'sesion_id', 'datos', 'cliente_id']
};

// Columnas que tienen que quedar como texto sí o sí. `ts` queda numérico
// porque es lo que ordena el log, y `fecha` la dejamos que Sheets la lea
// como fecha porque es para leer con ojos humanos.
var NUMERICAS = { ts: true };
var FECHAS = { fecha: true };

/* ---------- entrada ---------- */

// Ojo: si ejecutás doGet o doPost desde el editor de Apps Script, Google las
// llama sin objeto de evento y `e` llega undefined. Por eso todo lo que sigue
// tolera que no venga nada. Para preparar la planilla a mano, ejecutá
// `preparar`, no `doGet`.
function doGet(e) {
  e = e || {};
  return responder(e, ejecutar(e.parameter || {}));
}

function doPost(e) {
  e = e || {};
  var p = {};
  try { p = JSON.parse(e.postData.contents); }
  catch (err) { p = e.parameter || {}; }
  return responder(e, ejecutar(p));
}

function ejecutar(p) {
  p = p || {};
  try {
    // Abrir la URL /exec en el navegador, sin parámetros, sirve para
    // comprobar que la implementación quedó publicada.
    if (!p.accion) return estado();
    switch (p.accion) {
      case 'ping':     return { ok: true, version: 2 };
      case 'estado':   return estado();
      case 'preparar': return preparar();
      case 'anotar':   return anotar(p);
      case 'evento':   return registrarEvento(p);
      case 'buscar':   return buscarEnYoutube(p.q);
      default:         return { ok: false, error: 'Acción desconocida: ' + p.accion };
    }
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

function responder(e, datos) {
  var cuerpo = JSON.stringify(datos);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + cuerpo + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(cuerpo)
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- coerción de Sheets ---------- */

/**
 * appendRow parsea cada valor como si lo tipearas en la celda. Eso rompe
 * de dos maneras: un valor que empieza con = + - @ se guarda como fórmula
 * (y el texto original se pierde), y uno que parece número, hora o fecha
 * se guarda con ese tipo — con lo cual gviz, que asigna un solo tipo por
 * columna, después lo devuelve como null y la app no lo ve.
 *
 * El apóstrofo inicial fuerza texto y no queda guardado en el valor.
 */
function texto(v) {
  var s = (v === null || v === undefined) ? '' : String(v);
  if (s === '') return '';
  var formula = /^[=+\-@]/.test(s);
  var pareceNumero = /^[+-]?\d+([.,]\d+)?([eE][+-]?\d+)?$/.test(s);
  var pareceFechaUHora = /^[\d]+([:\/\-. ][\d]+)+$/.test(s);
  return (formula || pareceNumero || pareceFechaUHora) ? "'" + s : s;
}

/**
 * Un id que salga todo dígitos lo guardaría Sheets como número, y gviz lo
 * devolvería null en una columna de texto: la fila entera desaparecería
 * de la app sin dejar rastro. La 'k' adelante lo hace imposible.
 */
function id() {
  return 'k' + Utilities.getUuid().replace(/-/g, '').slice(0, 11);
}

function ahora() {
  return Date.now();
}

function fechaLegible() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss');
}

/* ---------- planilla ---------- */

function libro() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hoja(nombre) {
  var ss = libro();
  var h = ss.getSheetByName(nombre);
  if (!h) {
    h = ss.insertSheet(nombre);
    h.appendRow(COLUMNAS[nombre]);
    h.setFrozenRows(1);
    h.getRange(1, 1, 1, COLUMNAS[nombre].length).setFontWeight('bold');
  }
  return h;
}

/** Lee la fila 1 tal como está hoy. Es la que manda: si alguien agregó una
 *  columna a mano, respetamos su orden en vez de imponer el nuestro. */
function encabezados(h) {
  var ancho = h.getLastColumn();
  if (ancho < 1) return [];
  return h.getRange(1, 1, 1, ancho).getValues()[0]
    .map(function (c) { return String(c || '').trim(); });
}

/** Agrega al final las columnas esperadas que falten. Solo agrega: nunca
 *  mueve, renombra ni saca una que ya esté. Esto es lo que deja actualizar
 *  una planilla que ya se había preparado con una versión vieja. */
function asegurarColumnas(h, nombre) {
  var actuales = encabezados(h);
  var faltan = COLUMNAS[nombre].filter(function (c) { return actuales.indexOf(c) === -1; });
  if (!faltan.length) return actuales;
  h.getRange(1, actuales.length + 1, 1, faltan.length)
    .setValues([faltan])
    .setFontWeight('bold');
  return actuales.concat(faltan);
}

function preparar() {
  var creadas = [], agregadas = {};
  Object.keys(COLUMNAS).forEach(function (n) {
    if (!libro().getSheetByName(n)) creadas.push(n);
    var h = hoja(n);
    var antes = encabezados(h).length;
    var despues = asegurarColumnas(h, n);
    if (despues.length > antes) agregadas[n] = despues.slice(antes);
  });
  return {
    ok: true,
    creadas: creadas,
    columnasAgregadas: agregadas,
    planilla: libro().getName(),
    planillaId: libro().getId()
  };
}

/**
 * ¿Ya escribimos esta operación? El cliente manda una clave que genera una
 * sola vez, así que si el POST llegó pero la respuesta se perdió y el
 * navegador reintenta por GET, no duplicamos la fila. Es solo lectura.
 */
function yaEscrito(h, columnas, clienteId) {
  if (!clienteId) return null;
  var col = columnas.indexOf('cliente_id') + 1;
  if (!col) return null;
  var ultima = h.getLastRow();
  if (ultima < 2) return null;
  var desde = Math.max(2, ultima - 400);
  var valores = h.getRange(desde, col, ultima - desde + 1, 1).getValues();
  var colId = columnas.indexOf('id') + 1;
  for (var i = valores.length - 1; i >= 0; i--) {
    if (String(valores[i][0]).trim() === clienteId) {
      return colId ? String(h.getRange(desde + i, colId).getValue()) : '';
    }
  }
  return null;
}

/**
 * Arma la fila según el orden REAL de los encabezados y la agrega.
 * Devuelve el id, sea el nuevo o el de la fila que ya estaba.
 */
function agregar(nombre, datos, clienteId) {
  var candado = LockService.getScriptLock();
  try {
    candado.waitLock(25000);
  } catch (err) {
    throw new Error('La planilla está ocupada con otra escritura. Probá de nuevo en unos segundos.');
  }
  try {
    var h = hoja(nombre);
    var columnas = asegurarColumnas(h, nombre);

    var repetido = yaEscrito(h, columnas, clienteId);
    if (repetido !== null) return { id: repetido, duplicado: true };

    datos.cliente_id = clienteId || '';
    var fila = columnas.map(function (c) {
      if (!(c in datos)) return '';
      if (NUMERICAS[c]) return Number(datos[c]) || 0;
      if (FECHAS[c]) return datos[c];
      return texto(datos[c]);
    });
    h.appendRow(fila);
    return { id: datos.id, duplicado: false };
  } finally {
    candado.releaseLock();
  }
}

/* ---------- acciones ---------- */

function estado() {
  var ss = libro();
  var hojas = {}, faltan = {};
  Object.keys(COLUMNAS).forEach(function (n) {
    var h = ss.getSheetByName(n);
    if (!h) { hojas[n] = null; return; }
    hojas[n] = Math.max(0, h.getLastRow() - 1);
    var actuales = encabezados(h);
    var sinPoner = COLUMNAS[n].filter(function (c) { return actuales.indexOf(c) === -1; });
    if (sinPoner.length) faltan[n] = sinPoner;
  });
  return {
    ok: true,
    version: 2,
    planilla: ss.getName(),
    // El id es lo que hay que comparar contra VITE_ID_PLANILLA: el nombre
    // no alcanza, dos documentos distintos se pueden llamar igual.
    planillaId: ss.getId(),
    filas: hojas,
    columnasQueFaltan: faltan,
    youtube: PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY') ? 'configurada' : 'falta',
    ayuda: 'Está publicado. Si filas trae null, o columnasQueFaltan no está vacío, ejecutá preparar.'
  };
}

/**
 * Por POST el valor llega como número (0/1); por GET, e.parameter entrega
 * SIEMPRE cadenas, y la cadena "0" es truthy en JavaScript. Sin esto, todo
 * el que se anotara por el camino de respaldo quedaba marcado "canta solo".
 * Misma definición de verdadero que bool() en src/dominio.js.
 */
function esVerdadero(v) {
  return /^(s|si|sí|1|true|x)$/i.test(String(v === null || v === undefined ? '' : v).trim());
}

function anotar(p) {
  var persona = String(p.persona || '').trim();
  var tema    = String(p.tema || '').trim();
  if (!persona) return { ok: false, error: 'Falta el nombre.' };
  if (!tema)    return { ok: false, error: 'Falta el tema.' };

  var r = agregar('anotaciones', {
    id: id(),
    ts: ahora(),
    fecha: fechaLegible(),
    persona: persona,
    tema: tema,
    artista: String(p.artista || '').trim(),
    youtube_id: String(p.youtubeId || '').trim(),
    youtube_titulo: String(p.youtubeTitulo || '').trim(),
    duracion: String(p.duracion || '').trim(),
    canta_solo: esVerdadero(p.cantaSolo) ? 'SI' : 'NO'
  }, String(p.clienteId || '').trim());

  return { ok: true, id: r.id, duplicado: r.duplicado };
}

function registrarEvento(p) {
  var tipo = String(p.tipo || '').trim();
  if (!tipo) return { ok: false, error: 'Falta el tipo de evento.' };

  // Por POST llega objeto; por GET+JSONP llega ya serializado.
  var datos = p.datos;
  var comoTexto = (typeof datos === 'string') ? datos : JSON.stringify(datos || {});
  try { JSON.parse(comoTexto); }
  catch (err) { comoTexto = JSON.stringify({ crudo: String(datos) }); }

  var r = agregar('eventos', {
    id: id(),
    ts: ahora(),
    fecha: fechaLegible(),
    tipo: tipo,
    sesion_id: String(p.sesionId || '').trim(),
    datos: comoTexto
  }, String(p.clienteId || '').trim());

  return { ok: true, id: r.id, duplicado: r.duplicado };
}

/* ---------- youtube ---------- */

function buscarEnYoutube(q) {
  q = String(q || '').trim();
  if (q.length < 3) return { ok: true, videos: [] };

  var clave = PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY');
  if (!clave) return { ok: false, error: 'Falta cargar YOUTUBE_API_KEY en las propiedades del script.' };

  var cache = CacheService.getScriptCache();
  // La clave del caché tiene tope de 250 caracteres y el valor de 100 KB.
  // Un hash corto evita las dos cosas y no colisiona entre consultas.
  var llave = 'yt_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, q.toLowerCase())
  );
  var guardado = cache.get(llave);
  if (guardado) { try { return JSON.parse(guardado); } catch (err) { /* caché sucio */ } }

  var url = 'https://www.googleapis.com/youtube/v3/search'
    + '?part=snippet&type=video&videoEmbeddable=true&maxResults=6'
    + '&q=' + encodeURIComponent(q + ' karaoke')
    + '&key=' + clave;

  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var codigo = r.getResponseCode();
  if (codigo !== 200) {
    var motivo = 'YouTube respondió ' + codigo + '.';
    if (codigo === 403) motivo += ' Suele ser la cuota diaria agotada, o la API sin habilitar en el proyecto de Google Cloud.';
    if (codigo === 400) motivo += ' Revisá que la clave sea válida.';
    return { ok: false, error: motivo };
  }

  var datos = JSON.parse(r.getContentText());
  var videos = (datos.items || []).map(function (v) {
    return {
      id: v.id.videoId,
      titulo: v.snippet.title,
      canal: v.snippet.channelTitle,
      miniatura: v.snippet.thumbnails && v.snippet.thumbnails.medium
        ? v.snippet.thumbnails.medium.url : ''
    };
  });

  var salida = { ok: true, videos: videos };
  cache.put(llave, JSON.stringify(salida), 21600);
  return salida;
}
