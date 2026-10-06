const r = require('express').Router();
const s = require('./servicio');
const { requiereLogin, requiereRol } = require('../../middlewares/auth');

r.get('/carrito', async (req, res) => res.render('pedidos/carrito', await s.lineasCarrito(req.session.carrito)));

r.post('/carrito/agregar/:id', async (req, res) => {
  try {
    req.session.carrito = await s.agregarAlCarrito(req.session.carrito || {}, Number(req.params.id), req.body.cantidad);
    req.flash('ok', 'Agregado al carrito.');
  } catch (e) { if (e.status !== 400) throw e; req.flash('error', e.message); }
  res.redirect(req.body.volver === 'carrito' ? '/carrito' : (req.get('Referer') || '/productos'));
});

r.post('/carrito/quitar/:id', (req, res) => {
  delete (req.session.carrito || {})[req.params.id];
  res.redirect('/carrito');
});

r.post('/carrito/confirmar', requiereLogin, async (req, res) => {
  try {
    const ids = await s.confirmar(req.usuario.id, req.session.carrito, req.body);
    req.session.carrito = {};
    req.flash('ok', ids.length > 1 ? `Se generaron ${ids.length} pedidos, uno por productor.` : '¡Pedido enviado! El productor te va a confirmar.');
    res.redirect('/mis-compras');
  } catch (e) {
    if (e.status !== 400) throw e;
    req.flash('error', e.message);
    res.redirect('/carrito');
  }
});

r.get('/mis-compras', requiereLogin, async (req, res) => res.render('pedidos/compras', { pedidos: await s.compras(req.usuario.id) }));
r.get('/panel/ventas', requiereRol('PRODUCTOR'), async (req, res) => res.render('pedidos/ventas', { pedidos: await s.ventas(req.usuario.id) }));

r.post('/pedidos/:id/estado', requiereLogin, async (req, res) => {
  let destino = '/mis-compras';
  try {
    const { esProductor } = await s.cambiarEstado(Number(req.params.id), req.usuario, req.body.estado);
    if (esProductor) destino = '/panel/ventas';
    req.flash('ok', `Pedido #${req.params.id} actualizado.`);
  } catch (e) {
    if (e.status === 404 || e.status === 403) throw e;
    req.flash('error', e.message);
    if (req.usuario.rol === 'PRODUCTOR') destino = '/panel/ventas';
  }
  res.redirect(destino);
});

module.exports = r;
