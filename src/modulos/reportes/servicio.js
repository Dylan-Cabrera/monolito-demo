const { pool } = require('../../db/pool');
const VAL = 'i.cantidad * i.precio_unitario';
const VALIDOS = `items_pedido i JOIN pedidos pe ON pe.id=i.pedido_id AND pe.estado <> 'CANCELADO'`;

async function resumenProductor(id) {
  const [tot, top, pend] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(${VAL}),0)::float t FROM ${VALIDOS} WHERE pe.productor_id=$1`, [id]),
    pool.query(`SELECT p.nombre, SUM(i.cantidad)::int unidades, SUM(${VAL})::float monto FROM ${VALIDOS}
                JOIN productos p ON p.id=i.producto_id WHERE pe.productor_id=$1 GROUP BY p.id ORDER BY monto DESC LIMIT 5`, [id]),
    pool.query(`SELECT COUNT(*)::int n FROM pedidos WHERE productor_id=$1 AND estado='PENDIENTE'`, [id]),
  ]);
  return { total: tot.rows[0].t, top: top.rows, pendientes: pend.rows[0].n };
}

async function tablero() {
  const [loc, cat, tot] = await Promise.all([
    pool.query(`SELECT u.localidad, SUM(${VAL})::float monto, COUNT(DISTINCT pe.id)::int pedidos
                FROM ${VALIDOS} JOIN usuarios u ON u.id=pe.productor_id GROUP BY u.localidad ORDER BY monto DESC`),
    pool.query(`SELECT c.nombre, SUM(${VAL})::float monto FROM ${VALIDOS}
                JOIN productos p ON p.id=i.producto_id JOIN categorias c ON c.id=p.categoria_id GROUP BY c.id ORDER BY monto DESC`),
    pool.query(`SELECT COALESCE(SUM(${VAL}),0)::float total, COUNT(DISTINCT pe.productor_id)::int productores FROM ${VALIDOS}`),
  ]);
  return { porLocalidad: loc.rows, porCategoria: cat.rows, ...tot.rows[0] };
}

// Números en vivo para la portada y la guía
async function pulso() {
  const { rows } = await pool.query(`SELECT
    (SELECT COUNT(*) FROM usuarios WHERE rol='PRODUCTOR')::int productores,
    (SELECT COUNT(DISTINCT localidad) FROM usuarios WHERE rol='PRODUCTOR')::int localidades,
    (SELECT COUNT(*) FROM productos WHERE activo)::int productos,
    (SELECT COUNT(*) FROM pedidos)::int pedidos,
    (SELECT COALESCE(SUM(${VAL}),0) FROM ${VALIDOS})::float vendido`);
  return rows[0];
}

module.exports = { resumenProductor, tablero, pulso };
