import { Alarm } from '../../domain/index.js';
import type { AlarmSeverity, AlarmStatus, AlarmData } from '../../domain/index.js';

export interface AlarmRecord {
  id: number;
  runId: number;
  type: string;
  severity: AlarmSeverity;
  message: string;
  status: AlarmStatus;
  raisedAt: Date;
  resolvedAt: Date | null;
}

export function toAlarmDomain(record: AlarmRecord): Alarm {
  const data: AlarmData = {
    id: String(record.id),
    runId: record.runId,
    type: record.type,
    severity: record.severity,
    message: record.message,
    status: record.status,
    raisedAt: record.raisedAt,
    resolvedAt: record.resolvedAt ?? undefined,
  };
  return Alarm.create(data);
}

export function toAlarmRecord(alarm: Alarm): AlarmRecord {
  const data = alarm.toData();
  return {
    id: data.id ? Number(data.id) : 0,
    runId: Number(data.runId.value),
    type: data.type,
    severity: data.severity,
    message: data.message,
    status: data.status,
    raisedAt: data.raisedAt,
    resolvedAt: data.resolvedAt ?? null,
  };
}
