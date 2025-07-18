#!/bin/bash

# Fat Zebra Next.js Library - Transform to NPM Package Script
# This script transforms the existing project to use @fat-zebra/sdk as a dependency

set -e

echo "🚀 Starting transformation to NPM package with @fat-zebra/sdk..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function for colored output
print_step() {
    echo -e "${BLUE}📦 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [[ ! -f "README.md" ]]; then
    print_error "README.md not found. Please run this script from the project root."
    exit 1
fi

# Backup original files
print_step "Creating backup of original files..."
mkdir -p backup
cp -r . backup/ 2>/dev/null || true
print_success "Backup created in ./backup/"

# Create new directory structure
print_step "Creating NPM package directory structure..."

# Create src directory structure
mkdir -p src/{components,hooks,lib,utils,types}
mkdir -p src/server/{routes,middleware}
mkdir -p dist
mkdir -p tests/{components,hooks,lib,utils,__mocks__}
mkdir -p examples/{basic-checkout,with-tokenization,server-side-only}
mkdir -p docs
mkdir -p .github/{workflows,ISSUE_TEMPLATE}
mkdir -p scripts

print_success "Directory structure created"

# Move existing files to src directory
print_step "Moving existing files to src directory..."

# Move components
if [[ -f "components/PaymentForm.tsx" ]]; then
    mv components/PaymentForm.tsx src/components/
fi

# Move hooks
if [[ -f "hooks/usePayment.ts" ]]; then
    mv hooks/usePayment.ts src/hooks/
fi

# Move lib files
if [[ -d "lib/fat-zebra" ]]; then
    mv lib/fat-zebra/* src/lib/
fi

# Move API routes to server directory
if [[ -d "app/api" ]]; then
    mv app/api/* src/server/routes/
fi

print_success "Files moved to src directory"

# Create package.json
print_step "Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "@your-org/fat-zebra-nextjs",
  "version": "0.0.0-development",
  "description": "Complete Fat Zebra payment gateway integration for Next.js applications",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./components": {
      "import": "./dist/components/index.esm.js",
      "require": "./dist/components/index.js",
      "types": "./dist/components/index.d.ts"
    },
    "./hooks": {
      "import": "./dist/hooks/index.esm.js",
      "require": "./dist/hooks/index.js",
      "types": "./dist/hooks/index.d.ts"
    },
    "./server": {
      "import": "./dist/server/index.esm.js",
      "require": "./dist/server/index.js",
      "types": "./dist/server/index.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "scripts": {
    "build": "rollup -c",
    "build:watch": "rollup -c -w",
    "dev": "npm run build:watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.{ts,tsx}",
    "lint:fix": "eslint src/**/*.{ts,tsx} --fix",
    "type-check": "tsc --noEmit",
    "docs": "typedoc",
    "clean": "rimraf dist",
    "prepublishOnly": "npm run clean && npm run build && npm run test",
    "release": "semantic-release",
    "prepare": "husky install"
  },
  "keywords": [
    "fat-zebra",
    "payment",
    "gateway",
    "nextjs",
    "react",
    "typescript",
    "payment-processing",
    "credit-card",
    "e-commerce"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/fat-zebra-nextjs.git"
  },
  "bugs": {
    "url": "https://github.com/your-org/fat-zebra-nextjs/issues"
  },
  "homepage": "https://github.com/your-org/fat-zebra-nextjs#readme",
  "dependencies": {
    "@fat-zebra/sdk": "^1.5.9"
  },
  "peerDependencies": {
    "next": ">=14.0.0",
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^25.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-react": "^7.0.0",
    "eslint-plugin-react-hooks": "^4.0.0",
    "husky": "^8.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.0.0",
    "rimraf": "^5.0.0",
    "rollup": "^4.0.0",
    "rollup-plugin-dts": "^6.0.0",
    "semantic-release": "^22.0.0",
    "typedoc": "^0.25.0",
    "typescript": "^5.0.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
EOF

print_success "package.json created"

# Update TypeScript configs
print_step "Creating TypeScript configurations..."

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "src",
    "tests",
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "backup"
  ]
}
EOF

cat > tsconfig.build.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": false
  },
  "include": ["src"],
  "exclude": [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "tests",
    "examples",
    "dist"
  ]
}
EOF

print_success "TypeScript configurations created"

# Create updated lib files using @fat-zebra/sdk
print_step "Creating updated library files with @fat-zebra/sdk integration..."

