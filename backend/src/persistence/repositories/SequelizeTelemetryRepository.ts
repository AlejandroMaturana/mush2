import type { TelemetryRepository } from '../../domain/index.js';
import { Telemetry } from '../../domain/index.js';
import TelemetryModel from '../../models/Telemetry.js';
import { toTelemetryDomain, toTelemetryRecord, type TelemetryRecord } from '../mappers/TelemetryMapper.js';

export class SequelizeTelemetryRepository implements TelemetryRepository {
  async save(telemetry: Telemetry): Promise<void> {
    const record = toTelemetryRecord(telemetry);
    await TelemetryModel.create(record as any);
  }

  async findLatestByRunId(runId: string): Promise<Telemetry | null> {
    const record = await TelemetryModel.findOne({
      where: { runId: Number(runId) },
      order: [['timestamp', 'DESC']],
    });
    if (!record) return null;
    return toTelemetryDomain(record as TelemetryRecord);
  }

  async findByRunIdAndTimeRange(runId: string, from: Date, to: Date): Promise<Telemetry[]> {
    const records = await TelemetryModel.findAll({
      where: {
        runId: Number(runId),
        timestamp: { $between: [from, to] },
      },
      order: [['timestamp', 'ASC']],
    });
    return records.map(r => toTelemetryDomain(r as TelemetryRecord));
  }
}
