const { pool } = require('../../db/pool');
const { UNIDADES } = require('../../constantes');
const { ErrorNegocio } = require('../../errores');

const BASE = `SELECT p.*, c.nombre AS categoria, u.emprendimiento, u.localidad, u.telefono,
                     u.nombre || ' ' || u.apellido AS productor
              FROM productos p JOIN categorias c ON c.id=p.categoria_id JOIN usuarios u ON u.id=p.productor_id`;

async function listarPublicos({ q = '', categoria = '', localidad = '' } = {}) {
  const cond = ['p.activo', 'p.stock > 0'], args = [];
  if (q) { args.push(`%${q}%`); cond.push(`(p.nombre ILIKE $${args.length} OR p.descripcion ILIKE $${args.length})`); }
  if (categoria) { args.push(Number(categoria)); cond.push(`p.categoria_id = $${args.length}`); }
  if (localidad) { args.push(localidad); cond.push(`u.localidad = $${args.length}`); }
  const { rows } = await pool.query(`${BASE} WHERE ${cond.join(' AND ')} ORDER BY p.creado DESC`, args);
  return rows;
}

const categorias = async () => (await pool.query('SELECT * FROM categorias ORDER BY nombre')).rows;
const obtener = async (id) => (await pool.query(`${BASE} WHERE p.id=$1`, [Number(id) || 0])).rows[0];
const delProductor = async (pid) => (await pool.query(`${BASE} WHERE p.productor_id=$1 ORDER BY p.creado DESC`, [pid])).rows;

async function propio(productorId, id) {
  const p = await obtener(id);
  if (!p || p.productor_id !== productorId) throw new ErrorNegocio('Ese producto no es tuyo o no existe.', 404);
  return p;
}

function validar(d) {
  const e = {};
  if (!d.nombre?.trim()) e.nombre = 'Poné un nombre.';
  if (!(Number(d.precio) > 0)) e.precio = 'El precio tiene que ser mayor a cero.';
  if (!Number.isInteger(Number(d.stock)) || Number(d.stock) < 0) e.stock = 'Stock entero, cero o más.';
  if (!UNIDADES[d.unidad]) e.unidad = 'Elegí una unidad.';
  if (!d.categoria_id) e.categoria_id = 'Elegí una categoría.';
  return e;
}

async function guardar(productorId, id, d) {
  const errores = validar(d);
  if (Object.keys(errores).length) return { errores };
  const v = [d.nombre.trim(), d.descripcion || '', Number(d.precio), d.unidad, Number(d.stock), d.activo === 'on', Number(d.categoria_id)];
  if (id) {
    await propio(productorId, id);
    await pool.query(`UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, unidad=$4, stock=$5, activo=$6, categoria_id=$7 WHERE id=$8`, [...v, id]);
  } else {
    await pool.query(`INSERT INTO productos (nombre, descripcion, precio, unidad, stock, activo, categoria_id, productor_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [...v, productorId]);
  }
  return {};
}

// Si ya tiene ventas no se borra: se oculta (protege el historial de pedidos)
async function borrar(productorId, id) {
  await propio(productorId, id);
  const { rowCount } = await pool.query('SELECT 1 FROM items_pedido WHERE producto_id=$1 LIMIT 1', [id]);
  if (rowCount) { await pool.query('UPDATE productos SET activo=false WHERE id=$1', [id]); return 'oculto'; }
  await pool.query('DELETE FROM productos WHERE id=$1', [id]);
  return 'borrado';
}

module.exports = { listarPublicos, categorias, obtener, delProductor, propio, guardar, borrar };
