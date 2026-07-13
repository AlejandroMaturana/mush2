import { PhaseTransition, CultivationCycle, Recipe } from '../models/index.js';
import { events } from './eventBus.js';

const PHASE_SEQUENCE = ['INCUBATION', 'FRUITING', 'MAINTENANCE', 'COMPLETED'];

const TRANSITION_RULES = {
  'Hericium erinaceus': {
    INCUBATION: {
      minDays: 14,
      maxDays: 28,
      sensorTrigger: { field: 'co2', operator: '<', value: 800, sustainMinutes: 60 },
      notes: 'Melena de León: transiciona cuando CO2 baja (<800ppm) indicando colonización activa',
    },
    FRUITING: {
      minDays: 7,
      maxDays: 14,
      sensorTrigger: { field: 'temperature', operator: '<', value: 22, sustainMinutes: 120 },
      notes: 'Fructificación estable a 18-22°C con FAE alto',
    },
  },
  'Ganoderma lucidum': {
    INCUBATION: {
      minDays: 30,
      maxDays: 45,
      sensorTrigger: { field: 'co2', operator: '<', value: 700, sustainMinutes: 120 },
      notes: 'Reishi: CO2 < 700ppm indica mielio maduro para fructificación',
    },
    FRUITING: {
      minDays: 21,
      maxDays: 30,
      notes: 'Reishi: ciclo largo de fructificación para formación de estante',
    },
  },
  'Lentinula edodes': {
    INCUBATION: {
      minDays: 45,
      maxDays: 60,
      sensorTrigger: { field: 'temperature', operator: '<', value: 16, sustainMinutes: 60 },
      notes: 'Shiitake: cold shock (<16°C) para inducir fructificación',
    },
    FRUITING: {
      minDays: 14,
      maxDays: 21,
      notes: 'Shiitake: fructificación con alta luz y ventilación',
    },
  },
  'Trametes versicolor': {
    INCUBATION: {
      minDays: 21,
      maxDays: 30,
      sensorTrigger: { field: 'co2', operator: '<', value: 900, sustainMinutes: 60 },
      notes: 'Cola de Pavo: colonización rápida, transición por CO2',
    },
    FRUITING: {
      minDays: 14,
      maxDays: 21,
      notes: 'Cola de Pavo: fructificación con ciclos de luz 8h',
    },
  },
  'Cordyceps militaris': {
    INCUBATION: {
      minDays: 10,
      maxDays: 14,
      sensorTrigger: { field: 'temperature', operator: '<', value: 22, sustainMinutes: 120 },
      notes: 'Cordyceps: transición rápida, temperature trigger',
    },
    FRUITING: {
      minDays: 14,
      maxDays: 21,
      notes: 'Cordyceps: estroma sobre grano, luz 12h',
    },
  },
  'Pleurotus ostreatus': {
    INCUBATION: {
      minDays: 10,
      maxDays: 21,
      sensorTrigger: { field: 'co2', operator: '<', value: 1000, sustainMinutes: 30 },
      notes: 'Pleurotus: colonización rápida, CO2 como indicador',
    },
    FRUITING: {
      minDays: 5,
      maxDays: 10,
      notes: 'Pleurotus: fructificación muy rápida con FAE alto',
    },
  },
  'Inonotus obliquus': {
    INCUBATION: {
      minDays: 30,
      maxDays: 60,
      sensorTrigger: { field: 'co2', operator: '<', value: 1200, sustainMinutes: 120 },
      notes: 'Chaga: crecimiento lento, necesita colonización extensa',
    },
    FRUITING: {
      minDays: 21,
      maxDays: 30,
      notes: 'Chaga: extracción por calor, ciclo largo',
    },
  },
};

const OPERATORS = {
  '<': (val, threshold) => val < threshold,
  '>': (val, threshold) => val > threshold,
  '<=': (val, threshold) => val <= threshold,
  '>=': (val, threshold) => val >= threshold,
  '==': (val, threshold) => Math.abs(val - threshold) < 0.5,
};

const sensorHistory = {};
const HISTORY_WINDOW = 3600000;

function recordSensorReading(cycleId, field, value) {
  if (!sensorHistory[cycleId]) sensorHistory[cycleId] = {};
  if (!sensorHistory[cycleId][field]) sensorHistory[cycleId][field] = [];

  const history = sensorHistory[cycleId][field];
  const now = Date.now();
  history.push({ value, timestamp: now });
  sensorHistory[cycleId][field] = history.filter(r => now - r.timestamp < HISTORY_WINDOW);
}

function checkSustainCondition(cycleId, field, operator, value, sustainMinutes) {
  const history = sensorHistory[cycleId]?.[field];
  if (!history || history.length === 0) return false;

  const op = OPERATORS[operator];
  if (!op) return false;

  const sustainMs = sustainMinutes * 60000;
  const cutoff = Date.now() - sustainMs;
  const recentReadings = history.filter(r => r.timestamp >= cutoff);

  if (recentReadings.length < 3) return false;
  return recentReadings.every(r => op(r.value, value));
}

