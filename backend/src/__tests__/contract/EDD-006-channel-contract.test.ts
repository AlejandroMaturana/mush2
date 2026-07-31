import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Actuator } from '../../models/index.js';
import { ComputeActuators, type ActuatorCommand, type ActuatorType } from '../../application/use-cases/ComputeActuators.js';
import { Run, RunId, Telemetry, Recipe, RecipeId, ChamberId, TemperatureRange, HumidityRange, CO2Target, Phase, RunId as RID } from '../../domain/index.js';
import type { RecipeRepository } from '../../domain/index.js';

const VALID_TYPES: ActuatorType[] = ['VENTILATION', 'HEATER', 'HUMIDIFIER', 'LIGHT'];

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../../', relativePath), 'utf-8');
}

function makeRecipe(lightCycleHours?: number) {
  const tempRange = TemperatureRange.create(18, 28).unwrap();
  const humRange = HumidityRange.create(80, 95).unwrap();
  const co2Target = CO2Target.create(400, 800).unwrap();
  const phase = Phase.create({
    name: 'INCUBATION', tempRange, humRange, co2Target, durationDays: 14, lightCycleHours,
  }).unwrap();
  return Recipe.create({ id: RecipeId.create('recipe-1'), name: 'Reishi', species: 'Ganoderma', phases: [phase] }).unwrap();
}

function makeRun() {
  return Run.create({
    id: RunId.create('run-1'),
    chamberId: ChamberId.create('chamber-1'),
    recipeId: RecipeId.create('recipe-1'),
    status: 'ACTIVE',
    controlState: 'NORMAL',
    currentPhase: 'INCUBATION',
    startedAt: new Date(),
  });
}

async function compute(
  t: { temperature?: number; humidity?: number; co2?: number } = {},
  lightCycleHours?: number,
): Promise<ActuatorCommand[]> {
  const recipe = makeRecipe(lightCycleHours);
  const run = makeRun();
  const telemetry = Telemetry.create({
    runId: RID.create('run-1'),
    deviceId: 'esp32_001',
    timestamp: new Date(),
    temperature: t.temperature ?? 23,
    humidity: t.humidity ?? 88,
    co2: t.co2 ?? 500,
    voc: 10,
    aqi: 1,
    ssrState: [0, 0, 0, 0],
    wifiRssi: -65,
  });
  const mockRecipeRepo: RecipeRepository = {
    findById: vi.fn().mockResolvedValue(recipe),
    findAll: vi.fn().mockResolvedValue([recipe]),
    save: vi.fn(),
  };
  const result = await new ComputeActuators(mockRecipeRepo).execute({ run, telemetry });
  if (!result.isOk()) throw new Error('ComputeActuators failed');
  return result.value;
}

describe('EDD-006 — Mapeo canónico de canales (CH-T01 a CH-T13)', () => {
  describe('CH-T01 / CH-T02 — channel inválido', () => {
    it('CH-T01: channel 0 es rechazado por el modelo', async () => {
      await expect(Actuator.build({ deviceId: 1, channel: 0 }).validate()).rejects.toThrow();
    });

    it('CH-T02: channel 5 es rechazado por el modelo', async () => {
      await expect(Actuator.build({ deviceId: 1, channel: 5 }).validate()).rejects.toThrow();
    });

    it('CH-T01 + CH-T02: la ruta PATCH guarda channel 1-4 con 400', () => {
      const source = readSource('routes/actuators.js');
      expect(source).toContain('if (channel < 1 || channel > 4)');
      expect(source).toContain("error: 'channel debe ser 1-4'");
    });
  });

  describe('CH-T03 — channels 1-4 válidos', () => {
    it('el modelo acepta channel 1, 2, 3 y 4', async () => {
      for (const ch of [1, 2, 3, 4]) {
        await expect(Actuator.build({ deviceId: 1, channel: ch }).validate()).resolves.toBeDefined();
      }
    });

    it('ComputeActuators solo emite canales 1-4', async () => {
      const cmds = await compute({ temperature: 15, humidity: 60, co2: 900 }, 10);
      expect(cmds.length).toBeGreaterThan(0);
      for (const c of cmds) {
        expect([1, 2, 3, 4]).toContain(c.channel);
      }
    });
  });

  describe('CH-T04 a CH-T07 — channel ↔ ActuatorType', () => {
    it('CH-T04: CH1 ≡ VENTILATION', async () => {
      const cmds = await compute({ co2: 900 });
      const cmd = cmds.find(c => c.channel === 1);
      expect(cmd).toBeDefined();
      expect(cmd!.type).toBe('VENTILATION');
    });

    it('CH-T05: CH2 ≡ HEATER', async () => {
      const cmds = await compute({ temperature: 15 });
      const cmd = cmds.find(c => c.channel === 2);
      expect(cmd).toBeDefined();
      expect(cmd!.type).toBe('HEATER');
    });

    it('CH-T06: CH3 ≡ HUMIDIFIER', async () => {
      const cmds = await compute({ humidity: 60 });
      const cmd = cmds.find(c => c.channel === 3);
      expect(cmd).toBeDefined();
      expect(cmd!.type).toBe('HUMIDIFIER');
    });

    it('CH-T07: CH4 ≡ LIGHT (emite cuando la fase define lightCycleHours)', async () => {
      const cmds = await compute({}, 10);
      const cmd = cmds.find(c => c.channel === 4);
      expect(cmd).toBeDefined();
      expect(cmd!.type).toBe('LIGHT');
      expect(cmd!.state).toBe('ON');
    });

    it('CH-T07: el modelo contempla CH4 (validate min 1 max 4)', () => {
      const source = readSource('models/Actuator.js');
      expect(source).toContain('min: 1');
      expect(source).toContain('max: 4');
    });
  });

  describe('CH-T10 — Fan no permitido como ActuatorType', () => {
    it('ComputeActuators no referencia "Fan" como tipo', () => {
      const source = readSource('application/use-cases/ComputeActuators.ts');
      expect(source).not.toContain("'Fan'");
    });

    it('todos los comandos emitidos usan un ActuatorType válido', async () => {
      const cmds = await compute({ temperature: 15, humidity: 60, co2: 900 }, 10);
      expect(cmds.length).toBeGreaterThan(0);
      for (const c of cmds) {
        expect(VALID_TYPES).toContain(c.type);
      }
    });
  });

  describe('CH-T12 — channel inválido no muta estado', () => {
    it('el guard 1-4 en PATCH devuelve 400 antes de publicar el comando', () => {
      const source = readSource('routes/actuators.js');
      const guardIdx = source.indexOf('if (channel < 1 || channel > 4)');
      const publishIdx = source.indexOf('publishActuatorCommand(deviceId, cmds)');
      expect(guardIdx).toBeGreaterThan(-1);
      expect(publishIdx).toBeGreaterThan(guardIdx);
    });
  });
});
