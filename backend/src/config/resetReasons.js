export const RESET_REASON_MAP = {
  0: 'NO_MEAN',
  1: 'POWER_ON',
  2: 'INTERNAL',
  3: 'SOFTWARE_RESET',
  4: 'PANIC',
  5: 'INT_WDT',
  6: 'TASK_WDT',
  9: 'BROWNOUT',
  12: 'POWER_ON',
  14: 'BROWNOUT',
};

export function getResetReasonLabel(code) {
  return RESET_REASON_MAP[code] || `UNKNOWN(${code})`;
}
