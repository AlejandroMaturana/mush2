export default {
  testEnvironment: 'node',
  transform: {},
  testRegex: '(/__tests__/.*|\\.test)\\.js$',
  testPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
