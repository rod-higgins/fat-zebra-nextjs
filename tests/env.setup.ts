// Environment setup for Jest tests

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.FATZEBRA_USERNAME = 'test-username';
process.env.FATZEBRA_TOKEN = 'test-token';
process.env.FATZEBRA_SHARED_SECRET = 'test-shared-secret';
process.env.FATZEBRA_CLIENT_ID = 'test-client-id';
process.env.FATZEBRA_CLIENT_SECRET = 'test-client-secret';

// Suppress console output during tests unless explicitly needed
if (!process.env.VERBOSE_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}