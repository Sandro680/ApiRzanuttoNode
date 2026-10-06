const express = require("express");
const cors = require("cors");
const { ExecQueryAsync, ExecTransactionAsync, asyncHandler } = require("../conffdb/conexao.js");

const rotaPedidos = express.Router();
rotaPedidos.use(express.json());
rotaPedidos.use(cors());

// SELECT
rotaPedidos.get('/pedidos', asyncHandler(async (req, res, next) => {
    let filtro = [];
    let sql = "";
    let pesquisa = "";

    if (req.query.filial) {
        pesquisa += " and pv.pv_filial = ? ";
        filtro.push(req.query.filial); 
    }    
    if (req.query.idpedido) {
        pesquisa += " and pv.pv_codigo = ? ";
        filtro.push(req.query.idpedido); 
    }    
    if (req.query.idcliente) {
        pesquisa += " and pv.pv_cliente = ? ";
        filtro.push(req.query.idcliente)
    }    
    if (req.query.data1 && req.query.data2) { 
        pesquisa += " and cast(pv.pv_data as date) between cast(? as date) and cast(? as date) "
        filtro.push(req.query.data1, req.query.data2);
        //filtro.push(new Date(req.query.data1), new Date(req.query.data2));
    }    
    if (req.query.representante) {
        pesquisa += " and pv.vd_representante = ? ";
        filtro.push(req.query.representante); 
    }    
   
    if (pesquisa != "") 
        sql += "SELECT "; 
    else 
        sql += "SELECT first 50 "

    sql += `pv.pv_filial,
            pv.pv_codigo, 
            pv.pv_flag, 
            pv.pv_data, 
            pv.pv_cliente, 
            cast(clientes.cl_razao_social AS VARCHAR(60) CHARACTER SET WIN1252) cl_razao_social, 
            clientes.cl_cnpj, 
            (select vd2.fu_nome from funcionarios vd2 where vd2.fu_codigo=pv.pv_vendedor) vendedor, 
            (select vd3.fu_nome from funcionarios vd3 where vd3.fu_codigo=pv.vd_representante) representante, 
            pv.pv_valor_total, 
            pv.pv_desconto, 
            pv.pv_acrescimo, 
            pv.pv_FRETE, 
            pv.pv_total_geral, 
            prazos_compras.pzc_descricao, 
            cast(cidades.cd_nome AS VARCHAR(50) CHARACTER SET WIN1252) ||' - '||
            coalesce(cast(cidades.cd_uf AS VARCHAR(2) CHARACTER SET WIN1252),'') cidade, 
            pvd.pvd_descricao, 
            fin_tipodocumento.fin_tpd_descricao, 
            (select max(coalesce(ft.ft_documento,'0')) 
                from fat_pedidos fp 
                left join faturamento ft on (fp.fp_filial = ft.ft_filial and 
                                            fp.fp_faturamento = ft.ft_codigo and 
                                            fp.fp_flag = ft.ft_flag) 
                where fp.fp_filial = pv.pv_filial 
                and fp.fp_pedido = pv.pv_codigo) NF  
            ,pv.pv_forma_pagamento,
            pv.pv_prazo_pagamento,
            pv.pv_status, 
            pv.pv_cfop, 
            pv.pv_tabela, 
            pv.vd_representante, 
            pv.pv_observacao, 
            pv.pv_transportador,
            pv.pv_user    
        FROM pedidos_venda pv 
        left join pedidos_venda_status_cad psc on (pv.pv_status = psc.psd_codigo)
        left JOIN clientes ON (clientes.cl_codigo = pv.pv_cliente) 
        left  join pedidos_venda_documento pvd on (pvd.pvd_codigo = pv.pv_documento)
        left  join cidades on (clientes.cl_cidade = cidades.cd_codigo) 
        left  JOIN prazos_compras ON (prazos_compras.pzc_codigo = pv.pv_prazo_pagamento) 
        left  JOIN fin_tipodocumento ON (fin_tipodocumento.fin_tpd_id = pv.pv_forma_pagamento)
        WHERE pv.pv_status < 999  
        and pv.pv_documento <> 100 
        and psc.psd_rel_financeiro = 'T' 
        and not pv.pv_status = 5`;               
    
    if (pesquisa != "") sql += pesquisa;     

    sql += " ORDER BY 2 DESC";
    
    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, filtro, "R");        
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }
}));

rotaPedidos.get('/pedidoitens/:filial/:pedido', asyncHandler(async (req, res) => {
    const { filial, pedido } = req.params;
    let sql = `SELECT
                    I.PVI_FILIAL,       
                    I.PVI_CODIGO,       
                    I.PVI_PEDIDO,       
                    I.PVI_UNIDADE,
                    I.PVI_PRODUTO,
                    P.PD_REFERENCIA REFERENCIA,
                    U.UN_SIGLA UNSIGLA,
                    I.PVI_QUANTIDADE,
                    I.PVI_VALOR_UNITARIO,
                    I.PVI_VALOR_TOTAL,
                    I.PVI_LOCAL,
                    I.PVI_PRODUTO_DESCR,
                    I.PVI_DESCONTO,
                    I.PVI_ACRESCIMO,
                    I.PVI_ICMS_ST,
                    I.PVI_FRETE,
                    I.PVI_TOTAL_GERAL
            FROM PEDIDOS_VENDA_ITENS I
            INNER JOIN PRODUTOS P ON (P.PD_CODIGO = I.PVI_PRODUTO)
            INNER JOIN UNIDADES U ON (U.UN_CODIGO = I.PVI_UNIDADE)
            WHERE I.PVI_FILIAL = ?
              AND I.PVI_PEDIDO = ?`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [filial, pedido], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }    
}));

rotaPedidos.get('/pedidovenctos/:filial/:pedido', asyncHandler(async (req, res) => {
    const { filial, pedido } = req.params;
    let sql = `SELECT V.PVV_PARCELA, V.PVV_VENCIMENTO, V.PVV_VALOR
    FROM PEDIDOS_VENDA_VENCTOS V
    WHERE V.PVV_FILIAL = ?
      AND V.PVV_PEDIDO = ?`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, [filial, pedido], "R");
        res.json(result);
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }    
}));


