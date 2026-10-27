// Página html/informe.html: muestra el último informe que guardó content.js
// en chrome.storage.local (clave "ultimoInforme").

const resumen = document.getElementById('resumen');
const contenedor = document.getElementById('contenedor');

function formatearFecha(ms) {
  return new Date(ms).toLocaleString('es-AR');
}

// Crea una celda con texto (textContent evita que se interprete como HTML)
function celda(tipo, texto) {
  const el = document.createElement(tipo);
  el.textContent = texto ?? '';
  return el;
}

function mostrarInforme(informe) {
  if (!informe || !informe.jugadas || informe.jugadas.length === 0) {
    resumen.textContent = '';
    contenedor.innerHTML = '<p class="vacio">Todavía no hay jugadas guardadas. Jugá una partida con el bot y volvé a abrir el informe.</p>';
    return;
  }

  resumen.textContent =
    `Partida iniciada: ${formatearFecha(informe.inicio)} · ` +
    `Última actualización: ${formatearFecha(informe.actualizado)} · ` +
    `Turnos: ${informe.jugadas.length} · Modo: ${informe.modo} · ` +
    `Demora de envío: ${informe.demoraMin / 1000}–${informe.demoraMax / 1000} s`;

  // Las columnas salen de las claves de las jugadas (las mismas que en historialPartida)
  const columnas = [];
  informe.jugadas.forEach((jugada) => {
    Object.keys(jugada).forEach((clave) => {
      if (!columnas.includes(clave)) columnas.push(clave);
    });
  });

  const tabla = document.createElement('table');
  const encabezado = document.createElement('tr');
  encabezado.appendChild(celda('th', '#'));
  columnas.forEach((col) => encabezado.appendChild(celda('th', col)));
  tabla.appendChild(encabezado);

  informe.jugadas.forEach((jugada, i) => {
    const fila = document.createElement('tr');
    fila.appendChild(celda('td', i + 1));
    columnas.forEach((col) => fila.appendChild(celda('td', jugada[col])));
    tabla.appendChild(fila);
  });

  contenedor.replaceChildren(tabla);
}

chrome.storage.local.get(['ultimoInforme'], (datos) => mostrarInforme(datos.ultimoInforme));

// Si la pestaña queda abierta mientras se juega, se actualiza sola en cada turno
chrome.storage.onChanged.addListener((cambios, area) => {
  if (area === 'local' && cambios.ultimoInforme) {
    mostrarInforme(cambios.ultimoInforme.newValue);
  }
});
