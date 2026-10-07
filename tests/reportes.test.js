// Pruebas del módulo de reportes: se llama al servicio directo (sin HTTP) contra la base de prueba.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/chacra_test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db/pool');
const reportes = require('../src/modulos/reportes/servicio');

// Datos con montos redondos:
//   ramon (Ibarreta)     ENTREGADO  3 mandioca x 1000 + 2 zapallo x 500 = 4000
//   ramon (Ibarreta)     PENDIENTE  1 mandioca x 1000                   = 1000
//   ramon (Ibarreta)     CANCELADO  10 mandioca x 1000                  (no debe sumar)
//   otro  (Las Lomitas)  CONFIRMADO 2 batata x 2000                     = 4000
//   nuevo (Ibarreta)     sin ventas
let ramon, otro, nuevo;
before(async () => {
  await pool.query(fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8'));
  const u = async (usuario, rol, localidad, emp = null) => (await pool.query(
    `INSERT INTO usuarios (usuario, clave_hash, nombre, apellido, rol, localidad, emprendimiento, telefono)
     VALUES ($1,'x','N','A',$2,$3,$4,'1') RETURNING id`, [usuario, rol, localidad, emp])).rows[0].id;
  ramon = await u('ramon', 'PRODUCTOR', 'Ibarreta', 'Chacra');
  otro = await u('otro', 'PRODUCTOR', 'Las Lomitas', 'Otra');
  nuevo = await u('nuevo', 'PRODUCTOR', 'Ibarreta', 'Recién llegado');
  const laura = await u('laura', 'COMPRADOR', 'Formosa');

  const cat = async (nombre) => (await pool.query('INSERT INTO categorias (nombre) VALUES ($1) RETURNING id', [nombre])).rows[0].id;
  const raices = await cat('Raíces');
  const verduras = await cat('Verduras');
  const p = async (productorId, categoriaId, nombre, precio, activo = true) => (await pool.query(
    `INSERT INTO productos (productor_id, categoria_id, nombre, precio, stock, activo)
     VALUES ($1,$2,$3,$4,100,$5) RETURNING id`, [productorId, categoriaId, nombre, precio, activo])).rows[0].id;
  const mandioca = await p(ramon, raices, 'Mandioca', 1000);
  const zapallo = await p(ramon, verduras, 'Zapallo', 500);
  const batata = await p(otro, raices, 'Batata', 9999); // el precio subió después de la venta: vale el del pedido
  await p(ramon, verduras, 'Acelga', 300, false); // oculto: no cuenta como publicado

  const pedido = async (productorId, estado, items) => {
    const id = (await pool.query('INSERT INTO pedidos (comprador_id, productor_id, estado) VALUES ($1,$2,$3) RETURNING id',
      [laura, productorId, estado])).rows[0].id;
    for (const [productoId, cantidad, precio] of items) {
      await pool.query('INSERT INTO items_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1,$2,$3,$4)',
        [id, productoId, cantidad, precio]);
    }
  };
  await pedido(ramon, 'ENTREGADO', [[mandioca, 3, 1000], [zapallo, 2, 500]]);
  await pedido(ramon, 'PENDIENTE', [[mandioca, 1, 1000]]);
  await pedido(ramon, 'CANCELADO', [[mandioca, 10, 1000]]);
  await pedido(otro, 'CONFIRMADO', [[batata, 2, 2000]]);
});
after(() => pool.end());

test('resumenProductor: suma solo lo propio y no cancelado', async () => {
  const r = await reportes.resumenProductor(ramon);
  assert.equal(r.total, 5000);
  assert.equal(r.pendientes, 1);
  assert.deepEqual(r.top, [
    { nombre: 'Mandioca', unidades: 4, monto: 4000 },
    { nombre: 'Zapallo', unidades: 2, monto: 1000 },
  ]);
  // usa el precio guardado en el pedido, no el actual del producto
  assert.equal((await reportes.resumenProductor(otro)).total, 4000);
  assert.deepEqual(await reportes.resumenProductor(nuevo), { total: 0, top: [], pendientes: 0 });
});

test('tablero: totales por localidad y categoría sin pedidos cancelados', async () => {
  const t = await reportes.tablero();
  assert.equal(t.total, 9000);
  assert.equal(t.productores, 2); // solo los que vendieron
  assert.deepEqual(t.porLocalidad, [
    { localidad: 'Ibarreta', monto: 5000, pedidos: 2 },
    { localidad: 'Las Lomitas', monto: 4000, pedidos: 1 },
  ]);
  assert.deepEqual(t.porCategoria, [
    { nombre: 'Raíces', monto: 8000 },
    { nombre: 'Verduras', monto: 1000 },
  ]);
});

test('pulso: lo vendido excluye cancelados', async () => {
  const p = await reportes.pulso();
  assert.equal(p.vendido, 9000);
  assert.equal(p.productores, 3);
  assert.equal(p.localidades, 2);
  assert.equal(p.productos, 3); // el oculto no cuenta
  // Deuda conocida (decisión del grupo): "pedidos" cuenta TODOS, incluido el cancelado.
  // Si algún día se decide excluirlos, este valor pasa a 3.
  assert.equal(p.pedidos, 4);
});
