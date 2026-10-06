const r = require('express').Router();
const s = require('./servicio');
const { requiereRol } = require('../../middlewares/auth');
const { ErrorNegocio } = require('../../errores');

r.get('/productos', async (req, res) => {
  const filtros = { q: req.query.q || '', categoria: req.query.categoria || '', localidad: req.query.localidad || '' };
  res.render('catalogo/lista', { productos: await s.listarPublicos(filtros), categorias: await s.categorias(), f: filtros });
});

r.get('/productos/:id', async (req, res) => {
  const p = await s.obtener(req.params.id);
  if (!p || !p.activo) throw new ErrorNegocio('Ese producto no está disponible.', 404);
  res.render('catalogo/detalle', { p });
});

const soloProductor = requiereRol('PRODUCTOR');
r.get('/panel/productos', soloProductor, async (req, res) =>
  res.render('catalogo/mis_productos', { productos: await s.delProductor(req.usuario.id) }));

const form = async (res, d, errores = {}) => res.render('catalogo/form', { d, errores, categorias: await s.categorias() });
r.get('/panel/productos/nuevo', soloProductor, (req, res) => form(res, { unidad: 'kg', stock: 0, activo: true }));
r.get('/panel/productos/:id/editar', soloProductor, async (req, res) => form(res, await s.propio(req.usuario.id, req.params.id)));

const guardar = async (req, res) => {
  const id = req.params.id ? Number(req.params.id) : null;
  const { errores } = await s.guardar(req.usuario.id, id, req.body);
  if (errores) { res.status(422); return form(res, { ...req.body, id, activo: req.body.activo === 'on' }, errores); }
  req.flash('ok', 'Producto guardado.');
  res.redirect('/panel/productos');
};
r.post('/panel/productos/nuevo', soloProductor, guardar);
r.post('/panel/productos/:id/editar', soloProductor, guardar);

r.post('/panel/productos/:id/borrar', soloProductor, async (req, res) => {
  const r2 = await s.borrar(req.usuario.id, Number(req.params.id));
  req.flash('ok', r2 === 'oculto' ? 'Tiene ventas registradas: lo ocultamos del catálogo en lugar de borrarlo.' : 'Producto eliminado.');
  res.redirect('/panel/productos');
});

module.exports = r;
