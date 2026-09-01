import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('ISSUE-027: middleware global de error devuelve genérico sin err.message (I27/PR-K)', () => {
  it('un error propagado con next(err) responde 500 { SERVER_ERROR, "Error interno del servidor" }', async () => {
    const app = express();
    app.get('/boom', (req, res, next) => next(new Error('secret-internal-detail')));
    const { default: errorHandler } = await import('../../middlewares/errorHandler.js');
    app.use(errorHandler);

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'SERVER_ERROR', message: 'Error interno del servidor' });
    expect(JSON.stringify(res.body)).not.toContain('secret-internal-detail');
    expect(JSON.stringify(res.body)).not.toContain('err.message');
  });

  it('un error con status explícito (409) preserva el status', async () => {
    const app = express();
    app.get('/conflict', (req, res, next) => {
      const err = new Error('conflicto controlado');
      err.status = 409;
      next(err);
    });
    const { default: errorHandler } = await import('../../middlewares/errorHandler.js');
    app.use(errorHandler);

    const res = await request(app).get('/conflict');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SERVER_ERROR');
  });
});
