let diccionario = [];
let diccionarioCargado = false;
let historialPartida = []; //Arreglo para guardar las decisiones del bot

async function cargarDiccionario() {
  const respuesta = await fetch(chrome.runtime.getURL("diccionarios/diccionarioingles.txt"));

  if (!respuesta.ok) {
    throw new Error(`No se pudo leer el archivo: ${respuesta.status}`);
  }

  const texto = await respuesta.text();
  diccionario = texto
    .split(/\r?\n/)
    .map((palabra) => palabra.trim().toLowerCase())
    .filter((palabra) => palabra && !palabra.startsWith("#"));

  if (diccionario.length === 0) {
    throw new Error("El archivo está vacío");
  }

  diccionarioCargado = true;
  console.log("Diccionario cargado desde archivo TXT:", diccionario.length, "palabras");
}

let botActivado = false;
let silabaJugadaEnEsteTurno = ""; // Actúa como candado para no jugar dos veces el mismo turno
let ultimoIntentoTimestamp = 0;
let escrituraActiva = null;
let writeTimers = [];
let esperandoEnvioUsuario = false;
const palabrasIntentadasPorSilaba = new Map();

function guardarModoBotEnStorage(modo) {
  chrome.storage && chrome.storage.local && chrome.storage.local.set({ botMode: modo });
}

function aplicarModoBot(modo) {
  if (!modo) return;
  configuracionBot.modo = modo;

  if (modo === MODOS_BOT.manual) {
    const inputTexto = document.querySelector('.selfTurn input');
    if (inputTexto) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(inputTexto, "");
      inputTexto.dispatchEvent(new Event('input', { bubbles: true }));
    }
    esperandoEnvioUsuario = false;
    escrituraActiva = null;
    silabaJugadaEnEsteTurno = "";
  }
}

const MODOS_BOT = {
  completa: "completa",
  auto: "auto",
  manual: "manual"
};

const configuracionBot = {
  modo: MODOS_BOT.completa,
  delayEntreLetrasMin: 70,
  delayEntreLetrasMax: 200,
  // Demora al azar entre que la palabra queda escrita y se envía (en ms).
  // Se configura desde el popup (en segundos) y llega por chrome.storage.
  delayEnvioMin: 500,
  delayEnvioMax: 3500
};

const DEMORA_MAXIMA_PERMITIDA = 10000; // tope de seguridad: 10 s

