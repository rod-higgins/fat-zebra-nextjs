module.exports = {
  displayName: '@fwc/fat-zebra-nextjs',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  setupFiles: ['<rootDir>/tests/env.setup.ts'],
  
  // Module path mapping - FIXED: moduleNameMapping -> moduleNameMapper
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/server/(.*)$': '<rootDir>/src/server/$1',
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/backup/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/index.tsx',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.config.{js,jsx,ts,tsx}',
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageDirectory: 'coverage',
  
  // FIXED: Updated transform configuration to use new ts-jest syntax
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
      useESM: false,
      isolatedModules: true
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@fat-zebra/sdk)/)',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Jest configuration
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
  maxWorkers: '50%',
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Globals for testing environment
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.test.json',
      isolatedModules: true
    }
  }
};