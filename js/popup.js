document.getElementById('btn-jugar').addEventListener('click', () => {
  document.getElementById('estado').innerText = "Bot activado. Buscando partida...";
  
  // Enviamos una señal a la pestaña activa
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { comando: "iniciar_bot" });
    }
  });
});