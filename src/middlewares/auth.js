const { pool } = require('../db/pool');
const { prohibido } = require('../errores');

async function cargarUsuario(req, res, next) {
  res.locals.usuario = null;
  if (req.session.usuarioId) {
    const { rows } = await pool.query('SELECT id, usuario, nombre, apellido, rol, localidad, emprendimiento, telefono FROM usuarios WHERE id=$1', [req.session.usuarioId]);
    req.usuario = res.locals.usuario = rows[0] || null;
  }
  next();
}

function requiereLogin(req, res, next) {
  if (!req.usuario) return res.redirect('/ingresar?sig=' + encodeURIComponent(req.originalUrl));
  next();
}

const requiereRol = (...roles) => [requiereLogin, (req, res, next) => {
  if (!roles.includes(req.usuario.rol)) return next(prohibido());
  next();
}];

module.exports = { cargarUsuario, requiereLogin, requiereRol };
