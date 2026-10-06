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

  // Diferenciação de erros
  let status = 500;
  let mensagem = "Erro interno no servidor";

  if (err.name === "ValidationError") {
    status = 400;
    mensagem = err.message;
  } else if (err.name === "UnauthorizedError") {
    status = 401;
    mensagem = "Token inválido ou expirado";
  } else if (err.gdscode) {
    // Erro vindo do Firebird
    status = 400;
    mensagem = `Erro no banco: ${err.message}`;
  } else if (err.status) {
    status = err.status;
    mensagem = err.message;
  }

  res.status(status).json({
    erro: mensagem,
    rota: `${method} ${url}`,
    horario: timestamp
    // Se quiser, pode reativar os detalhes técnicos para debug:
     /*,detalhes: {
       gdscode: err.gdscode || null,
       sql: err.sql || null,
       params: err.params || null,
       stack: err.stack || null
     }*/
  });
}

module.exports = { errorHandler };


/*
### Benefícios dessa abordagem:
- **400** para erros de validação ou SQL (campo inexistente, parâmetros inválidos).  
- **401/403** para problemas de autenticação/autorização.  
- **500** só para falhas inesperadas.  
- Log completo no console, mas resposta enxuta para o cliente.  

Assim você evita que o cliente receba sempre “Erro interno” e já dá uma pista melhor do que aconteceu.  
*/



/*function errorHandler(err, req, res, next) {
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
      erro: err.message || "Erro interno no servidor"//,
      //detalhes: {
      //  gdscode: err.gdscode || null,
      //  gdsparams: err.gdsparams || null,
      //  sql: err.sql || null,
      //  params: err.params || null,
      //  stack: err.stack || null
      //},
      //rota: `${method} ${url}`,
      //horario: timestamp
    });
  }
  
  module.exports = { errorHandler }*/
  
  