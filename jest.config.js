/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Module path mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/server/(.*)$': '<rootDir>/src/server/$1',
    // Module mocking for optional dependencies
    '^next/server$': '<rootDir>/tests/__mocks__/next-server.js',
    // Mock @fat-zebra/sdk to prevent module not found errors
    '^@fat-zebra/sdk$': '<rootDir>/tests/__mocks__/fat-zebra-sdk.js'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: true
      }
    ]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.(ts|tsx)',
    '<rootDir>/tests/**/*.spec.(ts|tsx)',
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx)'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/examples/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/types/**/*',
    '!src/**/index.ts'
  ],
  
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  
  // Timeout settings
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@fat-zebra/sdk))'
  ]
};