import { jest } from '@jest/globals';

// ── Mocks compartidos del bot Telegram ─────────────────────────────
let mockInstances = [];
let instanceCount = 0;
let activePollingCount = 0;
let peakActivePolling = 0;
let sequence = [];

const mockGetMe = jest.fn();
const mockStopPolling = jest.fn();
const mockSendMessage = jest.fn();

function bumpPolling(delta) {
  activePollingCount += delta;
  if (activePollingCount > peakActivePolling) peakActivePolling = activePollingCount;
}

jest.unstable_mockModule('node-telegram-bot-api', () => ({
  default: class MockTelegramBot {
    constructor(token, options) {
      this.token = token;
      this.options = options;
      this.handlers = {};
      this.textHandlers = [];
      instanceCount += 1;
      mockInstances.push(this);
      if (options && options.polling) bumpPolling(1);
      sequence.push({ type: 'construct', token });
    }
    async getMe() { return mockGetMe(this); }
    async stopPolling() {
      sequence.push({ type: 'stop', token: this.token });
      if (this.options && this.options.polling) bumpPolling(-1);
      await mockStopPolling(this);
    }
    async sendMessage(...args) { return mockSendMessage(...args); }
    on(event, cb) {
      this.handlers[event] = this.handlers[event] || [];
      this.handlers[event].push(cb);
      return this;
    }
    onText(regex, cb) {
      this.textHandlers.push({ regex, cb });
      return this;
    }
  },
}));

jest.unstable_mockModule('../models/index.js', () => ({
  UserPreference: { findOne: jest.fn() },
  User: { findByPk: jest.fn() },
}));

jest.unstable_mockModule('../config/pino.js', () => ({
  createChildLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
  default: {},
}));

const {
  initBot,
  reconfigureBot,
  stopBot,
  sendMessage,
  isBotReady,
  getBotStatus,
} = await import('../services/telegramBotService.js');

const metrics = () => getBotStatus().metrics;

