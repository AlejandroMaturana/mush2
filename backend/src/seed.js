import sequelize from './config/database.js';
import bcrypt from 'bcryptjs';
import { Recipe, User, Chamber, UserChamberAccess, AuditLog, Device, IntegrationCredentials } from './models/index.js';

const RECIPES = [
  {
    name: 'Pearl Oyster — Standard',
    species: 'Pleurotus ostreatus',
    incubationTempMin: 20, incubationTempMax: 24,
    incubationHumMin: 85, incubationHumMax: 95,
    incubationCo2Max: 1200, incubationDurationDays: 21,
    fruitingTempMin: 14, fruitingTempMax: 18,
    fruitingHumMin: 85, fruitingHumMax: 92,
    fruitingCo2Max: 1000, fruitingDurationDays: 14,
    maintenanceTempMin: 12, maintenanceTempMax: 20,
    maintenanceHumMin: 80, maintenanceHumMax: 90,
    maintenanceCo2Max: 1200,
    faeIntervalMinutes: 10, ventilationStrategy: 'TIMER',
    lightCycleHours: 0, faeLevel: 'MEDIUM', dewPointMaxRH: 90,
  },
  {
    name: 'Pink Oyster — Tropical',
    species: 'Pleurotus djamor',
    incubationTempMin: 24, incubationTempMax: 28,
    incubationHumMin: 85, incubationHumMax: 95,
    incubationCo2Max: 1200, incubationDurationDays: 14,
    fruitingTempMin: 22, fruitingTempMax: 28,
    fruitingHumMin: 88, fruitingHumMax: 95,
    fruitingCo2Max: 1000, fruitingDurationDays: 10,
    maintenanceTempMin: 20, maintenanceTempMax: 26,
    maintenanceHumMin: 85, maintenanceHumMax: 92,
    maintenanceCo2Max: 1200,
    faeIntervalMinutes: 8, ventilationStrategy: 'TIMER',
    lightCycleHours: 0, faeLevel: 'MEDIUM', dewPointMaxRH: 92,
  },
  {
    name: 'Shiitake — Hardwood Log Block',
    species: 'Lentinula edodes',
    incubationTempMin: 21, incubationTempMax: 25,
    incubationHumMin: 80, incubationHumMax: 90,
    incubationCo2Max: 1200, incubationDurationDays: 60,
    fruitingTempMin: 10, fruitingTempMax: 16,
    fruitingHumMin: 80, fruitingHumMax: 88,
    fruitingCo2Max: 900, fruitingDurationDays: 21,
    maintenanceTempMin: 8, maintenanceTempMax: 18,
    maintenanceHumMin: 75, maintenanceHumMax: 85,
    maintenanceCo2Max: 1000,
    faeIntervalMinutes: 15, ventilationStrategy: 'HYBRID',
    lightCycleHours: 10, faeLevel: 'HIGH', dewPointMaxRH: 88,
  },
  {
    name: "Lion's Mane — Low CO2 Profile",
    species: 'Hericium erinaceus',
    incubationTempMin: 22, incubationTempMax: 26,
    incubationHumMin: 85, incubationHumMax: 92,
    incubationCo2Max: 1200, incubationDurationDays: 18,
    fruitingTempMin: 18, fruitingTempMax: 22,
    fruitingHumMin: 85, fruitingHumMax: 92,
    fruitingCo2Max: 800, fruitingDurationDays: 10,
    maintenanceTempMin: 15, maintenanceTempMax: 20,
    maintenanceHumMin: 80, maintenanceHumMax: 90,
    maintenanceCo2Max: 1000,
    faeIntervalMinutes: 6, ventilationStrategy: 'HYBRID',
    lightCycleHours: 6, faeLevel: 'HIGH', dewPointMaxRH: 90,
  },
  {
    name: 'Reishi — Cap/Shelf Form',
    species: 'Ganoderma lucidum',
    incubationTempMin: 24, incubationTempMax: 28,
    incubationHumMin: 85, incubationHumMax: 92,
    incubationCo2Max: 1200, incubationDurationDays: 45,
    fruitingTempMin: 22, fruitingTempMax: 26,
    fruitingHumMin: 85, fruitingHumMax: 90,
    fruitingCo2Max: 700, fruitingDurationDays: 30,
    maintenanceTempMin: 20, maintenanceTempMax: 24,
    maintenanceHumMin: 80, maintenanceHumMax: 88,
    maintenanceCo2Max: 1000,
    faeIntervalMinutes: 12, ventilationStrategy: 'CO2_TRIGGER',
    lightCycleHours: 12, faeLevel: 'HIGH', dewPointMaxRH: 88,
  },
  {
    name: 'Cordyceps militaris — Grain Stroma',
    species: 'Cordyceps militaris',
    incubationTempMin: 20, incubationTempMax: 23,
    incubationHumMin: 80, incubationHumMax: 88,
    incubationCo2Max: 1200, incubationDurationDays: 14,
    fruitingTempMin: 18, fruitingTempMax: 22,
    fruitingHumMin: 80, fruitingHumMax: 88,
    fruitingCo2Max: 1200, fruitingDurationDays: 21,
    maintenanceTempMin: 16, maintenanceTempMax: 20,
    maintenanceHumMin: 75, maintenanceHumMax: 85,
    maintenanceCo2Max: 1500,
    faeIntervalMinutes: 20, ventilationStrategy: 'TIMER',
    lightCycleHours: 12, faeLevel: 'LOW', dewPointMaxRH: 85,
  },
  {
    name: 'Turkey Tail — Extraction Grade',
    species: 'Trametes versicolor',
    incubationTempMin: 20, incubationTempMax: 24,
    incubationHumMin: 80, incubationHumMax: 90,
    incubationCo2Max: 1200, incubationDurationDays: 30,
    fruitingTempMin: 16, fruitingTempMax: 20,
    fruitingHumMin: 80, fruitingHumMax: 88,
    fruitingCo2Max: 950, fruitingDurationDays: 21,
    maintenanceTempMin: 14, maintenanceTempMax: 18,
    maintenanceHumMin: 75, maintenanceHumMax: 85,
    maintenanceCo2Max: 1000,
    faeIntervalMinutes: 15, ventilationStrategy: 'HYBRID',
    lightCycleHours: 8, faeLevel: 'MEDIUM', dewPointMaxRH: 87,
  },
];

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

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('[Seed] DB conectada');

    // ── RECETAS ──
    for (const data of RECIPES) {
      const [recipe, created] = await Recipe.findOrCreate({
        where: { name: data.name },
        defaults: data,
      });
      console.log(`[Seed] ${created ? 'Creada' : 'Ya existe'}: receta ${recipe.name}`);
    }

    // ── USUARIOS DE PRUEBA ──
    const createdUsers = {};
    for (const u of TEST_USERS) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const [user, userCreated] = await User.findOrCreate({
        where: { username: u.username },
        defaults: { username: u.username, email: u.email, passwordHash, role: u.role },
      });
      createdUsers[u.role] = user;
      if (userCreated) {
        console.log(`[Seed] Creado usuario ${u.username} (${u.role}, pass: ${u.password})`);
      } else {
        console.log(`[Seed] Usuario ${u.username} ya existe`);
      }
    }

    // ── CÁMARAS DE PRUEBA ──
    const adminUser = createdUsers['SUPER_ADMIN'];
    const createdChambers = [];
    for (const c of TEST_CHAMBERS) {
      const [chamber, created] = await Chamber.findOrCreate({
        where: { name: c.name },
        defaults: { ...c, createdBy: adminUser.id, updatedBy: adminUser.id },
      });
      createdChambers.push(chamber);
      console.log(`[Seed] ${created ? 'Creada' : 'Ya existe'}: cámara ${chamber.name}`);
    }

    // ── REGLAS DE ACCESO ──
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
              chamberId: chamber.id,
              role: rule.role,
              invitedBy: adminUser.id,
              acceptedAt: new Date(),
            },
          });
        }
      }
    }
    console.log('[Seed] Reglas de acceso creadas');

    // ── AUDITORÍA DE EJEMPLO ──
    const auditEntries = [
      {
        userId: adminUser.id, action: 'LOGIN_SUCCESS', resource: 'user',
        resourceId: adminUser.id, details: { method: 'local' }, ip: '127.0.0.1',
      },
      {
        userId: adminUser.id, action: 'DEVICE_REGISTER', resource: 'device',
        details: { deviceId: 'mush2_test_001' }, ip: '127.0.0.1',
      },
      {
        userId: adminUser.id, action: 'RECIPE_CREATE', resource: 'recipe',
        details: { recipeName: RECIPES[0].name }, ip: '127.0.0.1',
      },
    ];

    for (const entry of auditEntries) {
      await AuditLog.findOrCreate({
        where: { action: entry.action, resourceId: entry.resourceId || null },
        defaults: entry,
      });
    }
    console.log('[Seed] Auditoría de ejemplo creada');

    // ── THINGSPEAK TEST DATA ──
    const thingSpeakDevices = await Device.findAll({
      where: { thingSpeakEnabled: false },
      limit: 2,
    });
    for (const device of thingSpeakDevices) {
      await device.update({
        thingSpeakEnabled: true,
        thingSpeakChannelId: '123456',
        thingSpeakReadKey: 'ABCDEFGHIJKLMNOP',
        thingSpeakWriteKey: 'ZYXWVUTSRQPONMLK',
        thingSpeakSyncInterval: 300000,
      });
      await IntegrationCredentials.setCredentials(device.id, 'THINGSPEAK', {
        channelId: '123456',
        readKey: 'ABCDEFGHIJKLMNOP',
        writeKey: 'ZYXWVUTSRQPONMLK',
        syncInterval: 300000,
      });
      console.log(`[Seed] ThingSpeak habilitado en dispositivo ${device.deviceId}`);
    }
    if (thingSpeakDevices.length === 0) {
      console.log('[Seed] No hay dispositivos para asignar ThingSpeak de prueba');
    }

    await sequelize.close();
    console.log('[Seed] OK — R11 completado');
  } catch (err) {
    console.error('[Seed] Error:', err);
    process.exit(1);
  }
}

seed();
