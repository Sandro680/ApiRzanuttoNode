const firebird = require("node-firebird");  //CommonJS
const { promisify } = require("util");

const pools = {};
const poolUsage = {};
const poolStats = {};

function getPool(dbOptions) {
    const nomeBanco = dbOptions.database.toUpperCase();

    if (!pools[nomeBanco]) {
        const pool = firebird.pool(10, dbOptions);
        pools[nomeBanco] = pool;
        poolStats[nomeBanco] = { active: 0, total: 0 };
    }

    poolUsage[nomeBanco] = Date.now();
    return pools[nomeBanco];
}

async function ExecQueryAsync(dbOptions, sql, params = [], commit = "T") {
    const pool = getPool(dbOptions);
    const nomeBanco = dbOptions.database.toUpperCase();

    const getAsync = promisify(pool.get).bind(pool);

    try {
        const db = await getAsync();
        poolStats[nomeBanco].active++;
        poolStats[nomeBanco].total++;

        const transactionAsync = promisify(db.transaction).bind(db);
        const transaction = await transactionAsync(firebird.ISOLATION_READ_COMMITTED);

        const queryAsync = promisify(transaction.query).bind(transaction);
        const result = await queryAsync(sql, params);

        if (commit === "T") {
            await promisify(transaction.commit).bind(transaction)();
        } else {
            await promisify(transaction.rollback).bind(transaction)();
        }

        poolStats[nomeBanco].active--;
        db.detach();

        return result;
    } catch (err) {        
        throw err;
    } finally {
        poolStats[nomeBanco].active--;
        if (db) db.detach();
    }
}

async function ExecTransactionAsync(dbOptions, queriesArray) {
    const pool = getPool(dbOptions);
    const nomeBanco = dbOptions.database.toUpperCase();
    const getAsync = promisify(pool.get).bind(pool);

    const db = await getAsync();
    poolStats[nomeBanco].active++;
    poolStats[nomeBanco].total++;

    // Abre uma transação única para todo o bloco
    const transactionAsync = promisify(db.transaction).bind(db);
    const transaction = await transactionAsync(firebird.ISOLATION_READ_COMMITTED);
    const queryAsync = promisify(transaction.query).bind(transaction);

    try {
        let lastResult = null;
        
        // Executa cada query do array sequencialmente
        for (const q of queriesArray) {
            // Se os parâmetros forem uma função, executa passando o ID gerado no insert anterior
            const params = typeof q.params === 'function' ? q.params(lastResult) : q.params;
            lastResult = await queryAsync(q.sql, params);
        }

        // Se tudo der certo, grava em definitivo no Firebird
        await promisify(transaction.commit).bind(transaction)();
        return lastResult;
    } catch (err) {
        // Se qualquer item falhar, desfaz tudo (cabeçalho e itens)
        await promisify(transaction.rollback).bind(transaction)();
        throw err; 
    } finally {
        poolStats[nomeBanco].active--;
        db.detach();
    }
}


// --------------------------------------------------------------------------
// Funções de estatísticas
// --------------------------------------------------------------------------
function getPoolStats() {
    const stats = {};
    for (const nomeBanco in poolStats) {
        stats[nomeBanco] = {
            active: poolStats[nomeBanco].active,
            total: poolStats[nomeBanco].total,
            ultimoUso: new Date(poolUsage[nomeBanco]).toLocaleString()
        };
    }
    return stats;
}

function logPoolStats() {
    console.log("=== Estatísticas de Pools ===");
    for (const nomeBanco in poolStats) {
        console.log(
            `Banco: ${nomeBanco} | Ativas: ${poolStats[nomeBanco].active} | Total: ${poolStats[nomeBanco].total}`
        );
    }
    console.log("=============================");
}

// --------------------------------------------------------------------------
// Limpeza automática de pools não usados
// --------------------------------------------------------------------------
setInterval(() => {
    const agora = Date.now();
    const limite = 30 * 60 * 1000; // 30 minutos

    for (const nomeBanco in pools) {
        if (agora - poolUsage[nomeBanco] > limite) {
            console.log(`Liberando pool do banco ${nomeBanco} por inatividade...`);
            pools[nomeBanco].destroy();
            delete pools[nomeBanco];
            delete poolUsage[nomeBanco];
            delete poolStats[nomeBanco];
        }
    }
}, 10 * 60 * 1000);

// --------------------------------------------------------------------------
// Handler genérico para async/await em rotas
// --------------------------------------------------------------------------
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = { 
    getPool, 
    ExecQueryAsync,
    ExecTransactionAsync, 
    asyncHandler, 
    getPoolStats, 
    logPoolStats 
}