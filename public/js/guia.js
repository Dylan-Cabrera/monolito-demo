import { crearEscena, hayWebGL } from '/js/escena.js';

const { partes, escenas } = window.GUIA;
const pasos = [...document.querySelectorAll('.paso')];
const marcas = [...document.querySelectorAll('.progreso button')];
const panel = document.getElementById('panel');
const lienzo = document.getElementById('lienzo');
let actual = 0;
// Cada paso parte de este estado: saltar directo a cualquier paso se ve igual que llegar en orden
const BASE = { camara: 'general', flujo: null, monolito: true, intermediario: false, explotar: 0,
  etiquetas: [], foco: [], recorrido: false, limites: false, orbita: false };

const escena = hayWebGL()
  ? crearEscena(lienzo, { modo: 'guia', onFase: (i) => {
      pasos[actual].querySelectorAll('.fases li').forEach((li) => li.classList.toggle('activa', Number(li.dataset.fase) === i));
    } })
  : (lienzo.innerHTML = '<p class="sin-webgl">Este equipo no tiene WebGL: la guía funciona igual con el texto del panel.</p>', null);

const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
async function refrescarVivo() {
  try {
    const d = await (await fetch('/arquitectura/pulso')).json();
    document.querySelectorAll('[data-vivo]').forEach((el) => {
      const k = el.dataset.vivo;
      el.textContent = k === 'vendido' ? pesos(d[k]) : d[k];
    });
  } catch { /* sin conexión: quedan los números de la carga */ }
}

function ir(n) {
  actual = Math.max(0, Math.min(pasos.length - 1, n));
  pasos.forEach((p, i) => p.classList.toggle('visible', i === actual));
  marcas.forEach((m, i) => { m.classList.toggle('actual', i === actual); m.classList.toggle('hecho', i < actual); m.setAttribute('aria-selected', i === actual); });
  const parte = Number(pasos[actual].dataset.parte);
  document.getElementById('parte').textContent = `Parte ${parte} de ${partes.length}: ${partes[parte - 1]}`;
  document.getElementById('contador').textContent = `${actual + 1} / ${pasos.length}`;
  document.getElementById('ant').disabled = actual === 0;
  document.getElementById('sig').textContent = actual === pasos.length - 1 ? 'Volver a empezar' : 'Siguiente';
  escena?.setEstado({ ...BASE, ...escenas[actual] });
  if (pasos[actual].querySelector('[data-vivo]')) refrescarVivo();
  history.replaceState(null, '', `#paso-${actual + 1}`);
}

document.getElementById('ant').onclick = () => ir(actual - 1);
document.getElementById('sig').onclick = () => ir(actual === pasos.length - 1 ? 0 : actual + 1);
marcas.forEach((m) => { m.onclick = () => ir(Number(m.dataset.ir)); });
addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea,select')) return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); ir(actual + 1); }
  else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); ir(actual - 1); }
  else if (e.key.toLowerCase() === 'h') panel.classList.toggle('escondido');
  else if (e.key.toLowerCase() === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
});
// Entrar a la app reemplaza la guía en el historial: desde la app, "atrás" no vuelve a la presentación.
// Sin este script el enlace funciona igual, como un link común.
document.querySelectorAll('[data-entrar]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); location.replace(a.href); }));
addEventListener('hashchange', () => { const n = Number((location.hash.match(/paso-(\d+)/) || [])[1]) - 1; if (n >= 0 && n !== actual) ir(n); });
const inicial = Number((location.hash.match(/paso-(\d+)/) || [])[1]) - 1;
ir(Number.isInteger(inicial) && inicial >= 0 ? inicial : 0);
