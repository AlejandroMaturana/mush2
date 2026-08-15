import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { Device, Actuator, Subscription } from '../models/index.js';
import { env } from '../config/env.js';
import { createChildLogger } from '../config/pino.js';
import { getAccessibleDeviceIds } from '../middlewares/tenant.js';

const clients = new Map();
let wssInstance = null;
const log = createChildLogger('WS');

export function startWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  wssInstance = wss;

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const deviceId = url.searchParams.get('deviceId');

      if (!token) {
        ws.close(4401, 'Token requerido');
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, env.JWT_SECRET);
      } catch {
        ws.close(4401, 'Token inválido');
        return;
      }
      const userId = decoded.id;
      const role = decoded.role;

      const sub = await Subscription.findOne({ where: { userId, status: 'ACTIVE' } });
      const plan = sub?.plan || 'FREE';
      if (plan === 'FREE') {
        ws.close(4403, 'QoS insufficient');
        return;
      }

      if (!deviceId) {
        ws.close(4000, 'deviceId required');
        return;
      }

      const accessible = await getAccessibleDeviceIds(userId);
      if (!accessible.includes(deviceId)) {
        ws.close(4403, 'Acceso denegado al dispositivo');
        return;
      }

      ws.auth = { userId, role, plan };
      clients.set(deviceId, ws);

      log.info({ event: 'CONNECTED', deviceId, userId, plan }, `Conectado: ${deviceId} desde ${req.socket.remoteAddress}`);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (e) {
          log.error({ module: 'WS', event: 'INVALID_MESSAGE', error: e.message, deviceId }, `Mensaje inválido de ${deviceId}`);
        }
      });

      ws.on('close', () => {
        log.info({ event: 'DISCONNECTED', deviceId, userId: ws.auth?.userId, plan: ws.auth?.plan }, `Desconectado: ${deviceId}`);
        if (clients.get(deviceId) === ws) {
          clients.delete(deviceId);
        }
      });

      ws.on('error', (err) => {
        log.error({ module: 'WS', event: 'ERROR', error: err.message, deviceId }, `Error ${deviceId}`);
      });

      sendCurrentState(deviceId, ws);
    } catch (err) {
      log.error({ module: 'WS', event: 'HANDSHAKE_ERROR', error: err.message }, 'Error en handshake WebSocket');
      try {
        ws.close(4401, 'Error de autenticación');
      } catch { /* ignore */ }
    }
  });

  log.info({ event: 'SERVER_READY' }, 'WebSocket server listo en /ws');
  return wss;
}

export function sendActuatorUpdate(deviceId, actuators) {
  const ws = clients.get(deviceId);
  if (!ws || ws.readyState !== 1) return;

  ws.send(JSON.stringify({
    type: 'actuator_state',
    deviceId,
    actuators: actuators.map(a => ({
      channel: a.channel,
      state: a.state,
      mode: a.mode,
    })),
  }));
}

export function stopWebSocketServer() {
  for (const [deviceId, ws] of clients) {
    try { ws.close(1001, 'Server shutting down'); } catch { /* ignore */ }
  }
  clients.clear();
  if (wssInstance) {
    wssInstance.close();
    wssInstance = null;
  }
  log.info({ event: 'SERVER_CLOSED' }, 'WebSocket server cerrado');
}

async function sendCurrentState(deviceId, ws) {
  try {
    const device = await Device.findOne({ where: { deviceId } });
    if (!device) {
      ws.send(JSON.stringify({ type: 'actuator_state', deviceId, actuators: [] }));
      return;
    }
    const actuators = await Actuator.findAll({ where: { deviceId: device.id } });
    ws.send(JSON.stringify({
      type: 'actuator_state',
      deviceId,
      actuators: actuators.map(a => ({
        channel: a.channel,
        state: a.state,
        mode: a.mode,
      })),
    }));
  } catch (err) {
    log.error({ module: 'WS', event: 'SEND_STATE_ERROR', error: err.message, deviceId }, `Error sendCurrentState ${deviceId}`);
  }
}
