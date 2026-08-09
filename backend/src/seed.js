/**
 * Development fixtures seeder (ADR-029 + I60/I68).
 *
 * Seeds test users, chambers, access rules and audit entries for
 * development/test environments. The reference catalog (species,
 * recipes) is delegated to catalog-seed.js (I68) and seeded via
 * seedCatalog(). seed.js does NOT inject fake ThingSpeak credentials.
 *
 * Guards:
 *  - isSeedAllowed(): refuses to run in production (fail-fast).
 *  - Production must use migrations + seed-catalog + create-admin.
 */
import sequelize from './config/database.js';
import bcrypt from 'bcryptjs';
import { User, Chamber, UserChamberAccess, AuditLog, Device } from './models/index.js';
import { seedCatalog } from './db/catalog-seed.js';

const TEST_USERS = [
  { username: 'admin', email: 'admin@mush2.local', role: 'SUPER_ADMIN', password: 'admin123' },
  { username: 'manager', email: 'manager@mush2.local', role: 'ADMIN', password: 'manager123' },
  { username: 'tecno', email: 'tecno@mush2.local', role: 'OPERATOR', password: 'tecno123' },
  { username: 'invitado', email: 'invitado@mush2.local', role: 'VIEWER', password: 'invitado123' },
];

const TEST_CHAMBERS = [
  { name: 'Cámara Este — Ostra', volume: 2.5, location: 'Edificio A, Piso 1' },
  { name: 'Cámara Oeste — Shiitake', volume: 4.0, location: 'Edificio A, Piso 1' },
  { name: 'Cámara Norte — Reishi', volume: 3.0, location: 'Edificio A, Piso 2' },
  { name: 'Cámara Sur — Cordyceps', volume: 1.8, location: 'Edificio A, Piso 2' },
];

export function isSeedAllowed(nodeEnv = process.env.NODE_ENV || 'development') {
  return nodeEnv !== 'production';
}

async function seed() {
  if (!isSeedAllowed()) {
    console.error(
      `[Seed] REFUSED: seed.js cannot run in production (NODE_ENV="${process.env.NODE_ENV}"). ` +
      'Use db:migrate + db:seed:catalog + create-admin instead.'
    );
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('[Seed] DB conectada');

    // ── Reference catalog (I68) ────────────────────────────────────
    await seedCatalog();

    const createdUsers = {};
    for (const u of TEST_USERS) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const [user, userCreated] = await User.findOrCreate({
        where: { username: u.username },
        defaults: { username: u.username, email: u.email, passwordHash, role: u.role },
      });
      createdUsers[u.role] = user;
      if (userCreated) console.log(`[Seed] Usuario ${u.username} (${u.role})`);
    }

    const adminUser = createdUsers['SUPER_ADMIN'];
    const createdChambers = [];
    for (const c of TEST_CHAMBERS) {
      const [chamber, created] = await Chamber.findOrCreate({
        where: { name: c.name },
        defaults: { ...c, createdBy: adminUser.id, updatedBy: adminUser.id },
      });
      createdChambers.push(chamber);
      if (created) console.log(`[Seed] Cámara ${chamber.name}`);
    }

    const accessRules = [
      { user: createdUsers['SUPER_ADMIN'], chambers: createdChambers, role: 'OWNER' },
      { user: createdUsers['ADMIN'], chambers: createdChambers.slice(0, 2), role: 'OWNER' },
      { user: createdUsers['OPERATOR'], chambers: createdChambers.slice(0, 1), role: 'EDITOR' },
      { user: createdUsers['VIEWER'], chambers: createdChambers.slice(0, 1), role: 'VIEWER' },
    ];

    for (const rule of accessRules) {
      for (const chamber of rule.chambers) {
        const devices = await Device.findAll({ where: { chamberId: chamber.id } });
        for (const device of devices) {
          await UserChamberAccess.findOrCreate({
            where: { userId: rule.user.id, deviceId: device.id },
            defaults: {
              userId: rule.user.id,
              deviceId: device.id,
              role: rule.role,
              invitedBy: adminUser.id,
              acceptedAt: new Date(),
            },
          });
        }
      }
    }

    const auditEntries = [
      { userId: adminUser.id, action: 'LOGIN_SUCCESS', resource: 'user', resourceId: adminUser.id, details: { method: 'local' }, ip: '127.0.0.1' },
      { userId: adminUser.id, action: 'DEVICE_REGISTER', resource: 'device', details: { deviceId: 'mush2_test_001' }, ip: '127.0.0.1' },
    ];

    for (const entry of auditEntries) {
      await AuditLog.findOrCreate({
        where: { action: entry.action, resourceId: entry.resourceId || null },
        defaults: entry,
      });
    }

    await sequelize.close();
    console.log('[Seed] OK');
  } catch (err) {
    console.error('[Seed] Error:', err);
    process.exit(1);
  }
}

// Self-execute when run directly: `node src/seed.js`
// When imported as a module, just export (used by seed-dev.js).
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('/seed.js') || process.argv[1].endsWith('\\seed.js')
);

if (isDirectRun) {
  seed();
}

export default seed;
