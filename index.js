const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { ExecQueryAsync, getPoolStats, logPoolStats } = require("./conffdb/conexao.js");
const { errorHandler } = require("./error_handler.js");
const { getConfig, getLocalIP, getServerPath } = require("./conflocal.js");
const path = require("path");
const Table = require("cli-table3");
const chalk = require("chalk");

// Importação das rotas
const { rotaClientes }   = require("./rotas/clientes.js");
const { rotaCidades }    = require("./rotas/cidades.js");
const { rotaProdutos }   = require("./rotas/produtos.js"); 
const { rotaFamilias }   = require("./rotas/familias.js");
const { rotaMarcas }     = require("./rotas/marcas.js"); 
const { rotaNCM }        = require("./rotas/ncm.js");  
const { rotaPedidos }    = require("./rotas/pedidos.js");
const { rotaPesquisas }  = require('./rotas/pesquisas.js');
const { rotaNotaFiscal } = require('./rotas/notafiscal.js')

// Definição do Driver do Firebird conforme o Sistema Operacional
if (process.platform === "win32") {
    process.env.FIREBIRD_CLIENT = path.join(process.execPath, "..", "fbclient.dll");
    console.log(` Ambiente: Windows. Carregando fbclient.dll`);
} else if (process.platform === "linux") {
    process.env.FIREBIRD_CLIENT = path.join(__dirname, "libfbclient.so");
    console.log(`Ambiente: Linux. Carregando libfbclient.so`);
}

const app = express();
const SECRET = "segredo-super-seguro";

// --------------------------------------------------------------------------
// CARREGAMENTO DINÂMICO DOS DADOS VIA INI (Garante segurança e portabilidade)
// --------------------------------------------------------------------------
let ipBD = getConfig('ip') || "127.0.0.1"; 
let caminhoBD = getConfig('caminho'); 
let senhaBD = getConfig('senha') || "masterkey";

// CONFIGURAÇÃO SEGUIDA: O seu MASTER.FDB de testes SEMPRE será local no seu Windows
let ipDBMAster = "127.0.0.1"; 
let senhaBDMaster = "masterkey"; // Senha do seu MASTER local do Windows
let caminhoBDmaster = `${getServerPath()}/data/MASTER.FDB`;

// Se o 'caminho' não estiver definido no INI, assume a pasta padrão 'data' do Windows
if (!caminhoBD) {
    caminhoBD = `${getServerPath()}/data/`;
}

app.use(express.json());
app.use(cors());

// --------------------------------------------------------------------------
// ROTA PARA SERVIR ARQUIVOS ESTÁTICOS (imagens)
// --------------------------------------------------------------------------
app.use('/logos', express.static(path.join(process.cwd(), 'logos')));

// --------------------------------------------------------------------------
// 1. ROTA DE LOGIN (Valida localmente no seu computador)
// --------------------------------------------------------------------------
app.post("/login", async (req, res) => {
    const { usuario, senha } = req.body;

    const dbMaster = {        
        host: ipDBMAster,
        port: 3050,
        database: caminhoBDmaster,
        user: 'SYSDBA',
        password: senhaBDMaster,
        role: 'NONE'
    };

    const sql = `SELECT NOME_BANCO, IDUSUARIO, IDTENANT, IDEMPRESA
                 FROM USUARIOS_MASTER 
                 WHERE LOGIN = ? AND SENHA = ? AND STATUS = 'A'`;

    try {
        const result = await ExecQueryAsync(dbMaster, sql, [usuario, senha], "R");
        console.log("Resultado da query:", result);


        if (result.length === 0) {
            return res.status(401).json({ error: "Usuário ou senha inválidos" });
        }

        const dados = result[0];

        if (!dados.NOME_BANCO) {
            return res.status(500).json({ error: "Usuário não possui banco associado." });
        }    

        const token = jwt.sign({
            usuario,
            db: dados.NOME_BANCO,       // usado hoje (single-tenant)
            tenant_id: dados.IDTENANT,  // preparado para multi-tenant
            empresa_id: dados.IDEMPRESA // preparado para multi-CNPJs
        }, SECRET, { expiresIn: "24h" });

        res.json({ 
            token,
            nomeBanco: dados.NOME_BANCO,
            idUsuario: dados.IDUSUARIO,
            pathBD: `${caminhoBD}${dados.NOME_BANCO}.FDB` 
        });
    } catch (err) {
        res.status(500).json({ 
            error: `Erro interno no servidor de banco: ${err.message}` 
        });
    }
});

// --------------------------------------------------------------------------
// 2. MIDDLEWARE DE AUTENTICAÇÃO
// --------------------------------------------------------------------------
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Token não fornecido" });

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token expirado ou inválido" });
        req.user = user;
        next();
    });
}

// --------------------------------------------------------------------------
// 3. MIDDLEWARE PARA BANCO DINÂMICO
// --------------------------------------------------------------------------
function bancoDinamico(req, res, next) {
    const nomeBanco = req.user.db; // vem do token

    if (!nomeBanco) {
        return res.status(400).send("Banco não definido no token.");
    }

    const databasePath = `${caminhoBD}${nomeBanco.toUpperCase()}.FDB`;

    req.dbOptions = {
        host: ipBD,
        port: 3050,
        database: databasePath,
        user: 'SYSDBA',
        password: senhaBD,
        lowercase_keys: false,
        charset: 'WIN1252',
        role: 'NONE'
    };

    next();
}

