/**
 * Jest Configuration for Unit Tests
 * 
 * Configuration for unit tests with mocks and coverage.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  displayName: 'Unit Tests',
  
  // Setup files for unit tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/tests/types/jest-custom-matchers.ts'
  ],
  
  // Test patterns for unit tests only
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.{ts,tsx}',
  ],
  
  // Coverage configuration (same as existing)
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/index.ts',
    '!src/index.ts',
    '!src/**/*.config.{ts,tsx}',
    '!src/**/*.setup.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/server/routes/**/route.ts',
    '!src/server/types.ts',
    '!src/server/middleware.ts',
  ],
  
  coverageReporters: ['text', 'lcov', 'html'],
  
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
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