# Create types file
cat > src/types/index.ts << 'EOF'
// Re-export types from @fat-zebra/sdk
export {
  Environment,
  Payment,
  PaymentIntent,
  PaymentConfig,
  PublicEvent,
  Handlers
} from '@fat-zebra/sdk/dist';

// Custom types for our library
export interface FatZebraConfig {
  username: string;
  token: string;
  isTestMode?: boolean;
  baseUrl?: string;
}

export interface CardDetails {
  card_holder: string;
  card_number: string;
  card_expiry: string;
  cvv: string;
}

export interface Customer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface PurchaseRequest {
  amount: number;
  currency: string;
  reference: string;
  customer_ip?: string;
  customer?: Customer;
  card_details?: CardDetails;
  card_token?: string;
  capture?: boolean;
  extra?: Record<string, any>;
}

export interface TransactionResponse {
  id: string;
  authorization: string;
  amount: number;
  decimal_amount: number;
  successful: boolean;
  message: string;
  reference: string;
  currency: string;
  transaction_id: string;
  settlement_date: string;
  transaction_date: string;
  captured: boolean;
  card_number: string;
  card_holder: string;
  card_expiry: string;
  card_type: string;
}

export interface PaymentFormData {
  amount: number;
  cardDetails: CardDetails;
  reference: string;
  customer?: Customer;
  customerIp?: string;
}
EOF

# Create updated utils file
cat > src/utils/index.ts << 'EOF'
// Card validation utilities
export function validateCard(cardNumber: string): { isValid: boolean; type?: string } {
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false };
  }

  // Luhn algorithm
  let sum = 0;
  let alternate = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let n = parseInt(cleaned.charAt(i), 10);
    
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n = (n % 10) + 1;
      }
    }
    
    sum += n;
    alternate = !alternate;
  }

  const isValid = (sum % 10) === 0;
  
  let type: string | undefined;
  if (cleaned.startsWith('4')) {
    type = 'VISA';
  } else if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
    type = 'MASTERCARD';
  } else if (/^3[47]/.test(cleaned)) {
    type = 'AMEX';
  }

  return { isValid, type };
}

export function formatCardExpiry(month: number | string, year: number | string): string {
  const m = month.toString().padStart(2, '0');
  const y = year.toString();
  return `${m}/${y}`;
}

export function formatAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// Error handling
export class FatZebraError extends Error {
  public readonly errors: string[];
  public readonly response?: any;

  constructor(message: string, errors: string[] = [], response?: any) {
    super(message);
    this.name = 'FatZebraError';
    this.errors = errors;
    this.response = response;
  }
}

export function handleFatZebraResponse<T>(response: any): T {
  if (!response.successful) {
    throw new FatZebraError(
      'Transaction failed',
      response.errors || [],
      response
    );
  }
  return response.response;
}

// Constants
export const CURRENCIES = {
  AUD: 'AUD',
  USD: 'USD',
  NZD: 'NZD',
  GBP: 'GBP',
  EUR: 'EUR'
} as const;

export const TEST_CARDS = {
  VISA_SUCCESS: '4005550000000001',
  VISA_DECLINE: '4005550000000019',
  MASTERCARD_SUCCESS: '5123456789012346',
  MASTERCARD_DECLINE: '5123456789012353',
  AMEX_SUCCESS: '345678901234564',
  AMEX_DECLINE: '345678901234572'
} as const;
EOF

# Create updated PaymentForm component
cat > src/components/PaymentForm.tsx << 'EOF'
'use client';

import React, { useState } from 'react';
import { validateCard, formatCardExpiry } from '../utils';
import type { CardDetails, PaymentFormData } from '../types';

interface PaymentFormProps {
  onSubmit: (paymentData: PaymentFormData) => Promise<void>;
  loading?: boolean;
  currency?: string;
  amount?: number;
  enableTokenization?: boolean;
  onTokenizationSuccess?: (token: string) => void;
}