// INSERT
rotaPedidos.post('/pedido', asyncHandler(async (req, res) => {
    // 1. Extrai o cabeçalho e a lista de itens do corpo da requisição
    const { 
        pv_filial, pv_cliente, pv_vendedor, pv_cotacao, pv_data, pv_valor_total,
        pv_faturamento, pv_prazo_pagamento, pv_status, pv_forma_pagamento, pv_fat_parcial,
        pv_data_faturamento, vd_representante, pv_observacao, pv_desconto, pv_atualizacao,
        pv_transportador, pv_frete, pv_cfop, pv_volumes, pv_peso_bruto, pv_cubicagem,
        pv_total_nota, pv_peso_liquido, pv_tipo, pv_displays, pv_margem,
        pv_comissao_vendedor, pv_comissao_representante, pv_comissao_vendedor_b,
        pv_comissao_representante_b, pv_tabela_preco, pv_acrescimo, pv_flag, pv_icms_st,
        pv_tipo_frete, pv_observ_nf, pv_codigo_unico, pv_qtde_itens, pv_caixa, pv_documento,
        pv_doc_origem, pv_doc_origem_num, pv_sit_estoque, pv_sit_financeiro, pv_doc_origem_emp,
        pv_cpf, pv_terminal, pv_consumidor, pv_consuend, pv_desc_percent, pv_sinc, id_site,
        pv_tabela, pv_user, pv_troco_caixa, itens, pvvenctos
    } = req.body;

    // 2. SQL do Cabeçalho
    const sqlCabecalho = `INSERT INTO PEDIDOS_VENDA
    (PV_FILIAL, PV_CODIGO, PV_CLIENTE, PV_VENDEDOR, PV_COTACAO, PV_DATA, PV_VALOR_TOTAL,
    PV_FATURAMENTO, PV_PRAZO_PAGAMENTO, PV_STATUS, PV_FORMA_PAGAMENTO, PV_FAT_PARCIAL,
    PV_DATA_FATURAMENTO, VD_REPRESENTANTE, PV_OBSERVACAO, PV_DESCONTO, PV_ATUALIZACAO,
    PV_TRANSPORTADOR, PV_FRETE, PV_CFOP, PV_VOLUMES, PV_PESO_BRUTO, PV_CUBICAGEM,
    PV_TOTAL_NOTA, PV_PESO_LIQUIDO, PV_TIPO, PV_DISPLAYS, PV_MARGEM,
    PV_COMISSAO_VENDEDOR, PV_COMISSAO_REPRESENTANTE, PV_COMISSAO_VENDEDOR_B,
    PV_COMISSAO_REPRESENTANTE_B, PV_TABELA_PRECO, PV_ACRESCIMO, PV_FLAG, PV_ICMS_ST,
    PV_TIPO_FRETE, PV_OBSERV_NF, PV_CODIGO_UNICO, PV_QTDE_ITENS, PV_CAIXA,
    PV_DOCUMENTO, PV_DOC_ORIGEM, PV_DOC_ORIGEM_NUM, PV_SIT_ESTOQUE, PV_SIT_FINANCEIRO,
    PV_DOC_ORIGEM_EMP, PV_CPF, PV_TERMINAL, PV_CONSUMIDOR, PV_CONSUEND,
    PV_DESC_PERCENT, PV_SINC, ID_SITE, PV_TABELA, PV_USER, PV_TROCO_CAIXA)
    VALUES (?,gen_id(GEN_PEDIDOS_VENDA, 1),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
    ,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    RETURNING PV_CODIGO`;

    const operacoes = [
        {
            sql: sqlCabecalho,
            params: [pv_filial, pv_cliente, pv_vendedor, pv_cotacao ?? 0, pv_data,
                pv_valor_total ?? 0.0, pv_faturamento ?? 100.00, pv_prazo_pagamento ?? 11,
                pv_status ?? 1, pv_forma_pagamento ?? 1, pv_fat_parcial ?? 'F',
                pv_data_faturamento ?? null, vd_representante ?? 0, pv_observacao ?? null,
                pv_desconto ?? 0.0, pv_atualizacao ?? null, pv_transportador ?? 0,
                pv_frete ?? 0.0, pv_cfop ?? null, pv_volumes ?? null, pv_peso_bruto ?? null,
                pv_cubicagem ?? null, pv_total_nota ?? null, pv_peso_liquido ?? null,
                pv_tipo ?? null, pv_displays ?? null, pv_margem ?? null, pv_comissao_vendedor ?? null,
                pv_comissao_representante ?? null, pv_comissao_vendedor_b ?? null,
                pv_comissao_representante_b ?? null, pv_tabela_preco ?? 1, pv_acrescimo ?? 0.0,
                pv_flag ?? 0, pv_icms_st ?? 0.0, pv_tipo_frete ?? 0, pv_observ_nf ?? null,
                pv_codigo_unico ?? null, pv_qtde_itens ?? null, pv_caixa ?? null, pv_documento ?? 2,
                pv_doc_origem ?? 1, pv_doc_origem_num ?? 1, pv_sit_estoque ?? 0, pv_sit_financeiro ?? 1,
                pv_doc_origem_emp ?? 1, pv_cpf ?? null, pv_terminal ?? '1', pv_consumidor ?? null,
                pv_consuend ?? null, pv_desc_percent ?? 0.0, pv_sinc ?? null, id_site ?? null,
                pv_tabela ?? 1, pv_user, pv_troco_caixa ?? null
            ]
        }
    ];

    let idPedidoSalvo = null;
    // 3. Mapeia os itens lendo as propriedades de cada 'item' da lista
    if (itens && itens.length > 0) {
        itens.forEach(item => {
            const sqlItem = `INSERT INTO PEDIDOS_VENDA_ITENS
            (PVI_FILIAL, PVI_CODIGO, PVI_PEDIDO, PVI_UNIDADE, PVI_PRODUTO, PVI_QUANTIDADE, PVI_ENTREGA,
            PVI_VALOR_UNITARIO, PVI_VALOR_TOTAL, PVI_STATUS, PVI_ATUALIZACAO, PVI_LOCAL,
            PVI_PRODUTO_DESCR, PVI_PRECO_COMPRA, PVI_DESCONTO, PVI_ACRESCIMO, PVI_ICMS_ST,
            PVI_FRETE, PVI_TABELA_PRECO, PVI_CODIGO_UNICO, PVI_DATA, PVI_DESC_PERCENT, PVI_TRIB_CST,
            PVI_TRIB_ORIGEM, PVI_OBS, PVI_VENDEDOR, PVI_VICMS, PVI_PICMS, PVI_PIS_STRIB,
            PVI_COFINS_STRIB, PVI_ALIQUOTA_PIS, PVI_ALIQUOTA_COFINS, PVI_USER, PVI_TOTAL_GERAL)
            VALUES (?,gen_id(GEN_PEDIDOS_VENDA_ITENS, 1),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
            ,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

            operacoes.push({
                sql: sqlItem,
                params: (resultadoAnterior) => {                                
                    if (resultadoAnterior) {
                        const dados = Array.isArray(resultadoAnterior) ? resultadoAnterior[0] : resultadoAnterior;
                        const idDescoberto = dados?.PV_CODIGO || dados?.pv_codigo;
                        if (idDescoberto) {
                            idPedidoSalvo = idDescoberto; // Guarda na variável externa
                        }
                    }
                    
                    if (!idPedidoSalvo) {
                        throw new Error("Não foi possível recuperar o ID gerado para o pedido.");
                    }

                    // Usa os dados específicos de cada objeto 'item' do loop
                    return [
                        item.pvi_filial ?? pv_filial, // Fallback para a filial do cabeçalho
                        idPedidoSalvo, // Vincula ao ID pai retornado do banco
                        item.pvi_unidade,
                        item.pvi_produto,
                        item.pvi_quantidade ?? 0.0,
                        item.pvi_entrega ?? 0.0,
                        item.pvi_valor_unitario ?? 0.0,
                        item.pvi_valor_total ?? 0.0,
                        item.pvi_status ?? 0,
                        item.pvi_atualizacao ?? '',
                        item.pvi_local ?? 1,
                        item.pvi_produto_descr ?? '',
                        item.pvi_preco_compra ?? 0.0,
                        item.pvi_desconto ?? 0.0,
                        item.pvi_acrescimo ?? 0.0,
                        item.pvi_icms_st ?? 0.0,
                        item.pvi_frete ?? 0.0,
                        item.pvi_tabela_preco ?? 1,
                        item.pvi_codigo_unico ?? '',
                        item.pvi_data ?? '',
                        item.pvi_desc_percent ?? 0.0,
                        item.pvi_trib_cst ?? null,
                        item.pvi_trib_origem ?? 0,
                        item.pvi_obs ?? null,
                        item.pvi_vendedor ?? 0,
                        item.pvi_vicms ?? 0.0,
                        item.pvi_picms ?? 0.0,
                        item.pvi_pis_strib ?? null,
                        item.pvi_cofins_strib ?? null,
                        item.pvi_aliquota_pis ?? 0.0,
                        item.pvi_aliquota_cofins ?? 0.0,
                        item.pvi_user ?? pv_user, // Fallback para o usuário do cabeçalho se não houver no item
                        item.pvi_total_geral ?? 0.0
                    ];
                }
            });
        });//final foreach itens
    }//final if itens

    if (pvvenctos && pvvenctos.length > 0) {
        pvvenctos.forEach(parcela => {
            const sqlParcela = `INSERT INTO PEDIDOS_VENDA_VENCTOS
            (PVV_FILIAL, PVV_PEDIDO, PVV_PARCELA, PVV_VENCIMENTO, PVV_VALOR,
            PVV_TIPO_PAGAMENTO, PVV_CODIGO_UNICO, PVV_BOL_ID, PVV_BOL_NOSSONUMERO)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
            operacoes.push({
                sql: sqlParcela,
                params: () => {
                    if (!idPedidoSalvo) {
                        throw new Error("Não foi possível recuperar o ID do pedido para vincular as parcelas.");
                    }
                    return [
                        pv_filial,
                        idPedidoSalvo,
                        parcela.pvv_parcela,
                        parcela.pvv_vencimento,
                        parcela.pvv_valor,
                        parcela.pvv_tipo_pagamento,
                        parcela.pvv_codigo_unico ?? null,
                        parcela.pvv_bol_id ?? null,
                        parcela.pvv_bol_nossonumero ?? null
                    ];
                }
            });
        });
    }
    
    try {
        await ExecTransactionAsync(req.dbOptions, operacoes);

        res.status(201).json({ 
            status: "Sucesso", 
            mensagem: "Pedido e itens gravados com sucesso!" 
        });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }    
}));

