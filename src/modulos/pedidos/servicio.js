const { pool, transaccion } = require('../../db/pool');
const { TRANSICIONES, MODALIDADES, ESTADOS } = require('../../constantes');
const { ErrorNegocio } = require('../../errores');

// ---- Carrito (vive en la sesión: { productoId: cantidad }) ----
async function lineasCarrito(carrito = {}) {
  const ids = Object.keys(carrito).map(Number);
  if (!ids.length) return { lineas: [], total: 0 };
  const { rows } = await pool.query(
    `SELECT p.id, p.nombre, p.precio, p.unidad, p.stock, p.productor_id, u.emprendimiento
     FROM productos p JOIN usuarios u ON u.id=p.productor_id WHERE p.id = ANY($1) AND p.activo`, [ids]);
  const lineas = rows.map((p) => ({ p, cantidad: carrito[p.id], subtotal: p.precio * carrito[p.id] }));
  return { lineas, total: lineas.reduce((a, l) => a + l.subtotal, 0) };
}

async function agregarAlCarrito(carrito, productoId, cantidad) {
  const { rows } = await pool.query('SELECT stock FROM productos WHERE id=$1 AND activo AND stock>0', [productoId]);
  if (!rows[0]) throw new ErrorNegocio('Ese producto ya no está disponible.');
  const c = Math.max(1, parseInt(cantidad, 10) || 1);
  carrito[productoId] = Math.min((carrito[productoId] || 0) + c, rows[0].stock);
  return carrito;
}

// ---- Confirmar: UNA transacción para stock + pedidos + ítems ----
// Ejemplo clave del monolito: todo pasa en la misma base, o todo o nada.
async function confirmar(compradorId, carrito, { modalidad = 'RETIRO', direccion = '', nota = '' } = {}) {
  if (!MODALIDADES[modalidad]) throw new ErrorNegocio('Modalidad inválida.');
  if (modalidad === 'ENVIO' && !direccion.trim()) throw new ErrorNegocio('Para envío necesitamos la dirección.');
  const ids = Object.keys(carrito || {}).map(Number);
  if (!ids.length) throw new ErrorNegocio('El carrito está vacío.');

  return transaccion(async (db) => {
    const { rows: prods } = await db.query(
      'SELECT id, nombre, precio, stock, productor_id FROM productos WHERE id = ANY($1) AND activo ORDER BY id FOR UPDATE', [ids]);
    const porProductor = new Map();
    for (const p of prods) {
      const cant = carrito[p.id];
      if (p.stock < cant) throw new ErrorNegocio(`No alcanza el stock de ${p.nombre} (quedan ${p.stock}).`);
      if (!porProductor.has(p.productor_id)) porProductor.set(p.productor_id, []);
      porProductor.get(p.productor_id).push({ p, cant });
    }
    if (prods.length !== ids.length) throw new ErrorNegocio('Algún producto del carrito ya no está disponible.');
    const creados = [];
    for (const [productorId, items] of porProductor) {   // un pedido por productor
      const { rows } = await db.query(
        'INSERT INTO pedidos (comprador_id, productor_id, modalidad, direccion, nota) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [compradorId, productorId, modalidad, direccion.trim(), nota.trim()]);
      for (const { p, cant } of items) {
        await db.query('UPDATE productos SET stock = stock - $1 WHERE id=$2', [cant, p.id]);
        await db.query('INSERT INTO items_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1,$2,$3,$4)',
          [rows[0].id, p.id, cant, p.precio]);
      }
      creados.push(rows[0].id);
    }
    return creados;
  });
}

// ---- Estados ----
async function cambiarEstado(pedidoId, usuario, nuevo) {
  if (!ESTADOS[nuevo]) throw new ErrorNegocio('Estado inválido.');
  return transaccion(async (db) => {
    const { rows } = await db.query('SELECT * FROM pedidos WHERE id=$1 FOR UPDATE', [pedidoId]);
    const ped = rows[0];
    if (!ped) throw new ErrorNegocio('Pedido inexistente.', 404);
    const esProductor = ped.productor_id === usuario.id;
    const esComprador = ped.comprador_id === usuario.id;
    if (!esProductor && !(esComprador && nuevo === 'CANCELADO')) throw new ErrorNegocio('No podés cambiar este pedido.', 403);
    if (!TRANSICIONES[ped.estado].includes(nuevo))
      throw new ErrorNegocio(`No se puede pasar de ${ESTADOS[ped.estado]} a ${ESTADOS[nuevo]}.`);
    if (nuevo === 'CANCELADO') // devolver stock
      await db.query(`UPDATE productos p SET stock = p.stock + i.cantidad FROM items_pedido i
                      WHERE i.pedido_id=$1 AND i.producto_id=p.id`, [pedidoId]);
    await db.query('UPDATE pedidos SET estado=$1 WHERE id=$2', [nuevo, pedidoId]);
    return { esProductor };
  });
}

// ---- Listados (ítems agregados en JSON desde PostgreSQL) ----
const LISTADO = (filtro) => `
  SELECT pe.*, c.nombre || ' ' || c.apellido AS comprador, c.telefono AS tel_comprador,
         v.emprendimiento, v.localidad, v.telefono AS tel_productor,
         json_agg(json_build_object('nombre', p.nombre, 'unidad', p.unidad, 'cantidad', i.cantidad,
                  'subtotal', i.cantidad * i.precio_unitario) ORDER BY i.id) AS items,
         SUM(i.cantidad * i.precio_unitario)::float AS total
  FROM pedidos pe JOIN usuarios c ON c.id=pe.comprador_id JOIN usuarios v ON v.id=pe.productor_id
  JOIN items_pedido i ON i.pedido_id=pe.id JOIN productos p ON p.id=i.producto_id
  WHERE ${filtro}=$1 GROUP BY pe.id, c.id, v.id ORDER BY pe.creado DESC`;
const compras = async (id) => (await pool.query(LISTADO('pe.comprador_id'), [id])).rows;
const ventas = async (id) => (await pool.query(LISTADO('pe.productor_id'), [id])).rows;

module.exports = { lineasCarrito, agregarAlCarrito, confirmar, cambiarEstado, compras, ventas };
