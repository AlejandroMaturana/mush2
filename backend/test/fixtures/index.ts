import { buildDeviceInput } from '../factories/deviceFactory';

export const SEEDED_DEVICE_ID = 'mush2_A0F262E55CBC';
export const SEEDED_USER_ID = 1;

export const seededDevice = buildDeviceInput({
  id: 1,
  deviceId: SEEDED_DEVICE_ID,
  userId: SEEDED_USER_ID,
  chamberId: 1,
  chamberName: 'Chamber Alpha',
});

export const unownedDevice = buildDeviceInput({
  id: 2,
  deviceId: 'mush2_unowned_001',
  userId: null,
  chamberId: null,
  chamberName: 'Unassigned Device',
});
