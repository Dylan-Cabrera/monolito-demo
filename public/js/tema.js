// Selector de tema: oscuro por defecto; la elección queda guardada en este navegador.
const raiz = document.documentElement;
const boton = document.getElementById('tema');

function aplicar(tema) {
  raiz.dataset.tema = tema;
  raiz.style.colorScheme = tema === 'claro' ? 'light' : 'dark';
  boton?.setAttribute('aria-pressed', String(tema === 'claro'));
}

aplicar(raiz.dataset.tema === 'claro' ? 'claro' : 'oscuro');

boton?.addEventListener('click', () => {
  const tema = raiz.dataset.tema === 'claro' ? 'oscuro' : 'claro';
  aplicar(tema);
  try { localStorage.setItem('tema', tema); } catch { /* sin almacenamiento: vale solo para esta página */ }
});
