export default {
  testEnvironment: 'node',
  transform: {},
  testRegex: '(/__tests__/.*|\\.test)\\.js$',
  testPathIgnorePatterns: ['/node_modules/', '/src/__tests__/test-server.js'],
  moduleFileExtensions: ['js', 'json'],
};
