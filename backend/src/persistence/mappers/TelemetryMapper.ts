import { Telemetry, RunId } from '../../domain/index.js';
import type { TelemetryData } from '../../domain/index.js';

export interface TelemetryRecord {
  id: number;
  runId: number;
  deviceId: number;
  timestamp: Date;
  temperature: number;
  humidity: number;
  co2: number;
  voc: number | null;
  aqi: number | null;
  ssrState: number[];
  wifiRssi: number | null;
}

export function toTelemetryDomain(record: TelemetryRecord): Telemetry {
  const data: TelemetryData = {
    id: String(record.id),
    runId: RunId.create(String(record.runId)),
    deviceId: String(record.deviceId),
    timestamp: record.timestamp,
    temperature: record.temperature,
    humidity: record.humidity,
    co2: record.co2,
    voc: record.voc ?? 0,
    aqi: record.aqi ?? 0,
    ssrState: record.ssrState ?? [],
    wifiRssi: record.wifiRssi ?? 0,
  };
  return Telemetry.create(data);
}

export function toTelemetryRecord(telemetry: Telemetry): TelemetryRecord {
  const data = telemetry.toData();
  return {
    id: data.id ? Number(data.id) : 0,
    runId: Number(data.runId.value),
    deviceId: Number(data.deviceId),
    timestamp: data.timestamp,
    temperature: data.temperature,
    humidity: data.humidity,
    co2: data.co2,
    voc: data.voc,
    aqi: data.aqi,
    ssrState: data.ssrState,
    wifiRssi: data.wifiRssi,
  };
}