//UPDATE
rotaPedidos.put('/pedido/:filial/:pedido', asyncHandler(async (req, res) => {
    const { filial, pedido } = req.params; // ID do pedido vindo da URL

    // 1. Extrai os dados do corpo da requisição (incluindo itens_removidos)
    const { 
        pv_filial, pv_cliente, pv_vendedor, pv_cotacao, pv_data, pv_valor_total,
        pv_faturamento, pv_prazo_pagamento, pv_status, pv_forma_pagamento, pv_fat_parcial,
        pv_data_faturamento, vd_representante, pv_observacao, pv_desconto, pv_atualizacao,
        pv_transportador, pv_frete, pv_cfop, pv_volumes, pv_peso_bruto, pv_cubicagem,
        pv_total_nota, pv_peso_liquido, pv_tipo, pv_displays, pv_margem,
        pv_comissao_vendedor, pv_comissao_representante, pv_comissao_vendedor_b,
        pv_comissao_representante_b, pv_tabela_preco, pv_acrescimo, pv_flag, pv_icms_st,
        pv_tipo_frete, pv_observ_nf, pv_codigo_unico, pv_qtde_itens, pv_caixa, pv_documento,
        pv_doc_origem, pv_doc_origem_num, pv_sit_estoque, pv_sit_financeiro, pv_doc_origem_emp,
        pv_cpf, pv_terminal, pv_consumidor, pv_consuend, pv_desc_percent, pv_sinc, id_site,
        pv_tabela, pv_user, pv_troco_caixa, 
        itens, itens_removidos, pvvenctos 
    } = req.body;

    // 2. SQL de Update da Capa (Dispara triggers de alteração do cabeçalho)
    const sqlUpdateCapa = `UPDATE PEDIDOS_VENDA SET 
        PV_CLIENTE=?, PV_VENDEDOR=?, PV_COTACAO=?, PV_DATA=?, PV_VALOR_TOTAL=?,
        PV_FATURAMENTO=?, PV_PRAZO_PAGAMENTO=?, PV_STATUS=?, PV_FORMA_PAGAMENTO=?, PV_FAT_PARCIAL=?,
        PV_DATA_FATURAMENTO=?, VD_REPRESENTANTE=?, PV_OBSERVACAO=?, PV_DESCONTO=?, PV_ATUALIZACAO=?,
        PV_TRANSPORTADOR=?, PV_FRETE=?, PV_CFOP=?, PV_VOLUMES=?, PV_PESO_BRUTO=?, PV_CUBICAGEM=?,
        PV_TOTAL_NOTA=?, PV_PESO_LIQUIDO=?, PV_TIPO=?, PV_DISPLAYS=?, PV_MARGEM=?,
        PV_COMISSAO_VENDEDOR=?, PV_COMISSAO_REPRESENTANTE=?, PV_COMISSAO_VENDEDOR_B=?,
        PV_COMISSAO_REPRESENTANTE_B=?, PV_TABELA_PRECO=?, PV_ACRESCIMO=?, PV_FLAG=?, PV_ICMS_ST=?,
        PV_TIPO_FRETE=?, PV_OBSERV_NF=?, PV_CODIGO_UNICO=?, PV_QTDE_ITENS=?, PV_CAIXA=?,
        PV_DOCUMENTO=?, PV_DOC_ORIGEM=?, PV_DOC_ORIGEM_NUM=?, PV_SIT_ESTOQUE=?, PV_SIT_FINANCEIRO=?,
        PV_DOC_ORIGEM_EMP=?, PV_CPF=?, PV_TERMINAL=?, PV_CONSUMIDOR=?, PV_CONSUEND=?,
        PV_DESC_PERCENT=?, PV_SINC=?, ID_SITE=?, PV_TABELA=?, PV_USER=?, PV_TROCO_CAIXA=?
        WHERE PV_FILIAL = ? AND PV_CODIGO = ?`;

    const operacoes = [
        {
            sql: sqlUpdateCapa,
            params: [
                pv_cliente, pv_vendedor, pv_cotacao ?? 0, pv_data, pv_valor_total ?? 0.0,
                pv_faturamento ?? 100.00, pv_prazo_pagamento ?? 11, pv_status ?? 1, pv_forma_pagamento ?? 1,
                pv_fat_parcial ?? 'F', pv_data_faturamento ?? null, vd_representante ?? 0, pv_observacao ?? null,
                pv_desconto ?? 0.0, pv_atualizacao ?? null, pv_transportador ?? 0, pv_frete ?? 0.0,
                pv_cfop ?? null, pv_volumes ?? null, pv_peso_bruto ?? null, pv_cubicagem ?? null,
                pv_total_nota ?? null, pv_peso_liquido ?? null, pv_tipo ?? null, pv_displays ?? null,
                pv_margem ?? null, pv_comissao_vendedor ?? null, pv_comissao_representante ?? null,
                pv_comissao_vendedor_b ?? null, pv_comissao_representante_b ?? null, pv_tabela_preco ?? 1,
                pv_acrescimo ?? 0.0, pv_flag ?? 1, pv_icms_st ?? 0.0, pv_tipo_frete ?? 0, pv_observ_nf ?? null,
                pv_codigo_unico ?? null, pv_qtde_itens ?? null, pv_caixa ?? null, pv_documento ?? 2,
                pv_doc_origem ?? 1, pv_doc_origem_num ?? 1, pv_sit_estoque ?? 0, pv_sit_financeiro ?? 1,
                pv_doc_origem_emp ?? 1, pv_cpf ?? null, pv_terminal ?? '1', pv_consumidor ?? null,
                pv_consuend ?? null, pv_desc_percent ?? 0.0, pv_sinc ?? null, id_site ?? null,
                pv_tabela ?? 1, pv_user, pv_troco_caixa ?? null,
                filial, pedido
            ]
        }
    ];

    // 3. Deleta itens que foram removidos no Android (Dispara triggers de retorno de estoque)
    if (itens_removidos && itens_removidos.length > 0) {
        itens_removidos.forEach(item => {
            operacoes.push({
                sql: `DELETE FROM PEDIDOS_VENDA_ITENS WHERE PVI_FILIAL = ? AND PVI_CODIGO = ? AND PVI_PEDIDO = ?`,
                params: [item.pvi_filial, item.pvi_codigo, pedido]
            });
        });
    }

    // 4. Processa os itens atuais (Insert ou Update)
    if (itens && itens.length > 0) {
        itens.forEach(item => {
            if (item.pvi_codigo > 0) {
                // UPDATE em item existente (Dispara trigger de ajuste de estoque)
                const sqlUpdateItem = `UPDATE PEDIDOS_VENDA_ITENS SET 
                    PVI_UNIDADE=?, PVI_PRODUTO=?, PVI_QUANTIDADE=?, PVI_ENTREGA=?,
                    PVI_VALOR_UNITARIO=?, PVI_VALOR_TOTAL=?, PVI_STATUS=?, PVI_ATUALIZACAO=?, PVI_LOCAL=?,
                    PVI_PRODUTO_DESCR=?, PVI_PRECO_COMPRA=?, PVI_DESCONTO=?, PVI_ACRESCIMO=?, PVI_ICMS_ST=?,
                    PVI_FRETE=?, PVI_TABELA_PRECO=?, PVI_CODIGO_UNICO=?, PVI_DATA=?, PVI_DESC_PERCENT=?, 
                    PVI_TRIB_CST=?, PVI_TRIB_ORIGEM=?, PVI_OBS=?, PVI_VENDEDOR=?, PVI_VICMS=?, PVI_PICMS=?, 
                    PVI_PIS_STRIB=?, PVI_COFINS_STRIB=?, PVI_ALIQUOTA_PIS=?, PVI_ALIQUOTA_COFINS=?, 
                    PVI_USER=?, PVI_TOTAL_GERAL=?
                    WHERE PVI_FILIAL = ? AND PVI_CODIGO = ? AND PVI_PEDIDO = ?`;

                operacoes.push({
                    sql: sqlUpdateItem,
                    params: [
                        item.pvi_unidade, item.pvi_produto, item.pvi_quantidade ?? 0.0, item.pvi_entrega ?? 0.0,
                        item.pvi_valor_unitario ?? 0.0, item.pvi_valor_total ?? 0.0, item.pvi_status ?? 0,
                        item.pvi_atualizacao ?? '', item.pvi_local ?? 1, item.pvi_produto_descr ?? '',
                        item.pvi_preco_compra ?? 0.0, item.pvi_desconto ?? 0.0, item.pvi_acrescimo ?? 0.0,
                        item.pvi_icms_st ?? 0.0, item.pvi_frete ?? 0.0, item.pvi_tabela_preco ?? 1,
                        item.pvi_codigo_unico ?? '', item.pvi_data ?? '', item.pvi_desc_percent ?? 0.0,
                        item.pvi_trib_cst ?? null, item.pvi_trib_origem ?? 0, item.pvi_obs ?? null,
                        item.pvi_vendedor ?? 0, item.pvi_vicms ?? 0.0, item.pvi_picms ?? 0.0,
                        item.pvi_pis_strib ?? null, item.pvi_cofins_strib ?? null, item.pvi_aliquota_pis ?? 0.0,
                        item.pvi_aliquota_cofins ?? 0.0, item.pvi_user ?? pv_user, item.pvi_total_geral ?? 0.0,
                        item.pvi_filial, item.pvi_codigo, pedido
                    ]
                });
            } else {
                // INSERT em item novo (Dispara trigger de saída de estoque)
                const sqlInsertItem = `INSERT INTO PEDIDOS_VENDA_ITENS
                    (PVI_FILIAL, PVI_CODIGO, PVI_PEDIDO, PVI_UNIDADE, PVI_PRODUTO, PVI_QUANTIDADE, PVI_ENTREGA,
                    PVI_VALOR_UNITARIO, PVI_VALOR_TOTAL, PVI_STATUS, PVI_ATUALIZACAO, PVI_LOCAL,
                    PVI_PRODUTO_DESCR, PVI_PRECO_COMPRA, PVI_DESCONTO, PVI_ACRESCIMO, PVI_ICMS_ST,
                    PVI_FRETE, PVI_TABELA_PRECO, PVI_CODIGO_UNICO, PVI_DATA, PVI_DESC_PERCENT, PVI_TRIB_CST,
                    PVI_TRIB_ORIGEM, PVI_OBS, PVI_VENDEDOR, PVI_VICMS, PVI_PICMS, PVI_PIS_STRIB,
                    PVI_COFINS_STRIB, PVI_ALIQUOTA_PIS, PVI_ALIQUOTA_COFINS, PVI_USER, PVI_TOTAL_GERAL)
                    VALUES (?,gen_id(GEN_PEDIDOS_VENDA_ITENS, 1),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

                operacoes.push({
                    sql: sqlInsertItem,
                    params: [
                        item.pvi_filial ?? pv_filial, pedido, item.pvi_unidade, item.pvi_produto,
                        item.pvi_quantidade ?? 0.0, item.pvi_entrega ?? 0.0, item.pvi_valor_unitario ?? 0.0,
                        item.pvi_valor_total ?? 0.0, item.pvi_status ?? 0, item.pvi_atualizacao ?? '',
                        item.pvi_local ?? 1, item.pvi_produto_descr ?? '', item.pvi_preco_compra ?? 0.0,
                        item.pvi_desconto ?? 0.0, item.pvi_acrescimo ?? 0.0, item.pvi_icms_st ?? 0.0,
                        item.pvi_frete ?? 0.0, item.pvi_tabela_preco ?? 1, item.pvi_codigo_unico ?? '',
                        item.pvi_data ?? '', item.pvi_desc_percent ?? 0.0, item.pvi_trib_cst ?? null,
                        item.pvi_trib_origem ?? 0, item.pvi_obs ?? null, item.pvi_vendedor ?? 0,
                        item.pvi_vicms ?? 0.0, item.pvi_picms ?? 0.0, item.pvi_pis_strib ?? null,
                        item.pvi_cofins_strib ?? null, item.pvi_aliquota_pis ?? 0.0,
                        item.pvi_aliquota_cofins ?? 0.0, item.pvi_user ?? pv_user, item.pvi_total_geral ?? 0.0
                    ]
                });
            }
        });
    }

    // 5. Atualiza Vencimentos (Substituição Total)
    // Primeiro remove todos os antigos do pedido
    operacoes.push({
        sql: `DELETE FROM PEDIDOS_VENDA_VENCTOS WHERE PVV_FILIAL = ? AND PVV_PEDIDO = ?`,
        params: [filial, pedido]
    });

    // Depois insere os novos
    if (pvvenctos && pvvenctos.length > 0) {
        pvvenctos.forEach(parcela => {
            operacoes.push({
                sql: `INSERT INTO PEDIDOS_VENDA_VENCTOS
                    (PVV_FILIAL, PVV_PEDIDO, PVV_PARCELA, PVV_VENCIMENTO, PVV_VALOR,
                    PVV_TIPO_PAGAMENTO, PVV_CODIGO_UNICO, PVV_BOL_ID, PVV_BOL_NOSSONUMERO)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params: [
                    filial, pedido, parcela.pvv_parcela, parcela.pvv_vencimento, parcela.pvv_valor,
                    parcela.pvv_tipo_pagamento, parcela.pvv_codigo_unico ?? null,
                    parcela.pvv_bol_id ?? null, parcela.pvv_bol_nossonumero ?? null
                ]
            });
        });
    }    

    try {
        // Executa tudo em uma única transação atômica
        await ExecTransactionAsync(req.dbOptions, operacoes);

        res.status(200).json({ 
            status: "Sucesso", 
            mensagem: "Pedido atualizado com sucesso!" 
        });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }        
}));

