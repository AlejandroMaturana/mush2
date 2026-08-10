import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

function hasFile(relativePath: string): boolean {
  return existsSync(resolve(PROJECT_ROOT, relativePath));
}

describe('REG-008: Broker deployment plan (I65/INF-006)', () => {
  const plan = readProjectFile('docs/operations/broker-deployment.md');
  const prodConf = readProjectFile('docker/mosquitto/prod/mosquitto.conf');
  const prodAcl = readProjectFile('docker/mosquitto/prod/acl.conf');
  const contract = readProjectFile('docs/contracts/mqtt-contract.md');
  const renderYaml = readProjectFile('render.yaml');
  const compose = readProjectFile('docker-compose.yml');

  it('existe el plan de despliegue del broker', () => {
    expect(hasFile('docs/operations/broker-deployment.md')).toBe(true);
  });

  it('el plan documenta rollback', () => {
    expect(plan.toLowerCase()).toContain('rollback');
  });

  it('el plan documenta gestión de secretos', () => {
    expect(plan.toLowerCase()).toContain('secret');
  });

  it('el plan documenta pasos de migración', () => {
    expect(plan.toLowerCase()).toContain('migra');
  });

  it('el plan documenta la verificación de conectividad del bridge', () => {
    expect(plan.toLowerCase()).toContain('bridge');
  });

  it('la config prod referencia password_file y acl_file', () => {
    expect(prodConf).toContain('password_file /mosquitto/config/password_file');
    expect(prodConf).toContain('acl_file /mosquitto/config/acl.conf');
  });

  it('la config prod referencia el listener TLS 8883 (listo para activar)', () => {
    expect(prodConf).toContain('listener 8883');
    expect(prodConf).toContain('cafile');
    expect(prodConf).toContain('certfile');
    expect(prodConf).toContain('keyfile');
  });

  it('el ACL prod cubre el topic alarm del contrato (mush2/%c/alarm)', () => {
    expect(prodAcl).toContain('pattern write mush2/%c/alarm');
  });

  it('el ACL prod cubre ota/# para firmware (contrato §6.2)', () => {
    expect(prodAcl).toContain('pattern read mush2/%c/ota/#');
  });

  it('el ACL prod permite al bridge leer alarm', () => {
    expect(prodAcl).toContain('topic read mush2/+/alarm');
  });

  it('el contrato MQTT documenta el broker de producción con TLS 8883', () => {
    expect(contract).toContain('8883');
    expect(contract.toLowerCase()).toContain('producci');
  });

  it('docker-compose declara el servicio mosquitto con persistencia', () => {
    expect(compose).toContain('mosquitto');
    expect(compose).toContain('mosquitto-data');
  });

  it('render.yaml mantiene MQTT_BROKER_URL/PASS documentadas para el deploy (no valores inventados)', () => {
    expect(renderYaml).toContain('MQTT_BROKER_URL');
    expect(renderYaml).toContain('MQTT_BROKER_PASS');
  });
});