export function PaymentForm({ 
  onSubmit, 
  loading = false, 
  currency = 'AUD', 
  amount,
  enableTokenization = false,
  onTokenizationSuccess
}: PaymentFormProps) {
  const [formData, setFormData] = useState({
    card_holder: '',
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    amount: amount || 0,
    reference: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cardType, setCardType] = useState<string>('');

  const handleCardNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const validation = validateCard(cleaned);
    
    setFormData(prev => ({ ...prev, card_number: cleaned }));
    setCardType(validation.type || '');
    
    if (cleaned && !validation.isValid) {
      setErrors(prev => ({ ...prev, card_number: 'Invalid card number' }));
    } else {
      setErrors(prev => ({ ...prev, card_number: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors: Record<string, string> = {};
    
    if (!formData.card_holder.trim()) {
      validationErrors.card_holder = 'Card holder name is required';
    }
    
    if (!formData.card_number) {
      validationErrors.card_number = 'Card number is required';
    } else {
      const validation = validateCard(formData.card_number);
      if (!validation.isValid) {
        validationErrors.card_number = 'Invalid card number';
      }
    }
    
    if (!formData.expiry_month || !formData.expiry_year) {
      validationErrors.expiry = 'Expiry date is required';
    }
    
    if (!formData.cvv) {
      validationErrors.cvv = 'CVV is required';
    }
    
    if (formData.amount <= 0) {
      validationErrors.amount = 'Amount must be greater than 0';
    }
    
    if (!formData.reference.trim()) {
      validationErrors.reference = 'Reference is required';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    const paymentData: PaymentFormData = {
      amount: Math.round(formData.amount * 100),
      cardDetails: {
        card_holder: formData.card_holder,
        card_number: formData.card_number,
        card_expiry: formatCardExpiry(formData.expiry_month, formData.expiry_year),
        cvv: formData.cvv
      },
      reference: formData.reference
    };
    
    try {
      await onSubmit(paymentData);
    } catch (error) {
      console.error('Payment submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Holder Name
        </label>
        <input
          type="text"
          value={formData.card_holder}
          onChange={(e) => setFormData(prev => ({ ...prev, card_holder: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="John Smith"
          disabled={loading}
        />
        {errors.card_holder && <p className="text-red-500 text-sm mt-1">{errors.card_holder}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Number {cardType && <span className="text-gray-500">({cardType})</span>}
        </label>
        <input
          type="text"
          value={formData.card_number}
          onChange={(e) => handleCardNumberChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="4111 1111 1111 1111"
          maxLength={19}
          disabled={loading}
        />
        {errors.card_number && <p className="text-red-500 text-sm mt-1">{errors.card_number}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Month
          </label>
          <select
            value={formData.expiry_month}
            onChange={(e) => setFormData(prev => ({ ...prev, expiry_month: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="">MM</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month.toString().padStart(2, '0')}>
                {month.toString().padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <select
            value={formData.expiry_year}
            onChange={(e) => setFormData(prev => ({ ...prev, expiry_year: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="">YYYY</option>
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CVV
          </label>
          <input
            type="text"
            value={formData.cvv}
            onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="123"
            maxLength={4}
            disabled={loading}
          />
        </div>
      </div>
      {errors.expiry && <p className="text-red-500 text-sm mt-1">{errors.expiry}</p>}
      {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}

      {!amount && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount ({currency})
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="10.00"
            disabled={loading}
          />
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reference
        </label>
        <input
          type="text"
          value={formData.reference}
          onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Order #12345"
          disabled={loading}
        />
        {errors.reference && <p className="text-red-500 text-sm mt-1">{errors.reference}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 px-4 rounded-md font-medium ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
        } text-white transition-colors`}
      >
        {loading ? 'Processing...' : `Pay ${currency} ${(amount || formData.amount).toFixed(2)}`}
      </button>
    </form>
  );
}
EOF

# Create component index
cat > src/components/index.ts << 'EOF'
export { PaymentForm } from './PaymentForm';
export type { PaymentFormProps } from './PaymentForm';
EOF

# Create hook index
cat > src/hooks/index.ts << 'EOF'
export { usePayment } from './usePayment';
EOF

# Create lib index
cat > src/lib/index.ts << 'EOF'
export { FatZebraClient } from './client';
export { createFatZebraClient } from './client';
export * from './types';
EOF

# Create main index
cat > src/index.ts << 'EOF'
// Main library exports
export * from './lib';
export * from './components';
export * from './hooks';
export * from './utils';
export * from './types';
export * from './server';

// Re-export useful items from @fat-zebra/sdk
export {
  Environment,
  PublicEvent
} from '@fat-zebra/sdk/dist';

// Default export
export { createFatZebraClient as default } from './lib';
EOF

# Create server index
cat > src/server/index.ts << 'EOF'
export * from './routes';
EOF

# Create Rollup config
print_step "Creating build configuration..."
cat > rollup.config.js << 'EOF'
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {}),
  'react/jsx-runtime'
];

export default [
  // ES Modules build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.module,
      format: 'esm',
      sourcemap: true
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false
      })
    ]
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false
      })
    ]
  },
  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: pkg.types,
      format: 'esm'
    },
    plugins: [dts()]
  }
];
EOF

# Create Jest config
print_step "Creating test configuration..."
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
EOF

# Create test setup
cat > tests/setup.ts << 'EOF'
import '@testing-library/jest-dom';

// Mock @fat-zebra/sdk
jest.mock('@fat-zebra/sdk/dist', () => ({
  Environment: {
    sandbox: 'sandbox',
    production: 'production'
  },
  PublicEvent: {
    TOKENIZATION_SUCCESS: 'tokenization.success',
    TOKENIZATION_ERROR: 'tokenization.error'
  }
}));

// Mock fetch
global.fetch = jest.fn();
EOF

# Create GitHub Actions workflow
print_step "Creating GitHub Actions workflow..."
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
        
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        
    - run: npm ci
    - run: npm run lint
    - run: npm run type-check
    - run: npm run test:coverage
    - run: npm run build
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
EOF

# Create other necessary files
print_step "Creating additional configuration files..."

# ESLint config
cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  },
  env: {
    browser: true,
    node: true,
    es6: true
  }
};
EOF

# Prettier config
cat > .prettierrc.js << 'EOF'
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false
};
EOF

# .npmignore
cat > .npmignore << 'EOF'
src/
tests/
examples/
docs/
backup/
.github/
scripts/
*.config.js
*.config.ts
tsconfig*.json
.env*
.eslintrc*
.prettierrc*
.gitignore
CONTRIBUTING.md
SECURITY.md
rollup.config.js
jest.config.js
EOF

# Update README.md
print_step "Updating README.md..."
cat > README.md << 'EOF'
# Fat Zebra Next.js Library

A comprehensive TypeScript library for integrating Fat Zebra payment gateway with Next.js 14+ applications. Built on top of the official `@fat-zebra/sdk` with additional features for complete payment workflows.

## Features

- 🚀 Built on official `@fat-zebra/sdk`
- 💳 Complete payment processing (purchases, authorizations, captures, refunds)
- 🔐 Secure card tokenization with 3DS2 support
- ⚛️ React components and hooks
- 🛠️ Built-in validation and error handling
- 🧪 Test mode support
- 📱 Pre-built responsive payment forms
- 🔄 Server-side API route helpers

## Installation

```bash
npm install @your-org/fat-zebra-nextjs @fat-zebra/sdk
# or
yarn add @your-org/fat-zebra-nextjs @fat-zebra/sdk
```

## Quick Start

```tsx
import { PaymentForm, usePayment } from '@your-org/fat-zebra-nextjs';

function CheckoutPage() {
  const { loading, error, success, processPayment } = usePayment();

  const handlePayment = async (paymentData) => {
    await processPayment(paymentData);
  };

  if (success) {
    return <div>Payment successful!</div>;
  }

  return (
    <div>
      <PaymentForm 
        onSubmit={handlePayment}
        loading={loading}
        currency="AUD"
        amount={10.00}
      />
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## Documentation

- [API Reference](./docs/api.md)
- [Examples](./examples/)
- [Migration Guide](./docs/migration.md)

## License

MIT
EOF

# Create LICENSE
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 Your Organization

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# Install dependencies
print_step "Installing dependencies..."
npm install

print_success "Dependencies installed"

# Initialize git if not already initialized
if [[ ! -d ".git" ]]; then
    print_step "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: Transform to NPM package with @fat-zebra/sdk"
    print_success "Git repository initialized"
fi

# Final cleanup
print_step "Cleaning up..."
rm -rf components hooks lib app 2>/dev/null || true

print_success "🎉 Transformation complete!"
echo
echo "Next steps:"
echo "1. Update package.json with your organization details"
echo "2. Update README.md with your specific documentation"
echo "3. Run 'npm run build' to build the package"
echo "4. Run 'npm test' to run tests"
echo "5. Update .env.example with your Fat Zebra credentials"
echo "6. Test the package locally before publishing"
echo
echo "Your original files have been backed up in the ./backup/ directory"
echo
print_success "Ready to publish to NPM! 🚀"
EOF