// --------------------------------------------------------------------------
// 4. ROTAS PROTEGIDAS
// --------------------------------------------------------------------------
app.use('/', autenticarToken, bancoDinamico, rotaClientes);
app.use('/', autenticarToken, bancoDinamico, rotaCidades);
app.use('/', autenticarToken, bancoDinamico, rotaProdutos);
app.use('/', autenticarToken, bancoDinamico, rotaFamilias);
app.use('/', autenticarToken, bancoDinamico, rotaMarcas);
app.use('/', autenticarToken, bancoDinamico, rotaNCM);
app.use('/', autenticarToken, bancoDinamico, rotaPedidos);
app.use('/', autenticarToken, bancoDinamico, rotaPesquisas);
app.use('/', autenticarToken, bancoDinamico, rotaNotaFiscal);

// --------------------------------------------------------------------------
// 5. ROTAS DE ADMINISTRAÇÃO
// --------------------------------------------------------------------------
app.get("/admin/pools", (req, res) => {
    res.json(getPoolStats());
});

app.get("/admin/logpools", (req, res) => {
    logPoolStats();
    res.send("Estatísticas logadas no console.");
});

// --------------------------------------------------------------------------
// 6. MIDDLEWARE DE ERROS
// --------------------------------------------------------------------------
app.use(errorHandler);

// --------------------------------------------------------------------------
// 7. SERVIDOR
// --------------------------------------------------------------------------
const PORT = 3000;

app.listen(PORT, '0.0.0.0', () => {
    const table = new Table({
        colWidths: [60], // largura fixa da coluna
        wordWrap: true   // quebra automática se passar do limite
    });

    // adiciona as linhas
    table.push(
        [chalk.green("API Node-Firebird rodando na porta "+PORT+"\nAcessível em: http://"+getLocalIP()+":"+PORT)],
        [chalk.yellow(`Path MASTER: ${caminhoBDmaster}`)],
        [chalk.magenta.bold(`Path BD: ${caminhoBD}`)]
    );

    console.log(table.toString());
});

// --------------------------------------------------------------------------
// 8. TRATADORES GLOBAIS DE ERRO
// --------------------------------------------------------------------------
process.on("uncaughtException", (err) => {
    console.error("Erro não tratado:", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Rejeição não tratada:", reason);
});


/*app.post("/login", async (req, res) => {
    const { usuario, senha } = req.body;

    const dbMaster = {        
        host: ipDBMAster,
        port: 3050,
        database: caminhoBDmaster,
        user: 'SYSDBA',
        password: senhaBDMaster,
        role: 'NONE'
    };

    const sql = `SELECT NOME_BANCO, IDUSUARIO
                 FROM USUARIOS_MASTER 
                 WHERE LOGIN = ? AND SENHA = ? AND STATUS = 'A'`;

    try {
        const result = await ExecQueryAsync(dbMaster, sql, [usuario, senha], "R");

        if (result.length === 0) {
            return res.status(401).json({ error: "Usuário ou senha inválidos" });
        }

        const dados = result[0];
        const token = jwt.sign({ usuario, db: dados.NOME_BANCO }, SECRET, { expiresIn: "24h" });

        res.json({ 
            token,
            nomeBanco: dados.NOME_BANCO,
            idUsuario: dados.IDUSUARIO,
            pathBD: `${caminhoBD}${dados.NOME_BANCO}.FDB` 
        });
    } catch (err) {
        res.status(500).json({ 
            error: `Erro interno no servidor de banco: ${err.message}` 
        });
    }
});

// --------------------------------------------------------------------------
// 2. MIDDLEWARE DE AUTENTICAÇÃO
// --------------------------------------------------------------------------
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Token não fornecido" });

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token expirado ou inválido" });
        req.user = user;
        next();
    });
}

// --------------------------------------------------------------------------
// 3. MIDDLEWARE PARA BANCO DINÂMICO (Formato Definitivo Remoto/Local)
// --------------------------------------------------------------------------
app.use((req, res, next) => {
    const nomeBanco = req.headers.database;

    if (!nomeBanco) {
        return res.status(400).send("Header 'database' não informado.");
    }

    // O caminho do banco deve ser estritamente o caminho físico interno do Linux
    const databasePath = `${caminhoBD}${nomeBanco.toUpperCase()}.FDB`;

    req.dbOptions = {
        host: ipBD,             // O IP do seu Linux vindo do INI (Ex: 200.155.203.62)
        port: 3050,             // Porta padrão
        database: databasePath, // Caminho puro do Linux (Ex: /opt/firebird/data/BANCODADOS.FDB)
        user: 'SYSDBA', 
        password: senhaBD,      // Senha do Linux vinda do INI
        lowercase_keys: false, 
        charset: 'WIN1252',
        role: 'NONE'            // Evita rejeição do subsistema de segurança do Linux 3.0
    };

    next();
});



// --------------------------------------------------------------------------
// 4. ROTAS PROTEGIDAS
// --------------------------------------------------------------------------
app.use('/', autenticarToken, rotaClientes);
app.use('/', autenticarToken, rotaCidades);
app.use('/', autenticarToken, rotaProdutos);
app.use('/', autenticarToken, rotaFamilias);
app.use('/', autenticarToken, rotaMarcas);
app.use('/', autenticarToken, rotaNCM);
app.use('/', autenticarToken, rotaPedidos);
app.use('/', autenticarToken, rotaPesquisas);
app.use('/', autenticarToken, rotaNotaFiscal);*/
