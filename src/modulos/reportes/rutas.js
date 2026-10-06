const r = require('express').Router();
const s = require('./servicio');
const { requiereRol } = require('../../middlewares/auth');

r.get('/panel/resumen', requiereRol('PRODUCTOR'), async (req, res) => res.render('reportes/resumen', await s.resumenProductor(req.usuario.id)));
r.get('/tablero', requiereRol('ADMIN'), async (req, res) => res.render('reportes/tablero', await s.tablero()));
module.exports = r;
