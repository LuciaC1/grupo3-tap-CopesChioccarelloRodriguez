document.getElementById('btn-jugar').addEventListener('click', () => {
  const modoSeleccionado = document.querySelector('input[name="modo-bot"]:checked')?.value || 'completa';
  document.getElementById('estado').innerText = `Bot activado en modo ${modoSeleccionado}. Buscando partida...`;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        comando: 'iniciar_bot',
        config: { modo: modoSeleccionado }
      });
    }
  });
});