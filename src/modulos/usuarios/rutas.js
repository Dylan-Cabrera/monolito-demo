const r = require('express').Router();
const s = require('./servicio');

const destinoSeguro = (sig) => (sig && sig.startsWith('/') && !sig.startsWith('//') ? sig : '/productos');

r.get('/registro', (req, res) => res.render('usuarios/registro', { d: { rol: 'COMPRADOR' }, errores: {} }));
r.post('/registro', async (req, res) => {
  const { id, errores } = await s.registrar(req.body);
  if (errores) return res.status(422).render('usuarios/registro', { d: req.body, errores });
  req.session.usuarioId = id;
  req.flash('ok', '¡Bienvenido a Mercado Chacarero!');
  res.redirect(req.body.rol === 'PRODUCTOR' ? '/panel/productos' : '/productos');
});

r.get('/ingresar', (req, res) => res.render('usuarios/ingresar', { sig: req.query.sig || '', error: null }));
r.post('/ingresar', async (req, res) => {
  const id = await s.autenticar(req.body.usuario, req.body.clave);
  if (!id) return res.status(401).render('usuarios/ingresar', { sig: req.body.sig, error: 'Usuario o clave incorrectos.' });
  const carrito = req.session.carrito; // conservar el carrito armado antes de ingresar
  req.session.regenerate((err) => {
    if (err) throw err;
    req.session.usuarioId = id;
    req.session.carrito = carrito;
    res.redirect(destinoSeguro(req.body.sig));
  });
});

r.post('/salir', (req, res) => req.session.destroy(() => res.redirect('/')));
module.exports = r;
