/**
 * Jest Master Configuration
 * 
 * Runs both unit and integration test suites.
 */

module.exports = {
  projects: [
    '<rootDir>/jest.unit.config.js',
    '<rootDir>/jest.integration.config.js'
  ],
  
  // Coverage only from unit tests
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/index.ts',
    '!src/index.ts',
  ]
};
