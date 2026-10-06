// Crea el esquema y carga datos de demostración. Uso: npm run semilla
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

const PRODUCTORES = [
  ['don_ramon', 'Ramón', 'Benítez', 'Ibarreta', 'Chacra Los Algarrobos', [
    ['Zapallo anco', 'Hortalizas', 900, 'kg', 300, 'Zapallo criollo de chacra, sin agroquímicos.'],
    ['Mandioca', 'Raíces y tubérculos', 1100, 'kg', 250, 'Mandioca tierna, ideal para chipá y mbejú.'],
    ['Batata colorada', 'Raíces y tubérculos', 1000, 'kg', 120, '']]],
  ['dona_celsa', 'Celsa', 'Gómez', 'Pirané', 'Quesería La Criolla', [
    ['Queso criollo', 'Lácteos y quesos', 7500, 'kg', 40, 'Queso fresco de leche de vaca, hecho a la mañana.'],
    ['Ricota casera', 'Lácteos y quesos', 4200, 'kg', 25, ''],
    ['Dulce de leche', 'Miel y dulces', 3500, 'frasco', 60, 'Frasco de 500 g.']]],
  ['ana_lomitas', 'Ana', 'Pérez', 'Las Lomitas', 'Apícola El Monte', [
    ['Miel de monte', 'Miel y dulces', 6000, 'frasco', 80, 'Miel de flores del monte chaqueño, frasco de 1 kg.'],
    ['Miel con algarroba', 'Miel y dulces', 6800, 'frasco', 35, '']]],
  ['lucho_clorinda', 'Luis', 'Acosta', 'Clorinda', 'Quinta Don Luis', [
    ['Banana', 'Frutas', 1500, 'kg', 200, 'Banana de Clorinda, madurada en planta.'],
    ['Pomelo rosado', 'Frutas', 800, 'kg', 400, ''],
    ['Mamón', 'Frutas', 1200, 'kg', 90, '']]],
  ['maria_colorado', 'María', 'Segovia', 'El Colorado', 'Granja Segovia', [
    ['Huevos de campo', 'Huevos y carnes', 4800, 'doc', 70, 'Gallinas criadas sueltas.'],
    ['Chorizo criollo', 'Huevos y carnes', 8200, 'kg', 30, '']]],
];

async function main() {
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  const cats = {};
  for (const n of ['Hortalizas', 'Frutas', 'Raíces y tubérculos', 'Lácteos y quesos', 'Miel y dulces', 'Huevos y carnes'])
    cats[n] = (await pool.query('INSERT INTO categorias (nombre) VALUES ($1) RETURNING id', [n])).rows[0].id;
  const hash = await bcrypt.hash('demo1234', 10);
  const nuevo = async (u, n, a, rol, loc, emp, tel, h = hash) => (await pool.query(
    `INSERT INTO usuarios (usuario, clave_hash, nombre, apellido, rol, localidad, emprendimiento, telefono)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [u, h, n, a, rol, loc, emp, tel])).rows[0].id;
  const prods = [];
  let k = 0;
  for (const [u, n, a, loc, emp, lista] of PRODUCTORES) {
    const id = await nuevo(u, n, a, 'PRODUCTOR', loc, emp, `370-4${String(512340 + k++ * 7919).slice(0, 6)}`);
    for (const [nom, cat, precio, un, st, desc] of lista)
      prods.push((await pool.query(`INSERT INTO productos (productor_id, categoria_id, nombre, precio, unidad, stock, descripcion)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, productor_id, precio`, [id, cats[cat], nom, precio, un, st, desc])).rows[0]);
  }
  const laura = await nuevo('laura', 'Laura', 'Fernández', 'COMPRADOR', 'Formosa', null, '370-4123456');
  await nuevo('admin', 'Admin', 'Provincial', 'ADMIN', 'Formosa', null, '-', await bcrypt.hash('admin1234', 10));
  // Historial para que los reportes tengan datos
  const estados = ['ENTREGADO', 'ENTREGADO', 'CONFIRMADO', 'PENDIENTE'];
  for (const [i, p] of prods.slice(0, 10).entries()) {
    const cant = 2 + (i * 3) % 7;
    const ped = (await pool.query('INSERT INTO pedidos (comprador_id, productor_id, estado) VALUES ($1,$2,$3) RETURNING id',
      [laura, p.productor_id, estados[i % 4]])).rows[0].id;
    await pool.query('INSERT INTO items_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1,$2,$3,$4)', [ped, p.id, cant, p.precio]);
    await pool.query('UPDATE productos SET stock = stock - $1 WHERE id=$2', [cant, p.id]);
  }
  console.log('Listo. Usuarios: don_ramon, dona_celsa, laura (demo1234) · admin (admin1234)');
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
