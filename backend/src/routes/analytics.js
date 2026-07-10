import { Router } from 'express';
import { Op } from 'sequelize';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { Device, Telemetry, CultivationCycle, CycleState, Actuator } from '../models/index.js';

function calcVPD(temp, rh) {
  if (temp == null || rh == null) return null;
  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  const vpd = es - (es * rh / 100);
  return { vpd: Math.round(vpd * 100) / 100, saturationDeficit: Math.round((es - vpd) * 100) / 100 };
}

function calcRisks(temp, rh, vpd) {
  const risks = { condensation: 0, heatStress: 0, waterStress: 0 };
  if (rh != null) {
    if (rh >= 95) risks.condensation = 100;
    else if (rh >= 85) risks.condensation = 60 + (rh - 85) * 2.67;
    else if (rh >= 75) risks.condensation = 30 + (rh - 75) * 3;
    else risks.condensation = rh * 0.4;
  }
  if (temp != null) {
    if (temp >= 35) risks.heatStress = 100;
    else if (temp >= 30) risks.heatStress = 50 + (temp - 30) * 10;
    else if (temp >= 28) risks.heatStress = 20 + (temp - 28) * 15;
    else if (temp <= 10) risks.heatStress = 60;
    else if (temp <= 15) risks.heatStress = 30;
    else risks.heatStress = 0;
  }
  if (vpd != null) {
    if (vpd >= 2.5) risks.waterStress = 100;
    else if (vpd >= 1.8) risks.waterStress = 60 + (vpd - 1.8) * 57;
    else if (vpd >= 1.2) risks.waterStress = 20 + (vpd - 1.2) * 67;
    else if (vpd <= 0.2) risks.waterStress = 80;
    else if (vpd <= 0.4) risks.waterStress = 40;
    else risks.waterStress = 0;
  }
  Object.keys(risks).forEach(k => { risks[k] = Math.round(Math.min(100, Math.max(0, risks[k]))); });
  return risks;
}

const router = Router();

router.get('/:chamberId/analytics', optionalAuth, async (req, res) => {
  try {
    const device = await Device.findOne({
      where: { [Op.or]: [{ id: req.params.chamberId }, { deviceId: req.params.chamberId }] },
      include: [{ model: Actuator, attributes: ['channel', 'state', 'mode'] }],
    });
    if (!device) return res.status(404).json({ error: 'NOT_FOUND' });

    const latestTelemetry = await Telemetry.findAll({
      where: { deviceId: device.id },
      attributes: ['sensorType', 'value', 'unit', 'timestamp'],
      order: [['timestamp', 'DESC']],
      limit: 4,
    });

    const sensors = { temperature: null, humidity: null, co2: null, voc: null };
    for (const t of latestTelemetry) {
      const key = t.sensorType?.toLowerCase();
      if (key === 'temperature') sensors.temperature = t.value;
      else if (key === 'humidity') sensors.humidity = t.value;
      else if (key === 'co2') sensors.co2 = t.value;
      else if (key === 'voc') sensors.voc = t.value;
    }

    const vpdResult = calcVPD(sensors.temperature, sensors.humidity);
    const risks = calcRisks(sensors.temperature, sensors.humidity, vpdResult?.vpd);

    const activeCycle = await CultivationCycle.findOne({
      where: { deviceId: device.id, status: { [Op.in]: ['ACTIVE', 'RUNNING'] } },
      include: [{ model: CycleState, separate: true, limit: 1, order: [['timestamp', 'DESC']] }],
    });

    const cycleDetail = activeCycle ? {
      id: activeCycle.id,
      species: activeCycle.species,
      status: activeCycle.status,
      startedAt: activeCycle.startedAt,
      currentPhase: activeCycle.currentPhase,
      daysElapsed: activeCycle.startedAt ? Math.floor((Date.now() - new Date(activeCycle.startedAt)) / 86400000) : null,
      lastState: activeCycle.CycleStates?.[0] || null,
    } : null;

    const totalDevices = await Device.count();
    const faeCount = (device.Actuators || []).filter(a => a.mode === 'FAE').length;

    res.json({
      data: {
        chamber: {
          id: device.id,
          deviceId: device.deviceId,
          name: device.chamberName || device.deviceId,
          status: device.status,
          lastSeen: device.lastSeen,
        },
        telemetry: {
          temperature: { value: sensors.temperature, unit: '°C' },
          humidity: { value: sensors.humidity, unit: '%' },
          co2: { value: sensors.co2, unit: 'ppm' },
          voc: { value: sensors.voc, unit: 'ppb' },
        },
        vpd: vpdResult ? { ...vpdResult, unit: 'kPa' } : null,
        risks,
        cycle: cycleDetail,
        efficiency: {
          totalDevices,
          faeEnabled: faeCount > 0,
          faeCount,
          actuatorCount: (device.Actuators || []).length,
        },
        ts: Date.now(),
      },
    });
  } catch (err) {
    console.error('[ANALYTICS] Error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
