import type { AlarmRepository } from '../../domain/index.js';
import { Alarm } from '../../domain/index.js';
import AlarmModel from '../../models/Alarm.js';
import { toAlarmDomain, toAlarmRecord, type AlarmRecord } from '../mappers/AlarmMapper.js';

export class SequelizeAlarmRepository implements AlarmRepository {
  async save(alarm: Alarm): Promise<void> {
    const record = toAlarmRecord(alarm);
    await AlarmModel.upsert(record as any);
  }

  async findActiveByRunId(runId: string): Promise<Alarm[]> {
    const records = await AlarmModel.findAll({
      where: { runId: Number(runId), status: 'ACTIVE' },
      order: [['createdAt', 'DESC']],
    });
    return records.map(r => toAlarmDomain(r as AlarmRecord));
  }

  async findByRunId(runId: string): Promise<Alarm[]> {
    const records = await AlarmModel.findAll({
      where: { runId: Number(runId) },
      order: [['createdAt', 'DESC']],
    });
    return records.map(r => toAlarmDomain(r as AlarmRecord));
  }

  async resolve(alarmId: string, resolvedAt: Date): Promise<void> {
    await AlarmModel.update(
      { status: 'RESOLVED', resolvedAt },
      { where: { id: Number(alarmId) } }
    );
  }
}
