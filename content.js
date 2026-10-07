let diccionario = [];
let diccionarioCargado = false;

async function cargarDiccionario() {
  const respuesta = await fetch(chrome.runtime.getURL("diccionario.txt"));

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
  console.log("📚 Diccionario cargado desde archivo TXT:", diccionario.length, "palabras");
}

let botActivado = false;
let silabaJugadaEnEsteTurno = ""; // Actúa como candado para no jugar dos veces el mismo turno

// Escuchamos la señal del botón "¡Jugar!" del popup
chrome.runtime.onMessage.addListener((mensaje) => {
  if (mensaje.comando === "iniciar_bot") {
    if (!botActivado) {
      botActivado = true;
      console.log("🤖 Bot Automático Activado. Vigilando turnos...");
      if (!diccionarioCargado) {
        cargarDiccionario();
      }
      iniciarVigilancia();
    }
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

      // Si hay una sílaba y todavía NO jugamos en este turno exacto
      if (silabaActual !== "" && silabaActual !== silabaJugadaEnEsteTurno) {
        // 1. Bloqueamos para no volver a jugar hasta el próximo turno
        silabaJugadaEnEsteTurno = silabaActual; 
        // 2. Pensar la palabra (Acá iría tu algoritmo de abecedario)
        const palabra = encontrarPalabra(silabaActual);
        // 3. Ejecutar la acción
        if (palabra) {
          escribirYEnviar(inputTexto, palabra);
        } else {
          console.log("Me rindo, no encontré palabra para:", silabaActual);
        }
      }
    } else {
      // Si el turno pasó (es el turno de otro), reseteamos el candado
      silabaJugadaEnEsteTurno = "";
    }
  }, 400); 
}

function encontrarPalabra(silaba) {
  if (!diccionario.length) return null;

  const candidatas = diccionario.filter((p) => p.includes(silaba));
  return candidatas.length > 0 ? candidatas[0] : null;
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