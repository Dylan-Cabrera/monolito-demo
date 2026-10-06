const { Pool, types } = require('pg');
types.setTypeParser(1700, Number); // NUMERIC → number
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ejecuta fn dentro de una transacción: todo o nada
async function transaccion(fn) {
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const r = await fn(cli);
    await cli.query('COMMIT');
    return r;
  } catch (e) {
    await cli.query('ROLLBACK');
    throw e;
  } finally {
    cli.release();
  }
}
module.exports = { pool, transaccion };
