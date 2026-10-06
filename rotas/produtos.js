const express = require("express");
const cors = require("cors");
const { ExecQueryAsync, asyncHandler } = require("../conffdb/conexao.js");

const rotaProdutos = express.Router();
rotaProdutos.use(express.json());
rotaProdutos.use(cors());

// LISTA
rotaProdutos.get('/produtos', asyncHandler(async (req, res) => {    
    let filtro = [];
    let sql = ``;

    if (req.query.pesqdescr || req.query.pesqref) {
        sql = `
            SELECT p.pd_codigo,
                   CAST(p.pd_descricao AS VARCHAR(100) CHARACTER SET WIN1252) pd_descricao,
                   p.pd_referencia,
                   p.pd_lucro_vista,
                   p.pd_preco_vista,
                   p.pd_estoque,
                   p.pd_ncm,
                   pd_trib_cst
            FROM produtos p
            WHERE pd_status = 'T'
              AND (pd_descricao CONTAINING ? OR pd_referencia CONTAINING ?)
            ORDER BY pd_descricao
        `;
        filtro.push(req.query.pesqdescr, req.query.pesqref);
    } else {
        sql = `
            SELECT FIRST 100 p.pd_codigo,
                   CAST(p.pd_descricao AS VARCHAR(100) CHARACTER SET WIN1252) pd_descricao,
                   p.pd_referencia,
                   p.pd_lucro_vista,
                   p.pd_preco_vista,
                   p.pd_estoque,
                   p.pd_ncm,
                   pd_trib_cst
            FROM produtos p
            WHERE pd_status = 'T'
            ORDER BY 1 DESC
        `;
    }

    if (req.query.pd_preco_vista) {
        sql += ` AND pd_preco_vista >= ?`;
        filtro.push(req.query.pd_preco_vista);
    }    

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, filtro, "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// DETALHE
rotaProdutos.get('/produto/:pd_codigo', asyncHandler(async (req, res) => {    
    const { pd_codigo } = req.params;

    const sql = `
        SELECT p.pd_codigo,
               p.pd_familia,
               (SELECT CAST(fm_nome AS VARCHAR(40) CHARACTER SET WIN1252)
                  FROM familias WHERE fm_codigo = pd_familia) fm_nome,
               CAST(p.pd_descricao AS VARCHAR(100) CHARACTER SET WIN1252) pd_descricao,
               CAST(p.pd_detalhes AS VARCHAR(255) CHARACTER SET WIN1252) pd_detalhes,
               p.pd_referencia,
               p.pd_preco_compra,
               p.pd_lucro_vista,
               p.pd_preco_vista,
               p.pd_estoque,
               p.pd_estoque_minimo,
               p.pd_primeira_compra,
               (SELECT FIRST 1 ei.eni_custo_real
                  FROM entradas_itens ei
                 WHERE ei.eni_produto = p.pd_codigo
                   AND ei.eni_custo_real > 0
                 ORDER BY ei.eni_entrada DESC) ultimocusto,
               p.pd_status,
               p.pd_materiaprima,
               p.pd_pa,
               p.pd_ncm,
               p.pd_barras,
               p.prd_marca,
               (SELECT CAST(pm.mar_descricao AS VARCHAR(30) CHARACTER SET WIN1252)
                  FROM produto_marca pm WHERE pm.mar_codigo = p.prd_marca) mar_descricao,
               pd_trib_cst,
               p.pd_balanca,
               p.pd_localizacao,
               p.pd_controlaestoque,
               p.pd_data_cadastro
        FROM produtos p
        WHERE pd_codigo = ?
    `;

    try {            
        const result = await ExecQueryAsync(req.dbOptions, sql, [pd_codigo], "R");

        if (result.length === 0) {
            return res.status(404).json({ erro: "Produto não encontrado" });
        }

        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// INSERT
rotaProdutos.post('/produto', asyncHandler(async (req, res) => {
    const sql = `
        INSERT INTO produtos (
            pd_codigo, pd_data_cadastro, pd_atualizacao, pd_familia, pd_descricao,
            pd_referencia, pd_preco_compra, pd_lucro_vista, pd_preco_vista, pd_estoque,
            pd_estoque_minimo, pd_primeira_compra, pd_status, pd_materiaprima, pd_pa,
            pd_ncm, pd_barras, pd_trib_cst, prd_marca, pd_detalhes, pd_balanca,
            pd_localizacao, pd_controlaestoque
        )
        VALUES (gen_id(gen_produtos, 1), CURRENT_DATE, CURRENT_TIMESTAMP,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING PD_CODIGO
    `;

    const params = [
        req.body.pd_familia, req.body.pd_descricao, req.body.pd_referencia,
        req.body.pd_preco_compra, req.body.pd_lucro_vista, req.body.pd_preco_vista,
        req.body.pd_estoque, req.body.pd_estoque_minimo, req.body.pd_primeira_compra,
        req.body.pd_status, req.body.pd_materiaprima, req.body.pd_pa,
        req.body.pd_ncm, req.body.pd_barras, req.body.pd_trib_cst,
        req.body.prd_marca, req.body.pd_detalhes, req.body.pd_balanca,
        req.body.pd_localizacao, req.body.pd_controlaestoque
    ];

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, params, "T");
        res.status(201).json({ pd_codigo: result.PD_CODIGO });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// UPDATE
rotaProdutos.put('/produto/:pd_codigo', asyncHandler(async (req, res) => {
    const { pd_codigo } = req.params;

    const sql = `
        UPDATE produtos SET
            pd_familia = ?, pd_descricao = ?, pd_referencia = ?, pd_preco_compra = ?,
            pd_lucro_vista = ?, pd_preco_vista = ?, pd_estoque = ?, pd_estoque_minimo = ?,
            pd_primeira_compra = ?, pd_status = ?, pd_materiaprima = ?, pd_pa = ?, pd_ncm = ?,
            pd_atualizacao = CURRENT_TIMESTAMP, pd_barras = ?, pd_trib_cst = ?, prd_marca = ?,
            pd_detalhes = ?, pd_balanca = ?, pd_localizacao = ?, pd_controlaestoque = ?
        WHERE pd_codigo = ?
    `;

    const params = [
        req.body.pd_familia, req.body.pd_descricao, req.body.pd_referencia,
        req.body.pd_preco_compra, req.body.pd_lucro_vista, req.body.pd_preco_vista,
        req.body.pd_estoque, req.body.pd_estoque_minimo, req.body.pd_primeira_compra,
        req.body.pd_status, req.body.pd_materiaprima, req.body.pd_pa, req.body.pd_ncm,
        req.body.pd_barras, req.body.pd_trib_cst, req.body.prd_marca,
        req.body.pd_detalhes, req.body.pd_balanca, req.body.pd_localizacao,
        req.body.pd_controlaestoque, pd_codigo
    ];

    try {
        await ExecQueryAsync(req.dbOptions, sql, params, "T");
        res.status(200).json({ message: `Produto ${pd_codigo} atualizado com sucesso!` });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// DELETE
rotaProdutos.delete('/produto/:pd_codigo', asyncHandler(async (req, res) => {
    const { pd_codigo } = req.params;
    const sql = `DELETE FROM produtos WHERE pd_codigo = ? RETURNING PD_CODIGO`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [pd_codigo], "T");

        if (result.length === 0) {
            return res.status(404).json({ erro: "Produto não encontrado" });
        }

        res.status(200).json({ 
            message: `Produto (código ${result.PD_CODIGO}) deletado com sucesso!` 
        });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

module.exports = { rotaProdutos }
