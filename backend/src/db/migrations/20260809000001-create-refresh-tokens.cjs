'use strict';
/**
 * Migración incremental (I17) — tabla refresh_tokens.
 * Almacena SOLO el hash sha256 del refresh token (nunca el token en claro)
 * junto con su jti para revocación dura y rotación por familia.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      userId: { type: Sequelize.UUID, allowNull: false },
      jti: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      tokenHash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      replacedByJti: { type: Sequelize.STRING(64), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('refresh_tokens', ['userId']);
    await queryInterface.addIndex('refresh_tokens', ['jti']);
    await queryInterface.addIndex('refresh_tokens', ['expiresAt']);

    await queryInterface.addConstraint('refresh_tokens', {
      type: 'foreign key',
      name: 'refresh_tokens_userId_fkey',
      fields: ['userId'],
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('refresh_tokens', 'refresh_tokens_userId_fkey');
    await queryInterface.dropTable('refresh_tokens');
  },
};
