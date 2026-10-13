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
const palabrasIntentadasPorSilaba = new Map();

// Escuchamos la señal del botón "¡Jugar!" del popup
chrome.runtime.onMessage.addListener(async (mensaje) => {
  if (mensaje.comando === "iniciar_bot") {
    if (!botActivado) {
      botActivado = true;
      console.log("Bot Automático Activado. Vigilando turnos...");
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
  
  //Escuchar el botón de resumen desde el popup
  if (mensaje.comando === "mostrar_resumen") {
    mostrarResumenPartida();
  }
});

function iniciarVigilancia() {
  // Ejecuta esta revisión cada 400 milisegundos
  setInterval(() => {
    if (!botActivado || !diccionarioCargado) return;

    // Busca los elementos. RECUERDA: Ajusta el selector del input al real.
    const divSilaba = document.querySelector('.syllable');
    const inputTexto = document.querySelector('.selfTurn input'); // Ejemplo: suele haber una clase 'selfTurn' cuando te toca
    
    // Condición de turno: el input existe, está visible y no está bloqueado
    const esMiTurno = inputTexto && inputTexto.offsetParent !== null && !inputTexto.disabled;

    if (esMiTurno && divSilaba) {
      const silabaActual = divSilaba.textContent.trim().toLowerCase(); // esto es para que el bot compare siempre en minúsculas y sin espacios raros
      const reintentarMismaSilaba = silabaActual === silabaJugadaEnEsteTurno && Date.now() - ultimoIntentoTimestamp > 800;

      // Si hay una sílaba y todavía NO jugamos en este turno exacto, o si ya falló una y queremos probar otra
      if (silabaActual !== "" && (silabaActual !== silabaJugadaEnEsteTurno || reintentarMismaSilaba)) {
        // 1. Bloqueamos para no volver a jugar hasta el próximo turno
        silabaJugadaEnEsteTurno = silabaActual;
        ultimoIntentoTimestamp = Date.now();

        const yaProbadas = palabrasIntentadasPorSilaba.get(silabaActual) || [];
        const palabra = encontrarPalabra(silabaActual, yaProbadas);

        // 2. Ejecutar la acción
        if (palabra) {
          palabrasIntentadasPorSilaba.set(silabaActual, [...yaProbadas, palabra]);
          escribirYEnviar(inputTexto, palabra);
        } else {
          palabrasIntentadasPorSilaba.delete(silabaActual);
          console.log("Me rindo, no encontré más palabras para:", silabaActual);
        }
      }
    } else {
      // Si el turno pasó (es el turno de otro), reseteamos el candado
      silabaJugadaEnEsteTurno = "";
      ultimoIntentoTimestamp = 0;
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

function encontrarPalabra(silaba, palabrasExcluidas = []) {
  if (!diccionario.length) return null;

  const letrasDisponibles = obtenerLetrasDisponibles();
  const exclusiones = new Set(palabrasExcluidas);

  const candidatas = diccionario
    .filter((p) => p.includes(silaba) && !exclusiones.has(p))
    .sort((a, b) => {
      if (b.length !== a.length) {
        return b.length - a.length;
      }

      const utilesA = contarLetrasUtiles(a, letrasDisponibles);
      const utilesB = contarLetrasUtiles(b, letrasDisponibles);

      if (utilesB !== utilesA) {
        return utilesB - utilesA;
      }

      return 0;
    });

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

  //Guardar la decisión en el historial ---
  let palabraElegida = null;
  if (palabrasValidas.length > 0) {
    palabraElegida = palabrasValidas[0];
  } else {
    const primeraCandidata = candidatas[0];
    palabraElegida = primeraCandidata || null;
  }

  if (palabraElegida) {
    historialPartida.push({
      Sílaba: silaba,
      'Palabra Elegida': palabraElegida,
      'Letras en Pantalla': letrasDisponibles || 'Ninguna/No leídas',
      'Otras Opciones (Top 3)': candidatas.slice(0, 3).join(', ') 
    });
  }
  
  return palabraElegida;
}

function escribirYEnviar(inputElement, palabra) {
  console.log(`Escribiendo: ${palabra}`);
  
  // El truco del setter nativo para sortear React/Vue
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeSetter.call(inputElement, palabra);
  
  // Avisamos al juego que el input cambió
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Simulamos el Enter
  setTimeout(() => {
    inputElement.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13
    }));
  }, 150); // Un micro-retraso de 150ms lo hace parecer más "humano" y evita bugs en el juego
}

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