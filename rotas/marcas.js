const express = require("express");
const cors = require("cors");
const { ExecQueryAsync, asyncHandler } = require("../conffdb/conexao.js");

const rotaMarcas = express.Router();
rotaMarcas.use(express.json());
rotaMarcas.use(cors())

            //SELECT                
rotaMarcas.get('/marcas', asyncHandler(async (req, res) => {    
    let filtro = [];
    let sql = `select m.mar_codigo, CAST(m.mar_descricao AS VARCHAR(30) CHARACTER SET WIN1252) mar_descricao 
    from produto_marca m where 1=1 order by 2`; 

    if (req.query.descricao) {
        sql += "and mar_descricao containing ?";
        filtro.push(req.query.descricao);
    }

    const result = await ExecQueryAsync(req.dbOptions, sql, filtro, "R");
    res.json(result);
}));


            //INSERT        
rotaMarcas.post('/marcas', asyncHandler(async (req, res) => {

    const sql = `insert into produto_marca (mar_codigo, mar_descricao) 
                               values(gen_id(gen_produto_marca, 1), ?) RETURNING MAR_CODIGO`;

    const result = await ExecQueryAsync(req.dbOptions, sql, [req.body.mar_descricao], "T");
    res.status(201).json({ mar_codigo: result.MAR_CODIGO });
}));
            //UPDATE
rotaMarcas.put('/marcas/:mar_codigo', asyncHandler(async (req, res) => {
    const { mar_codigo } = req.params;
    const sql = `update produto_marca set mar_descricao = ? where mar_codigo = ?`;                     
    
    await ExecQueryAsync(req.dbOptions, sql, [req.params.mar_descricao, mar_codigo], "T");
    res.status(200).json({ message: `Marca ${mar_codigo} atualizada com sucesso!` });
}));

            //DELETE
rotaMarcas.delete('/marcas/:mar_codigo', asyncHandler(async (req, res) => {
    const { mar_codigo } = req.params;
    const sql = `delete from produto_marca where mar_codigo = ?`;

    const result = await ExecQueryAsync(req.dbOptions, sql, [mar_codigo], "T");

    if (result.length === 0) 
        return res.status(404).json({ erro: "Marca não encontrada" });
    
    res.status(200).json({ message: `Marca (código ${mar_codigo}) deletada com sucesso!` });
}));    

module.exports = { rotaMarcas }