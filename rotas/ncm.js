const express = require("express");
const cors = require("cors");
const { ExecQueryAsync, asyncHandler } = require("../conffdb/conexao.js");

const rotaNCM = express.Router();
rotaNCM.use(express.json());
rotaNCM.use(cors())

            //GET
rotaNCM.get('/ncm', asyncHandler(async (req, res) => {
    const sql = `select replace(cf_ncm, '.', '') cf_ncm from classificacao_fiscal  
                 where cf_ncm is not null and cf_ncm <> '' order by 1 `;
    
    const result = await ExecQueryAsync(req.dbOptions, sql, [], "R");
    res.json(result);
}));
            //POST
rotaNCM.post('/ncm', asyncHandler(async (req, res) => {
    
    const sql = `insert into classificacao_fiscal (cf_ncm, cf_ncm_nf) "+
                                            values(?, ?) RETURNING CF_NCM`; 

    const result = await ExecQueryAsync(req.dbOptions, sql, [
        req.body.cf_ncm, req.body.cf_ncm_nf
    ], "T");

    res.status(201).json({ ncm_codigo: result.CF_NCM });
}));

module.exports = { rotaNCM }