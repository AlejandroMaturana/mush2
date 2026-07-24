import mqtt from 'mqtt';
import { Device, Telemetry, Actuator, DeviceHealth, DeviceMaintenance } from '../models/index.js';
import { events } from './eventBus.js';
import { sendActuatorUpdate } from './webSocketServer.js';
import { recordEvent, getStatusFromDevice } from './deviceHealthService.js';

const TOPIC_PREFIX = 'mush2';

// Single broker configuration (no fallback)
const broker = {
  url: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  username: process.env.MQTT_BROKER_USER || 'backend_bridge',
  password: process.env.MQTT_BROKER_PASS || '',
  label: 'Mosquitto',
};

let client = null;
const connectedDevices = new Set();

function createClient() {
  const clientId = `mush2_backend_${Date.now()}`;
  const c = mqtt.connect(broker.url, {
    clientId,
    clean: true,
    username: broker.username,
    password: broker.password,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });

  c.on('connect', () => {
    console.log(`[MQTT] Conectado a ${broker.label} (${broker.url})`);
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
          Device.findOrCreate({ where: { deviceId }, defaults: { deviceId } })
            .then(([device]) => {
              const updates = {};
              if (data.mac) updates.macAddress = data.mac;
              if (data.fwVer) updates.firmwareVersion = data.fwVer;
              if (data.hwRev) updates.hwRevision = data.hwRev;
              if (data.state) {
                updates.lastFirmwareState = data.state;
              }
              if (data.mode) updates.controlMode = data.mode;
              if (Object.keys(updates).length > 0) {
                device.update(updates).catch(() => {});
              }
              recordEvent(deviceId, 'status').catch(() => {});
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
  });

  return c;
}

export function startMqttBridge() {
  client = createClient();
  console.log(`[MQTT] Bridge iniciado — broker: ${broker.label}`);
  return client;
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

  if (client && client.connected) {
    client.publish(topic, payload, opts);
    return true;
  }
  return false;
}

export function getMqttStatus() {
  return {
    broker: broker.label,
    url: broker.url,
    connected: client ? client.connected : false,
    connectedDevices: connectedDevices.size,
  };
}

export function stopMqttBridge() {
  if (client) {
    client.end(true);
    client = null;
  }
}

async function handleTelemetry(deviceId, data) {
  try {
    const [device] = await Device.findOrCreate({
      where: { deviceId },
      defaults: { deviceId },
    });

    const rawTs = data.ts || Date.now();
    const ts = new Date(rawTs < 1e12 ? rawTs * 1000 : rawTs);
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

    await recordEvent(deviceId, 'telemetry');

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
      defaults: { deviceId },
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

    await recordEvent(deviceId, 'health');

    events.emit('health', { deviceId, ...data });
  } catch (err) {
    console.error(`[MQTT] Error handling health from ${deviceId}:`, err.message);
  }
}

async function handleMaintenance(deviceId, data) {
  try {
    const [device] = await Device.findOrCreate({
      where: { deviceId },
      defaults: { deviceId },
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

    await recordEvent(deviceId, 'maintenance');

    events.emit('maintenance', { deviceId, ...data });
  } catch (err) {
    console.error(`[MQTT] Error handling maintenance from ${deviceId}:`, err.message);
  }
}
