import AuditLog from '../models/AuditLog.js';

export async function logAudit({ userId, action, resource, resourceId, details, ip, userAgent }) {
  try {
    await AuditLog.create({ userId, action, resource, resourceId, details, ip, userAgent });
  } catch (err) {
    console.error('[AUDIT] Error logging:', err.message);
  }
}
