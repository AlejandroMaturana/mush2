export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 100;
export function normalizeLimit(raw, defaultLimit = DEFAULT_LIMIT) {
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultLimit;
  return Math.min(parsed, MAX_LIMIT);
}
