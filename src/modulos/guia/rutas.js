// Portada 3D + guía de la exposición: viven DENTRO del monolito que explican.
const r = require('express').Router();
const { pulso } = require('../reportes/servicio'); // llamada directa entre módulos: sin red, sin API
const { PARTES, PASOS } = require('./pasos');

r.get('/', async (req, res) => res.render('guia/portada', { pulso: await pulso() }));
r.get('/arquitectura', async (req, res) => res.render('guia/arquitectura', { pulso: await pulso(), PARTES, PASOS }));
r.get('/arquitectura/pulso', async (req, res) => res.json({ ...(await pulso()), pid: process.pid }));
module.exports = r;
