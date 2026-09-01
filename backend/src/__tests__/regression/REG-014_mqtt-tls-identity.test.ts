import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { validate } from '../../config/ConfigurationService.js';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

function prodEnv(brokerUrl: string) {
  return {
    NODE_ENV: 'production',
    DB: { host: 'localhost', database: 'mush2', username: 'postgres', port: 5432, url: undefined },
    JWT_SECRET: 'strong-secret-1234567890abcdef',
    DATA_ENC_KEY: 'enc-key-1234567890abcdef',
    MQTT: { brokerUrl },
  };
}

describe('REG-014: MQTT TLS fail-fast e identidad por dispositivo (I15)', () => {
  const envSource = readProjectFile('backend/src/config/env.js');
  const bridgeSource = readProjectFile('backend/src/services/mqttBridge.js');
  const prodAcl = readProjectFile('docker/mosquitto/prod/acl.conf');
  const prodConf = readProjectFile('docker/mosquitto/prod/mosquitto.conf');
  const compose = readProjectFile('docker-compose.yml');

  describe('fail-fast ante no-TLS en producción', () => {
    it('validate() lanza si MQTT_BROKER_URL no es TLS en producción', () => {
      expect(() => validate(prodEnv('mqtt://broker:1883'))).toThrow();
      expect(() => validate(prodEnv('tcp://broker:1883'))).toThrow();
    });

    it('validate() menciona TLS/mqtts en el error de no-TLS', () => {
      let message = '';
      try {
        validate(prodEnv('mqtt://broker:1883'));
      } catch (err) {
        message = err.message;
      }
      expect(message).toMatch(/TLS|mqtts/i);
    });

    it('validate() acepta mqtts:// en producción', () => {
      expect(() => validate(prodEnv('mqtts://broker:8883'))).not.toThrow();
    });

    it('validate() sigue permitiendo mqtt:// en desarrollo', () => {
      const dev = { ...prodEnv('mqtt://localhost:1883'), NODE_ENV: 'development' };
      expect(() => validate(dev)).not.toThrow();
    });
  });

  describe('mqtts:// por defecto en producción', () => {
    it('env.js define default mqtts://localhost:8883 para producción', () => {
      expect(envSource).toContain("'mqtts://localhost:8883'");
    });

    it('env.js expone MQTT_REJECT_UNAUTHORIZED (por defecto true)', () => {
      expect(envSource).toContain('MQTT_REJECT_UNAUTHORIZED');
    });
  });

  describe('identidad del bridge desde env + TLS', () => {
    it('mqttBridge conecta con usuario/password desde env (identidad del bridge)', () => {
      expect(bridgeSource).toContain('username: broker.username');
      expect(bridgeSource).toContain('password: broker.password');
      expect(bridgeSource).toContain('env.MQTT');
    });

    it('mqttBridge pasa rejectUnauthorized a las opciones de conexión', () => {
      expect(bridgeSource).toContain('rejectUnauthorized');
    });
  });

  describe('ACL por dispositivo y listener TLS de producción', () => {
    it('acl.conf de prod acota por %c (telemetría/status/alarm/ack/health/maintenance)', () => {
      for (const t of ['telemetry', 'status', 'alarm', 'ack', 'health', 'maintenance']) {
        expect(prodAcl).toContain(`pattern write mush2/%c/${t}`);
      }
    });

    it('acl.conf de prod restringe lectura del firmware a sus propios topics', () => {
      expect(prodAcl).toContain('pattern read mush2/%c/actuators');
      expect(prodAcl).toContain('pattern read mush2/%c/ota/#');
      expect(prodAcl).not.toContain('topic readwrite mush2/+/#');
    });

    it('acl.conf de prod define el usuario bridge por separado de los dispositivos', () => {
      expect(prodAcl).toContain('user backend_bridge');
    });

    it('mosquitto.prod.conf ya no permite al bridge backend conectarse sin TLS', () => {
      expect(prodConf).not.toContain('sin TLS');
    });

    it('docker-compose.yml usa mqtts:// para el backend bridge', () => {
      expect(compose).toContain('mqtts://mosquitto:8883');
    });
  });
});
