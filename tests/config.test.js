// Guard de arranque: en producción no se levanta el monolito con un SESSION_SECRET débil.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');
const { validarSecreto } = require('../src/config');

const FUERTE = 'a'.repeat(64);

test('validarSecreto: en producción rechaza secretos vacíos, de ejemplo o cortos', () => {
  for (const s of [undefined, '', '   ', 'dev', 'cambiar-esto', 'a'.repeat(31)]) {
    assert.match(validarSecreto({ NODE_ENV: 'production', SESSION_SECRET: s }), /SESSION_SECRET/, `debería rechazar ${JSON.stringify(s)}`);
  }
  assert.equal(validarSecreto({ NODE_ENV: 'production', SESSION_SECRET: FUERTE }), null);
  assert.equal(validarSecreto({ NODE_ENV: 'production', SESSION_SECRET: 'a'.repeat(32) }), null);
});

test('validarSecreto: fuera de producción no exige nada', () => {
  assert.equal(validarSecreto({ SESSION_SECRET: 'dev' }), null);
  assert.equal(validarSecreto({ NODE_ENV: 'development' }), null);
});

test('server.js: en producción con secreto débil el proceso termina antes de escuchar', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '../src/server.js')], {
    env: { ...process.env, NODE_ENV: 'production', SESSION_SECRET: 'dev' },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /No se puede iniciar.*SESSION_SECRET/);
  assert.match(r.stderr, /openssl rand -hex 32/);
  assert.doesNotMatch(r.stdout, /localhost/); // nunca llegó a app.listen
});
