/**
 * Jest Configuration for Integration Tests
 * 
 * Separate configuration for integration tests that hit real APIs.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  displayName: 'Integration Tests',
  
  // Setup files for integration tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/tests/integration/setup.ts'
  ],
  
  // Test patterns for integration tests only
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.{ts,tsx}',
  ],
  
  // Don't collect coverage for integration tests (they test real APIs)
  collectCoverage: false,
  
  // Longer timeout for real API calls
  testTimeout: 30000,
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
};
