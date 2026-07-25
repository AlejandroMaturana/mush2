import AuditLog from '../models/AuditLog.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('AUDIT');

export async function logAudit({ userId, action, resource, resourceId, details, ip, userAgent }) {
  try {
    await AuditLog.create({ userId, action, resource, resourceId, details, ip, userAgent });
  } catch (err) {
    log.error({ error: err.message, action, resource, resourceId }, 'Error logging audit entry');
  }
}
