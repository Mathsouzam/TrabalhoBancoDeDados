const sql = require('mssql');

const config = {
  user: 'admin',
  password: '12345678',
  server: 'tpindustria.cn4g2oe0m8qg.us-east-2.rds.amazonaws.com', 
  database: 'TPindustria',
  options: {
    encrypt: true, 
    trustServerCertificate: true 
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Conectado ao banco de dados com sucesso!');
    return pool;
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
    throw err;
  });

module.exports = {
  sql, poolPromise
};