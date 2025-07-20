/**
 * Jest Configuration
 * 
 * This configuration enhances the existing Jest setup to address React testing 
 * warnings and improve test stability for the usePayment hook and other components.
 * All existing functionality has been preserved.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/tests/types/jest-custom-matchers.ts'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx}',
    '<rootDir>/tests/**/*.spec.{ts,tsx}'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/*.stories.{ts,tsx}',
  ],
  
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: false
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx', 
    'js',
    'jsx',
    'json'
  ],
  
  // Environment options for better React testing
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  
  // Global setup for better test isolation
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: false
    }
  },
  
  // Timeout configuration for async tests
  testTimeout: 10000,
  
  // Better error handling for async tests
  errorOnDeprecated: false,
  
  // Reduce console noise in tests
  verbose: false,
  silent: false,
  
  // Handle ES modules properly
  extensionsToTreatAsEsm: [],
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  
  // Reporter configuration
  reporters: [
    'default'
  ]
};