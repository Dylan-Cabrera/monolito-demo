// Validaciones de configuración que se corren antes de levantar el servidor.
const SECRETOS_DEBILES = ['dev', 'cambiar-esto'];
const LARGO_MINIMO = 32;

// Devuelve el mensaje de error, o null si la configuración sirve.
// Solo exige en producción: en desarrollo y en los tests alcanza con el valor por defecto.
function validarSecreto(env = process.env) {
  if (env.NODE_ENV !== 'production') return null;
  const secreto = (env.SESSION_SECRET || '').trim();
  let motivo = null;
  if (!secreto) motivo = 'está vacío';
  else if (SECRETOS_DEBILES.includes(secreto)) motivo = `es un valor de ejemplo ("${secreto}")`;
  else if (secreto.length < LARGO_MINIMO) motivo = `tiene ${secreto.length} caracteres y el mínimo es ${LARGO_MINIMO}`;
  if (!motivo) return null;
  return `SESSION_SECRET ${motivo}. En producción hace falta un secreto propio: `
    + 'generá uno con `openssl rand -hex 32` y cargalo en el .env o en las variables del entorno.';
}

module.exports = { validarSecreto, SECRETOS_DEBILES, LARGO_MINIMO };
