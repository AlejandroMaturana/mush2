import { sendEmail, isEmailConfigured } from './emailProvider.js';
import { createChildLogger } from '../../config/pino.js';

const log = createChildLogger('WEBHOOK');

export async function sendWebhook({ url, payload }) {
  log.info({ event: 'WEBHOOK_NOT_IMPLEMENTED', url }, 'Webhook provider is a stub — not yet implemented');
  return false;
}
