
const { sql, poolPromise } = require('./db');

async function runQuery() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Fornecedor');
    console.log('Resultados da consulta:', result.recordset);
  } catch (err) {
    console.error('Erro ao executar a consulta:', err);
  } finally {
    sql.close();
  }
}

runQuery();