'use strict';
/* Migración incremental (ISSUE-014 / PR-F) — índices de rendimiento */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('recipes', ['name'], { name: 'recipes_name' });
    await queryInterface.addIndex('cultivation_cycles', ['deviceId', 'createdAt'], { name: 'cultivation_cycles_device_created' });
    await queryInterface.addIndex('api_keys', ['userId', 'lastUsedAt'], { name: 'api_keys_user_last_used' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('recipes', 'recipes_name');
    await queryInterface.removeIndex('cultivation_cycles', 'cultivation_cycles_device_created');
    await queryInterface.removeIndex('api_keys', 'api_keys_user_last_used');
  },
};
