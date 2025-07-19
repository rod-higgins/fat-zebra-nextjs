// Environment setup for Jest tests - Standalone library version

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.FATZEBRA_USERNAME = 'test-username';
process.env.FATZEBRA_TOKEN = 'test-token';
process.env.FATZEBRA_SHARED_SECRET = 'test-shared-secret';
process.env.FATZEBRA_CLIENT_ID = 'test-client-id';
process.env.FATZEBRA_CLIENT_SECRET = 'test-client-secret';

// Set up standalone library environment (not NextJS)
process.env.FATZEBRA_STANDALONE = 'true';

// Set up test mode flags
process.env.FATZEBRA_TEST_MODE = 'true';
process.env.FATZEBRA_SANDBOX = 'true';

// Remove NextJS-specific environment variables that might cause conflicts
delete process.env.NEXT_PUBLIC_FATZEBRA_USERNAME;
delete process.env.NEXT_PUBLIC_FATZEBRA_CLIENT_ID;

// Set up DOM environment polyfills for jsdom
if (typeof window !== 'undefined') {
  // Mock window.crypto for Node.js testing environment
  if (!window.crypto) {
    const crypto = require('crypto');
    Object.defineProperty(window, 'crypto', {
      value: {
        getRandomValues: (arr: any) => crypto.randomBytes(arr.length),
        subtle: {
          generateKey: jest.fn(),
          importKey: jest.fn(),
          exportKey: jest.fn(),
          encrypt: jest.fn(),
          decrypt: jest.fn(),
          sign: jest.fn(),
          verify: jest.fn(),
        }
      }
    });
  }

  // Mock window.location for testing
  if (!window.location) {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        protocol: 'http:',
        host: 'localhost:3000',
        hostname: 'localhost',
        port: '3000',
        pathname: '/',
        search: '',
        hash: '',
        origin: 'http://localhost:3000',
        assign: jest.fn(),
        replace: jest.fn(),
        reload: jest.fn(),
      },
      writable: true,
    });
  }
}

// Suppress console output during tests unless explicitly needed
if (!process.env.VERBOSE_TESTS) {
  const originalConsole = global.console;
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Mock setTimeout and setInterval for testing
global.setTimeout = jest.fn((fn, delay) => {
  if (typeof fn === 'function') {
    fn();
  }
  return 1;
}) as any;

global.setInterval = jest.fn((fn, delay) => {
  if (typeof fn === 'function') {
    fn();
  }
  return 1;
}) as any;

global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();