// Valida y aplica el rango de demora. Si vienen al revés (mín > máx), los da vuelta.
function aplicarDemoras(min, max) {
  min = Number(min);
  max = Number(max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return;

  if (min > max) [min, max] = [max, min];
  configuracionBot.delayEnvioMin = Math.max(0, Math.min(min, DEMORA_MAXIMA_PERMITIDA));
  configuracionBot.delayEnvioMax = Math.max(0, Math.min(max, DEMORA_MAXIMA_PERMITIDA));
  console.log(`Demora de envío: entre ${configuracionBot.delayEnvioMin / 1000} y ${configuracionBot.delayEnvioMax / 1000} s`);
}

const ALFABETO = [..."abcdefghijklmnopqrstuvwxyz"];
let letrasPendientes = [...ALFABETO];
let letrasUsadasEnPartida = {};
let numeroCicloLetras = 1;

function randomEntre(min, max) {
  return Math.random() * (max - min) + min;
}

function obtenerLetrasPendientes() {
  return letrasPendientes.join("");
}

function obtenerLetrasUnicas(palabra) {
  const letrasEncontradas = [];
  const palabraEnMinusculas = palabra.toLowerCase();

  for (const caracter of palabraEnMinusculas) {
    const esLetra = /^[a-z]$/.test(caracter);
    const yaFueAgregada = letrasEncontradas.includes(caracter);

    if (esLetra && !yaFueAgregada) {
      letrasEncontradas.push(caracter);
    }
  }

  return letrasEncontradas;
}

function consumirLetrasDePalabra(palabra) {
  if (!palabra) return [];

  const letras = obtenerLetrasUnicas(palabra);
  const letrasConsumidas = [];

  for (const letra of letras) {
    letrasUsadasEnPartida[letra] = (letrasUsadasEnPartida[letra] || 0) + 1;

    const indice = letrasPendientes.indexOf(letra);
    if (indice === -1) continue;

    letrasPendientes.splice(indice, 1);
    letrasConsumidas.push(letra);
  }

  if (letrasPendientes.length === 0) {
    letrasPendientes = [...ALFABETO];
    numeroCicloLetras += 1;
    console.log("Se completó el alfabeto. Comenzando un nuevo ciclo de letras.");
  }

  return letrasConsumidas;
}

// Escuchamos la señal del botón "¡Jugar!" del popup
chrome.runtime.onMessage.addListener(async (mensaje) => {
  if (mensaje.comando === "iniciar_bot") {
    if (mensaje.config && mensaje.config.modo) {
      aplicarModoBot(mensaje.config.modo);
      guardarModoBotEnStorage(mensaje.config.modo);
    }
    if (mensaje.config && mensaje.config.delayEnvioMin !== undefined) {
      aplicarDemoras(mensaje.config.delayEnvioMin, mensaje.config.delayEnvioMax);
    }

    if (!botActivado) {
      botActivado = true;
      console.log(`Bot Automático Activado en modo: ${configuracionBot.modo}. Vigilando turnos...`);
      if (!diccionarioCargado) {
        try {
          await cargarDiccionario();
        } catch (error) {
          console.error("Error cargando diccionario:", error);
          return;
        }
      }
      iniciarVigilancia();
    }
  }

  if (mensaje.comando === "configurar_bot") {
    if (mensaje.config && mensaje.config.modo) {
      aplicarModoBot(mensaje.config.modo);
      guardarModoBotEnStorage(mensaje.config.modo);
      console.log("Configuración del bot actualizada:", configuracionBot.modo);
    }
  }
  
  //Escuchar el botón de resumen desde el popup
  if (mensaje.comando === "mostrar_resumen") {
    mostrarResumenPartida();
  }
});

if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['botMode', 'delayEnvioMin', 'delayEnvioMax'], (datos) => {
    if (datos && datos.botMode) {
      aplicarModoBot(datos.botMode);
    }
    if (datos && datos.delayEnvioMin !== undefined && datos.delayEnvioMax !== undefined) {
      aplicarDemoras(datos.delayEnvioMin, datos.delayEnvioMax);
    }
  });

  // Cambios hechos en el popup se aplican en caliente
  chrome.storage.onChanged.addListener((cambios, area) => {
    if (area !== 'local') return;

    if (cambios.botMode && cambios.botMode.newValue) {
      aplicarModoBot(cambios.botMode.newValue);
    }
    if (cambios.delayEnvioMin || cambios.delayEnvioMax) {
      chrome.storage.local.get(['delayEnvioMin', 'delayEnvioMax'], (datos) => {
        aplicarDemoras(datos.delayEnvioMin, datos.delayEnvioMax);
      });
    }
  });
}

function iniciarVigilancia() {
  // Ejecuta esta revisión cada 400 milisegundos
  setInterval(() => {
    if (!botActivado || !diccionarioCargado) return;

    const divSilaba = document.querySelector('.syllable');
    const inputTexto = document.querySelector('.selfTurn input');
    const esMiTurno = inputTexto && inputTexto.offsetParent !== null && !inputTexto.disabled;

    if (configuracionBot.modo === MODOS_BOT.manual) {
      silabaJugadaEnEsteTurno = "";
      return;
    }

    if (esMiTurno && divSilaba) {
      const silabaActual = divSilaba.textContent.trim().toLowerCase();
      const reintentarMismaSilaba = silabaActual === silabaJugadaEnEsteTurno && Date.now() - ultimoIntentoTimestamp > 800;

      if (!silabaActual) {
        return;
      }

      if (configuracionBot.modo === MODOS_BOT.auto && esperandoEnvioUsuario) {
        return;
      }

      if (escrituraActiva && escrituraActiva.silaba !== silabaActual) {
        escrituraActiva = null;
      }

      if (escrituraActiva && escrituraActiva.silaba === silabaActual) {
        return;
      }

      if (silabaActual !== "" && (silabaActual !== silabaJugadaEnEsteTurno || reintentarMismaSilaba)) {
        silabaJugadaEnEsteTurno = silabaActual;
        ultimoIntentoTimestamp = Date.now();

        const yaProbadas = palabrasIntentadasPorSilaba.get(silabaActual) || [];
        const palabra = encontrarPalabra(silabaActual, yaProbadas);

        if (palabra) {
          palabrasIntentadasPorSilaba.set(silabaActual, [...yaProbadas, palabra]);
          escribirYEnviar(inputTexto, palabra, silabaActual);
        } else {
          palabrasIntentadasPorSilaba.delete(silabaActual);
          console.log("Me rindo, no encontré más palabras para:", silabaActual);
        }
      }
    } else {
      silabaJugadaEnEsteTurno = "";
      ultimoIntentoTimestamp = 0;
      escrituraActiva = null;
      esperandoEnvioUsuario = false;
      writeTimers.forEach((timer) => clearTimeout(timer));
      writeTimers = [];
      palabrasIntentadasPorSilaba.clear();
    }
  }, 400); 
}

