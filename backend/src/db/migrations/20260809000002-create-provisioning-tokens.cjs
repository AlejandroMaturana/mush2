'use strict';
/**
 * Migración incremental (ISSUE-001 / PR-E) — tabla provisioning_tokens.
 * Token de aprovisionamiento de un solo uso para el registro de dispositivos.
 * Almacena SOLO el hash sha256 del token (nunca el token en claro), con cuota
 * (maxUses/usesRemaining), expiración, revocación y binding opcional a deviceId.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provisioning_tokens', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      tokenHash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      label: { type: Sequelize.STRING(128), allowNull: true },
      deviceId: { type: Sequelize.STRING(50), allowNull: true },
      maxUses: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      usesRemaining: { type: Sequelize.INTEGER, allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: true },
      lastUsedAt: { type: Sequelize.DATE, allowNull: true },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('provisioning_tokens', ['tokenHash']);
    await queryInterface.addIndex('provisioning_tokens', ['deviceId']);
    await queryInterface.addIndex('provisioning_tokens', ['expiresAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('provisioning_tokens');
  },
};
