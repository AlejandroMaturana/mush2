/**
 * MQTT Service — Mush2 Backend
 * 
 * Gestiona la conexión, suscripción y procesamiento de mensajes MQTT desde dispositivos IoT.
 * 
 * Características:
 * - Broker primario + fallback con reconexión exponencial
 * - Parseo de tópicos MQTT con validación
 * - Persistencia automática de telemetría, estado y eventos en PostgreSQL
 * - Deduplicación de alarmas (max 1 alarma por tipo/dispositivo cada 60s)
 * - Emit de eventos para consumo por otros servicios
 * 
 * @module services/mqttService
 * @see {@link docs/protocol/protocol-v1.md}
 * @see {@link docs/contracts/mqtt-contract.md}
 */

import mqtt from 'mqtt';
import { EventEmitter } from 'events';
import { env } from '../config/env.js';
import { Device, Telemetry, Sensor, Actuator } from '../models/index.js';

/** EventEmitter para comunicación intra-backend (telemetría, alarmas, estado) */
export const events = new EventEmitter();

/** Cliente MQTT activo (null si desconectado) */
let client = null;

/** Estado de conexión MQTT */
let connected = false;

/** Delay de reconexión actual (backoff exponencial) */
let backoffDelay = 5000;

/** Mínimo delay de reconexión: 5 segundos */
const BACKOFF_MIN = 5000;

/** Máximo delay de reconexión: 3 minutos */
const BACKOFF_MAX = 180000;

/** Deduplicación de alarmas: { "deviceId:reason": timestamp } */
let alarmLastEmit = {};

const TOPICS = [
  'mush2/telemetry/+/sensors',
  'mush2/telemetry/+/state',
  'mush2/event/+/boot',
  'mush2/event/+/ack',
  'mush2/event/+/alarm',
  'mush2/state/+/online',
];

function parseTopic(topic) {
  const parts = topic.split('/');
  if (parts.length < 4) return null;
  return { type: parts[1], deviceId: parts[2], action: parts[3] };
}

async function handleTelemetry(deviceId, payload) {
  try {
    const [device] = await Device.findOrCreate({
      where: { deviceId },
      defaults: {
        deviceId,
        macAddress: payload.deviceId || deviceId,
        status: 'ONLINE',
        lastSeen: new Date(),
      },
    });
    await device.update({ lastSeen: new Date(), status: 'ONLINE' });

    if (payload.sensors) {
      const sensorTypes = {
        temperature: { type: 'TEMPERATURE', unit: '°C', value: payload.sensors.temperature },
        humidity: { type: 'HUMIDITY', unit: '%', value: payload.sensors.humidity },
        co2: { type: 'CO2', unit: 'ppm', value: payload.sensors.co2 },
        voc: { type: 'VOC', unit: 'ppb', value: payload.sensors.voc },
      };

      for (const [key, data] of Object.entries(sensorTypes)) {
        if (data.value == null) continue;
        const [sensor] = await Sensor.findOrCreate({
          where: { deviceId: device.id, type: data.type },
          defaults: { deviceId: device.id, type: data.type },
        });
        await Telemetry.create({
          deviceId: device.id,
          sensorId: sensor.id,
          value: data.value,
          sensorType: data.type,
          unit: data.unit,
          timestamp: payload.ts ? new Date(payload.ts * 1000) : new Date(),
        });
      }

      events.emit('telemetry', { deviceId, sensors: payload.sensors, ts: payload.ts });
    }
  } catch (err) {
    console.error('[MQTT] Error handling telemetry:', err.message);
  }
}

async function handleBoot(deviceId, payload) {
  try {
    const [device] = await Device.findOrCreate({
      where: { deviceId },
      defaults: { deviceId, macAddress: payload.mac || deviceId, status: 'ONLINE', lastSeen: new Date() },
    });
    await device.update({
      firmwareVersion: payload.fwVersion || device.firmwareVersion,
      status: 'ONLINE',
      lastSeen: new Date(),
    });
    console.log(`[MQTT] Device boot: ${deviceId} v${payload.fwVersion}`);
  } catch (err) {
    console.error('[MQTT] Error handling boot:', err.message);
  }
}

async function handleOnline(deviceId, payload) {
  try {
    const status = payload.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
    await Device.update({ status, lastSeen: new Date() }, { where: { deviceId } });
  } catch (err) {
    console.error('[MQTT] Error handling online:', err.message);
  }
}

async function handleAck(deviceId, payload) {
  try {
    const device = await Device.findOne({ where: { deviceId } });
    if (!device) return;

    if (payload.actuatorState && payload.actuatorState.channel) {
      const { channel, state } = payload.actuatorState;
      const [actuator] = await Actuator.findOrCreate({
        where: { deviceId: device.id, channel },
        defaults: { deviceId: device.id, channel, state, mode: 'LOCAL' },
      });
      await actuator.update({ state, lastAck: payload.status, lastSeen: new Date(), lastCommand: payload.cmdId });
    }

    events.emit('ack', { deviceId, cmdId: payload.cmdId, status: payload.status, actuatorState: payload.actuatorState });
  } catch (err) {
    console.error('[MQTT] Error handling ack:', err.message);
  }
}

