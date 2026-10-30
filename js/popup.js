const radioButtons = document.querySelectorAll('input[name="modo-bot"]');
const inputDelayMin = document.getElementById('delay-min');
const inputDelayMax = document.getElementById('delay-max');
const ayudaDemora = document.getElementById('ayuda-demora');
const checkboxEnterAutomatico = document.getElementById('enter-automatico');
const cantidadRechazadas = document.getElementById('cantidad-rechazadas');
const DEMORA_MAXIMA_SEG = 10;

// Lee los dos campos (en segundos), los corrige si hace falta y devuelve ms
function leerDemoras() {
  let min = parseFloat(inputDelayMin.value);
  let max = parseFloat(inputDelayMax.value);

  if (Number.isNaN(min)) min = 0.5;
  if (Number.isNaN(max)) max = 3.5;
  if (min > max) [min, max] = [max, min]; // si quedaron al revés, los damos vuelta

  min = Math.max(0, Math.min(min, DEMORA_MAXIMA_SEG));
  max = Math.max(0, Math.min(max, DEMORA_MAXIMA_SEG));

  return { delayEnvioMin: Math.round(min * 1000), delayEnvioMax: Math.round(max * 1000) };
}

function mostrarDemoras({ delayEnvioMin, delayEnvioMax }) {
  inputDelayMin.value = delayEnvioMin / 1000;
  inputDelayMax.value = delayEnvioMax / 1000;
  ayudaDemora.textContent = `Envía entre ${delayEnvioMin / 1000} y ${delayEnvioMax / 1000} s al azar`;
}

// Al guardar en storage, content.js se entera solo (storage.onChanged) y lo aplica en caliente
function guardarDemoras() {
  const demoras = leerDemoras();
  mostrarDemoras(demoras);
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set(demoras);
  }
  document.getElementById('estado').textContent = 'Demora actualizada.';
}

inputDelayMin.addEventListener('change', guardarDemoras);
inputDelayMax.addEventListener('change', guardarDemoras);

function guardarModoYAplicarlo(modo) {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ botMode: modo });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        comando: 'configurar_bot',
        config: { modo }
      });
    }
  });
}

function guardarEnterAutomaticoYAplicarlo(enterAutomatico) {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ enterAutomatico });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        comando: 'configurar_bot',
        config: { enterAutomatico }
      });
    }
  });
}

radioButtons.forEach((radio) => {
  radio.addEventListener('change', () => {
    const modoSeleccionado = radio.value;
    document.getElementById('estado').textContent = `Modo ${modoSeleccionado}. Cambios aplicados en caliente.`;
    guardarModoYAplicarlo(modoSeleccionado);
  });
});

checkboxEnterAutomatico.addEventListener('change', () => {
  const enterAutomatico = checkboxEnterAutomatico.checked;
  document.getElementById('estado').textContent = enterAutomatico
    ? 'Enter automático activado.'
    : 'Enter automático desactivado.';
  guardarEnterAutomaticoYAplicarlo(enterAutomatico);
});

// ---------------- Encender / apagar ----------------
// El estado se guarda en storage ("botEncendido"); content.js lo escucha con
// storage.onChanged y se prende o se apaga en caliente.
const btnEncender = document.getElementById('btn-encender');
let botEncendido = false;

function modoElegido() {
  return document.querySelector('input[name="modo-bot"]:checked')?.value || 'completa';
}

function mostrarEstadoBot(encendido) {
  botEncendido = encendido;
  btnEncender.textContent = encendido ? '⏹ Apagar bot' : '▶ Encender bot';
  btnEncender.classList.toggle('apagar', encendido);
  document.getElementById('estado').textContent = encendido
    ? `Bot encendido en modo ${modoElegido()}.`
    : 'Bot apagado.';
}

btnEncender.addEventListener('click', () => {
  const encender = !botEncendido;

  if (encender) {
    // Antes de encender, guardamos las opciones elegidas
    guardarModoYAplicarlo(modoElegido());
    guardarEnterAutomaticoYAplicarlo(checkboxEnterAutomatico.checked);
    chrome.storage.local.set(leerDemoras());
  }

  chrome.storage.local.set({ botEncendido: encender });
  mostrarEstadoBot(encender);
});

// Abre en una pestaña nueva la página con el informe de la última partida
document.getElementById('btn-informe').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('html/informe.html') });
  window.close();
});

document.getElementById('btn-ver-rechazadas').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('html/rechazadas.html') });
  window.close();
});

document.getElementById('btn-limpiar-rechazadas').addEventListener('click', () => {
  chrome.storage.local.set({ palabrasRechazadas: [] });
  cantidadRechazadas.textContent = '0';
  document.getElementById('estado').textContent = 'Lista de palabras rechazadas limpiada.';
});

if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get([
    'botMode',
    'delayEnvioMin',
    'delayEnvioMax',
    'botEncendido',
    'enterAutomatico',
    'palabrasRechazadas'
  ], (datos) => {
    if (datos && datos.botMode) {
      const radio = document.querySelector(`input[name="modo-bot"][value="${datos.botMode}"]`);
      if (radio) {
        radio.checked = true;
      }
    }
    // Mostramos la demora que quedó guardada la última vez
    if (datos && datos.delayEnvioMin !== undefined && datos.delayEnvioMax !== undefined) {
      mostrarDemoras(datos);
    }
    if (datos && datos.enterAutomatico !== undefined) {
      checkboxEnterAutomatico.checked = datos.enterAutomatico;
    }
    cantidadRechazadas.textContent = Array.isArray(datos && datos.palabrasRechazadas)
      ? datos.palabrasRechazadas.length
      : '0';
    // Mostramos si el bot está encendido o apagado
    mostrarEstadoBot(Boolean(datos && datos.botEncendido));
  });
}