function obtenerLetrasDisponibles() {
  const selectores = [
    '.letter',
    '.tile',
    '.rack .letter',
    '.rack .tile',
    '.letters .letter',
    '.letters .tile',
    '[data-letter]',
    '.available-letters',
    '.letter-bank',
    '.remaining-letters'
  ];

  const letras = new Set();

  for (const selector of selectores) {
    const nodos = document.querySelectorAll(selector);
    if (!nodos || nodos.length === 0) continue;

    nodos.forEach((nodo) => {
      const valor = (nodo.textContent || nodo.getAttribute('data-letter') || '').trim();
      for (const letra of valor.toLowerCase()) {
        if (/[a-z]/.test(letra)) {
          letras.add(letra);
        }
      }
    });
  }

  return letras.size > 0 ? [...letras].join('') : null;
}

function contarLetras(texto) {
  const conteo = {};

  for (const letra of (texto || '').toLowerCase()) {
    if (!/[a-z]/.test(letra)) continue;
    conteo[letra] = (conteo[letra] || 0) + 1;
  }

  return conteo;
}

function puedeFormarseConLetras(palabra, letrasDisponibles) {
  if (!letrasDisponibles) return true;

  const disponibles = contarLetras(letrasDisponibles);
  const restante = { ...disponibles };

  for (const letra of palabra) {
    if (!restante[letra]) {
      return false;
    }
    restante[letra] -= 1;
  }

  return true;
}

function contarLetrasUtiles(palabra, letrasDisponibles) {
  if (!letrasDisponibles) return palabra.length;

  const disponibles = contarLetras(letrasDisponibles);
  let utiles = 0;

  for (const letra of palabra) {
    if (!disponibles[letra]) continue;
    utiles += 1;
    disponibles[letra] -= 1;
  }

  return utiles;
}

function contarLetrasPendientesUtiles(palabra) {
  const pendientes = new Set(letrasPendientes);
  const letras = obtenerLetrasUnicas(palabra);

  return letras.filter((letra) => pendientes.has(letra)).length;
}

function encontrarPalabra(silaba, palabrasExcluidas = []) {
  if (!diccionario.length) return null;

  const letrasDisponibles = obtenerLetrasDisponibles();
  const exclusiones = new Set(palabrasExcluidas);

  // Calculamos los puntajes UNA vez por palabra y después ordenamos.
  // (Calcularlos dentro del sort los repetía en cada comparación: tardaba más de 1 s por turno.)
  const candidatas = diccionario
    .filter((p) => p.includes(silaba) && !exclusiones.has(p))
    .map((p) => ({
      palabra: p,
      pendientes: contarLetrasPendientesUtiles(p),
      utiles: contarLetrasUtiles(p, letrasDisponibles),
      azar: Math.random() // desempate final al azar
    }))
    .sort((a, b) =>
      (b.pendientes - a.pendientes) ||
      (b.palabra.length - a.palabra.length) ||
      (b.utiles - a.utiles) ||
      (a.azar - b.azar)
    )
    .map((c) => c.palabra);

  if (!candidatas.length) return null;

  const palabrasValidas = [];
  const inicio = Date.now();

  for (const palabra of candidatas) {
    if (Date.now() - inicio >= 2000) {
      break;
    }

    const esValidaParaElJuego = puedeFormarseConLetras(palabra, letrasDisponibles);
    if (!esValidaParaElJuego) {
      continue;
    }

    palabrasValidas.push(palabra);
  }

  const palabraElegida = palabrasValidas[0] || candidatas[0] || null;

  if (palabraElegida) {
    const letrasAntesDeConsumir = obtenerLetrasPendientes();
    const cicloAntesDeConsumir = numeroCicloLetras;
    const letrasUsadas = consumirLetrasDePalabra(palabraElegida);

    historialPartida.push({
      Sílaba: silaba,
      'Palabra Elegida': palabraElegida,
      'Letras en Pantalla': letrasDisponibles || 'Ninguna/No leídas',
      'Letras del Ciclo Consumidas': letrasUsadas.join(', ') || 'Ninguna',
      'Letras Pendientes Antes de Jugar': letrasAntesDeConsumir || 'Ninguna',
      'Letras Pendientes Después de Jugar': obtenerLetrasPendientes(),
      'Ciclo de Letras': cicloAntesDeConsumir,
      'Letras Totales Usadas': JSON.stringify(letrasUsadasEnPartida),
      'Otras Opciones (Top 3)': candidatas.slice(0, 3).join(', ')
    });
  }
  
  return palabraElegida;
}

