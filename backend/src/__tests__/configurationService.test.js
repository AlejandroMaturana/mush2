import { validate } from '../config/ConfigurationService.js';

function prodEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    DB: { url: 'postgres://postgres:postgres@localhost:5432/mush2' },
    JWT_SECRET: 'strong-secret-1234567890abcdef',
    DATA_ENC_KEY: 'enc-key-1234567890abcdef',
    MQTT: { brokerUrl: 'mqtts://broker:8883' },
    ...overrides,
  };
}

describe('ConfigurationService validate (ISSUE-020)', () => {
  it('accepts production config with a valid DATA_ENC_KEY distinct from JWT_SECRET', () => {
    expect(() => validate(prodEnv())).not.toThrow();
  });

  it('throws in production when DATA_ENC_KEY is missing', () => {
    expect(() => validate(prodEnv({ DATA_ENC_KEY: '' }))).toThrow(/DATA_ENC_KEY/);
    expect(() => validate(prodEnv({ DATA_ENC_KEY: undefined }))).toThrow(/DATA_ENC_KEY/);
  });

  it('throws in production when DATA_ENC_KEY equals JWT_SECRET', () => {
    const secret = 'strong-secret-1234567890abcdef';
    expect(() => validate(prodEnv({ JWT_SECRET: secret, DATA_ENC_KEY: secret })))
      .toThrow(/must be different from JWT_SECRET/);
  });

  it('does not require DATA_ENC_KEY in development', () => {
    const dev = prodEnv({ NODE_ENV: 'development', MQTT: { brokerUrl: 'mqtt://localhost:1883' } });
    delete dev.DATA_ENC_KEY;
    expect(() => validate(dev)).not.toThrow();
  });
});