// FATURA COM NOTA E SEM NOTA
rotaPedidos.post('/pedido/faturar', asyncHandler(async (req, res) => {
    const { pv_filial, pv_codigo, tipo, pv_cfop, pv_transportador, pv_user } = req.body;

    if (tipo === 'SEM_NOTA') {
        const sql = `EXECUTE PROCEDURE SPGERAFATURAMENTOF01(?, ?)`;
        try {
            await ExecTransactionAsync(req.dbOptions, [
                { sql, params: [pv_filial, pv_codigo] }
            ]);
            return res.json({ 
                sucesso: true, 
                mensagem: "Pedido faturado sem nota com sucesso!" 
            });
        } catch (err) {
            console.error("Erro no faturamento sem nota:", err.message);
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: "Erro ao faturar: " + err.message 
            });
        }
    } else if (tipo === 'NFE') {
        if (!pv_cfop) {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: "Selecione um CFOP / Tipo de Nota para faturar com NFe" 
            });
        }

        const iTipo = 1; // Tipo de faturamento para NFe
        const iTransp = pv_transportador || 0;
        const nIdUsuario = pv_user || 1;

        try {
            const queries = [
                // 1. SP_GERAR_FATURAMENTO
                { sql: `SELECT CODIGO FROM SP_GERAR_FATURAMENTO(?, ?)`, params: [pv_filial, iTipo] },

                // 2. FAT_PEDIDOS (usa o CODIGO retornado da query anterior)
                { sql: `
                    UPDATE OR INSERT INTO FAT_PEDIDOS (FP_FILIAL, FP_FATURAMENTO, FP_FLAG, FP_PEDIDO)
                    VALUES (?, ?, ?, ?)
                    MATCHING (FP_FILIAL, FP_FATURAMENTO, FP_FLAG, FP_PEDIDO)
                  `,
                  params: (resFat) => [pv_filial, resFat[0].CODIGO, iTipo, pv_codigo] },

                // 3. SP_GERAR_ITENS_FATURAMENTO
                { sql: `EXECUTE PROCEDURE SP_GERAR_ITENS_FATURAMENTO(?, ?)`,
                  params: (resFat) => [resFat[0].CODIGO, pv_filial] },

                // 4. SP_GERAR_VENCTOS_FATURAMENTO
                { sql: `EXECUTE PROCEDURE SP_GERAR_VENCTOS_FATURAMENTO(?, ?)`,
                  params: (resFat) => [resFat[0].CODIGO, pv_filial] },

                // 5. SP_NF_GERAR
                { sql: `EXECUTE PROCEDURE SP_NF_GERAR(?, ?, ?, ?, ?)`,
                  params: (resFat) => [resFat[0].CODIGO, pv_cfop, iTransp, pv_filial, nIdUsuario] },

                // 6. SP_FINALIZAR_FATURAMENTO
                { sql: `EXECUTE PROCEDURE SP_FINALIZAR_FATURAMENTO(?, ?)`,
                  params: (resFat) => [resFat[0].CODIGO, pv_filial] }
            ];

            const lastResult = await ExecTransactionAsync(req.dbOptions, queries);
            const iFaturamento = lastResult[0]?.CODIGO || lastResult[0]?.codigo;

            return res.json({ 
                sucesso: true, 
                mensagem: "NFe gerada com sucesso!",
                faturamento: iFaturamento 
            });
        } catch (err) {
            console.error("Erro no faturamento NFe:", err.message);
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: "Erro ao gerar NFe: " + err.message 
            });
        }
    } else {
        return res.status(400).json({ mensagem: "Tipo de faturamento não implementado" });
    }


    /*if (tipo === 'SEM_NOTA') {
        const sql = `EXECUTE PROCEDURE SPGERAFATURAMENTOF01(?, ?)`;
        try {
            await ExecQueryAsync(req.dbOptions, sql, [pv_filial, pv_codigo], "T");
            return res.json({ 
                sucesso: true, 
                mensagem: "Pedido faturado sem nota com sucesso!" 
            });
        } catch (err) {
            console.error("Erro no faturamento sem nota:", err.message);
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: "Erro ao faturar: " + err.message 
            });
        }
    } else if (tipo === 'NFE') {
        if (!pv_cfop) {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: "Selecione um CFOP / Tipo de Nota para faturar com NFe" 
            });
        }

        const iTipo = 1; // Tipo de faturamento para NFe
        const iTransp = pv_transportador || 0;
        const nIdUsuario = pv_user || 1;

        try {
            // 1. SP_GERAR_FATURAMENTO - Gera e retorna o ID do Faturamento
            const sqlFaturamento = `SELECT CODIGO FROM SP_GERAR_FATURAMENTO(?, ?)`;
            const resFat = await ExecQueryAsync(req.dbOptions, sqlFaturamento, [pv_filial, iTipo], "T");
            
            const iFaturamento = resFat && resFat[0] ? (resFat[0].CODIGO || resFat[0].codigo) : null;
            if (!iFaturamento) {
                throw new Error("Não foi possível obter o código de faturamento.");
            }

            // 2. Vincular Pedido ao Faturamento (FAT_PEDIDOS)
            const sqlFatPedidos = `
                UPDATE OR INSERT INTO FAT_PEDIDOS (FP_FILIAL, FP_FATURAMENTO, FP_FLAG, FP_PEDIDO)
                VALUES (?, ?, ?, ?)
                MATCHING (FP_FILIAL, FP_FATURAMENTO, FP_FLAG, FP_PEDIDO)
            `;
            await ExecQueryAsync(req.dbOptions, sqlFatPedidos, [pv_filial, iFaturamento, iTipo, pv_codigo], "T");

            // 3. SP_GERAR_ITENS_FATURAMENTO (1º FATURAMENTO, 2º FILIAL)
            const sqlItens = `EXECUTE PROCEDURE SP_GERAR_ITENS_FATURAMENTO(?, ?)`;
            await ExecQueryAsync(req.dbOptions, sqlItens, [iFaturamento, pv_filial], "T");

            // 4. SP_GERAR_VENCTOS_FATURAMENTO
            const sqlVenctos = `EXECUTE PROCEDURE SP_GERAR_VENCTOS_FATURAMENTO(?, ?)`;
            await ExecQueryAsync(req.dbOptions, sqlVenctos, [iFaturamento, pv_filial], "T");

            // 5. SP_NF_GERAR
            const sqlNfGerar = `EXECUTE PROCEDURE SP_NF_GERAR(?, ?, ?, ?, ?)`;
            await ExecQueryAsync(req.dbOptions, sqlNfGerar, [iFaturamento, pv_cfop, iTransp, pv_filial, nIdUsuario], "T");

            // 6. SP_FINALIZAR_FATURAMENTO
            const sqlFinalizar = `EXECUTE PROCEDURE SP_FINALIZAR_FATURAMENTO(?, ?)`;
            await ExecQueryAsync(req.dbOptions, sqlFinalizar, [iFaturamento, pv_filial], "T");

            return res.json({ 
                sucesso: true, 
                mensagem: "NFe gerada com sucesso!",
                faturamento: iFaturamento 
            });
        } catch (err) {
            console.error("Erro no faturamento NFe:", err.message);
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: "Erro ao gerar NFe: " + err.message 
            });
        }
    } else {
        return res.status(400).json({ mensagem: "Tipo de faturamento não implementado" });
    }*/
}));

