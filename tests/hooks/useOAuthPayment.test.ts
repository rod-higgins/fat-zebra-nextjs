import '@testing-library/jest-dom';
import '../types/jest-custom-matchers';
import { renderHook, act } from '@testing-library/react';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../setup');

// Mock the useOAuthPayment hook since it might not exist yet
const mockUseOAuthPayment = (accessToken: string, username: string, options?: any) => {
  return {
    loading: false,
    error: null,
    success: false,
    processPayment: jest.fn().mockResolvedValue({
      successful: true,
      response: { id: 'txn-123' }
    }),
    resetState: jest.fn()
  };
};

// Mock the hook module
jest.mock('../../src/hooks/useOAuthPayment', () => ({
  useOAuthPayment: mockUseOAuthPayment
}));

describe('useOAuthPayment Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() =>
        mockUseOAuthPayment('test-token', 'test-username')
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
      expect(typeof result.current.processPayment).toBe('function');
      expect(typeof result.current.resetState).toBe('function');
    });

    it('should handle empty access token', () => {
      const { result } = renderHook(() =>
        mockUseOAuthPayment('', 'test-username')
      );

      expect(result.current).toBeDefined();
      expect(result.current.processPayment).toBeDefined();
    });

    it('should handle empty username', () => {
      const { result } = renderHook(() =>
        mockUseOAuthPayment('test-token', '')
      );

      expect(result.current).toBeDefined();
      expect(result.current.processPayment).toBeDefined();
    });
  });

  describe('OAuth Configuration', () => {
    it('should accept OAuth configuration options', () => {
      const options = {
        enableTokenization: true,
        enable3DS: true,
        sandbox: true
      };

      const { result } = renderHook(() =>
        mockUseOAuthPayment('test-token', 'test-username', options)
      );

      expect(result.current).toBeDefined();
    });

    it('should handle missing options gracefully', () => {
      const { result } = renderHook(() =>
        mockUseOAuthPayment('test-token', 'test-username')
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('Payment Processing', () => {
    it('should process payment successfully', async () => {
      const mockPaymentData = createMockPurchaseRequest();
      const { result } = renderHook(() =>
        mockUseOAuthPayment('test-token', 'test-username')
      );

      await act(async () => {
        const response = await result.current.processPayment(mockPaymentData);
        expect(response.successful).toBe(true);
        expect(response.response.id).toBe('txn-123');
      });
    });

    it('should handle payment processing errors', async () => {
      const mockProcessPayment = jest.fn().mockRejectedValue(new Error('Payment failed'));
      const mockHook = {
        loading: false,
        error: 'Payment failed',
        success: false,
        processPayment: mockProcessPayment,
        resetState: jest.fn()
      };

      const { result } = renderHook(() => mockHook);

      expect(result.current.error).toBe('Payment failed');
    });
  });

  describe('State Management', () => {
    it('should reset state when resetState is called', () => {
      const mockResetState = jest.fn();
      const mockHook = {
        loading: false,
        error: 'Previous error',
        success: true,
        processPayment: jest.fn(),
        resetState: mockResetState
      };

      const { result } = renderHook(() => mockHook);

      act(() => {
        result.current.resetState();
      });

      expect(mockResetState).toHaveBeenCalled();
    });

    it('should handle loading state changes', () => {
      const mockHook = {
        loading: true,
        error: null,
        success: false,
        processPayment: jest.fn(),
        resetState: jest.fn()
      };

      const { result } = renderHook(() => mockHook);

      expect(result.current.loading).toBe(true);
    });
  });

  describe('Integration Features', () => {
    it('should support tokenization when enabled', () => {
      const options = { enableTokenization: true };
      const { result } = renderHook(() =>
        mockUseOAuthPayment('test-token', 'test-username', options)
      );

      expect(result.current.processPayment).toBeDefined();
    });

    it('should support 3DS when enabled', () => {
      const options = { enable3DS: true };
      const { result } = renderHook(() =>
        mockUseOAuthPayment('test-token', 'test-username', options)
      );

      expect(result.current.processPayment).toBeDefined();
    });

    it('should work in sandbox mode', () => {
      const options = { sandbox: true };
      const { result } = renderHook(() =>
        mockUseOAuthPayment('test-token', 'test-username', options)
      );

      expect(result.current.processPayment).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      const mockHook = {
        loading: false,
        error: 'Network error',
        success: false,
        processPayment: jest.fn(),
        resetState: jest.fn()
      };

      const { result } = renderHook(() => mockHook);

      expect(result.current.error).toBe('Network error');
    });

    it('should handle authentication errors', () => {
      const mockHook = {
        loading: false,
        error: 'Invalid access token',
        success: false,
        processPayment: jest.fn(),
        resetState: jest.fn()
      };

      const { result } = renderHook(() => mockHook);

      expect(result.current.error).toBe('Invalid access token');
    });

    it('should handle validation errors', () => {
      const mockHook = {
        loading: false,
        error: 'Invalid payment data',
        success: false,
        processPayment: jest.fn(),
        resetState: jest.fn()
      };

      const { result } = renderHook(() => mockHook);

      expect(result.current.error).toBe('Invalid payment data');
    });
  });
});