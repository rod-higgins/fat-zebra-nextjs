import '@testing-library/jest-dom';

// Mock @fat-zebra/sdk
jest.mock('@fat-zebra/sdk/dist', () => ({
  Environment: {
    sandbox: 'sandbox',
    production: 'production'
  },
  PublicEvent: {
    FORM_VALIDATION_ERROR: 'form.validation.error',
    FORM_VALIDATION_SUCCESS: 'form.validation.success',
    TOKENIZATION_SUCCESS: 'tokenization.success',
    TOKENIZATION_ERROR: 'tokenization.error',
    SCA_SUCCESS: 'sca.success',
    SCA_ERROR: 'sca.error',
    SCA_CHALLENGE: 'sca.challenge'
  },
  Payment: jest.fn(),
  PaymentIntent: jest.fn(),
  PaymentConfig: jest.fn()
}));

// Mock @fat-zebra/sdk/dist/react
jest.mock('@fat-zebra/sdk/dist/react', () => ({
  VerifyCard: ({ onScaSuccess, onScaError }: any) => {
    // Simulate successful 3DS verification after a short delay
    setTimeout(() => {
      onScaSuccess?.({ verified: true });
    }, 100);
    return null;
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Mock crypto for Node.js environment
const crypto = require('crypto');
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: any) => crypto.randomBytes(arr.length)
  }
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}));

// Mock environment variables
process.env.FATZEBRA_USERNAME = 'test_username';
process.env.FATZEBRA_TOKEN = 'test_token';
process.env.FATZEBRA_SHARED_SECRET = 'test_shared_secret';
process.env.FATZEBRA_CLIENT_ID = 'test_client_id';
process.env.FATZEBRA_CLIENT_SECRET = 'test_client_secret';
process.env.NODE_ENV = 'test';

// Silence console.error in tests unless explicitly testing for errors
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});