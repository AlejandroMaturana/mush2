import request from 'supertest';
import app from '../app.js';
import { markReady, getReadiness } from '../config/readiness.js';

describe('Health', () => {
  afterEach(() => {
    // Reset readiness state to starting for isolation
    const readiness = getReadiness();
    readiness.status = 'starting';
  });

  it('GET /health returns 503 when services are starting', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('starting');
  });

  it('GET /health returns 200 when services are ready', async () => {
    markReady();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });
});
