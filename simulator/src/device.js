// Virtual Device (Protocol Simulator MVP — FASE 1).
//
// Emula un dispositivo físico frente al backend MQTT:
//   - publica telemetría periódica conforme a telemetry.schema.json;
//   - publica status online/offline conforme a status.schema.json;
//   - se suscribe a {prefix}/{deviceId}/actuators y parsea comandos canónicos
//     (paridad exacta con firmware/src/mqtt_client.cpp + tasks.cpp);
//   - responde con ACK conforme a ack.schema.json en {prefix}/{deviceId}/ack;
//   - deduplica cmdId en memoria (CmdIdDedup, política MVP).
//
// El estado interno de los 4 canales existe ÚNICAMENTE para responder comandos
// y reflejarse en la telemetría. Sin persistencia, scheduler, lógica de cultivo
// ni máquina de estados (pertenecen a FASE 2).

import { parseCommand } from './contract/command.js';
import { buildAck, ACK_STATUS } from './contract/ack.js';
import { createTelemetryGenerator } from './contract/telemetry.js';
import { buildStatus } from './contract/status.js';
import { loadSchemas } from './contract/schemas.js';
import { validate, isValid } from './contract/validator.js';
import { CmdIdDedup } from './dedup.js';

const SCHEMAS = loadSchemas();

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export class VirtualDevice {
  constructor({ config, mqttClient, dedup = new CmdIdDedup(), log = () => {} }) {
    this.config = config;
    this.client = mqttClient;
    this.dedup = dedup;
    this.log = log;

    this.topic = {
      actuators: `${config.topicPrefix}/${config.deviceId}/actuators`,
      ack: `${config.topicPrefix}/${config.deviceId}/ack`,
      telemetry: `${config.topicPrefix}/${config.deviceId}/telemetry`,
      status: `${config.topicPrefix}/${config.deviceId}/status`,
    };

    this.channelStates = [false, false, false, false];
    this.telemetryGen = createTelemetryGenerator({
      mode: config.telemetryMode,
      seed: config.seed,
      base: config.telemetryBase,
    });
    this.interval = null;
    this.connected = false;
    this.stopping = false;
  }

  // Inicia la conexión y devuelve una promesa que resuelve al primer 'connect'
  // o rechaza si el cliente emite 'error' antes de conectar.
  start(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout conectando al broker ${this.config.brokerUrl}`));
      }, timeoutMs);

      const onConnect = () => {
        clearTimeout(timer);
        this.connected = true;
        this.client.subscribe(this.topic.actuators, { qos: this.config.qos });
        this._publishStatus('online');
        this._startTelemetryInterval();
        this.log(`[device] ${this.config.deviceId} conectado — suscrito a ${this.topic.actuators}`);
        resolve();
      };

      const onError = (err) => {
        if (!this.connected) {
          clearTimeout(timer);
          cleanup();
          reject(err);
        } else {
          this.log(`[device] error MQTT: ${err?.message || err}`);
        }
      };

      const cleanup = () => {
        this.client.off('connect', onConnect);
        this.client.off('error', onError);
      };

      this.client.on('connect', onConnect);
      this.client.on('error', onError);
      this.client.on('message', (topic, payload) => this._handleMessage(topic, payload));
      this.client.on('offline', () => this._handleOffline());
      this.client.connect?.();
    });
  }

  async stop() {
    this.stopping = true;
    this._stopTelemetryInterval();
    if (this.connected) {
      this._publishStatus('offline');
    }
    await new Promise((resolve) => {
      try {
        this.client.end(false, resolve);
      } catch {
        resolve();
      }
    });
    this.connected = false;
  }

  getChannelState(channel) {
    if (!Number.isInteger(channel) || channel < 1 || channel > 4) return null;
    return this.channelStates[channel - 1];
  }

  _handleMessage(topic, payload) {
    if (topic !== this.topic.actuators) return;

    const raw = payload.toString();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      json = null;
    }

    const schemaErrors = json ? validate(SCHEMAS['command.schema.json'], json) : ['payload no es JSON'];
    if (schemaErrors.length > 0) {
      this.log(`[device] comando no conforme al schema: ${schemaErrors.join('; ')}`);
    }

    const parsed = parseCommand(raw);
    if (!parsed.ok) {
      this.log(`[device] payload ignorado (${parsed.reason}) — sin ACK (paridad firmware)`);
      return;
    }

    const { command, status: cmdStatus } = parsed;
    let ack;

    if (cmdStatus === ACK_STATUS.OK) {
      const channel = command.channel;
      const state = command.value;
      if (command.cmdId && this.dedup.isDuplicate(command.cmdId)) {
        ack = buildAck({
          cmdId: command.cmdId,
          channel,
          state,
          status: ACK_STATUS.ALREADY_EXECUTED,
          ts: nowSeconds(),
        });
        this._publishAck(ack);
        this.log(`[device] cmdId duplicado ignorado: ${command.cmdId} (ch${channel})`);
        return;
      }
      this.channelStates[channel - 1] = state;
      ack = buildAck({
        cmdId: command.cmdId,
        channel,
        state,
        status: ACK_STATUS.OK,
        ts: nowSeconds(),
      });
      this.log(`[device] Actuator ch${channel}: ${state ? 'ON' : 'OFF'} (REMOTE) cmdId=${command.cmdId}`);
    } else {
      ack = buildAck({
        cmdId: command.cmdId,
        channel: 0,
        state: false,
        status: cmdStatus,
        ts: nowSeconds(),
      });
    }

    this._publishAck(ack);
  }

  _publishAck(ack) {
    if (!isValid(SCHEMAS['ack.schema.json'], ack)) {
      this.log(`[device] ACK interno no conforme al schema — descartado: ${JSON.stringify(ack)}`);
      return;
    }
    this.client.publish(this.topic.ack, JSON.stringify(ack), { qos: this.config.qos });
    this.log(`[device] ACK ${ack.status} ch${ack.channel} cmdId=${ack.cmdId}`);
  }

  _publishTelemetry() {
    const telemetry = this.telemetryGen();
    if (!isValid(SCHEMAS['telemetry.schema.json'], telemetry)) {
      this.log(`[device] telemetría no conforme al schema — descartada: ${JSON.stringify(telemetry)}`);
      return;
    }
    this.client.publish(this.topic.telemetry, JSON.stringify(telemetry), { qos: this.config.qos });
  }

  _publishStatus(state) {
    const status = buildStatus({
      state,
      mode: 'virtual',
      rssi: -55,
      mac: `SIM_${this.config.deviceId}`,
      fwVer: 'sim-0.1.0',
      hwRev: 'SIM-1.0',
      ts: nowSeconds(),
    });
    if (!isValid(SCHEMAS['status.schema.json'], status)) {
      this.log(`[device] status no conforme al schema — descartado: ${JSON.stringify(status)}`);
      return;
    }
    this.client.publish(this.topic.status, JSON.stringify(status), {
      qos: this.config.qos,
      retain: this.config.retainStatus,
    });
  }

  _startTelemetryInterval() {
    this._stopTelemetryInterval();
    this.interval = setInterval(() => this._publishTelemetry(), this.config.telemetryIntervalMs);
  }

  _stopTelemetryInterval() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  _handleOffline() {
    this.connected = false;
    this._stopTelemetryInterval();
    this.log(`[device] ${this.config.deviceId} desconectado del broker`);
  }
}
