import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { env } from './config/env.js';
import { getReadiness } from './config/readiness.js';
import { events } from './services/eventBus.js';
import router from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", env.CORS_ORIGIN],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const isDev = env.NODE_ENV === 'development' || env.NODE_ENV === 'local';
const limiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 2000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intente más tarde' },
  skip: (req) => isDev || (req.method === 'GET' && (
    req.originalUrl.startsWith('/api/v1/actuators') ||
    req.originalUrl.startsWith('/api/v1/devices')
  )),
});
app.use('/api/', limiter);

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (req.path.startsWith('/api/v1/auth')) return next();
  if (req.path === '/events') return next();
  const { status } = getReadiness();
  if (status === 'starting') {
    return res.status(503).json({ error: 'Servidor iniciando', status, retryAfter: 5 });
  }
  next();
});

app.use('/api/v1', router);

app.get('/health', (req, res) => {
  const readiness = getReadiness();
  const statusCode = readiness.status === 'starting' ? 503 : readiness.status === 'degraded' ? 200 : 200;
  res.status(statusCode).json({
    status: readiness.status,
    uptime: process.uptime(),
    startedAt: readiness.startedAt,
    readyAt: readiness.readyAt,
    services: readiness.services,
  });
});

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  let closed = false;
  const safeWrite = (chunk) => { if (!closed) try { res.write(chunk); } catch {} };

  safeWrite('event: connected\ndata: {"type":"connected"}\n\n');

  const wrap = (type) => (data) => {
    safeWrite(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const listeners = {
    ack: wrap('ack'),
    state: wrap('state'),
    telemetry: wrap('telemetry'),
    alarm: wrap('alarm'),
    control_eval: wrap('control_eval'),
    health: wrap('health'),
    maintenance: wrap('maintenance'),
    phase_transition: wrap('phase_transition'),
    device_health: wrap('device_health'),
    device_status_changed: wrap('device_status_changed'),
  };

  for (const [type, fn] of Object.entries(listeners)) {
    events.on(type, fn);
  }

  const keepAlive = setInterval(() => safeWrite(':keepalive\n\n'), 30000);

  const cleanup = () => {
    closed = true;
    for (const [type, fn] of Object.entries(listeners)) {
      events.off(type, fn);
    }
    clearInterval(keepAlive);
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
});

if (env.NODE_ENV === 'production') {
  const publicDir = resolve(__dirname, '../public');
  if (existsSync(publicDir)) {
    app.use(express.static(publicDir, { maxAge: '1d', index: 'index.html' }));
    app.get('*splat', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/events' || req.path === '/health') {
        return next();
      }
      res.sendFile(resolve(publicDir, 'index.html'));
    });
  }
}

export default app;

