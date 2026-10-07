// Canto de Hornero: UN proceso, UN despliegue, UNA base de datos.
const path = require('path');
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { csrfSync } = require('csrf-sync');
const { pool } = require('./db/pool');
const C = require('./constantes');
const { cargarUsuario } = require('./middlewares/auth');

const app = express();
const raiz = path.join(__dirname, '..');
const nm = (p) => path.join(raiz, 'node_modules', p);

// --- Capa de presentación (vistas EJS renderizadas en el servidor) ---
app.set('view engine', 'ejs');
app.set('views', path.join(raiz, 'views'));

// --- Archivos estáticos: hasta three.js lo sirve el mismo monolito ---
app.use(express.static(path.join(raiz, 'public')));
app.use('/vendor/three', express.static(nm('three/build')));
app.use('/vendor/three-addons', express.static(nm('three/examples/jsm')));
app.use('/fuentes/bricolage', express.static(nm('@fontsource-variable/bricolage-grotesque')));
app.use('/fuentes/public-sans', express.static(nm('@fontsource/public-sans')));

// Evidencia en vivo del monolito: mismo proceso (PID) atiende todo
app.use((req, res, next) => { res.locals.t0 = process.hrtime.bigint(); res.locals.pid = process.pid; next(); });
app.use(express.urlencoded({ extended: false }));
app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }), // sesiones en la MISMA base
  secret: process.env.SESSION_SECRET || 'dev',
  resave: false, saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8, sameSite: 'lax' },
}));

// Mensajes flash + datos comunes a todas las vistas
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || [];
  delete req.session.flash;
  req.flash = (tipo, texto) => { (req.session.flash ||= []).push({ tipo, texto }); };
  res.locals.C = C;
  res.locals.pesos = (n) => '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  res.locals.ruta = req.path;
  res.locals.carritoCantidad = Object.values(req.session.carrito || {}).reduce((a, b) => a + b, 0);
  next();
});
app.use(cargarUsuario);

// Protección CSRF: el token vive en la sesión (la misma Postgres) y viaja en un campo oculto de cada form POST.
// Va después de flash y cargarUsuario porque la página de error 403 usa esos datos para dibujar la cabecera.
const csrf = csrfSync({ getTokenFromRequest: (req) => req.body?._csrf, size: 32 });
app.use((req, res, next) => {
  // Recién al dibujar un formulario se genera el token: una página sin forms no crea sesión.
  res.locals.campoCsrf = () => `<input type="hidden" name="_csrf" value="${csrf.generateToken(req)}">`;
  next();
});
app.use(csrf.csrfSynchronisedProtection);

// --- Módulos internos: se llaman por código, no por red ---
app.use(require('./modulos/guia/rutas'));
app.use(require('./modulos/usuarios/rutas'));
app.use(require('./modulos/catalogo/rutas'));
app.use(require('./modulos/pedidos/rutas'));
app.use(require('./modulos/reportes/rutas'));

app.use((req, res) => res.status(404).render('error', { codigo: 404, mensaje: 'Esa página no existe.' }));
app.use((err, req, res, next) => {
  if (err.status !== 403) console.error(err);
  // Token CSRF ausente o vencido (por ejemplo, un formulario abierto antes de ingresar)
  if (err.code === 'EBADCSRFTOKEN') err = { status: 403, message: 'El formulario venció o no es válido. Volvé atrás, recargá la página y probá de nuevo.' };
  res.status(err.status || 500).render('error', { codigo: err.status || 500, mensaje: err.status ? err.message : 'Algo falló en el servidor.' });
});

module.exports = app;