// Rota para buscar os CFOPs / Tipos de Nota Fiscal
rotaPedidos.get('/pesqcfop', asyncHandler(async (req, res) => {
    const sql = `SELECT TN_CODIGO, CAST(TN_DESCRICAO AS VARCHAR(40) CHARACTER SET WIN1252) TN_DESCRICAO, 
    TN_CFOP FROM TIPO_NOTA_FISCAL ORDER BY TN_DESCRICAO`;

    try {
        const result = await ExecQueryAsync(req.dbOptions, sql, []);
        res.json(result);
    } catch (err) {
        console.error("Erro ao buscar CFOPs:", err.message);
        res.status(500).json({ mensagem: "Erro ao buscar CFOPs: " + err.message });
    }
}));

// DELETE
rotaPedidos.delete('/pedido/item/:pvi_filial/:pvi_pedido/:pvi_codigo', asyncHandler(async (req, res) => {
    const { pvi_filial, pvi_pedido, pvi_codigo } = req.params;

    const sqlDeleteItem = `DELETE FROM PEDIDOS_VENDA_ITENS 
                           WHERE PVI_FILIAL = ? AND PVI_PEDIDO = ? AND PVI_CODIGO = ?`;

    const operacoes = [{
        sql: sqlDeleteItem,
        params: [pvi_filial, pvi_pedido, pvi_codigo]
    }];

    try {
        await ExecTransactionAsync(req.dbOptions, operacoes);
        res.status(200).json({ status: "Sucesso", mensagem: "Pedido Excluido!" });
    } catch (err) {        
        //err.sql = sql;
        //err.params = filtro;
        next(err); // passa para o errorHandler
    }            
}));

