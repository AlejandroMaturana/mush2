import nodemailer from 'nodemailer';
import { createChildLogger } from '../../config/pino.js';
import { env } from '../../config/env.js';

const log = createChildLogger('EMAIL');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { host, port, secure, user, pass } = env.SMTP;

  if (!host) {
    log.info({ event: 'SMTP_NOT_CONFIGURED' }, 'SMTP not configured — email alerts disabled');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    timeout: 10000,
    connectionTimeout: 10000,
  });

  log.info({ event: 'SMTP_CONFIGURED', host, port, secure }, 'SMTP transporter created');
  return transporter;
}

async function withRetry(fn, { attempts = 3, delay = 5000 } = {}) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) {
    log.warn({ event: 'EMAIL_SKIPPED', reason: 'SMTP not configured', to }, 'Email send skipped');
    return false;
  }

  try {
    await withRetry(() => transport.sendMail({
      from: env.SMTP.from || env.SMTP.user || 'mush2@localhost',
      to,
      subject,
      html,
    }));

    log.info({ event: 'EMAIL_SENT', to, subject }, 'Email sent successfully');
    return true;
  } catch (err) {
    log.error({ event: 'EMAIL_FAILED', to, subject, error: err.message, attempts: 3 }, 'Email send failed after retries');
    throw err;
  }
}

export function isEmailConfigured() {
  return !!env.SMTP.host;
}
