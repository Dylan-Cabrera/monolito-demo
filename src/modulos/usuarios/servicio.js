const bcrypt = require('bcryptjs');
const { pool } = require('../../db/pool');
const { LOCALIDADES } = require('../../constantes');

function validar(d) {
  const e = {};
  if (!/^[a-z0-9_]{3,40}$/i.test(d.usuario || '')) e.usuario = 'Entre 3 y 40 letras, números o guion bajo.';
  if ((d.clave || '').length < 8) e.clave = 'Mínimo 8 caracteres.';
  if (d.clave !== d.clave2) e.clave2 = 'Las claves no coinciden.';
  if (!d.nombre?.trim()) e.nombre = 'Falta el nombre.';
  if (!d.apellido?.trim()) e.apellido = 'Falta el apellido.';
  if (!['PRODUCTOR', 'COMPRADOR'].includes(d.rol)) e.rol = 'Elegí productor o comprador.';
  if (!LOCALIDADES.includes(d.localidad)) e.localidad = 'Elegí una localidad.';
  if (!d.telefono?.trim()) e.telefono = 'Dejá un teléfono para coordinar.';
  if (d.rol === 'PRODUCTOR' && !d.emprendimiento?.trim()) e.emprendimiento = 'Los productores necesitan el nombre de su chacra.';
  return e;
}

async function registrar(d) {
  const errores = validar(d);
  if (!errores.usuario) {
    const { rowCount } = await pool.query('SELECT 1 FROM usuarios WHERE lower(usuario)=lower($1)', [d.usuario]);
    if (rowCount) errores.usuario = 'Ese usuario ya existe.';
  }
  if (Object.keys(errores).length) return { errores };
  const hash = await bcrypt.hash(d.clave, 10);
  const { rows } = await pool.query(
    `INSERT INTO usuarios (usuario, clave_hash, nombre, apellido, rol, telefono, localidad, emprendimiento)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [d.usuario, hash, d.nombre.trim(), d.apellido.trim(), d.rol, d.telefono.trim(), d.localidad,
     d.rol === 'PRODUCTOR' ? d.emprendimiento.trim() : null]);
  return { id: rows[0].id };
}

async function autenticar(usuario, clave) {
  const { rows } = await pool.query('SELECT id, clave_hash FROM usuarios WHERE lower(usuario)=lower($1)', [usuario || '']);
  if (!rows[0] || !(await bcrypt.compare(clave || '', rows[0].clave_hash))) return null;
  return rows[0].id;
}

module.exports = { registrar, autenticar };
