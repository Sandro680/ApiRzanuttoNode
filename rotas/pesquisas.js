const express = require("express");
const cors = require("cors");
const { ExecQueryAsync, asyncHandler } = require("../conffdb/conexao.js");

const rotaPesquisas = express.Router();
rotaPesquisas.use(express.json());
rotaPesquisas.use(cors());

// EMPRESA
rotaPesquisas.get('/pesqempresa', asyncHandler(async (req, res) => {

    let sql = `SELECT i.imb_imb_id idempresa, 
                      i.imb_imb_razaosocial||'-'||i.imb_imb_cgc empresa 
               FROM imb_imobiliaria i ORDER BY 1`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }    
}));

rotaPesquisas.get('/filial/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const sql = `SELECT 
    I.IMB_IMB_ID IDEMPRESA, I.IMB_IMB_RAZAOSOCIAL RAZAO_SOCIAL, I.IMB_IMB_CGC CNPJ, I.IMB_IMB_IE IE,
    I.IMB_IMB_ENDERECO ENDERECO, I.IMB_IMB_ENDERECONUMERO NUMERO, I.CEP_BAI_NOME BAIRRO, 
    (SELECT C.CD_NOME FROM CIDADES C WHERE C.CD_CODIGO = I.IMB_CIDADE) CIDADE, I.CEP_UF_SIGLA UF,
    COALESCE(I.IMB_IMB_TELEFONE1, null) TELEFONE, COALESCE(I.IMB_IMB_TELEFONE2, null) TELEFONE2
    FROM IMB_IMOBILIARIA I WHERE I.IMB_IMB_ID = ?`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [id], "R");   
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }    
}));

// VENDEDOR
rotaPesquisas.get('/pesqvendedor', asyncHandler(async (req, res) => {

    let sql = `SELECT v.vd_funcionario idvendedor, v.vd_nome FROM vendedores v ORDER BY 1`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// CLIENTE
rotaPesquisas.get('/pesqcliente', asyncHandler(async (req, res) => {

    let sql = `SELECT CL_CODIGO IDCLIENTE,
    CAST(CL_RAZAO_SOCIAL AS VARCHAR(60) CHARACTER SET WIN1252)||'-'||
    COALESCE(CAST(CL_CNPJ AS VARCHAR(18)),'')  CLIENTE
        FROM CLIENTES WHERE CL_STATUS = 'T' ORDER BY 2`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// EMPRESA E FUNCIONARIO PARA MOSTRAR NA TELA DE LISTA DE PEDIDO
rotaPesquisas.get('/pesqempfunc/:fu_codigo', asyncHandler(async (req, res) => {
    const { fu_codigo } = req.params;
    
    let sql = `SELECT FIRST 1 I.IMB_IMB_RAZAOSOCIAL EMPRESA, I.IMB_IMB_CGC CNPJEMPRESA,
                    (SELECT COALESCE(F.FU_NOME, 'SEM NOME') 
                    FROM FUNCIONARIOS F WHERE F.FU_CODIGO = ?) NOMEUSUARIO
                FROM IMB_IMOBILIARIA I`;
    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [fu_codigo], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// FORMA PGTO
rotaPesquisas.get('/pesqformapagto', asyncHandler(async (req, res) => {
    
    let sql = `SELECT D.FIN_TPD_ID, D.FIN_TPD_DESCRICAO
                FROM FIN_TIPODOCUMENTO D
                ORDER BY 1`;
    
    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// TABELA DE PREÇO
rotaPesquisas.get('/pesqtabelapr', asyncHandler(async (req, res) => {
    
    let sql = `SELECT TPR_CODIGO, TPR_DESCRICAO, TPR_VALOR, TPR_TIPO, TPR_PADRAO
    FROM TABELA_PRECO T
    ORDER BY 1`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// PRAZOS
rotaPesquisas.get('/pesqprazopagto', asyncHandler(async (req, res) => {
   
    let sql = `SELECT PZ.PZC_CODIGO, PZ.PZC_DESCRICAO
    FROM PRAZOS_COMPRAS PZ
    ORDER BY 1`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// PRAZO PARCELAS
rotaPesquisas.get('/prazoparcelas/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    let sql = `SELECT * FROM PRAZOS_COMPRAS_PARCELAS PZ 
               WHERE PZ.PRC_PRAZO_COMPRAS = ?
               ORDER BY PZ.PRC_DIA`;

    try {    
        const result = await ExecQueryAsync(req.dbOptions, sql, [id], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

//TRANSPORTADORAS
rotaPesquisas.get('/pesqtransportadora', asyncHandler(async (req, res) => {
    
    let sql = `SELECT CL_CODIGO, CL_RAZAO_SOCIAL
    FROM CLIENTES C
    WHERE C.CL_TIPO_TRANSPORTADOR = 'T'
    ORDER BY 1`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// PESQUISA PRODUTO
rotaPesquisas.get('/pesqproduto', asyncHandler(async (req, res) => {
    let pesquisa = req.query.pesquisa || ""; // parâmetro vindo da query string
    pesquisa = pesquisa.trim();

    let sql = `SELECT P.PD_CODIGO, CAST(P.PD_DESCRICAO AS VARCHAR(120) CHARACTER SET WIN1252) DESCRICAO, 
    CAST(P.PD_REFERENCIA AS VARCHAR(20) CHARACTER SET WIN1252) REFERENCIA, P.PD_PRECO_VISTA, 
        U.UN_CODIGO, U.UN_SIGLA 
        FROM PRODUTOS P
        INNER JOIN UNIDADES U ON (U.UN_PRODUTO = P.PD_CODIGO)
        WHERE P.PD_STATUS = 'T'
          AND (P.PD_CODIGO CONTAINING ? OR 
               UPPER(TRIM(P.PD_DESCRICAO)) CONTAINING ? OR 
               UPPER(TRIM(P.PD_REFERENCIA)) CONTAINING ?) 
        ORDER BY 2`;

    const params = [pesquisa, pesquisa.toUpperCase(), pesquisa.toUpperCase()];
    try {       
        const result = await ExecQueryAsync(req.dbOptions, sql, params, "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

module.exports = { rotaPesquisas }
