import Chamber from './Chamber.js';
import Device from './Device.js';
import Sensor from './Sensor.js';
import Telemetry from './Telemetry.js';
import Event from './Event.js';
import Actuator from './Actuator.js';
import Recipe from './Recipe.js';
import CultivationCycle from './CultivationCycle.js';
import CycleState from './CycleState.js';
import User from './User.js';
import AuditLog from './AuditLog.js';
import UserChamberAccess from './UserChamberAccess.js';
import Alarm from './Alarm.js';
import ApiKey from './ApiKey.js';
import UserPreference from './UserPreference.js';
import SystemSetting from './SystemSetting.js';
import TelegramDeviceConfig from './TelegramDeviceConfig.js';
import IntegrationCredentials from './IntegrationCredentials.js';
import Subscription from './Subscription.js';
import DeviceHealth from './DeviceHealth.js';
import SpeciesProfile from './SpeciesProfile.js';

Device.hasMany(Sensor, { foreignKey: 'deviceId' });
Sensor.belongsTo(Device, { foreignKey: 'deviceId' });

Device.hasMany(Telemetry, { foreignKey: 'deviceId' });
Telemetry.belongsTo(Device, { foreignKey: 'deviceId' });

Sensor.hasMany(Telemetry, { foreignKey: 'sensorId' });
Telemetry.belongsTo(Sensor, { foreignKey: 'sensorId' });

Device.hasMany(Event, { foreignKey: 'deviceId' });
Event.belongsTo(Device, { foreignKey: 'deviceId' });

Device.hasMany(Actuator, { foreignKey: 'deviceId' });
Actuator.belongsTo(Device, { foreignKey: 'deviceId' });

Recipe.hasMany(CultivationCycle, { foreignKey: 'recipeId' });
CultivationCycle.belongsTo(Recipe, { foreignKey: 'recipeId' });

CultivationCycle.hasMany(CycleState, { foreignKey: 'cycleId' });
CycleState.belongsTo(CultivationCycle, { foreignKey: 'cycleId' });

User.belongsToMany(Device, { through: UserChamberAccess, foreignKey: 'userId' });
Device.belongsToMany(User, { through: UserChamberAccess, foreignKey: 'deviceId' });

Device.hasMany(UserChamberAccess, { foreignKey: 'deviceId' });
Device.hasMany(CultivationCycle, { foreignKey: 'deviceId' });
CultivationCycle.belongsTo(Device, { foreignKey: 'deviceId' });

Alarm.belongsTo(Device, { foreignKey: 'deviceId' });
Device.hasMany(Alarm, { foreignKey: 'deviceId' });
Alarm.belongsTo(User, { foreignKey: 'acknowledgedBy', as: 'acknowledger' });
User.hasMany(Alarm, { foreignKey: 'acknowledgedBy', as: 'acknowledgedAlarms' });

User.hasMany(ApiKey, { foreignKey: 'userId' });
ApiKey.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(UserPreference, { foreignKey: 'userId' });
UserPreference.belongsTo(User, { foreignKey: 'userId' });

Chamber.hasMany(Device, { foreignKey: 'chamberId' });
Device.belongsTo(Chamber, { foreignKey: 'chamberId' });

Chamber.hasMany(CultivationCycle, { foreignKey: 'chamberId' });
CultivationCycle.belongsTo(Chamber, { foreignKey: 'chamberId' });

Chamber.hasMany(UserChamberAccess, { foreignKey: 'chamberId' });
UserChamberAccess.belongsTo(Chamber, { foreignKey: 'chamberId' });

Device.hasOne(TelegramDeviceConfig, { foreignKey: 'deviceId' });
TelegramDeviceConfig.belongsTo(Device, { foreignKey: 'deviceId' });

UserChamberAccess.belongsTo(User, { foreignKey: 'userId' });

Device.hasMany(IntegrationCredentials, { foreignKey: 'deviceId' });
IntegrationCredentials.belongsTo(Device, { foreignKey: 'deviceId' });

User.hasOne(Subscription, { foreignKey: 'userId' });
Subscription.belongsTo(User, { foreignKey: 'userId' });

Device.hasMany(DeviceHealth, { foreignKey: 'deviceId' });
DeviceHealth.belongsTo(Device, { foreignKey: 'deviceId' });

SpeciesProfile.hasMany(Recipe, { foreignKey: 'speciesId' });
Recipe.belongsTo(SpeciesProfile, { foreignKey: 'speciesId' });

export { Chamber, Device, Sensor, Telemetry, Event, Actuator, Recipe, CultivationCycle, CycleState, User, AuditLog, UserChamberAccess, Alarm, ApiKey, UserPreference, SystemSetting, TelegramDeviceConfig, IntegrationCredentials, Subscription, DeviceHealth, SpeciesProfile };
