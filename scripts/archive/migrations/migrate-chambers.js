import { Op } from 'sequelize';
import { Chamber, Device, UserChamberAccess } from '../models/index.js';

export async function migrateChambers() {
  console.log('[MIGRATE] Starting chamber migration...');

  const devices = await Device.findAll({
    where: { chamberName: { [Op.ne]: '' } },
    attributes: ['id', 'chamberName', 'chamberLocation', 'userId', 'chamberId'],
  });

  const grouped = {};
  for (const d of devices) {
    const key = d.chamberName || 'Unnamed Chamber';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  }

  let created = 0;
  let updated = 0;

  for (const [name, devs] of Object.entries(grouped)) {
    const first = devs[0];
    let chamber = await Chamber.findOne({ where: { name } });

    if (!chamber) {
      chamber = await Chamber.create({
        name,
        location: first.chamberLocation || null,
        createdBy: first.userId || null,
      });
      created++;
    }

    for (const d of devs) {
      if (d.chamberId !== chamber.id) {
        await Device.update({ chamberId: chamber.id }, { where: { id: d.id } });
        updated++;
      }
    }
  }

  const accesses = await UserChamberAccess.findAll({
    where: { chamberId: null },
    include: [{ model: Device, attributes: ['chamberId'] }],
  });

  for (const a of accesses) {
    if (a.Device?.chamberId) {
      await a.update({ chamberId: a.Device.chamberId });
    }
  }

  const all = await Chamber.findAll({ order: [['name', 'ASC']] });
  console.log(`[MIGRATE] Done: ${created} chambers created, ${updated} devices updated, chambers total: ${all.length}`);
  return all;
}
