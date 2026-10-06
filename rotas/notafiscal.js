const express = require("express");
const cors = require("cors");
const { ExecQueryAsync, ExecTransactionAsync, asyncHandler } = require("../conffdb/conexao.js");

const rotaNotaFiscal = express.Router();
rotaNotaFiscal.use(express.json());
rotaNotaFiscal.use(cors());

// SELECT
rotaNotaFiscal.get('/notafiscal', asyncHandler(async (req, res, next) => {
    let filtro = [];
    let sql = "";
    let pesquisa = "";

    if (req.query.nffilial) {
        pesquisa += " and nf.nf_empresa = ? ";
        filtro.push(req.query.nffilial); 
    }    
    if (req.query.nfnum1) {
        pesquisa += " and nf.nf_nota_fiscal >= ? ";
        filtro.push(req.query.nfnum1); 
    }    
    if (req.query.nfnum2) {
        pesquisa += " and nf.nf_nota_fiscal <= ? ";
        filtro.push(req.query.nfnum2); 
    }        
    if (req.query.nfserie) {
        pesquisa += " and nf.nf_serie = ? ";
        filtro.push(req.query.nfserie); 
    }  
    if (req.query.nfmodelo) {
        pesquisa += " and nf.nf_modelo = ? ";
        filtro.push(req.query.nfmodelo); 
    }        
    if (req.query.nfdestinatario) {
        pesquisa += " and nf.nf_destinatario = ? ";
        filtro.push(req.query.nfdestinatario)
    }    
    if (req.query.nfdata1) { 
        pesquisa += " and cast(nf.nf_data_emissao as date) >= ? "
        filtro.push(req.query.nfdata1);        
    }    
    if (req.query.nfdata2) { 
        pesquisa += " and cast(nf.nf_data_emissao as date) <= ? "
        filtro.push(req.query.nfdata2);        
    }    
   
    if (pesquisa != "") 
        sql += "SELECT "; 
    else 
        sql += "SELECT first 50 "

    sql += `NF.NF_EMPRESA,
            NF.NF_NOTA_FISCAL, 
            CASE 
            WHEN COALESCE(NF.NF_NOTA_FISCALNFSE,0) > 0 THEN 
                NF.NF_NOTA_FISCALNFSE 
            ELSE NF.NF_NOTA_FISCAL 
            END NUMERONFE, 
            NF.NF_MODELO, 
            NF.NF_SERIE, 
            NF.NF_DATA_EMISSAO, 
            NF.NF_CFOP, 
            NF.NF_TIPO_NF, 
            CL.CL_CNPJ, 
            CAST(CL.CL_RAZAO_SOCIAL AS VARCHAR(60) CHARACTER SET WIN1252) CL_RAZAO_SOCIAL, 
            CAST(CL.CL_NOME_FANTASIA AS VARCHAR(60) CHARACTER SET WIN1252) CL_NOME_FANTASIA, 
            NF.NF_BASE_ICMS, 
            NF.NF_VALOR_ICMS, 
            NF.NF_BASE_SUBSTIT, 
            NF.NF_ICMS_SUBSTIT, 
            NF.NF_FRETE, 
            NF.NF_SEGURO, 
            NF.NF_DESPESAS, 
            NF.NF_IPI, 
            NF.NF_TOTAL_PIS, 
            NF.NF_TOTAL_COFINS, 
            NF.NF_TOT_PRODUTOS, 
            NF.NF_TOTAL_NOTA, 
            NF.NF_CHAVE, 
            NF.NF_SITUACAO, 
            NF.FT_CODIGO, 
            NF.NF_TIPO_NOTA_FISCAL, 
            VD.VD_NOME, 
            NS.NFS_DESCRICAO, 
            FU.FU_NOME 
        FROM NOTA_FISCAL NF
        LEFT  JOIN CLIENTES CL           ON (NF.NF_DESTINATARIO = CL.CL_CODIGO)
        LEFT  JOIN TRANSPORTADORAS TR    ON (NF.NF_TRANSPORTADOR = TR.TR_CODIGO)
        LEFT  JOIN TIPO_NOTA_FISCAL TNF  ON (NF.NF_TIPO_NOTA_FISCAL = TNF.TN_CODIGO)
        LEFT  JOIN CIDADES CD            ON (CL.CL_CIDADE=CD.CD_CODIGO)
        LEFT  JOIN VENDEDORES VD         ON (VD.VD_FUNCIONARIO = NF.NF_VENDEDOR)
        LEFT  JOIN NOTA_FISCAL_STATUS NS ON (NS.NFS_CODIGO = NF.NF_SITUACAO)
        LEFT  JOIN FUNCIONARIOS FU       ON (FU.FU_CODIGO = NF.NF_USER)
        WHERE 1=1`;               
    
    if (pesquisa != "") sql += pesquisa;     

    sql += " ORDER BY NF_DATA_EMISSAO DESC";
    
    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, filtro, "R");        
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }
}));

module.exports = { rotaNotaFiscal }