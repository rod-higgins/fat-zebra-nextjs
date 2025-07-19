module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true,
    node: true,
    es6: true,
    jest: true,
    es2020: true
  },
  globals: {
    RequestInit: 'readonly',
    Response: 'readonly',
    Request: 'readonly',
    Headers: 'readonly',
    AbortSignal: 'readonly'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  extends: [
    'eslint:recommended'
  ],
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks'
  ],
  rules: {
    // Basic rules
    'no-unused-vars': 'off', // Turned off in favor of @typescript-eslint version
    'no-console': 'off', // Changed from 'warn' to 'off'
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',

    // TypeScript specific rules (without requiring @typescript-eslint/recommended)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off', // Changed from 'warn' to 'off'

    // React rules  
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    
    // React Hooks - made less strict for development
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'off' // Changed from 'warn' to 'off'
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // TypeScript-specific overrides
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
      }
    },
    {
      files: ['*.js', '*.jsx'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      files: ['tests/**/*', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off'
      }
    },
    {
      files: ['src/types/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off' // Changed from 'warn' to 'off'
      }
    },
    {
      files: ['rollup.config.js', 'jest.config.js', '.eslintrc.js'],
      env: {
        node: true
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    'backup/',
    '*.d.ts'
  ]
};