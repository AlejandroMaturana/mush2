import sequelize from './config/database.js';
import bcrypt from 'bcryptjs';
import { Recipe, User, Chamber, UserChamberAccess, AuditLog, Device, IntegrationCredentials, SpeciesProfile, MedicinalProperty, BioactiveCompound } from './models/index.js';

const DIFFICULTY_MAP = {
  'Principiante': 'BEGINNER',
  'Intermedio': 'INTERMEDIATE',
  'Avanzado': 'ADVANCED',
};

const SPECIES = [
  {
    id: 'hericium-erinaceus',
    nombre_comun: 'Melena de León',
    nombre_cientifico: 'Hericium erinaceus',
    clase: 'Medicinal',
    dificultad: 'Intermedio',
    clima_origen: 'Templado',
    descripcion: 'Hongo con aspecto de cascada de espinas blancas. Altamente valorado por sus propiedades nootrópicas y de salud neurológica.',
    propiedades_medicinales: [
      { categoria: 'Nootrópico y Cognitivo', descripcion: 'Estimula la síntesis de NGF (Factor de Crecimiento Nervioso), mejorando la memoria y concentración.' },
      { categoria: 'Gastroprotector', descripcion: 'Apoya la salud de la mucosa gástrica y la microbiota intestinal.' },
    ],
    compuestos_bioactivos: [
      { nombre: 'hericenones', valor: null },
      { nombre: 'erinacines', valor: null },
      { nombre: 'beta Glucans', valor: '30%' },
    ],
    atributos_generales: {
      ciclo_estimado_semanas: '8-10',
      eficiencia_biologica_promedio: '60-80%',
      sustratos_compatibles: ['Serrín de maderas duras', 'Suplemento de salvado de trigo'],
    },
  },
  {
    id: 'ganoderma-lucidum',
    nombre_comun: 'Reishi',
    nombre_cientifico: 'Ganoderma lucidum',
    clase: 'Medicinal',
    dificultad: 'Avanzado',
    clima_origen: 'Subtropical',
    descripcion: "El 'hongo de la inmortalidad'. Rico en triterpenos y betaglucanos. Forma de estante y consistencia leñosa.",
    propiedades_medicinales: [
      { categoria: 'Inmunomodulador', descripcion: 'Estimula la respuesta del sistema inmunitario y combate la fatiga.' },
      { categoria: 'Adaptógeno y Relajante', descripcion: 'Ayuda a reducir el estrés físico/mental y promueve la calidad del sueño.' },
      { categoria: 'Hepatoprotector', descripcion: 'Apoya la función hepática y reduce la inflamación celular.' },
    ],
    compuestos_bioactivos: [
      { nombre: 'beta Glucans', valor: '40%' },
      { nombre: 'triterpenes', valor: null },
      { nombre: 'ganodermanontriol', valor: null },
    ],
    atributos_generales: {
      ciclo_estimado_semanas: '12-16',
      eficiencia_biologica_promedio: '50-80%',
      sustratos_compatibles: ['Serrín de maderas duras', 'Paja de trigo', 'Afrecho de trigo'],
    },
  },
  {
    id: 'lentinula-edodes',
    nombre_comun: 'Shiitake',
    nombre_cientifico: 'Lentinula edodes',
    clase: 'Comestible / Medicinal',
    dificultad: 'Intermedio',
    clima_origen: 'Templado húmedo',
    descripcion: 'Clásico hongo asiático de sombrero marrón oscuro, gran sabor umami y excelentes propiedades inmunitarias.',
    propiedades_medicinales: [
      { categoria: 'Inmunoestimulante', descripcion: 'Contiene lentinan, conocido por potenciar las defensas del organismo.' },
      { categoria: 'Cardiovascular', descripcion: 'Ayuda a mantener niveles saludables de colesterol gracias al eritadenine.' },
    ],
    compuestos_bioactivos: [
      { nombre: 'lentinan', valor: null },
      { nombre: 'eritadenine', valor: null },
      { nombre: 'beta Glucans', valor: '25%' },
    ],
    atributos_generales: {
      ciclo_estimado_semanas: '10-14',
      eficiencia_biologica_promedio: '75-100%',
      sustratos_compatibles: ['Serrín de roble / maderas duras', 'Tarugos de madera (cultivo en troncos)'],
    },
  },
  {
    id: 'trametes-versicolor',
    nombre_comun: 'Cola de Pavo',
    nombre_cientifico: 'Trametes versicolor',
    clase: 'Medicinal',
    dificultad: 'Principiante',
    clima_origen: 'Templado',
    descripcion: 'Hongo medicinal con forma de abanico y anillos coloridos. Alto contenido de PSP (polisacárido péptido). Ideal para principiantes por su resistencia.',
    propiedades_medicinales: [
      { categoria: 'Inmunooncología', descripcion: 'Extremadamente estudiado por su apoyo al sistema inmune en terapias integrativas.' },
      { categoria: 'Prebiótico', descripcion: 'Rico en polisacáridos que nutren la flora intestinal beneficiosa.' },
    ],
    compuestos_bioactivos: [
      { nombre: 'P S P', valor: null },
      { nombre: 'beta Glucans', valor: '35%' },
      { nombre: 'polysaccharopeptide', valor: null },
    ],
    atributos_generales: {
      ciclo_estimado_semanas: '6-8',
      eficiencia_biologica_promedio: '80-110%',
      sustratos_compatibles: ['Serrín de madera', 'Ramas y troncos caídos'],
    },
  },
  {
    id: 'cordyceps-militaris',
    nombre_comun: 'Cordyceps Militaris',
    nombre_cientifico: 'Cordyceps militaris',
    clase: 'Medicinal',
    dificultad: 'Avanzado',
    clima_origen: 'Templado / Alpino',
    descripcion: 'Hongo entomopatógeno de llamativo color naranja brillante. Potente estimulante de la energía celular y la oxigenación.',
    propiedades_medicinales: [
      { categoria: 'Energético y Rendimiento', descripcion: 'Optimiza la producción de ATP y mejora la utilización de oxígeno durante el ejercicio.' },
      { categoria: 'Antienvejecimiento', descripcion: 'Alto contenido de antioxidantes y cordicepina con efectos revitalizantes.' },
    ],
    compuestos_bioactivos: [
      { nombre: 'cordycepin', valor: null },
      { nombre: 'adenosine', valor: null },
      { nombre: 'beta Glucans', valor: '20%' },
    ],
    atributos_generales: {
      ciclo_estimado_semanas: '6-8',
      eficiencia_biologica_promedio: '40-60%',
      sustratos_compatibles: ['Arroz integral enriquecido', 'Medios líquidos especializados'],
    },
  },
  {
    id: 'pleurotus-ostreatus',
    nombre_comun: 'Pleurotus',
    nombre_cientifico: 'Pleurotus ostreatus',
    clase: 'Comestible',
    dificultad: 'Principiante',
    clima_origen: 'Templado húmedo',
    descripcion: 'Ostra común. Hongo comestible ideal para principiantes. Crecimiento rápido y gran adaptabilidad a diversos sustratos.',
    propiedades_medicinales: [
      { categoria: 'Salud Metabólica', descripcion: 'Contiene compuestos naturales que apoyan la regulación del colesterol.' },
      { categoria: 'Nutricional', descripcion: 'Aporte alto de proteínas vegetales, fibra y antioxidantes.' },
    ],
    compuestos_bioactivos: [
      { nombre: 'beta Glucans', valor: '15%' },
      { nombre: 'lovastatina', valor: null },
      { nombre: 'ergotioneina', valor: null },
    ],
    atributos_generales: {
      ciclo_estimado_semanas: '3-5',
      eficiencia_biologica_promedio: '80-120%',
      sustratos_compatibles: ['Paja de trigo o arroz', 'Serrín de maderas blandas', 'Pulpa de café'],
    },
  },
  {
    id: 'inonotus-obliquus',
    nombre_comun: 'Chaga',
    nombre_cientifico: 'Inonotus obliquus',
    clase: 'Medicinal',
    dificultad: 'Avanzado',
    clima_origen: 'Boreal frío',
    descripcion: 'Hongo parásito de abedules. Altísimo contenido de antioxidantes. Extracción compleja debido a su ciclo de vida silvestre.',
    propiedades_medicinales: [
      { categoria: 'Antioxidante Extremo', descripcion: 'Posee uno de los valores ORAC más altos del reino fúngico, combatiendo el estrés oxidativo celular.' },
      { categoria: 'Antiinflamatorio', descripcion: 'Apoya la respuesta inflamatoria sistémica y la salud de la piel.' },
    ],
    compuestos_bioactivos: [
      { nombre: 'melanina', valor: null },
      { nombre: 'beta Glucans', valor: '45%' },
      { nombre: 'superoxido Dismutasa', valor: null },
    ],
    atributos_generales: {
      ciclo_estimado_semanas: 'Silvestre / No cultivable masivamente en interior a corto plazo',
      eficiencia_biologica_promedio: 'N/D',
      sustratos_compatibles: ['Troncos vivos de abedul'],
    },
  },
];

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

    console.log(`[Seed] ${SPECIES.length} especies`);

    for (const data of SPECIES) {
      const difficultyLevel = DIFFICULTY_MAP[data.dificultad] || 'BEGINNER';
      const imageUrl = `/images/species/${data.id}.webp`;

      const existing = await SpeciesProfile.findOne({ where: { scientificName: data.nombre_cientifico } });
      let species;
      if (existing) {
        await existing.update({
          name: data.nombre_comun,
          adapterClass: data.clase,
          originClimate: data.clima_origen,
          difficultyLevel,
          description: data.descripcion,
          shortDescription: data.descripcion,
          imageUrl,
          generalAttributes: data.atributos_generales || {},
        });
        species = existing;
        console.log(`[Seed] Actualizada: ${species.name}`);
      } else {
        species = await SpeciesProfile.create({
          name: data.nombre_comun,
          scientificName: data.nombre_cientifico,
          adapterClass: data.clase,
          originClimate: data.clima_origen,
          difficultyLevel,
          description: data.descripcion,
          shortDescription: data.descripcion,
          imageUrl,
          generalAttributes: data.atributos_generales || {},
        });
        console.log(`[Seed] Creada: ${species.name}`);
      }

      if (data.propiedades_medicinales?.length) {
        for (const prop of data.propiedades_medicinales) {
          const existingProp = await MedicinalProperty.findOne({
            where: { speciesId: species.id, category: prop.categoria },
          });
          if (existingProp) {
            await existingProp.update({ description: prop.descripcion });
          } else {
            await MedicinalProperty.create({
              speciesId: species.id,
              category: prop.categoria,
              description: prop.descripcion,
            });
          }
        }
      }

      if (data.compuestos_bioactivos?.length) {
        for (const comp of data.compuestos_bioactivos) {
          const existingComp = await BioactiveCompound.findOne({
            where: { speciesId: species.id, name: comp.nombre },
          });
          if (existingComp) {
            await existingComp.update({ value: comp.valor });
          } else {
            await BioactiveCompound.create({
              speciesId: species.id,
              name: comp.nombre,
              value: comp.valor,
            });
          }
        }
      }
    }

    console.log('[Seed] Especies pobladas');

    for (const data of RECIPES) {
      const [recipe, created] = await Recipe.findOrCreate({
        where: { name: data.name },
        defaults: data,
      });
      console.log(`[Seed] ${created ? 'Creada' : 'Ya existe'}: receta ${recipe.name}`);
    }

    const allSpecies = await SpeciesProfile.findAll();
    const speciesMap = Object.fromEntries(allSpecies.map(s => [s.scientificName, s.id]));

    const allRecipes = await Recipe.findAll({ where: { speciesId: null } });
    for (const recipe of allRecipes) {
      const speciesId = speciesMap[recipe.species];
      if (speciesId) {
        await recipe.update({ speciesId });
        console.log(`[Seed] Vinculada receta "${recipe.name}" → especie id=${speciesId}`);
      }
    }

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
      { userId: adminUser.id, action: 'RECIPE_CREATE', resource: 'recipe', details: { recipeName: RECIPES[0].name }, ip: '127.0.0.1' },
    ];

    for (const entry of auditEntries) {
      await AuditLog.findOrCreate({
        where: { action: entry.action, resourceId: entry.resourceId || null },
        defaults: entry,
      });
    }

    const thingSpeakDevices = await Device.findAll({ where: { thingSpeakEnabled: false }, limit: 2 });
    for (const device of thingSpeakDevices) {
      await device.update({
        thingSpeakEnabled: true,
        thingSpeakChannelId: '123456',
        thingSpeakSyncInterval: 300000,
      });
      await IntegrationCredentials.setCredentials(device.id, 'THINGSPEAK', {
        readKey: 'ABCDEFGHIJKLMNOP',
        writeKey: 'ZYXWVUTSRQPONMLK',
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
