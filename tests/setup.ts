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
