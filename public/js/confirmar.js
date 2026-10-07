// Pide confirmación antes de enviar un <form data-confirmar="pregunta">.
// Reemplaza al onsubmit inline, que la política de seguridad de contenido (CSP) bloquea.
document.addEventListener('submit', (e) => {
  const pregunta = e.target.dataset.confirmar;
  if (pregunta && !confirm(pregunta)) e.preventDefault();
});
