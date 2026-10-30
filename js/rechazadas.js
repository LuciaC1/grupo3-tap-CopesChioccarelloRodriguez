const resumen = document.getElementById('resumen');
const lista = document.getElementById('lista');
const vacio = document.getElementById('vacio');

function mostrarPalabrasRechazadas(palabras) {
  const palabrasOrdenadas = [...new Set(palabras)]
    .filter((palabra) => typeof palabra === 'string' && palabra.trim())
    .sort((a, b) => a.localeCompare(b));

  resumen.textContent = `${palabrasOrdenadas.length} palabra${palabrasOrdenadas.length === 1 ? '' : 's'} rechazada${palabrasOrdenadas.length === 1 ? '' : 's'}.`;
  lista.replaceChildren();
  vacio.hidden = palabrasOrdenadas.length > 0;

  palabrasOrdenadas.forEach((palabra) => {
    const item = document.createElement('li');
    item.textContent = palabra;
    lista.appendChild(item);
  });
}

chrome.storage.local.get(['palabrasRechazadas'], (datos) => {
  mostrarPalabrasRechazadas(Array.isArray(datos.palabrasRechazadas) ? datos.palabrasRechazadas : []);
});

chrome.storage.onChanged.addListener((cambios, area) => {
  if (area !== 'local' || !cambios.palabrasRechazadas) return;
  const palabras = Array.isArray(cambios.palabrasRechazadas.newValue)
    ? cambios.palabrasRechazadas.newValue
    : [];
  mostrarPalabrasRechazadas(palabras);
});
