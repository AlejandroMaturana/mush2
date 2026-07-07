import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { events } from './services/eventBus.js';
import router from './routes/index.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", env.CORS_ORIGIN],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intente más tarde' },
  skip: (req) => req.method === 'GET' && (
    req.originalUrl.startsWith('/api/v1/actuators') ||
    req.originalUrl.startsWith('/api/v1/devices')
  ),
});
app.use('/api/', limiter);

app.use('/api/v1', router);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write('data: {"type":"connected"}\n\n');

  const onAck = (data) => {
    res.write(`event: ack
data: ${JSON.stringify(data)}

`);
  };
  const onState = (data) => {
    res.write(`event: state
data: ${JSON.stringify(data)}

`);
  };
  const onTelemetry = (data) => {
    res.write(`event: telemetry
data: ${JSON.stringify(data)}

`);
  };
  const onAlarm = (data) => {
    res.write(`event: alarm
data: ${JSON.stringify(data)}

`);
  };
  const onControlEval = (data) => {
    res.write(`event: control_eval
data: ${JSON.stringify(data)}

`);
  };

  events.on('ack', onAck);
  events.on('state', onState);
  events.on('telemetry', onTelemetry);
  events.on('alarm', onAlarm);
  events.on('control_eval', onControlEval);

  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 30000);

  req.on('close', () => {
    events.off('ack', onAck);
    events.off('state', onState);
    events.off('telemetry', onTelemetry);
    events.off('alarm', onAlarm);
    events.off('control_eval', onControlEval);
    clearInterval(keepAlive);
  });
});

// --- Production: serve frontend SPA build ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDistPath = resolve(__dirname, '../../frontend/dist');

if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res) => {
    if (
      !req.path.startsWith('/api/') &&
      !req.path.startsWith('/events') &&
      !req.path.startsWith('/ws') &&
      !req.path.startsWith('/health')
    ) {
      res.sendFile(resolve(frontendDistPath, 'index.html'));
    }
  });
}

export default app;

