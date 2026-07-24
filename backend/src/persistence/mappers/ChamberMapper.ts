import { Chamber, ChamberId } from '../../domain/index.js';
import type { ChamberData } from '../../domain/index.js';

export interface ChamberRecord {
  id: number;
  name: string;
  location: string | null;
  deviceId: number | null;
}

export function toChamberDomain(record: ChamberRecord): Chamber {
  const data: ChamberData = {
    id: ChamberId.create(String(record.id)),
    name: record.name,
    deviceId: record.deviceId ? String(record.deviceId) : '',
    location: record.location ?? undefined,
  };
  return Chamber.create(data);
}

export function toChamberRecord(chamber: Chamber): ChamberRecord {
  const data = chamber.toData();
  return {
    id: Number(data.id.value),
    name: data.name,
    location: data.location ?? null,
    deviceId: data.deviceId ? Number(data.deviceId) : null,
  };
}
