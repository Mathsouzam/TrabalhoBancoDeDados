
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { sql, poolPromise } = require('./db');
const path = require('path');
const app = express();
const port = 3000;

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'telas'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}));

app.get('/', (req, res) => {
  if (req.session.loggedin) {
    res.render('index.html');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', (req, res) => {
  res.render('login.html', { message: null });
});

app.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Usuario', sql.NVarChar(50), usuario)
      .input('Senha', sql.NVarChar(255), senha)
      .execute('ValidarLogin');

    if (result.recordset.length > 0) {
      req.session.loggedin = true;
      req.session.usuario = result.recordset[0].Usuario;
      res.redirect('/');
    } else {
      res.render('login.html', { message: 'Usuário ou senha inválidos.' });
    }
  } catch (err) {
    console.error('Erro ao validar login:', err);
    res.status(500).send('Erro ao validar login');
  }
});

app.get('/consulta', (req, res) => {
  if (req.session.loggedin) {
    res.render('consulta.html', { data: null });
  } else {
    res.redirect('/login');
  }
});

app.post('/query', async (req, res) => {
  const numTabela = parseInt(req.body.numTabela, 10);
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('NumTabela', sql.Int, numTabela)
      .execute('ListagemTabelas');
    res.render('consulta.html', { data: result.recordset });
  } catch (err) {
    console.error('Erro ao executar a stored procedure:', err);
    res.status(500).send('Erro ao executar a stored procedure');
  }
});

app.get('/cadastroFornecedor', async (req, res) => {
  if (req.session.loggedin) {
    try {
      const pool = await poolPromise;
      const result = await pool.request().execute('ListarCidades');
      res.render('cadastroFornecedor.html', { message: null, cidades: result.recordset });
    } catch (err) {
      console.error('Erro ao buscar cidades:', err);
      res.status(500).send('Erro ao buscar cidades');
    }
  } else {
    res.redirect('/login');
  }
});

app.post('/inserirFornecedor', async (req, res) => {
  const { Logradouro, CNPJ, Telefone, FKCidade, Nome } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('Logradouro', sql.VarChar, Logradouro)
      .input('CNPJ', sql.VarChar, CNPJ)
      .input('Telefone', sql.VarChar, Telefone)
      .input('FKCidade', sql.Int, FKCidade)
      .input('Nome', sql.VarChar, Nome)
      .execute('InserirFornecedor');
    const result = await pool.request().execute('ListarCidades');
    res.render('cadastroFornecedor.html', { message: 'Fornecedor cadastrado com sucesso!', cidades: result.recordset });
  } catch (err) {
    console.error('Erro ao executar a stored procedure:', err);
    res.status(500).send('Erro ao executar a stored procedure');
  }
});

app.get('/relatoriosGerenciais', async (req, res) => {
  if (req.session.loggedin) {
    try {
      const pool = await poolPromise;
      const fornecedorCidade = await pool.request().execute('ListarFornecedorProduto');
      const consumoSetor = await pool.request().execute('ListarConsumo');
      const menorValor = await pool.request().execute('ListarMenorValor');
      res.render('relatoriosGerenciais.html', {
        fornecedorCidade: fornecedorCidade.recordset,
        consumoSetor: consumoSetor.recordset,
        menorValor: menorValor.recordset
      });
    } catch (err) {
      console.error('Erro ao buscar registros gerais:', err);
      console.error('Detalhes do erro:', err);
      res.status(500).send('Erro ao buscar registros gerais');
    }
  } else {
    res.redirect('/login');
  }
});

app.get('/realizarCompra', async (req, res) => {
  if (req.session.loggedin) {
    try {
      const pool = await poolPromise;
      const fornecedores = await pool.request().execute('ListarFornecedores');
      res.render('realizarCompra.html', { fornecedores: fornecedores.recordset, valorTotal: 0, message: null, fornecedorId: null });
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err);
      res.status(500).send('Erro ao buscar fornecedores');
    }
  } else {
    res.redirect('/login');
  }
});

app.post('/inserirCompra', async (req, res) => {
  const { fornecedorId, produtoNome, precoUnitario, quantidade } = req.body;
  try {
    const pool = await poolPromise;

    await pool.request()
      .input('FKFornecedor', sql.Int, fornecedorId)
      .input('Produto', sql.NVarChar(255), produtoNome)
      .input('Quantidade', sql.Int, quantidade)
      .input('ValorUnitario', sql.Decimal(18, 2), precoUnitario) 
      .execute('InserirCompraEProduto');
    const fornecedores = await pool.request().execute('ListarFornecedores');
    res.render('realizarCompra.html', { fornecedores: fornecedores.recordset, valorTotal: 0, message: 'Compra realizada com sucesso!', fornecedorId: null });
  } catch (err) {
    console.error('Erro ao realizar compra:', err);
    res.status(500).send('Erro ao realizar compra');
  }
});

app.get('/consumirProduto', async (req, res) => {
  if (req.session.loggedin) {
    try {
      const pool = await poolPromise;
      const produtos = await pool.request().execute('ListarProduto');
      const setores = await pool.request().execute('ListarSetor');
      res.render('consumirProduto.html', { produtos: produtos.recordset, setores: setores.recordset, message: null });
    } catch (err) {
      console.error('Erro ao buscar produtos e setores:', err);
      res.status(500).send('Erro ao buscar produtos e setores');
    }
  } else {
    res.redirect('/login');
  }
});

app.post('/inserirConsumo', async (req, res) => {
  const { produtoId, setorId, quantidade } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('FKProduto', sql.Int, produtoId)
      .input('FKSetor', sql.Int, setorId)
      .input('Quantidade', sql.Int, quantidade)
      .execute('InserirConsumo');
    const produtos = await pool.request().execute('ListarProduto');
    const setores = await pool.request().execute('ListarSetor');
    res.render('consumirProduto.html', { produtos: produtos.recordset, setores: setores.recordset, message: 'Consumo registrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao registrar consumo:', err);
    res.status(500).send('Erro ao registrar consumo');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});