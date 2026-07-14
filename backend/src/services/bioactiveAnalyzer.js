import { Op } from 'sequelize';
import { CultivationCycle, CycleState, BioactiveProfile, Recipe, SpeciesProfile } from '../models/index.js';

export async function getEnvironmentSummary(cycleId) {
  const states = await CycleState.findAll({
    where: { cycleId },
    order: [['snapshotDate', 'ASC']],
  });

  if (states.length === 0) return {};

  const phases = {};
  for (const state of states) {
    const phase = state.phase || 'unknown';
    if (!phases[phase]) {
      phases[phase] = { temps: [], hums: [], co2s: [], count: 0 };
    }
    phases[phase].temps.push(parseFloat(state.temperature) || 0);
    phases[phase].hums.push(parseFloat(state.humidity) || 0);
    phases[phase].co2s.push(parseFloat(state.co2) || 0);
    phases[phase].count++;
  }

  const summary = {};
  for (const [phase, data] of Object.entries(phases)) {
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const min = (arr) => arr.length ? Math.min(...arr) : 0;
    const max = (arr) => arr.length ? Math.max(...arr) : 0;

    summary[phase] = {
      avgTemp: Math.round(avg(data.temps) * 10) / 10,
      minTemp: Math.round(min(data.temps) * 10) / 10,
      maxTemp: Math.round(max(data.temps) * 10) / 10,
      avgHum: Math.round(avg(data.hums) * 10) / 10,
      minHum: Math.round(min(data.hums) * 10) / 10,
      maxHum: Math.round(max(data.hums) * 10) / 10,
      avgCO2: Math.round(avg(data.co2s)),
      minCO2: Math.round(min(data.co2s)),
      maxCO2: Math.round(max(data.co2s)),
      snapshots: data.count,
    };
  }

  return summary;
}

export async function getCorrelation(cycleId) {
  const cycle = await CultivationCycle.findByPk(cycleId, {
    include: [{ model: Recipe, include: [{ model: SpeciesProfile }] }],
  });

  if (!cycle) return null;

  const envSummary = await getEnvironmentSummary(cycleId);

  const bioactives = await BioactiveProfile.findAll({
    where: { cycleId },
    order: [['compoundName', 'ASC'], ['analysisDate', 'DESC']],
  });

  const compounds = {};
  for (const b of bioactives) {
    if (!compounds[b.compoundName]) {
      compounds[b.compoundName] = {
        name: b.compoundName,
        values: [],
        unit: b.unit,
      };
    }
    compounds[b.compoundName].values.push(parseFloat(b.concentration));
  }

  const compoundList = Object.values(compounds).map(c => ({
    name: c.name,
    avgConcentration: c.values.length
      ? Math.round(c.values.reduce((a, b) => a + b, 0) / c.values.length * 100) / 100
      : 0,
    minConcentration: c.values.length ? Math.min(...c.values) : 0,
    maxConcentration: c.values.length ? Math.max(...c.values) : 0,
    unit: c.unit,
    sampleCount: c.values.length,
  }));

  const insights = generateInsights(envSummary, compoundList, cycle);

  return {
    cycleId,
    species: cycle.Recipe?.SpeciesProfile?.name || cycle.species || 'Unknown',
    environmentByPhase: envSummary,
    compounds: compoundList,
    insights,
  };
}

function generateInsights(envSummary, compounds, cycle) {
  const insights = [];

  const fruiting = envSummary.fruiting || envSummary.FRUITING;
  if (fruiting) {
    if (fruiting.avgCO2 < 800) {
      insights.push(`CO2 promedio < 800ppm durante fructificación (${fruiting.avgCO2}ppm) — condiciones óptimas para producción de compuestos`);
    } else if (fruiting.avgCO2 > 1200) {
      insights.push(`CO2 alto (${fruiting.avgCO2}ppm) durante fructificación — puede reducir síntesis de compuestos bioactivos`);
    }

    if (fruiting.avgHum >= 85 && fruiting.avgHum <= 92) {
      insights.push(`Humedad ${fruiting.avgHum}% en rango ideal (85-92%) durante fructificación`);
    }

    if (fruiting.avgTemp >= 18 && fruiting.avgTemp <= 23) {
      insights.push(`Temperatura ${fruiting.avgTemp}°C en rango óptimo para desarrollo de fructificaciones`);
    }
  }

  const incubation = envSummary.incubation || envSummary.INCUBATION;
  if (incubation) {
    if (incubation.avgCO2 > 1000) {
      insights.push(`CO2 elevado (${incubation.avgCO2}ppm) durante incubación — normal para colonización, verificar que no persista en fructificación`);
    }
  }

  for (const c of compounds) {
    if (c.avgConcentration > 0) {
      insights.push(`${c.name}: ${c.avgConcentration} ${c.unit} (promedio de ${c.sampleCount} análisis)`);
    }
  }

  return insights;
}
