import type { ChamberRepository } from '../../domain/index.js';
import { Chamber } from '../../domain/index.js';
import ChamberModel from '../../models/Chamber.js';
import Device from '../../models/Device.js';
import { toChamberDomain, toChamberRecord, type ChamberRecord } from '../mappers/ChamberMapper.js';

export class SequelizeChamberRepository implements ChamberRepository {
  async findById(id: string): Promise<Chamber | null> {
    const record = await ChamberModel.findByPk(Number(id));
    if (!record) return null;
    return toChamberDomain(record as ChamberRecord);
  }

  async findByDeviceId(deviceId: string): Promise<Chamber | null> {
    const device = await Device.findByPk(Number(deviceId));
    if (!device) return null;
    const chamberId = (device as any).chamberId;
    if (!chamberId) return null;
    return this.findById(String(chamberId));
  }

  async findAll(): Promise<Chamber[]> {
    const records = await ChamberModel.findAll();
    return records.map(r => toChamberDomain(r as ChamberRecord));
  }

  async save(chamber: Chamber): Promise<void> {
    const record = toChamberRecord(chamber);
    await ChamberModel.upsert(record);
  }
}
