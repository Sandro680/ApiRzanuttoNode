const express = require("express");
const cors = require("cors");
const { ExecQueryAsync, asyncHandler } = require("../conffdb/conexao.js");

const rotaClientes = express.Router();
rotaClientes.use(express.json());
rotaClientes.use(cors());

// LISTA
rotaClientes.get('/clientes', asyncHandler(async (req, res) => {    
    let filtro = [];
    let sql = ``;

    if (req.query.razaosocial || req.query.cnpj) {
        sql = `
            SELECT cl.cl_codigo,
                   cl.cl_cnpj,
                   CAST(cl.cl_razao_social AS VARCHAR(60) CHARACTER SET WIN1252) cl_razao_social,
                   cl.cl_telefone
            FROM clientes cl
            WHERE (cl.cl_tipo_cliente = 'T' AND cl.cl_status = 'T')
              AND (cl.cl_razao_social CONTAINING ? OR
                   REPLACE(REPLACE(REPLACE(cl.cl_cnpj,'.',''),'/',''),'-','') CONTAINING ?)
            ORDER BY cl_razao_social
        `;
        filtro.push(req.query.razaosocial, req.query.cnpj);
    } else {
        sql = `
            SELECT FIRST 100 cl.cl_codigo,
                   cl.cl_cnpj,
                   CAST(cl.cl_razao_social AS VARCHAR(60) CHARACTER SET WIN1252) cl_razao_social,
                   cl.cl_telefone
            FROM clientes cl
            WHERE cl.cl_tipo_cliente = 'T' AND cl.cl_status = 'T'
            ORDER BY 1 DESC
        `;
    }    

    const result = await ExecQueryAsync(req.dbOptions, sql, filtro, "R");
    res.json(result);
}));

// DETALHE
rotaClientes.get('/cliente/:cl_codigo', asyncHandler(async (req, res) => {
    const { cl_codigo } = req.params;
    const sql = `
        SELECT cl.cl_codigo,
               cl.cl_cidade,
               (SELECT CAST(cd.cd_nome AS VARCHAR(50) CHARACTER SET WIN1252)
                  FROM cidades cd WHERE cd.cd_codigo = cl.cl_cidade) cidade,
               cl.cl_cnpj,
               CAST(cl.cl_razao_social AS VARCHAR(60) CHARACTER SET WIN1252) cl_razao_social,
               CAST(cl.cl_nome_fantasia AS VARCHAR(60) CHARACTER SET WIN1252) cl_nome_fantasia,
               cl.cl_inscricao_estadual,
               CAST(cl.cl_endereco AS VARCHAR(100) CHARACTER SET WIN1252) cl_endereco,
               CAST(cl.cl_endereco_compl AS VARCHAR(100) CHARACTER SET WIN1252) cl_endereco_compl,
               cl.cl_endereco_numero,
               cl.cl_cep,
               CAST(cl.cl_endereco_bairro AS VARCHAR(60) CHARACTER SET WIN1252) cl_endereco_bairro,
               cl.cl_telefone,
               cl.cl_email,
               cl.cl_status
        FROM clientes cl
        WHERE cl.cl_codigo = ?
    `;

    const result = await ExecQueryAsync(req.dbOptions, sql, [cl_codigo], "R");

    if (result.length === 0) {
        return res.status(404).json({ erro: "Cliente não encontrado" });
    }

    res.json(result);
}));

// INSERT
rotaClientes.post('/cliente', asyncHandler(async (req, res) => {
    const sql = `
        INSERT INTO clientes (
            cl_codigo, cl_status, cl_cidade, cl_cnpj, cl_razao_social,
            cl_nome_fantasia, cl_inscricao_estadual, cl_endereco,
            cl_endereco_compl, cl_endereco_numero, cl_cep,
            cl_endereco_bairro, cl_telefone, cl_email
        )
        VALUES (gen_id(gen_clientes, 1), 'T', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING CL_CODIGO
    `;

    const params = [
        req.body.cl_cidade, req.body.cl_cnpj, req.body.cl_razao_social,
        req.body.cl_nome_fantasia, req.body.cl_inscricao_estadual,
        req.body.cl_endereco, req.body.cl_endereco_compl, req.body.cl_endereco_numero,
        req.body.cl_cep, req.body.cl_endereco_bairro, req.body.cl_telefone, req.body.cl_email
    ];

    const result = await ExecQueryAsync(req.dbOptions, sql, params, "T");
    res.status(201).json({ cl_codigo: result.CL_CODIGO });
}));

// UPDATE
rotaClientes.put('/cliente/:cl_codigo', asyncHandler(async (req, res) => {
    const { cl_codigo } = req.params;
    const sql = `
        UPDATE clientes SET
            cl_cidade = ?, cl_cnpj = ?, cl_razao_social = ?, cl_nome_fantasia = ?,
            cl_inscricao_estadual = ?, cl_status = 'T', cl_endereco = ?, cl_endereco_compl = ?,
            cl_endereco_numero = ?, cl_cep = ?, cl_endereco_bairro = ?, cl_telefone = ?, cl_email = ?
        WHERE cl_codigo = ?
    `;

    const params = [
        req.body.cl_cidade, req.body.cl_cnpj, req.body.cl_razao_social,
        req.body.cl_nome_fantasia, req.body.cl_inscricao_estadual,
        req.body.cl_endereco, req.body.cl_endereco_compl, req.body.cl_endereco_numero,
        req.body.cl_cep, req.body.cl_endereco_bairro, req.body.cl_telefone,
        req.body.cl_email, cl_codigo
    ];

    await ExecQueryAsync(req.dbOptions, sql, params, "T");
    res.status(200).json({ message: `Cliente ${cl_codigo} atualizado com sucesso!` });
}));

// DELETE
rotaClientes.delete('/cliente/:cl_codigo', asyncHandler(async (req, res) => {
    const { cl_codigo } = req.params;
    const sql = `DELETE FROM clientes WHERE cl_codigo = ? RETURNING CL_CODIGO`;

    const result = await ExecQueryAsync(req.dbOptions, sql, [cl_codigo], "T");

    if (result.length === 0) {
        return res.status(404).json({ erro: "Cliente não encontrado" });
    }

    res.status(200).json({ 
        message: `Cliente (código ${result.CL_CODIGO}) deletado com sucesso!` 
    });
}));

module.exports = { rotaClientes }
