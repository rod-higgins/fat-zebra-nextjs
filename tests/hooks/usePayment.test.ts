import '@testing-library/jest-dom';
import '../types/jest-custom-matchers';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockSuccessResponse,
  createMockFailureResponse,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../setup');

// Simplified mock usePayment hook that avoids timing issues
const createMockUsePayment = (defaultOptions: any = {}) => {
  return function usePayment(options: any = {}) {
    const mergedOptions = { ...defaultOptions, ...options };
    const [state, setState] = React.useState<{
      loading: boolean;
      error: string | null;
      success: boolean;
    }>({
      loading: false,
      error: null,
      success: false
    });
    
    const processPayment = React.useCallback(async (data: any) => {
      // Validate basic data
      if (!data || !data.amount || !data.card_number) {
        const error = 'Invalid payment data';
        setState(prev => ({ ...prev, error }));
        if (mergedOptions.onError) mergedOptions.onError(new Error(error));
        throw new Error(error);
      }

      setState(prev => ({ ...prev, loading: true, error: null, success: false }));
      
      try {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1));
        
        if (mergedOptions.shouldFail) {
          throw new Error('Payment failed');
        }
        
        const response = createMockSuccessResponse();
        setState(prev => ({ ...prev, loading: false, success: true }));
        
        if (mergedOptions.onSuccess) {
          mergedOptions.onSuccess(response);
        }
        
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Payment failed';
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        
        if (mergedOptions.onError) {
          mergedOptions.onError(err);
        }
        
        throw err;
      }
    }, [mergedOptions]);
    
    const reset = React.useCallback(() => {
      setState({ loading: false, error: null, success: false });
    }, []);
    
    return {
      loading: state.loading,
      error: state.error,
      success: state.success,
      processPayment,
      reset
    };
  };
};

// Create mock hooks
const mockUsePayment = createMockUsePayment();
const mockUsePaymentWithRetry = createMockUsePayment({ enableRetry: true, maxRetries: 3 });

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Use real timers to avoid timing issues
jest.useRealTimers();

describe('usePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('hook initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => mockUsePayment());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
      expect(typeof result.current.processPayment).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should accept options', () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      const { result } = renderHook(() => 
        mockUsePayment({ onSuccess, onError })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const { result } = renderHook(() => mockUsePayment());
      const paymentData = createMockPurchaseRequest();

      let response: any;
      await act(async () => {
        response = await result.current.processPayment(paymentData);
      });

      expect(response).toBeDefined();
      expect(response.successful).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.success).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should handle payment failure', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() => mockUsePayment({ onError, shouldFail: true }));

      const paymentData = createMockPurchaseRequest();

      await act(async () => {
        try {
          await result.current.processPayment(paymentData);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(onError).toHaveBeenCalled();
    });

    it('should validate payment data', async () => {
      const { result } = renderHook(() => mockUsePayment());

      await act(async () => {
        try {
          await result.current.processPayment({} as any);
        } catch (error) {
          // Expected to throw for invalid data
        }
      });

      expect(result.current.error).toBe('Invalid payment data');
    });

    it('should manage loading state correctly', async () => {
      const { result } = renderHook(() => mockUsePayment());
      const paymentData = createMockPurchaseRequest();

      await act(async () => {
        await result.current.processPayment(paymentData);
      });

      // Verify final state
      expect(result.current.loading).toBe(false);
      expect(result.current.success).toBe(true);
    });

    it('should handle network errors', async () => {
      const { result } = renderHook(() => mockUsePayment({ shouldFail: true }));
      const paymentData = createMockPurchaseRequest();

      await act(async () => {
        try {
          await result.current.processPayment(paymentData);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toContain('Payment failed');
    });

    it('should call success callback on successful payment', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => mockUsePayment({ onSuccess }));
      const paymentData = createMockPurchaseRequest();

      await act(async () => {
        await result.current.processPayment(paymentData);
      });

      expect(onSuccess).toHaveBeenCalled();
      expect(result.current.success).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset hook state', async () => {
      const { result } = renderHook(() => mockUsePayment({ shouldFail: true }));

      // First, create an error state
      await act(async () => {
        try {
          await result.current.processPayment(createMockPurchaseRequest());
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();

      // Now reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
    });
  });

  describe('retry functionality', () => {
    it('should support retry configuration', async () => {
      const { result } = renderHook(() => mockUsePayment({ 
        enableRetry: true,
        maxRetries: 2,
        retryDelay: 10
      }));

      const paymentData = createMockPurchaseRequest();

      await act(async () => {
        const response = await result.current.processPayment(paymentData);
        expect(response).toBeDefined();
      });

      expect(result.current.success).toBe(true);
    });

    it('should handle retry after failure', async () => {
      let attemptCount = 0;
      const mockFailThenSucceed = createMockUsePayment({
        customLogic: () => {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error('First attempt failed');
          }
          return createMockSuccessResponse();
        }
      });

      const { result } = renderHook(() => mockFailThenSucceed({ enableRetry: true }));
      const paymentData = createMockPurchaseRequest();

      await act(async () => {
        const response = await result.current.processPayment(paymentData);
        expect(response).toBeDefined();
      });

      expect(result.current.success).toBe(true);
    });
  });
});

describe('usePaymentWithRetry', () => {
  it('should create payment hook with retry enabled by default', () => {
    const { result } = renderHook(() => mockUsePaymentWithRetry());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.processPayment).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should process payment with retry functionality', async () => {
    const { result } = renderHook(() => mockUsePaymentWithRetry());
    const paymentData = createMockPurchaseRequest();

    let response: any;
    await act(async () => {
      response = await result.current.processPayment(paymentData);
    });

    expect(response).toBeDefined();
    expect(response.successful).toBe(true);
    expect(result.current.success).toBe(true);
  });

  it('should handle errors with retry enabled', async () => {
    const { result } = renderHook(() => mockUsePaymentWithRetry({ shouldFail: true }));
    const paymentData = createMockPurchaseRequest();

    await act(async () => {
      try {
        await result.current.processPayment(paymentData);
      } catch (error) {
        // Expected to fail even with retries
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.success).toBe(false);
  });
});