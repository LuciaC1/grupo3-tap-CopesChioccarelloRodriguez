const radioButtons = document.querySelectorAll('input[name="modo-bot"]');

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

radioButtons.forEach((radio) => {
  radio.addEventListener('change', () => {
    const modoSeleccionado = radio.value;
    document.getElementById('estado').innerText = `Modo ${modoSeleccionado}. Cambios aplicados en caliente.`;
    guardarModoYAplicarlo(modoSeleccionado);
  });
});

document.getElementById('btn-jugar').addEventListener('click', () => {
  const modoSeleccionado = document.querySelector('input[name="modo-bot"]:checked')?.value || 'completa';
  document.getElementById('estado').innerText = `Bot activado en modo ${modoSeleccionado}. Buscando partida...`;

  guardarModoYAplicarlo(modoSeleccionado);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        comando: 'iniciar_bot',
        config: { modo: modoSeleccionado }
      });
    }
  });
});

if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['botMode'], (datos) => {
    if (datos && datos.botMode) {
      const radio = document.querySelector(`input[name="modo-bot"][value="${datos.botMode}"]`);
      if (radio) {
        radio.checked = true;
      }
    }
  });
}
