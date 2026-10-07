const { rateLimit } = require('express-rate-limit');

// Freno a la fuerza bruta sobre el ingreso: 10 intentos fallidos cada 15 minutos por IP.
// El contador vive en la memoria del proceso: como el monolito es UN solo proceso, la cuenta es exacta
// y no hace falta otro almacén. Se reinicia si se reinicia el servidor.
const limitadorIngreso = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true, // ingresar bien no gasta intentos
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).render('usuarios/ingresar', {
    sig: req.body?.sig || '', error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
  }),
});

module.exports = { limitadorIngreso };