module.exports = { rotaPedidos }

/*
pv.pv_filial,
            pv.pv_codigo, 
            pv.pv_flag, 
            pv.pv_data, 
            --pv.pv_cliente,
            clientes.cl_razao_social, 
            -- clientes.cl_nome_fantasia,
            clientes.cl_cnpj, 
            (select vd2.fu_nome from funcionarios vd2 where vd2.fu_codigo=pv.pv_vendedor) vendedor, 
            (select vd3.fu_nome from funcionarios vd3 where vd3.fu_codigo=pv.vd_representante) representante, 
            pv.pv_valor_total, 
            pv.pv_desconto, 
            pv.pv_acrescimo, 
            pv.pv_FRETE, 
            pv.pv_total_geral, 
            --psc.psd_descricao,
            --pv.pv_faturamento,
            prazos_compras.pzc_descricao, 
            /* (select coalesce(sum(fa.fin_ard_valorvencimento),0)
                from fin_ardoc fa 
                where fa.fin_clt_id=pv.pv_codigo 
                and fa.fin_ard_datapagamento is null 
                and fa.fin_ard_dthinativo is null 
                and cast(fa.fin_ard_datavencimento as date) < current_date) DEBITOFIN, 
            pv.pv_margem Margem, 
            clientes.cl_codigo, 
            pv.pv_status, 
            pv.pv_cfop, 
            pv.pv_tabela, 
            pv.vd_representante, 
            pv.pv_observacao, 
            pv.pv_transportador,*/
         //   cidades.cd_nome||' - '||coalesce(cidades.cd_uf,'') cidade, 
         //   pvd.pvd_descricao, 
            /*pvd.pvd_codigo,
            pv.pv_doc_origem_num, 
            pv.pv_documento,
            case 
                when pv.pv_sit_financeiro = 2 then 'CREDITO' 
                when pv.pv_sit_financeiro = 3 then 'DEBITO' 
                    else '' 
                end devolucao, 
            pv.pv_sat_id,*/

        //    fin_tipodocumento.fin_tpd_descricao, 
           /* (select max(coalesce(ft.ft_documento,'0')) 
                from fat_pedidos fp 
                left join faturamento ft on (fp.fp_filial = ft.ft_filial and 
                                            fp.fp_faturamento = ft.ft_codigo and 
                                            fp.fp_flag = ft.ft_flag) 
                where fp.fp_filial = pv.pv_filial 
                and fp.fp_pedido = pv.pv_codigo) NF*/  /*,
            coalesce((select first 1 
                    p.pro_producao_id 
                from PRO_PEDIDO p 
                where p.pro_filial = pv.pv_filial 
                and p.pro_pedido = pv.pv_codigo), 0) PRODUCAO*/
    /*            
        FROM pedidos_venda pv 
        left join pedidos_venda_status_cad psc on (pv.pv_status = psc.psd_codigo) 
        left JOIN clientes ON (clientes.cl_codigo = pv.pv_cliente) 
        left  join pedidos_venda_documento pvd on (pvd.pvd_codigo = pv.pv_documento) 
        left  join cidades on (clientes.cl_cidade = cidades.cd_codigo) 
        left  JOIN prazos_compras ON (prazos_compras.pzc_codigo = pv.pv_prazo_pagamento) 
        left  JOIN fin_tipodocumento ON (fin_tipodocumento.fin_tpd_id = pv.pv_forma_pagamento) 
        WHERE pv.pv_status < 999  
        and pv.pv_documento <> 100 
        and psc.psd_rel_financeiro = 'T' 
        and not pv.pv_status = 5
*/


