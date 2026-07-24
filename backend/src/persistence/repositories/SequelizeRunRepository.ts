import type { RunRepository } from '../../domain/index.js';
import { Run } from '../../domain/index.js';
import CultivationCycle from '../../models/CultivationCycle.js';
import { toRunDomain, toRunRecord, type RunRecord } from '../mappers/RunMapper.js';

export class SequelizeRunRepository implements RunRepository {
  async findById(id: string): Promise<Run | null> {
    const record = await CultivationCycle.findByPk(Number(id));
    if (!record) return null;
    return toRunDomain(record as RunRecord);
  }

  async findByChamberId(chamberId: string): Promise<Run | null> {
    const record = await CultivationCycle.findOne({
      where: { chamberId: Number(chamberId), status: 'ACTIVE' },
    });
    if (!record) return null;
    return toRunDomain(record as RunRecord);
  }

  async findActiveRuns(): Promise<Run[]> {
    const records = await CultivationCycle.findAll({
      where: { status: 'ACTIVE' },
    });
    return records.map(r => toRunDomain(r as RunRecord));
  }

  async save(run: Run): Promise<void> {
    const record = toRunRecord(run);
    await CultivationCycle.upsert(record);
  }
}
