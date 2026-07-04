import mqtt from 'mqtt';
import { Device, Telemetry, Actuator } from '../models/index.js';
import { events } from './eventBus.js';
import { sendActuatorUpdate } from './webSocketServer.js';

const TOPIC_PREFIX = 'mush2';

// Broker configuration
const BROKERS = [
  {
    url: process.env.MQTT_BROKER || 'mqtt://test.mosquitto.org:1883',
    label: 'Mosquitto (primary)',
  },
];

if (process.env.MQTT_BROKER_FALLBACK) {
  BROKERS.push({
    url: process.env.MQTT_BROKER_FALLBACK,
    label: 'HiveMQ (fallback)',
  });
}

let primaryClient = null;
let fallbackClient = null;
let activeLabel = null;
const connectedDevices = new Set();

function createClient(broker, isFallback) {
  const clientId = `mush2_backend_${isFallback ? 'fb_' : ''}${Date.now()}`;
  const c = mqtt.connect(broker.url, {
    clientId,
    clean: true,
    reconnectPeriod: 8000,
    connectTimeout: 10000,
  });

  c.on('connect', () => {
    console.log(`[MQTT] Conectado a ${broker.label} (${broker.url})`);
    if (!activeLabel) activeLabel = broker.label;
    c.subscribe(`${TOPIC_PREFIX}/+/telemetry`, { qos: 1 });
    c.subscribe(`${TOPIC_PREFIX}/+/status`, { qos: 1 });
    c.subscribe(`${TOPIC_PREFIX}/+/alarm`, { qos: 1 });
    c.subscribe(`${TOPIC_PREFIX}/+/ack`, { qos: 1 });
  });

  c.on('message', (topic, payload) => {
    const parts = topic.split('/');
    if (parts.length < 3) return;
    const deviceId = parts[1];
    const type = parts[2];

    try {
      const data = JSON.parse(payload.toString());
      if (type === 'telemetry') {
        handleTelemetry(deviceId, data);
      } else if (type === 'status') {
        connectedDevices.add(deviceId);
        events.emit('state', { deviceId, ...data });
        if (data.actuatorState || data.channel) {
          events.emit('ack', {
            deviceId,
            actuatorState: data.actuatorState || { channel: data.channel, state: data.state },
            status: data.status || 'ACKED',
            timestamp: Date.now(),
          });
        }
      } else if (type === 'alarm') {
        events.emit('alarm', { deviceId, ...data });
      } else if (type === 'ack') {
        events.emit('ack', {
          deviceId,
          actuatorState: data.actuatorState || { channel: data.channel, state: data.state },
          status: data.status || 'ACKED',
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error(`[MQTT] Error parsing from ${topic}:`, err.message);
    }
  });

  c.on('error', (err) => {
    console.error(`[MQTT] Error en ${broker.label}: ${err.message}`);
  });

  c.on('close', () => {
    console.log(`[MQTT] ${broker.label} — desconectado`);
    if (isFallback) {
      fallbackClient = null;
    }
  });

  return c;
}

export function startMqttBridge() {
  // Always try the primary broker
  primaryClient = createClient(BROKERS[0], false);

  // If a fallback is configured, also connect it
  if (BROKERS.length > 1) {
    fallbackClient = createClient(BROKERS[1], true);
  }

  events.on('control_eval', (data) => {
    if (!data.deviceId) return;
    const payload = JSON.stringify({
      type: 'actuator_state',
      deviceId: data.deviceId,
      timestamp: Date.now(),
      actuators: (data.actuatorCommands || []).map(c => ({
        channel: c.channel,
        state: c.command,
        mode: 'REMOTE',
      })),
    });
    const opts = { qos: 1, retain: false };

    const topic = `${TOPIC_PREFIX}/${data.deviceId}/actuators`;

    // Publish to primary; if disconnected, try fallback
    if (primaryClient && primaryClient.connected) {
      primaryClient.publish(topic, payload, opts);
    } else if (fallbackClient && fallbackClient.connected) {
      fallbackClient.publish(topic, payload, opts);
    }
  });

  const brokerList = BROKERS.map(b => b.label).join(', ');
  console.log(`[MQTT] Bridge iniciado — brokers: ${brokerList}`);
  return primaryClient;
}

export function publishActuatorCommand(deviceId, commands) {
  const topic = `${TOPIC_PREFIX}/${deviceId}/actuators`;
  const payload = JSON.stringify({
    type: 'actuator_state',
    deviceId,
    timestamp: Date.now(),
    actuators: commands.map(c => ({
      channel: c.channel,
      state: c.state,
      mode: c.mode || 'REMOTE',
    })),
  });
  const opts = { qos: 1, retain: false };

  let published = false;
  if (primaryClient && primaryClient.connected) {
    primaryClient.publish(topic, payload, opts);
    published = true;
  }
  if (fallbackClient && fallbackClient.connected) {
    fallbackClient.publish(topic, payload, opts);
    published = true;
  }
  return published;
}

export function getMqttStatus() {
  return {
    brokers: BROKERS.map(b => b.label),
    primaryConnected: primaryClient ? primaryClient.connected : false,
    fallbackConnected: fallbackClient ? fallbackClient.connected : false,
    active: activeLabel,
    connectedDevices: connectedDevices.size,
  };
}

export function stopMqttBridge() {
  if (primaryClient) {
    primaryClient.end(true);
    primaryClient = null;
  }
  if (fallbackClient) {
    fallbackClient.end(true);
    fallbackClient = null;
  }
  activeLabel = null;
}

async function handleTelemetry(deviceId, data) {
  try {
    const [device] = await Device.findOrCreate({
      where: { deviceId },
      defaults: { deviceId, status: 'ONLINE' },
    });

    const ts = new Date(data.ts || Date.now());
    const sensors = [
      { type: 'TEMPERATURE', value: data.temp, unit: '°C' },
      { type: 'HUMIDITY', value: data.hum, unit: '%' },
      { type: 'CO2', value: data.co2, unit: 'ppm' },
      { type: 'VOC', value: data.tvoc, unit: 'ppb' },
    ];

    for (const s of sensors) {
      if (s.value == null) continue;
      await Telemetry.create({
        deviceId: device.id,
        sensorType: s.type,
        value: s.value,
        unit: s.unit,
        timestamp: ts,
      });
    }

    await device.update({ lastSeen: ts, status: 'ONLINE' });

    events.emit('telemetry', {
      deviceId,
      sensors: {
        temperature: data.temp,
        humidity: data.hum,
        co2: data.co2,
        voc: data.tvoc,
      },
    });
  } catch (err) {
    console.error(`[MQTT] Error handling telemetry from ${deviceId}:`, err.message);
  }
}
