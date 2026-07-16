import { Op } from 'sequelize';
import { Device, Telemetry, Recipe, CultivationCycle, CycleState, Actuator, Alarm } from '../models/index.js';
import SystemSetting from '../models/SystemSetting.js';
import { events } from './eventBus.js';
import { evaluatePhaseTransition, executePhaseTransition } from './phaseEvaluator.js';

const PHASE_SEQUENCE = ['INCUBATION', 'FRUITING', 'MAINTENANCE', 'COMPLETED'];
const EVAL_INTERVAL = 60000;
let TEMP_CRITICAL = 32.0;
let TEMP_RECOVERY = 28.0;

let intervalHandle = null;

const actuatorState = {};

async function loadSafetySettings() {
  try {
    const [critSetting, recSetting] = await Promise.all([
      SystemSetting.findOne({ where: { key: 'temp_critical' } }),
      SystemSetting.findOne({ where: { key: 'temp_recovery' } }),
    ]);
    if (critSetting) TEMP_CRITICAL = parseFloat(critSetting.value) || 32.0;
    if (recSetting) TEMP_RECOVERY = parseFloat(recSetting.value) || 28.0;
  } catch { /* use defaults */ }
}

function getActuatorState(deviceId) {
  if (!actuatorState[deviceId]) {
    actuatorState[deviceId] = { ventOn: false, heatOn: false, humidOn: false, postVentActive: false, postVentStart: 0, overheat: false, prevVent: false, prevHeat: false, prevHumid: false };
  }
  return actuatorState[deviceId];
}

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

function severityFromDeviation(value, min, max) {
  if (value == null) return null;
  if (min != null && value < min) {
    const diff = min - value;
    if (diff > 3) return 'CRITICAL';
    if (diff > 1.5) return 'HIGH';
    return 'MEDIUM';
  }
  if (max != null && value > max) {
    const diff = value - max;
    if (diff > 3) return 'CRITICAL';
    if (diff > 1.5) return 'HIGH';
    return 'MEDIUM';
  }
  return null;
}

async function ensureAlarm(deviceId, type, sensorType, severity, message, currentValue, thresholdMin, thresholdMax) {
  const existing = await Alarm.findOne({
    where: { deviceId, type, sensorType, resolvedAt: null },
  });
  if (existing) return existing;

  const alarm = await Alarm.create({
    deviceId, type, sensorType, severity, message,
    currentValue, thresholdMin, thresholdMax,
  });

  events.emit('alarm', {
    id: alarm.id,
    deviceId,
    type,
    severity,
    sensorType,
    message,
    currentValue,
    createdAt: alarm.createdAt,
  });

  return alarm;
}

async function resolveAlarm(deviceId, type, sensorType) {
  const active = await Alarm.findOne({
    where: { deviceId, type, sensorType, resolvedAt: null },
  });
  if (!active) return;

  await active.update({ resolvedAt: new Date() });

  events.emit('alarm', {
    id: active.id,
    deviceId,
    type,
    severity: active.severity,
    sensorType,
    message: active.message,
    resolvedAt: active.resolvedAt,
    currentValue: active.currentValue,
  });
}

function calcVPD(temp, hum) {
  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  return ((100 - hum) / 100) * es;
}

