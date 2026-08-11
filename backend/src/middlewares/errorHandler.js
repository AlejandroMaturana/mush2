import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('ERROR_HANDLER');

export default (err, req, res, next) => {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;

  log.error(
    { module: 'ERROR_HANDLER', event: 'UNHANDLED_ERROR', status, error: err.message, stack: err.stack, path: req.originalUrl, method: req.method },
    'Error no manejado por las rutas'
  );

  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({ error: 'SERVER_ERROR', message: 'Error interno del servidor' });
}