function escribirPalabraConRetardo(inputElement, palabra, { enviarAuto = false, silabaActual = "" } = {}) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  let valorActual = "";

  const letras = [...palabra];
  let acumulado = 0;

  const finalizarEscritura = () => {
    if (enviarAuto) {
      // Modo auto: terminó de tipear, ahora espera la demora al azar y envía solo
      programarEnvio(inputElement, palabra, silabaActual);
      return;
    }

    setTimeout(() => {
      if (escrituraActiva && escrituraActiva.silaba === silabaActual) {
        escrituraActiva = null;
      }
    }, 250);
  };

  for (const letra of letras) {
    const delay = randomEntre(configuracionBot.delayEntreLetrasMin, configuracionBot.delayEntreLetrasMax);

    const timer = setTimeout(() => {
      valorActual += letra;
      nativeSetter.call(inputElement, valorActual);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));

      if (valorActual.length === letras.length) {
        finalizarEscritura();
      }
    }, acumulado);

    writeTimers.push(timer);
    acumulado += delay;
  }

}

// ---------------- Envío ----------------

// El input del juego está dentro de un <form>. Un Enter simulado no envía el form por sí
// solo, así que: probamos con el Enter y, si el juego no lo atendió, enviamos el form.
function enviarPalabra(inputElement) {
  const enter = new KeyboardEvent('keydown', {
    bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13
  });
  const atendido = !inputElement.dispatchEvent(enter); // false = el juego hizo preventDefault

  if (!atendido && inputElement.form) {
    inputElement.form.requestSubmit();
  }
}

function sigueSiendoMiTurno(inputElement) {
  return inputElement.isConnected && inputElement.offsetParent !== null && !inputElement.disabled;
}

// Espera un tiempo al azar entre delayEnvioMin y delayEnvioMax y envía la palabra.
function programarEnvio(inputElement, palabra, silabaActual) {
  const demora = randomEntre(configuracionBot.delayEnvioMin, configuracionBot.delayEnvioMax);

  // Guardamos la demora en la última jugada del historial (la que se acaba de elegir)
  const jugada = historialPartida[historialPartida.length - 1];
  if (jugada && jugada['Palabra Elegida'] === palabra) {
    jugada['Demora de Envío (s)'] = (demora / 1000).toFixed(2);
  }

  console.log(`"${palabra}" se envía en ${(demora / 1000).toFixed(2)} s`);

  const timer = setTimeout(() => {
    // Si mientras esperábamos terminó el turno o cambió la sílaba, no enviamos nada
    if (!escrituraActiva || escrituraActiva.silaba !== silabaActual) return;
    if (!sigueSiendoMiTurno(inputElement)) return;

    enviarPalabra(inputElement);

    // El reintento ("pasaron 800 ms y sigo en la misma sílaba") se cuenta desde el envío,
    // no desde que se eligió la palabra; si no, reintentaría antes de haber enviado.
    ultimoIntentoTimestamp = Date.now();
    escrituraActiva = null;
  }, demora);

  // En la lista de timers: si el turno termina antes, el setInterval los cancela todos
  writeTimers.push(timer);
}

function escribirYEnviar(inputElement, palabra, silabaActual = "") {
  console.log(`Escribiendo: ${palabra} | modo: ${configuracionBot.modo}`);

  writeTimers.forEach((timer) => clearTimeout(timer));
  writeTimers = [];

  escrituraActiva = {
    silaba: silabaActual,
    palabra,
    finalizada: false
  };

  switch (configuracionBot.modo) {
    case MODOS_BOT.manual:
      escribirPalabraConRetardo(inputElement, palabra, { enviarAuto: false, silabaActual });
      break;
    case MODOS_BOT.auto:
      escribirPalabraConRetardo(inputElement, palabra, { enviarAuto: true, silabaActual });
      break;
    case MODOS_BOT.completa:
    default:
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(inputElement, palabra);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      programarEnvio(inputElement, palabra, silabaActual);
      break;
  }
}

function resetearEsperaUsuario() {
  esperandoEnvioUsuario = false;
  escrituraActiva = null;
  silabaJugadaEnEsteTurno = "";
}

window.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter' && configuracionBot.modo === MODOS_BOT.auto && esperandoEnvioUsuario) {
    resetearEsperaUsuario();
  }
});


// Muestra la tabla en la consola al llamarla
function mostrarResumenPartida() {
  if (historialPartida.length === 0) {
    console.log("No hay jugadas registradas en el historial todavía.");
    return;
  }
  
  console.group("Resumen de Decisiones del Bot");
  console.log("Total de turnos jugados:", historialPartida.length);
  console.table(historialPartida);
  console.groupEnd();
}

// Atajo para Firefox: Presiona F9 para ver la tabla en la consola
window.addEventListener('keydown', (evento) => {
  if (evento.key === 'F9') {
    mostrarResumenPartida();
  }
});