describe('TelegramService lifecycle (ISSUE-047)', () => {
  beforeEach(async () => {
    // El módulo es singleton: detener cualquier instancia sobrante del test
    // anterior antes de resetear los contadores del mock.
    await stopBot();
    jest.clearAllMocks();
    mockInstances = [];
    instanceCount = 0;
    activePollingCount = 0;
    peakActivePolling = 0;
    sequence = [];
    mockGetMe.mockImplementation((inst) => {
      if (inst.token === 'token-invalid') throw new Error('401: Unauthorized');
      return { username: `${inst.token}-bot` };
    });
    mockStopPolling.mockResolvedValue();
    mockSendMessage.mockResolvedValue({ message_id: 1 });
  });

  it('initBot without token → disabled, no instance created', async () => {
    const result = await initBot('', 'BotA');

    expect(result).toBeNull();
    const status = getBotStatus();
    expect(status.state).toBe('disabled');
    expect(status.running).toBe(false);
    expect(isBotReady()).toBe(false);
    expect(instanceCount).toBe(0);
  });

  it('initBot with token → ready, single active polling instance', async () => {
    const instance = await initBot('token-ok', 'BotA');

    expect(instance).not.toBeNull();
    const status = getBotStatus();
    expect(status.state).toBe('ready');
    expect(status.running).toBe(true);
    expect(status.username).toBe('token-ok-bot');
    expect(status.lastStateChangeAt).toBeTruthy();
    expect(status.startedAt).toBeTruthy();
    expect(activePollingCount).toBe(1);
    expect(peakActivePolling).toBe(1);
  });

  it('initBot when getMe fails → failed, no active polling instance', async () => {
    const instance = await initBot('token-invalid', 'BotA');

    expect(instance).toBeNull();
    const status = getBotStatus();
    expect(status.state).toBe('failed');
    expect(status.running).toBe(false);
    expect(status.lastError).toContain('401');
    expect(status.lastErrorAt).toBeTruthy();
    expect(activePollingCount).toBe(0);
    expect(instanceCount).toBe(1);
  });

  it('failed → ready only via starting (no direct failed → ready)', async () => {
    await initBot('token-invalid', 'BotA');
    expect(getBotStatus().state).toBe('failed');

    const instance = await initBot('token-ok', 'BotB');

    expect(instance).not.toBeNull();
    expect(getBotStatus().state).toBe('ready');
    const constructs = sequence.filter((s) => s.type === 'construct');
    expect(constructs.length).toBe(2);
  });

  it('polling_error → degraded with running=true and sendMessage keeps working', async () => {
    await initBot('token-ok', 'BotA');
    const inst = mockInstances[0];
    const errorCb = inst.handlers['polling_error'][0];
    errorCb(new Error('Conflict: terminated by other getUpdates request'));

    const status = getBotStatus();
    expect(status.state).toBe('degraded');
    expect(status.running).toBe(true);
    expect(status.metrics.pollingErrors).toBe(1);

    const before = metrics();
    const sent = await sendMessage('123', 'hola');
    expect(sent).toBe(true);
    expect(metrics().messagesSent).toBe(before.messagesSent + 1);
    expect(metrics().lastDeliveryAt).toBeTruthy();
  });

  it('degraded recovers to ready when a message is received', async () => {
    await initBot('token-ok', 'BotA');
    const inst = mockInstances[0];
    inst.handlers['polling_error'][0](new Error('network hiccup'));
    expect(getBotStatus().state).toBe('degraded');

    inst.handlers['message'][0]({ chat: { id: 1 }, text: 'hi' });
    expect(getBotStatus().state).toBe('ready');
    expect(getBotStatus().running).toBe(true);
  });

  it('stale events from a replaced instance are ignored (generation guard)', async () => {
    await initBot('token-a', 'BotA');
    const oldInst = mockInstances[0];

    await reconfigureBot('token-b', 'BotB');
    expect(getBotStatus().state).toBe('ready');
    const baseline = metrics().pollingErrors;

    // polling_error tardío de la instancia vieja: no debe registrar nada
    oldInst.handlers['polling_error'][0](new Error('stale error'));
    expect(getBotStatus().state).toBe('ready');
    expect(metrics().pollingErrors).toBe(baseline);

    // degradamos la instancia actual y verificamos que un mensaje tardío de la
    // vieja no pueda recuperarla (handler de otra generación)
    mockInstances[1].handlers['polling_error'][0](new Error('real degraded'));
    expect(getBotStatus().state).toBe('degraded');
    expect(metrics().pollingErrors).toBe(baseline + 1);

    oldInst.handlers['message'][0]({ chat: { id: 1 }, text: 'stale' });
    expect(getBotStatus().state).toBe('degraded');
  });

  it('init → reconfigure → stop without multiple active instances (409 regression)', async () => {
    await initBot('token-a', 'BotA');
    expect(activePollingCount).toBe(1);

    await reconfigureBot('token-b', 'BotB');

    const status = getBotStatus();
    expect(status.state).toBe('ready');
    expect(status.username).toBe('token-b-bot');
    expect(instanceCount).toBe(2);
    expect(activePollingCount).toBe(1);
    expect(peakActivePolling).toBe(1);

    // El stop de la instancia anterior se completó ANTES de construir la nueva
    expect(sequence).toEqual([
      { type: 'construct', token: 'token-a' },
      { type: 'stop', token: 'token-a' },
      { type: 'construct', token: 'token-b' },
    ]);

    await stopBot();
    expect(getBotStatus().state).toBe('stopped');
    expect(getBotStatus().stoppedAt).toBeTruthy();
    expect(activePollingCount).toBe(0);
    expect(sequence).toContainEqual({ type: 'stop', token: 'token-b' });
  });

  it('multiple concurrent reconfigures end with a single active instance (no 409)', async () => {
    await initBot('token-a', 'BotA');
    const before = metrics();

    await Promise.all([
      reconfigureBot('token-b', 'BotB'),
      reconfigureBot('token-c', 'BotC'),
      reconfigureBot('token-d', 'BotD'),
      reconfigureBot('token-e', 'BotE'),
    ]);

    const status = getBotStatus();
    expect(status.state).toBe('ready');
    expect(status.metrics.reconfigures).toBe(before.reconfigures + 4);
    expect(mockInstances.length).toBe(5);
    expect(sequence.filter((s) => s.type === 'stop').length).toBe(4);
    expect(activePollingCount).toBe(1);
    expect(peakActivePolling).toBe(1);
  });

  it('sendMessage counts success/failure and updates lastError', async () => {
    await initBot('token-ok', 'BotA');
    const before = metrics();

    mockSendMessage.mockResolvedValueOnce({ message_id: 1 });
    const ok = await sendMessage('chat-1', 'ok');
    expect(ok).toBe(true);

    mockSendMessage.mockRejectedValueOnce(new Error('chat not found'));
    const fail = await sendMessage('chat-2', 'ko');
    expect(fail).toBe(false);

    const status = getBotStatus();
    expect(status.metrics.messagesSent).toBe(before.messagesSent + 1);
    expect(status.metrics.messagesFailed).toBe(before.messagesFailed + 1);
    expect(status.metrics.lastDeliveryAt).toBeTruthy();
    expect(status.lastError).toContain('chat not found');
    expect(status.lastErrorAt).toBeTruthy();
  });

  it('sendMessage returns false when stopped', async () => {
    await initBot('token-ok', 'BotA');
    await stopBot();

    expect(getBotStatus().state).toBe('stopped');
    expect(getBotStatus().stoppedAt).toBeTruthy();
    expect(await sendMessage('1', 'x')).toBe(false);
    expect(activePollingCount).toBe(0);
  });
});