export async function evaluatePhaseTransition(cycle, readings, recipe) {
  if (!readings || !recipe) return { shouldTransition: false };
  if (cycle.currentPhase === 'COMPLETED') return { shouldTransition: false };

  const config = cycle.adaptationConfig || {};
  const mode = config.mode || 'MANUAL';
  if (mode === 'MANUAL') return { shouldTransition: false };

  const speciesRules = TRANSITION_RULES[recipe.scientificName];
  if (!speciesRules) return { shouldTransition: false };

  const phaseRules = speciesRules[cycle.currentPhase];
  if (!phaseRules) return { shouldTransition: false };

  const now = Date.now();
  const phaseStart = cycle.phaseStartedAt ? new Date(cycle.phaseStartedAt).getTime() : now;
  const elapsedDays = (now - phaseStart) / 86400000;

  if (readings) {
    for (const [field, value] of Object.entries(readings)) {
      if (value != null) recordSensorReading(cycle.id, field, value);
    }
  }

  const minDays = phaseRules.minDays || 0;
  const maxDays = phaseRules.maxDays || Infinity;
  const sensorTrigger = phaseRules.sensorTrigger;

  if (elapsedDays < minDays) {
    return { shouldTransition: false, reason: `Min days not reached (${elapsedDays.toFixed(1)}/${minDays})` };
  }

  if (sensorTrigger) {
    const sensorValue = readings[sensorTrigger.field];
    if (sensorValue != null) {
      const sustained = checkSustainCondition(
        cycle.id, sensorTrigger.field,
        sensorTrigger.operator, sensorTrigger.value,
        sensorTrigger.sustainMinutes || 60,
      );
      if (sustained) {
        const idx = PHASE_SEQUENCE.indexOf(cycle.currentPhase);
        const nextPhase = PHASE_SEQUENCE[idx + 1];
        if (nextPhase) {
          const result = {
            shouldTransition: true,
            triggerType: 'SENSOR',
            fromPhase: cycle.currentPhase,
            toPhase: nextPhase,
            triggerData: {
              sensorReadings: readings,
              ruleMatched: {
                field: sensorTrigger.field,
                operator: sensorTrigger.operator,
                threshold: sensorTrigger.value,
                actualValue: sensorValue,
                sustainedMinutes: sensorTrigger.sustainMinutes,
                elapsedDays: parseFloat(elapsedDays.toFixed(1)),
              },
              notes: phaseRules.notes,
            },
          };
          if (mode === 'SEMI_AUTO') result.status = 'PENDING';
          return result;
        }
      }
    }
  }

  if (elapsedDays >= maxDays) {
    const idx = PHASE_SEQUENCE.indexOf(cycle.currentPhase);
    const nextPhase = PHASE_SEQUENCE[idx + 1];
    if (nextPhase) {
      const result = {
        shouldTransition: true,
        triggerType: 'TIME',
        fromPhase: cycle.currentPhase,
        toPhase: nextPhase,
        triggerData: {
          sensorReadings: readings,
          ruleMatched: { maxDays, elapsedDays: parseFloat(elapsedDays.toFixed(1)) },
          notes: phaseRules.notes,
        },
      };
      if (mode === 'SEMI_AUTO') result.status = 'PENDING';
      return result;
    }
  }

  if (sensorTrigger && elapsedDays >= minDays) {
    const sensorValue = readings[sensorTrigger.field];
    if (sensorValue != null) {
      const op = OPERATORS[sensorTrigger.operator];
      if (op && op(sensorValue, sensorTrigger.value)) {
        const idx = PHASE_SEQUENCE.indexOf(cycle.currentPhase);
        const nextPhase = PHASE_SEQUENCE[idx + 1];
        if (nextPhase) {
          const result = {
            shouldTransition: true,
            triggerType: 'SENSOR_SUGGESTED',
            fromPhase: cycle.currentPhase,
            toPhase: nextPhase,
            triggerData: {
              sensorReadings: readings,
              ruleMatched: {
                field: sensorTrigger.field,
                operator: sensorTrigger.operator,
                threshold: sensorTrigger.value,
                actualValue: sensorValue,
                sustainMinutes: sensorTrigger.sustainMinutes,
                sustained: false,
                elapsedDays: parseFloat(elapsedDays.toFixed(1)),
              },
              notes: phaseRules.notes,
            },
          };
          if (mode === 'SEMI_AUTO') result.status = 'PENDING';
          return result;
        }
      }
    }
  }

  return { shouldTransition: false };
}

export async function executePhaseTransition(cycle, transitionResult) {
  const transition = await PhaseTransition.create({
    cycleId: cycle.id,
    fromPhase: transitionResult.fromPhase,
    toPhase: transitionResult.toPhase,
    triggerType: transitionResult.triggerType,
    triggerData: transitionResult.triggerData,
    status: transitionResult.status || 'EXECUTED',
    executedAt: transitionResult.status === 'PENDING' ? null : new Date(),
  });

  if (transition.status === 'EXECUTED') {
    await cycle.update({
      currentPhase: transition.toPhase,
      phaseStartedAt: new Date(),
    });

    console.log(`[PHASE] Cycle ${cycle.id}: ${transition.fromPhase} → ${transition.toPhase} (${transition.triggerType})`);

    events.emit('phase_transition', {
      cycleId: cycle.id,
      fromPhase: transition.fromPhase,
      toPhase: transition.toPhase,
      triggerType: transition.triggerType,
      triggerData: transition.triggerData,
      transitionId: transition.id,
    });
  } else {
    console.log(`[PHASE] Cycle ${cycle.id}: Sugerencia de transición ${transition.fromPhase} → ${transition.toPhase} (pendiente aprobación)`);
  }

  return transition;
}

export function getTransitionRulesForSpecies(scientificName) {
  return TRANSITION_RULES[scientificName] || null;
}

export function getAllTransitionRules() {
  return TRANSITION_RULES;
}
