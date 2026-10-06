const express = require("express");
const cors = require("cors");
const { ExecQueryAsync, asyncHandler } = require("../conffdb/conexao.js");

const rotaGenerica = express.Router();
rotaGenerica.use(express.json());
rotaGenerica.use(cors());

// SELECT
rotaGenerica.get('/tabela', asyncHandler(async (req, res) => {
    let filtro = [];
    let sql = `SELECT id, nome, CAST(descricao AS VARCHAR(150) CHARACTER SET WIN1252) descricao 
               FROM tabela 
               WHERE nome IS NOT NULL AND nome <> ''`;

    if (req.query.nome) {
        sql += " AND nome containing ?";
        filtro.push(req.query.nome);
    }

    sql += " ORDER BY nome";

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, filtro, "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }            
}));

// INSERT
rotaGenerica.post('/tabela', asyncHandler(async (req, res) => {
    const sql = `INSERT INTO tabela (id, nome, descricao) 
                 VALUES (gen_id(gen_tabela, 1), ?, ?) 
                 RETURNING ID`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [
            req.body.nome, req.body.descricao
        ], "T");

        res.status(201).json({ id: result.ID });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }            
}));

// UPDATE
rotaGenerica.put('/tabela/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const sql = `UPDATE tabela 
                 SET nome = ?, descricao = ? 
                 WHERE id = ?`;

    try {
        await ExecQueryAsync(req.dbOptions, sql, [
            req.body.nome, req.body.descricao, id
        ], "T");

        res.json({ message: `Registro ${id} atualizado com sucesso!` });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }                
}));

// DELETE
rotaGenerica.delete('/tabela/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM tabela WHERE id = ? RETURNING ID`;
    
    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [id], "T");

        if (result.length === 0) 
            return res.status(404).json({ erro: "Registro não encontrado" });

        res.json({ message: `Registro (ID ${result.ID}) deletado com sucesso!` });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }                    
}));

module.exports = { rotaGenerica }
