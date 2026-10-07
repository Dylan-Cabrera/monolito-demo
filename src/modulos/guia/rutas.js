// Portada 3D + guía de la exposición: viven DENTRO del monolito que explican.
const r = require('express').Router();
const { pulso } = require('../reportes/servicio'); // llamada directa entre módulos: sin red, sin API
const { PARTES, PASOS } = require('./pasos');

// La presentación no muestra la navegación de la app: se entra recién desde el último paso de la guía.
const presentacion = (req, res, next) => { res.locals.modo = 'presentacion'; next(); };

r.get('/', presentacion, async (req, res) => res.render('guia/portada', { pulso: await pulso() }));
r.get('/arquitectura', presentacion, async (req, res) => res.render('guia/arquitectura', { pulso: await pulso(), PARTES, PASOS }));
r.get('/arquitectura/pulso', async (req, res) => res.json({ ...(await pulso()), pid: process.pid }));
module.exports = r;