function computeActuatorCommands(deviceId, temp, hum, co2, thresholds) {
  const state = getActuatorState(deviceId);
  const now = Date.now();
  const commands = [];

  if (temp >= TEMP_CRITICAL) {
    if (!state.overheat) {
      state.overheat = true;
      commands.push({ channel: 1, command: 'ON', reason: 'OVERHEAT' });
      commands.push({ channel: 2, command: 'OFF', reason: 'OVERHEAT' });
      commands.push({ channel: 3, command: 'OFF', reason: 'OVERHEAT' });
      console.log(`[CONTROL] ${deviceId} OVERHEAT — vent ON, heat/humid OFF`);
    }
    return commands;
  }

  if (state.overheat && temp < TEMP_RECOVERY) {
    state.overheat = false;
    state.ventOn = false;
    console.log(`[CONTROL] ${deviceId} Overheat cleared`);
  }

  if (state.overheat) return commands;

  const ventThresholdOnTemp = thresholds.tempMax + 1.0;
  const ventThresholdOnCo2 = thresholds.co2Max + 100;
  const ventThresholdOffTemp = thresholds.tempMax - 1.0;
  const ventThresholdOffCo2 = thresholds.co2Max - 100;

  let shouldVent = false;
  if (temp >= ventThresholdOnTemp || (co2 > 0 && co2 >= ventThresholdOnCo2)) {
    shouldVent = true;
  }
  if (state.ventOn) {
    if (!(temp < ventThresholdOffTemp && (co2 === 0 || co2 < ventThresholdOffCo2))) {
      shouldVent = true;
    }
  }

  if (state.ventOn && !shouldVent) {
    state.postVentActive = true;
    state.postVentStart = now;
  }
  state.ventOn = shouldVent;

  if (state.ventOn && !state.prevVent) {
    if (co2 > 0) {
      commands.push({ channel: 1, command: 'ON', reason: co2 > thresholds.co2Max ? 'CO2_HIGH' : 'TEMP_HIGH' });
    } else {
      commands.push({ channel: 1, command: 'ON', reason: 'TEMP_HIGH' });
    }
  } else if (!state.ventOn && state.prevVent) {
    commands.push({ channel: 1, command: 'OFF', reason: 'CLEAR' });
  }

  if (state.ventOn) {
    state.heatOn = false;
    state.humidOn = false;
    if (state.prevHeat) {
      commands.push({ channel: 2, command: 'OFF', reason: 'VENT_BLOCK' });
    }
    if (state.prevHumid) {
      commands.push({ channel: 3, command: 'OFF', reason: 'VENT_BLOCK' });
    }
  } else {
    if (state.heatOn) {
      if (temp >= thresholds.tempMax) {
        state.heatOn = false;
      }
    } else {
      if (temp <= thresholds.tempMin - 1.0) {
        state.heatOn = true;
      }
    }
    if (state.heatOn !== state.prevHeat) {
      commands.push({ channel: 2, command: state.heatOn ? 'ON' : 'OFF', reason: state.heatOn ? 'TEMP_LOW' : 'TEMP_OK' });
    }

    if (temp >= 27.5) {
      state.humidOn = false;
    } else if (state.humidOn) {
      if (hum >= thresholds.humMax || temp >= 28.0) {
        state.humidOn = false;
      }
    } else {
      const postVentElapsed = state.postVentActive ? (now - state.postVentStart) : 999999;
      if (state.postVentActive && postVentElapsed >= 10000 && postVentElapsed < 40000) {
        state.humidOn = true;
      } else if (state.postVentActive && postVentElapsed >= 40000) {
        state.postVentActive = false;
      }
      if (hum <= thresholds.humMin - 7.0 && temp < 27.5) {
        state.humidOn = true;
      }
    }
    if (state.humidOn !== state.prevHumid) {
      commands.push({ channel: 3, command: state.humidOn ? 'ON' : 'OFF', reason: state.humidOn ? 'HUM_LOW' : 'HUM_OK' });
    }
  }

  state.prevVent = state.ventOn;
  state.prevHeat = state.heatOn;
  state.prevHumid = state.humidOn;

  return commands;
}

async function getLatestReadings(deviceId) {
  const latest = await Telemetry.findOne({
    where: { deviceId },
    order: [['timestamp', 'DESC']],
  });
  if (!latest) return null;

  const [rows] = await Telemetry.sequelize.query(`
    SELECT DISTINCT ON (t."sensorType") t."sensorType", t.value, t."timestamp"
    FROM telemetry t
    WHERE t."deviceId" = $1
    ORDER BY t."sensorType", t."timestamp" DESC
  `, { bind: [deviceId] });

  const readings = {};
  for (const row of rows) {
    readings[row.sensorType.toLowerCase()] = parseFloat(row.value);
  }
  return readings;
}