/*
// UPDATE CABEÇALHO E ITEM JUNTOS... INVIAVEL PARA VARIOS ITENS 
rotaPedidos.put('/pedido/:pv_filial/:id', asyncHandler(async (req, res) => {
    // 1. Captura os identificadores diretamente dos parâmetros da URL
    const idFilial = req.params.pv_filial;
    const idPedido = req.params.id;

    // 2. Extrai os dados do corpo (sem precisar confiar na filial vinda do body)
    const { 
        pv_cliente, pv_vendedor, pv_data, 
        pv_prazo_pagamento, pv_formapagamento, vd_representante, 
        pv_observacao, pv_user, itens 
    } = req.body;

    // 3. SQL de Atualização do Cabeçalho usando as variáveis da URL no WHERE
    const sqlCabecalho = `UPDATE PEDIDOS_VENDA SET
        PV_CLIENTE = ?, PV_VENDEDOR = ?, PV_DATA = ?, 
        PV_PRAZO_PAGAMENTO = ?, PV_FORMA_PAGAMENTO = ?, VD_REPRESENTANTE = ?, 
        PV_OBSERVACAO = ?, PV_USER = ?, PV_ATUALIZACAO = current_timestamp
    WHERE PV_FILIAL = ? AND PV_CODIGO = ?`;

    const operacoes = [
        {
            sql: sqlCabecalho,
            params: [
                pv_cliente, pv_vendedor, pv_data, 
                pv_prazo_pagamento || 11, pv_formapagamento || 1, 
                vd_representante, pv_observacao, pv_user,
                idFilial, idPedido // Valores blindados vindos da URL
            ]
        }
    ];

    if (itens && itens.length > 0) {
        const idsMantidos = itens.map(item => item.pvi_codigo).filter(Boolean);

        // Operação A: Remove itens excluídos usando o idFilial da URL
        if (idsMantidos.length > 0) {
            const placeholders = idsMantidos.map(() => '?').join(',');
            const sqlRemoveExcluidos = `DELETE FROM PEDIDOS_VENDA_ITENS 
                                        WHERE PVI_FILIAL = ? AND PVI_PEDIDO = ? AND PVI_CODIGO NOT IN (${placeholders})`;
            operacoes.push({
                sql: sqlRemoveExcluidos,
                params: [idFilial, idPedido, ...idsMantidos]
            });
        } else {
            const sqlDeletaTodosItens = `DELETE FROM PEDIDOS_VENDA_ITENS WHERE PVI_FILIAL = ? AND PVI_PEDIDO = ?`;
            operacoes.push({
                sql: sqlDeletaTodosItens,
                params: [idFilial, idPedido]
            });
        }

        // Operação B: Varre a lista decidindo entre UPDATE ou INSERT por item
        itens.forEach(item => {
            if (item.pvi_codigo) {
                // UPDATE no item existente (Usa o idFilial da URL para o WHERE)
                const sqlUpdateItem = `UPDATE PEDIDOS_VENDA_ITENS SET
                    PVI_UNIDADE = ?, PVI_PRODUTO = ?, PVI_QUANTIDADE = ?, 
                    PVI_VALOR_UNITARIO = ?, PVI_VALOR_TOTAL = ?, PVI_LOCAL = ?, PVI_PRODUTO_DESCR = ?, 
                    PVI_PRECO_COMPRA = ?, PVI_DESCONTO = ?, PVI_ACRESCIMO = ?, PVI_USER = ?,
                    PVI_ATUALIZACAO = current_timestamp
                WHERE PVI_FILIAL = ? AND PVI_PEDIDO = ? AND PVI_CODIGO = ?`;

                operacoes.push({
                    sql: sqlUpdateItem,
                    params: [
                        item.pvi_unidade, item.pvi_produto, item.pvi_quantidade,
                        item.pvi_valor_unitario, item.pvi_valor_total, item.pvi_local || 1, item.pvi_produto_descr,
                        item.pvi_preco_compra || 0, item.pvi_desconto || 0, item.pvi_acrescimo || 0, item.pvi_user || pv_user,
                        idFilial, idPedido, item.pvi_codigo
                    ]
                });
            } else {
                // INSERT no item novo (Usa o idFilial da URL na coluna PVI_FILIAL do banco)
                const sqlInsertItem = `INSERT INTO PEDIDOS_VENDA_ITENS
                (PVI_FILIAL, PVI_CODIGO, PVI_PEDIDO, PVI_UNIDADE, PVI_PRODUTO, PVI_QUANTIDADE, PVI_ENTREGA, 
                  PVI_VALOR_UNITARIO, PVI_VALOR_TOTAL, PVI_STATUS, PVI_ATUALIZACAO, PVI_LOCAL, PVI_PRODUTO_DESCR, 
                  PVI_PRECO_COMPRA, PVI_DESCONTO, PVI_ACRESCIMO, PVI_ICMS_ST, PVI_FRETE, PVI_TABELA_PRECO, 
                  PVI_DATA, PVI_VENDEDOR, PVI_USER)
                VALUES (?, gen_id(GEN_PEDIDOS_VENDA_ITENS, 1), ?, ?, ?, ?, 0, ?, ?, 1, current_timestamp, ?, ?, ?, ?, ?, 0, 0, 1, current_date, 0, ?)`;

                operacoes.push({
                    sql: sqlInsertItem,
                    params: [
                        idFilial, idPedido, item.pvi_unidade, item.pvi_produto, item.pvi_quantidade,
                        item.pvi_valor_unitario, item.pvi_valor_total, item.pvi_local || 1, item.pvi_produto_descr,
                        item.pvi_preco_compra || 0, item.pvi_desconto || 0, item.pvi_acrescimo || 0, item.pvi_user || pv_user
                    ]
                });
            }
        });
    }

    await ExecTransactionAsync(req.dbOptions, operacoes);

    res.status(200).json({ 
        status: "Sucesso", 
        mensagem: "Pedido e itens atualizados com segurança!" 
    });
}));*/
