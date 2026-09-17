const express = require("express");
const cors = require("cors");
const { ExecQueryAsync, asyncHandler } = require("../conffdb/conexao.js");

const rotaCidades = express.Router();
rotaCidades.use(express.json());
rotaCidades.use(cors());

// LISTA
rotaCidades.get('/cidades', asyncHandler(async (req, res) => {    
    let filtro = [];
    let sql = `
        SELECT cd_codigo,
               CAST(cd_nome AS VARCHAR(50) CHARACTER SET WIN1252) cd_nome,
               codigo_ibge,
               cd_uf,
               cd_pais
        FROM cidades 
        WHERE cd_nome IS NOT NULL AND cd_nome <> ''
    `;

    if (req.query.descricao) {
        sql += ` AND cd_nome CONTAINING ?`;
        filtro.push(req.query.descricao);
    }

    sql += ` ORDER BY cd_nome`;

    const result = await ExecQueryAsync(req.dbOptions, sql, filtro, "R");
    res.json(result);
}));

// INSERT
rotaCidades.post('/cidades', asyncHandler(async (req, res) => {
    const sql = `
        INSERT INTO cidades (
            cd_codigo, cd_regiao, cd_nome, codigo_ibge, cd_uf, cd_pais, cd_atualizacao, cd_disponibilidade
        ) VALUES (
            gen_id(gen_cidades, 1), 1, ?, ?, ?, 1058, CURRENT_DATE, NULL
        )
        RETURNING CD_CODIGO
    `;

    const result = await ExecQueryAsync(req.dbOptions, sql, [
        req.body.cd_nome, 
        req.body.codigo_ibge, 
        req.body.cd_uf
    ], "T");

    res.status(201).json({ cd_codigo: result.CD_CODIGO });
}));

// UPDATE
rotaCidades.put('/cidades/:cd_codigo', asyncHandler(async (req, res) => {
    const { cd_codigo } = req.params;
    const sql = `
        UPDATE cidades SET 
            cd_nome = ?, 
            codigo_ibge = ?, 
            cd_uf = ?, 
            cd_pais = ?, 
            cd_atualizacao = ?, 
            cd_disponibilidade = ?
        WHERE cd_codigo = ?
    `;

    const params = [
        req.body.cd_nome, req.body.codigo_ibge, req.body.cd_uf, 
        req.body.cd_pais, req.body.cd_atualizacao, req.body.cd_disponibilidade, cd_codigo
    ];

    await ExecQueryAsync(req.dbOptions, sql, params, "T");
    res.status(200).json({ message: `Cidade ${cd_codigo} atualizada com sucesso!` });
}));

// DELETE
rotaCidades.delete('/cidades/:cd_codigo', asyncHandler(async (req, res) => {
    const { cd_codigo } = req.params;
    const sql = `
        DELETE FROM cidades 
        WHERE cd_codigo = ? 
        RETURNING CD_CODIGO
    `;

    const result = await ExecQueryAsync(req.dbOptions, [sql], [cd_codigo], "T");

    if (result.length === 0) {
        return res.status(404).json({ erro: "Cidade não encontrada" });
    }

    res.status(200).json({ 
        message: `Cidade (código ${result.CD_CODIGO}) deletada com sucesso!` 
    });
}));

module.exports = { rotaCidades }
