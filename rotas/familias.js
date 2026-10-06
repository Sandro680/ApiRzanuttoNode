const express = require("express");
const cors = require("cors");
const { ExecQueryAsync, asyncHandler } = require("../conffdb/conexao.js");

const rotaFamilias = express.Router();
rotaFamilias.use(express.json());
rotaFamilias.use(cors())

            //SELECT                
rotaFamilias.get('/familias', asyncHandler(async (req, res) => {    
    let filtro = [];
    let sql = `select f.fm_codigo, CAST(f.fm_nome AS VARCHAR(40) CHARACTER SET WIN1252) fm_nome 
    from familias f where 1=1 order by 2 `; 

    if (req.query.nome) {
        sql += "and fm_descricao containing ?";
        filtro.push(req.query.nome);
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


            //INSERT        
rotaFamilias.post('/familias', asyncHandler(async (req, res) => {

    const sql = `insert into familias (fm_codigo, fm_nome) "+
                                values(gen_id(gen_familias, 1), ?) RETURNING FM_CODIGO`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [req.body.fm_nome], "T");
        res.status(201).json({ fm_codigo: result.FM_CODIGO });    
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }            
}));
            //UPDATE
rotaFamilias.put('/familias/:fm_codigo', asyncHandler(async (req, res) => {
    const { fm_codigo } = req.params;
    const sql = `update familias set fm_nome = ? where fm_codigo = ?`;                     
        
    try {
        await ExecQueryAsync(req.dbOptions, sql, [req.params.fm_nome, fm_codigo], "T");
        res.status(200).json({ message: `Familia ${cd_codigo} atualizada com sucesso!` });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }                
}));

            //DELETE
rotaFamilias.delete('/familias/:fm_codigo', asyncHandler(async (req, res) => {
    const { fm_codigo } = req.params;
    const sql = `delete from familias where fm_codigo = ?`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [fm_codigo], "T");

        if (result.length === 0) 
            return res.status(404).json({ erro: "Familia não encontrada" });
        
        res.status(200).json({ message: `Família (código ${fm_codigo}) deletada com sucesso!` });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }            
}));    

module.exports = { rotaFamilias }