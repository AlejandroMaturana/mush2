import mqtt from 'mqtt';
import { Device, Telemetry, Actuator, DeviceHealth, DeviceMaintenance } from '../models/index.js';
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
    c.subscribe(`${TOPIC_PREFIX}/+/health`, { qos: 1 });
    c.subscribe(`${TOPIC_PREFIX}/+/maintenance`, { qos: 1 });
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
        if (data.mac || data.fwVer || data.hwRev || data.state || data.mode) {
          Device.findOrCreate({ where: { deviceId }, defaults: { deviceId, status: 'ONLINE' } })
            .then(([device]) => {
              const updates = {};
              if (data.mac) updates.macAddress = data.mac;
              if (data.fwVer) updates.firmwareVersion = data.fwVer;
              if (data.hwRev) updates.hwRevision = data.hwRev;
              if (data.state) {
                updates.lastFirmwareState = data.state;
                const stateMap = { NORMAL: 'ONLINE', DEGRADED: 'MAINTENANCE', ERROR: 'ERROR', SAFE: 'MAINTENANCE', OTA_UPDATING: 'MAINTENANCE' };
                updates.status = stateMap[data.state] || device.status;
              }
              if (data.mode) updates.controlMode = data.mode;
              device.update(updates).catch(() => {});
            })
            .catch(() => {});
        }
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
      } else if (type === 'health') {
        handleHealth(deviceId, data);
      } else if (type === 'maintenance') {
        handleMaintenance(deviceId, data);
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

  const brokerList = BROKERS.map(b => b.label).join(', ');
  console.log(`[MQTT] Bridge iniciado — brokers: ${brokerList}`);
  return primaryClient;
}

export function publishActuatorCommand(deviceId, commands, config = null) {
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
    ...(config || {}),
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
      { type: 'AQI', value: data.aqi, unit: 'AQI' },
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
        aqi: data.aqi,
      },
    });
  } catch (err) {
    console.error(`[MQTT] Error handling telemetry from ${deviceId}:`, err.message);
  }
}

async function handleHealth(deviceId, data) {
  try {
    const [device] = await Device.findOrCreate({
      where: { deviceId },
      defaults: { deviceId, status: 'ONLINE' },
    });

    const ts = new Date(data.ts || Date.now());

    await DeviceHealth.create({
      deviceId: device.id,
      freeHeap: data.freeHeap,
      minFreeHeap: data.minFreeHeap,
      maxAllocHeap: data.maxAllocHeap,
      stackSensors: data.stack?.sensors,
      stackSSR: data.stack?.ssr,
      stackWiFi: data.stack?.wifi,
      stackMQTT: data.stack?.mqtt,
      stackOTA: data.stack?.ota,
      stackTelemetry: data.stack?.telemetry,
      stackButton: data.stack?.button,
      i2cHealthy: data.i2cHealthy,
      sensorAht21: data.sensorAht21,
      sensorEns160: data.sensorEns160,
      staleTaskMask: data.staleTaskMask,
      heartbeatsHealthy: data.heartbeatsHealthy,
      bootTestPassed: data.bootTest,
      bootTestFailReason: data.bootTestFailReason,
      uptime: data.uptime,
      rebootCount: data.rebootCount,
      timestamp: ts,
    });

    await device.update({ lastSeen: ts, status: 'ONLINE' });

    events.emit('health', { deviceId, ...data });
  } catch (err) {
    console.error(`[MQTT] Error handling health from ${deviceId}:`, err.message);
  }
}

async function handleMaintenance(deviceId, data) {
  try {
    const [device] = await Device.findOrCreate({
      where: { deviceId },
      defaults: { deviceId, status: 'ONLINE' },
    });

    const ts = new Date(data.ts || Date.now());

    await DeviceMaintenance.create({
      deviceId: device.id,
      component: data.component,
      health: data.health,
      estimatedFailure: data.estimatedFailure,
      reason: data.reason,
      timestamp: ts,
    });

    await device.update({ lastSeen: ts, status: 'ONLINE' });

    events.emit('maintenance', { deviceId, ...data });
  } catch (err) {
    console.error(`[MQTT] Error handling maintenance from ${deviceId}:`, err.message);
  }
}
