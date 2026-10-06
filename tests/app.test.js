// Pruebas de integración: levantan la app completa (un monolito) contra una base de prueba.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/chacra_test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { pool, transaccion } = require('../src/db/pool');
const app = require('../src/app');

let prod, prodId;
before(async () => {
  await pool.query(fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8'));
  const h = await bcrypt.hash('clave1234', 4);
  const u = async (usuario, rol, emp = null) => (await pool.query(
    `INSERT INTO usuarios (usuario, clave_hash, nombre, apellido, rol, localidad, emprendimiento, telefono)
     VALUES ($1,$2,'N','A',$3,'Ibarreta',$4,'1') RETURNING id`, [usuario, h, rol, emp])).rows[0].id;
  prodId = await u('ramon', 'PRODUCTOR', 'Chacra');
  await u('otro', 'PRODUCTOR', 'Otra');
  await u('laura', 'COMPRADOR');
  const cat = (await pool.query("INSERT INTO categorias (nombre) VALUES ('Raíces') RETURNING id")).rows[0].id;
  prod = (await pool.query(`INSERT INTO productos (productor_id, categoria_id, nombre, precio, stock)
    VALUES ($1,$2,'Mandioca',1100,10) RETURNING id`, [prodId, cat])).rows[0].id;
});
after(() => pool.end());

async function ingresar(usuario) {
  const ag = request.agent(app);
  const r = await ag.post('/ingresar').type('form').send({ usuario, clave: 'clave1234', sig: '/productos' });
  assert.equal(r.status, 302);
  return ag;
}
const stock = async () => (await pool.query('SELECT stock FROM productos WHERE id=$1', [prod])).rows[0].stock;

test('portada, guía y catálogo responden', async () => {
  for (const u of ['/', '/arquitectura', '/productos']) assert.equal((await request(app).get(u)).status, 200);
  const r = await request(app).get('/arquitectura/pulso');
  assert.equal(r.body.pid, process.pid); // mismo proceso que corre las pruebas
});

test('clave incorrecta no ingresa', async () => {
  const r = await request(app).post('/ingresar').type('form').send({ usuario: 'laura', clave: 'mal' });
  assert.equal(r.status, 401);
});

test('comprar descuenta stock en una transacción', async () => {
  const ag = await ingresar('laura');
  await ag.post(`/carrito/agregar/${prod}`).type('form').send({ cantidad: 4 });
  const r = await ag.post('/carrito/confirmar').type('form').send({ modalidad: 'RETIRO' });
  assert.equal(r.headers.location, '/mis-compras');
  assert.equal(await stock(), 6);
  const { rows } = await pool.query('SELECT estado FROM pedidos');
  assert.deepEqual(rows.map((x) => x.estado), ['PENDIENTE']);
});

test('sin stock suficiente: se rechaza y no se guarda nada', async () => {
  const ag = await ingresar('laura');
  await ag.post(`/carrito/agregar/${prod}`).type('form').send({ cantidad: 6 });
  await pool.query('UPDATE productos SET stock = 2 WHERE id=$1', [prod]); // alguien compró en el medio
  const antes = (await pool.query('SELECT COUNT(*)::int n FROM pedidos')).rows[0].n;
  const r = await ag.post('/carrito/confirmar').type('form').send({ modalidad: 'RETIRO' });
  assert.equal(r.headers.location, '/carrito');
  assert.equal((await pool.query('SELECT COUNT(*)::int n FROM pedidos')).rows[0].n, antes);
  assert.equal(await stock(), 2);
  await pool.query('UPDATE productos SET stock = 6 WHERE id=$1', [prod]);
});

test('falla a mitad de la transacción: ROLLBACK deshace lo ya hecho', async () => {
  const antes = (await pool.query('SELECT COUNT(*)::int n FROM pedidos')).rows[0].n;
  await assert.rejects(transaccion(async (db) => {
    await db.query('INSERT INTO pedidos (comprador_id, productor_id) VALUES ($1,$1)', [prodId]); // se hace...
    await db.query('UPDATE productos SET stock = -1 WHERE id=$1', [prod]); // ...y esto viola CHECK (stock >= 0)
  }));
  assert.equal((await pool.query('SELECT COUNT(*)::int n FROM pedidos')).rows[0].n, antes); // el INSERT se deshizo
});

test('transición inválida rechazada y cancelar repone stock', async () => {
  const id = (await pool.query('SELECT id FROM pedidos LIMIT 1')).rows[0].id;
  const ramon = await ingresar('ramon');
  await ramon.post(`/pedidos/${id}/estado`).type('form').send({ estado: 'ENTREGADO' }); // de PENDIENTE no se puede
  assert.equal((await pool.query('SELECT estado FROM pedidos WHERE id=$1', [id])).rows[0].estado, 'PENDIENTE');
  await ramon.post(`/pedidos/${id}/estado`).type('form').send({ estado: 'CANCELADO' });
  assert.equal(await stock(), 10);
});

test('permisos: comprador no publica, productor no edita lo ajeno', async () => {
  const laura = await ingresar('laura');
  assert.equal((await laura.get('/panel/productos')).status, 403);
  const otro = await ingresar('otro');
  assert.equal((await otro.get(`/panel/productos/${prod}/editar`)).status, 404);
  assert.equal((await request(app).get('/tablero')).status, 302);
});

test('borrar un producto con ventas lo oculta en lugar de borrarlo', async () => {
  const ramon = await ingresar('ramon');
  await ramon.post(`/panel/productos/${prod}/borrar`);
  const { rows } = await pool.query('SELECT activo FROM productos WHERE id=$1', [prod]);
  assert.equal(rows[0].activo, false);
});
