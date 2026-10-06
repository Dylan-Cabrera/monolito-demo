class ErrorNegocio extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
const prohibido = (msg = 'No tenés permiso para entrar acá.') => new ErrorNegocio(msg, 403);
module.exports = { ErrorNegocio, prohibido };
