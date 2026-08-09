'use strict';
/**
 * sequelize-cli config (I61).
 *
 * Loaded by `sequelize-cli db:migrate` (--config config/config.cjs).
 * Reuses the app's env.js as the single source of truth for connection
 * settings (ADR-029). Because sequelize-cli resolves the environment
 * key as `--env`, we return the SAME resolved config under every key so
 * `pnpm db:migrate` always targets the current NODE_ENV connection.
 *
 * Supports both component-based (DB_HOST/DB_NAME/...) and DATABASE_URL
 * based connections. SSL is enabled when the URL carries sslmode=require.
 */
module.exports = async function sequelizeCliConfig() {
  const { env } = await import('../src/config/env.js');

  let connection = {};
  if (env.DB.url) {
    const u = new URL(env.DB.url);
    connection = {
      database: decodeURIComponent(u.pathname.replace(/^\//, '')),
      username: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 5432,
    };
    if (u.searchParams.get('sslmode')) {
      connection.dialectOptions = {
        ssl: { require: true, rejectUnauthorized: false },
      };
    }
  } else {
    connection = {
      database: env.DB.database,
      username: env.DB.username,
      password: env.DB.password,
      host: env.DB.host,
      port: env.DB.port,
    };
  }

  const config = {
    dialect: 'postgres',
    logging: false,
    define: { underscored: false },
    ...connection,
  };

  return { development: config, test: config, production: config };
};