async function evaluateCycle(cycle) {
  try {
    const recipe = await Recipe.findByPk(cycle.recipeId);
    if (!recipe) return;

    const thresholds = getPhaseThresholds(recipe, cycle.currentPhase);
    if (!thresholds) return;

    let device = null;
    if (cycle.deviceId) {
      device = await Device.findByPk(cycle.deviceId);
    } else if (cycle.chamberId) {
      device = await Device.findOne({ where: { chamberId: cycle.chamberId } });
    }
    if (!device) return;

    const readings = await getLatestReadings(device.id);
    if (!readings) return;

    const temp = readings.temperature;
    const hum = readings.humidity;
    const co2 = readings.co2;

    const vpd = (temp != null && hum != null) ? calcVPD(temp, hum) : null;

    await CycleState.create({
      cycleId: cycle.id,
      phase: cycle.currentPhase,
      temperature: temp,
      humidity: hum,
      co2,
      voc: readings.voc,
      vpd: vpd ? parseFloat(vpd.toFixed(3)) : null,
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
    if (vpd != null) {
      if (vpd > 0.9) deviations.push(`VPD_HIGH:${vpd.toFixed(3)}`);
      if (vpd < 0.3) deviations.push(`VPD_LOW:${vpd.toFixed(3)}`);
    }

    const alarmChecks = [
      { sensorType: 'TEMPERATURE', value: temp, min: thresholds.tempMin, max: thresholds.tempMax },
      { sensorType: 'HUMIDITY', value: hum, min: thresholds.humMin, max: thresholds.humMax },
      { sensorType: 'CO2', value: co2, min: null, max: thresholds.co2Max },
    ];

    for (const check of alarmChecks) {
      if (check.value == null) continue;
      const sev = severityFromDeviation(check.value, check.min, check.max);
      if (sev) {
        await ensureAlarm(
          device.id,
          'THRESHOLD_CROSSED',
          check.sensorType,
          sev,
          `${check.sensorType} fuera de rango: ${check.value.toFixed(1)} (rango: ${check.min ?? '-'}–${check.max ?? '-'})`,
          check.value,
          check.min,
          check.max,
        );
      } else {
        await resolveAlarm(device.id, 'THRESHOLD_CROSSED', check.sensorType);
      }
    }

    const commands = (temp != null) ? computeActuatorCommands(device.deviceId, temp, hum, co2, thresholds) : [];

    const currentActuators = await Actuator.findAll({ where: { deviceId: device.id } });
    const overrideMap = {};
    for (const a of currentActuators) {
      overrideMap[a.channel] = a.overrideUntil && new Date(a.overrideUntil) > new Date();
    }
    const filteredCommands = commands.filter(cmd => !overrideMap[cmd.channel]);

    for (const cmd of filteredCommands) {
      try {
        const [actuator] = await Actuator.findOrCreate({
          where: { deviceId: device.id, channel: cmd.channel },
          defaults: { deviceId: device.id, channel: cmd.channel },
        });
        await actuator.update({
          state: cmd.command,
          lastCommand: `auto_${cmd.reason}_${Date.now()}`,
          lastSeen: new Date(),
          mode: 'REMOTE',
        });
      } catch (err) {
        console.error(`[CONTROL] Error updating actuator ${cmd.channel}:`, err.message);
      }
    }

    if (filteredCommands.length > 0) {
      console.log(`[CONTROL] ${device.deviceId} → ${filteredCommands.map(c => `CH${c.channel}=${c.command}(${c.reason})`).join(' | ')}`);
    }

    const evalEvent = {
      deviceId: device.deviceId,
      cycleId: cycle.id,
      phase: cycle.currentPhase,
      thresholds: { tempMin: thresholds.tempMin, tempMax: thresholds.tempMax, humMin: thresholds.humMin, humMax: thresholds.humMax, co2Max: thresholds.co2Max },
      readings: { temp, hum, co2, vpd: vpd ? parseFloat(vpd.toFixed(3)) : null },
      deviations,
      actuatorCommands: filteredCommands.map(c => ({ channel: c.channel, command: c.command, reason: c.reason })),
    };
    events.emit('control_eval', evalEvent);

    if (thresholds.durationDays && cycle.startDate) {
      const start = new Date(cycle.startDate);
      const elapsed = Math.floor((Date.now() - start.getTime()) / 86400000);
      if (elapsed >= thresholds.durationDays) {
        const currentIdx = PHASE_SEQUENCE.indexOf(cycle.currentPhase);
        if (currentIdx >= 0 && currentIdx < PHASE_SEQUENCE.length - 1) {
          const prevPhase = cycle.currentPhase;
          const nextPhase = PHASE_SEQUENCE[currentIdx + 1];
          await cycle.update({ currentPhase: nextPhase, phaseStartedAt: new Date() });
          console.log(`[CONTROL] Cycle ${cycle.id} avanzó a fase ${nextPhase}`);

          const configCmd = {
            target: 'config',
            tempMin: parseFloat(recipe[`${nextPhase.toLowerCase()}TempMin`]),
            tempMax: parseFloat(recipe[`${nextPhase.toLowerCase()}TempMax`]),
            humMin: parseFloat(recipe[`${nextPhase.toLowerCase()}HumMin`]),
            humMax: parseFloat(recipe[`${nextPhase.toLowerCase()}HumMax`]),
            co2Max: recipe[`${nextPhase.toLowerCase()}Co2Max`],
            mode: 'LOCAL',
          };
          console.log(`[CONTROL] Phase transition config updated in DB:`, configCmd);

          events.emit('control_eval', {
            deviceId: device.deviceId,
            cycleId: cycle.id,
            event: 'PHASE_TRANSITION',
            fromPhase: prevPhase,
            toPhase: nextPhase,
          });
          events.emit('phase_transition', {
            deviceId: device.deviceId,
            cycleId: cycle.id,
            fromPhase: prevPhase,
            toPhase: nextPhase,
          });
          events.emit('phase_transition', {
            deviceId: device.deviceId,
            cycleId: cycle.id,
            fromPhase: cycle.currentPhase,
            toPhase: nextPhase,
          });

          if (nextPhase === 'COMPLETED') {
            await cycle.update({ status: 'COMPLETED' });
            for (const ch of [1, 2, 3]) {
              try {
                const [act] = await Actuator.findOrCreate({ where: { deviceId: device.id, channel: ch }, defaults: { deviceId: device.id, channel: ch } });
                await act.update({ state: 'OFF', mode: 'REMOTE', lastSeen: new Date() });
              } catch (e) {
                console.error(`[CONTROL] Error turning off ch${ch}:`, e.message);
              }
            }
          }
        }
      }
    }

    const transitionResult = await evaluatePhaseTransition(cycle, readings, recipe);
    if (transitionResult.shouldTransition) {
      await executePhaseTransition(cycle, transitionResult);
    }
  } catch (err) {
    console.error(`[CONTROL] Error evaluating cycle ${cycle.id}:`, err.message);
  }
}

export async function evaluateAllCycles() {
  try {
    await loadSafetySettings();

    const activeCycles = await CultivationCycle.findAll({
      where: {
        status: 'ACTIVE',
        currentPhase: { [Op.ne]: 'COMPLETED' },
      },
    });

    for (const cycle of activeCycles) {
      await evaluateCycle(cycle);
    }

    if (activeCycles.length > 0) {
      console.log(`[CONTROL] Evaluated ${activeCycles.length} active cycles`);
    }
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
