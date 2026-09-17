
function errorHandler(err, req, res, next) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
  
    console.error(`[${timestamp}] Erro capturado:`);
    console.error(`Rota: ${method} ${url}`);
    console.error("Erro completo:", err);
  
    if (res.headersSent) {
      return next(err);
    }
  
    const status = err.status || 500;
  
    res.status(status).json({
      erro: err.message || "Erro interno no servidor"/*,
      detalhes: {
        gdscode: err.gdscode || null,
        gdsparams: err.gdsparams || null,
        sql: err.sql || null,
        params: err.params || null,
        stack: err.stack || null
      },
      rota: `${method} ${url}`,
      horario: timestamp*/
    });
  }
  
  module.exports = { errorHandler }
  
  