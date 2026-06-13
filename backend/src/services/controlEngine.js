import { Op } from 'sequelize';
import { Device, Telemetry, Recipe, CultivationCycle, CycleState } from '../models/index.js';
import { events } from './mqttService.js';

const PHASE_SEQUENCE = ['INCUBATION', 'FRUITING', 'MAINTENANCE', 'COMPLETED'];
const EVAL_INTERVAL = 60000;

let intervalHandle = null;

function getPhaseThresholds(recipe, phase) {
  switch (phase) {
    case 'INCUBATION':
      return {
        tempMin: parseFloat(recipe.incubationTempMin),
        tempMax: parseFloat(recipe.incubationTempMax),
        humMin: parseFloat(recipe.incubationHumMin),
        humMax: parseFloat(recipe.incubationHumMax),
        co2Max: recipe.incubationCo2Max,
        durationDays: recipe.incubationDurationDays,
      };
    case 'FRUITING':
      return {
        tempMin: parseFloat(recipe.fruitingTempMin),
        tempMax: parseFloat(recipe.fruitingTempMax),
        humMin: parseFloat(recipe.fruitingHumMin),
        humMax: parseFloat(recipe.fruitingHumMax),
        co2Max: recipe.fruitingCo2Max,
        durationDays: recipe.fruitingDurationDays,
      };
    case 'MAINTENANCE':
      return {
        tempMin: parseFloat(recipe.maintenanceTempMin),
        tempMax: parseFloat(recipe.maintenanceTempMax),
        humMin: parseFloat(recipe.maintenanceHumMin),
        humMax: parseFloat(recipe.maintenanceHumMax),
        co2Max: recipe.maintenanceCo2Max,
        durationDays: null,
      };
    default:
      return null;
  }
}

async function evaluateCycle(cycle) {
  try {
    const recipe = await Recipe.findByPk(cycle.recipeId);
    if (!recipe) return;

    const thresholds = getPhaseThresholds(recipe, cycle.currentPhase);
    if (!thresholds) return;

    const device = await Device.findOne({ where: { chamberId: cycle.chamberId } });
    if (!device) return;

    const latest = await Telemetry.findOne({
      where: { deviceId: device.id },
      order: [['timestamp', 'DESC']],
    });
    if (!latest) return;

    const [rows] = await Telemetry.sequelize.query(`
      SELECT DISTINCT ON (t."sensorType") t."sensorType", t.value, t."timestamp"
      FROM telemetry t
      WHERE t."deviceId" = $1
      ORDER BY t."sensorType", t."timestamp" DESC
    `, { bind: [device.id] });

    const readings = {};
    for (const row of rows) {
      readings[row.sensorType.toLowerCase()] = parseFloat(row.value);
    }

    const temp = readings.temperature;
    const hum = readings.humidity;
    const co2 = readings.co2;

    await CycleState.create({
      cycleId: cycle.id,
      phase: cycle.currentPhase,
      temperature: temp,
      humidity: hum,
      co2,
      voc: readings.voc,
      snapshotDate: new Date(),
    });

    const deviations = [];
    if (temp != null) {
      if (temp < thresholds.tempMin) deviations.push(`TEMP_LOW:${temp}`);
      if (temp > thresholds.tempMax) deviations.push(`TEMP_HIGH:${temp}`);
    }
    if (hum != null) {
      if (hum < thresholds.humMin) deviations.push(`HUM_LOW:${hum}`);
      if (hum > thresholds.humMax) deviations.push(`HUM_HIGH:${hum}`);
    }
    if (co2 != null && co2 > thresholds.co2Max) {
      deviations.push(`CO2_HIGH:${co2}`);
    }

    const mqttEvent = {
      deviceId: device.deviceId,
      cycleId: cycle.id,
      phase: cycle.currentPhase,
      thresholds: { tempMin: thresholds.tempMin, tempMax: thresholds.tempMax, humMin: thresholds.humMin, humMax: thresholds.humMax, co2Max: thresholds.co2Max },
      readings: { temp, hum, co2 },
      deviations,
    };
    events.emit('control_eval', mqttEvent);

    if (thresholds.durationDays && cycle.startDate) {
      const start = new Date(cycle.startDate);
      const elapsed = Math.floor((Date.now() - start.getTime()) / 86400000);
      if (elapsed >= thresholds.durationDays) {
        const currentIdx = PHASE_SEQUENCE.indexOf(cycle.currentPhase);
        if (currentIdx >= 0 && currentIdx < PHASE_SEQUENCE.length - 1) {
          const nextPhase = PHASE_SEQUENCE[currentIdx + 1];
          await cycle.update({ currentPhase: nextPhase });
          console.log(`[CONTROL] Cycle ${cycle.id} avanzó a fase ${nextPhase}`);

          events.emit('control_eval', {
            deviceId: device.deviceId,
            cycleId: cycle.id,
            event: 'PHASE_TRANSITION',
            fromPhase: cycle.currentPhase,
            toPhase: nextPhase,
          });

          if (nextPhase === 'COMPLETED') {
            await cycle.update({ status: 'COMPLETED' });
          }
        }
      }
    }
  } catch (err) {
    console.error(`[CONTROL] Error evaluating cycle ${cycle.id}:`, err.message);
  }
}

export async function evaluateAllCycles() {
  try {
    const activeCycles = await CultivationCycle.findAll({
      where: {
        status: 'ACTIVE',
        currentPhase: { [Op.ne]: 'COMPLETED' },
      },
    });

    for (const cycle of activeCycles) {
      await evaluateCycle(cycle);
    }

    console.log(`[CONTROL] Evaluated ${activeCycles.length} active cycles`);
  } catch (err) {
    console.error('[CONTROL] Error evaluating cycles:', err.message);
  }
}

export function startControlEngine() {
  console.log('[CONTROL] Engine started');
  evaluateAllCycles();
  intervalHandle = setInterval(evaluateAllCycles, EVAL_INTERVAL);
}

export function stopControlEngine() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  console.log('[CONTROL] Engine stopped');
}