async function handleAlarm(deviceId, payload) {
  try {
    const now = Date.now();
    const lastEmit = alarmLastEmit[deviceId + payload.reason] || 0;
    if (now - lastEmit < 60000) return;
    alarmLastEmit[deviceId + payload.reason] = now;

    events.emit('alarm', { deviceId, reason: payload.reason, ts: payload.ts });
  } catch (err) {
    console.error('[MQTT] Error handling alarm:', err.message);
  }
}

async function handleDeviceState(deviceId, payload) {
  try {
    const device = await Device.findOne({ where: { deviceId } });
    if (!device || !payload.actuators) return;

    for (const act of payload.actuators) {
      const [actuator] = await Actuator.findOrCreate({
        where: { deviceId: device.id, channel: act.channel },
        defaults: { deviceId: device.id, channel: act.channel, state: act.state, mode: payload.mode || 'LOCAL' },
      });
      await actuator.update({ state: act.state, mode: payload.mode || actuator.mode, lastSeen: new Date() });
    }

    events.emit('state', { deviceId, actuators: payload.actuators, mode: payload.mode });
  } catch (err) {
    console.error('[MQTT] Error handling device state:', err.message);
  }
}

function onMessage(topic, message) {
  const parsed = parseTopic(topic);
  if (!parsed) return;

  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch {
    return;
  }

  switch (parsed.type) {
    case 'telemetry':
      if (parsed.action === 'sensors') handleTelemetry(parsed.deviceId, payload);
      if (parsed.action === 'state') handleDeviceState(parsed.deviceId, payload);
      break;
    case 'event':
      if (parsed.action === 'boot') handleBoot(parsed.deviceId, payload);
      if (parsed.action === 'ack') handleAck(parsed.deviceId, payload);
      if (parsed.action === 'alarm') handleAlarm(parsed.deviceId, payload);
      break;
    case 'state':
      if (parsed.action === 'online') handleOnline(parsed.deviceId, payload);
      break;
  }
}

export function connectMQTT() {
  const brokers = [
    `mqtt://${env.MQTT.broker}:${env.MQTT.port}`,
    `mqtt://${env.MQTT.fallbackBroker}:${env.MQTT.fallbackPort}`,
  ];

  let brokerIndex = 0;

  function tryConnect(index) {
    if (index >= brokers.length) {
      brokerIndex = 0;
      console.log(`[MQTT] All brokers failed, retrying in ${backoffDelay / 1000}s`);
      setTimeout(() => tryConnect(0), backoffDelay);
      backoffDelay = Math.min(backoffDelay * 2, BACKOFF_MAX);
      return;
    }

    console.log(`[MQTT] Connecting to ${brokers[index]}...`);
    client = mqtt.connect(brokers[index], {
      clientId: `mush2_backend_${Date.now()}`,
      clean: true,
      keepalive: 30,
      reconnectPeriod: backoffDelay,
    });

    client.on('connect', () => {
      connected = true;
      backoffDelay = BACKOFF_MIN;
      brokerIndex = index;
      console.log(`[MQTT] Connected to ${brokers[index]}`);
      client.subscribe(TOPICS, { qos: 1 }, (err) => {
        if (err) console.error('[MQTT] Subscribe error:', err.message);
      });
    });

    client.on('message', onMessage);

    client.on('close', () => {
      connected = false;
    });

    client.on('error', (err) => {
      console.error(`[MQTT] Error on ${brokers[index]}:`, err.message);
      client.end(true);
      tryConnect(index + 1);
    });
  }

  tryConnect(0);
}

export function publishCommand(deviceId, command) {
  if (!client || !connected) {
    console.error('[MQTT] Not connected, cannot publish');
    return false;
  }
  const topic = `mush2/cmd/${deviceId}/actuator`;
  const payload = JSON.stringify({
    protocol: '1.0.0',
    cmdId: `cmd_${Date.now()}`,
    ts: Math.floor(Date.now() / 1000),
    ...command,
  });
  // QoS 2: exactly-once delivery — requerido por protocol-v1 para comandos de actuador
  client.publish(topic, payload, { qos: 2 }, (err) => {
    if (err) {
      console.error(`[MQTT] Error al publicar en ${topic}:`, err.message);
    } else {
      console.log(`[MQTT] Comando publicado → ${topic} | ch=${command.channel} cmd=${command.command}`);
    }
  });
  return true;
}

export function isMQTTConnected() {
  return connected;
}
