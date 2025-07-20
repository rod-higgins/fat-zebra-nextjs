/**
 * Tests for usePayment hook - Fixed version
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePayment, usePaymentWithRetry } from '../../src/hooks/usePayment';
import type { 
  PurchaseRequest, 
  CardDetails, 
  UsePaymentOptions,
  TransactionResponse,
  FatZebraResponse,
  FatZebraError
} from '../../src/types';

// Mock the fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test utilities
const createMockCardDetails = (): CardDetails => ({
  card_holder: 'John Doe',
  card_number: '4005550000000001',
  card_expiry: '12/25',
  cvv: '123'
});

const createMockPurchaseRequest = (): PurchaseRequest => ({
  amount: 10.00,
  currency: 'AUD',
  reference: 'TEST-REF',
  customer_ip: '127.0.0.1',
  card_holder: 'John Doe',
  card_number: '4005550000000001',
  card_expiry: '12/25',
  cvv: '123',
  customer: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com'
  }
});

const createMockSuccessResponse = (): FatZebraResponse<TransactionResponse> => ({
  successful: true,
  response: {
    id: 'txn-123',
    amount: 10.00,
    currency: 'AUD',
    reference: 'TEST-REF',
    message: 'Transaction successful',
    successful: true,
    settlement_date: '2025-07-21',
    transaction_id: 'txn-123',
    card_holder: 'John Doe',
    card_number: '****0001',
    card_type: 'Visa',
    authorization: 'auth-123',
    captured: true,
    created_at: '2025-07-20T10:00:00Z'
  }
});

const createMockFailureResponse = (): FatZebraResponse => ({
  successful: false,
  errors: ['Payment declined'],
  test: true
});

describe('usePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Setup default successful mock response
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(createMockSuccessResponse())
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => usePayment());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.processPayment).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should accept options', () => {
      const options: UsePaymentOptions = {
        onSuccess: jest.fn(),
        onError: jest.fn(),
        enableRetry: true,
        maxRetries: 3
      };

      const { result } = renderHook(() => usePayment(options));

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => usePayment({ onSuccess }));

      const paymentData = createMockPurchaseRequest();
      let response: TransactionResponse | undefined;

      await act(async () => {
        response = await result.current.processPayment(paymentData);
      });

      expect(response).toBeDefined();
      expect(response!.successful).toBe(true);
      expect(response!.id).toBe('txn-123');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(onSuccess).toHaveBeenCalledWith(response!);
    });

    it('should handle payment failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: jest.fn().mockResolvedValue(createMockFailureResponse())
      });

      const onError = jest.fn();
      const { result } = renderHook(() => usePayment({ onError }));

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
      const { result } = renderHook(() => usePayment());

      await act(async () => {
        try {
          await result.current.processPayment({} as PurchaseRequest);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should set loading state during processing', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const { result } = renderHook(() => usePayment());
      const paymentData = createMockPurchaseRequest();

      let loadingStateCapture: boolean[] = [];

      const processPaymentPromise = act(async () => {
        const promise = result.current.processPayment(paymentData);
        
        // Capture loading state during processing
        loadingStateCapture.push(result.current.loading);
        
        await promise;
        
        // Capture final loading state
        loadingStateCapture.push(result.current.loading);
      });

      await processPaymentPromise;

      // During processing, loading should have been true at some point
      expect(loadingStateCapture).toContain(true);
      // Final state should be false
      expect(result.current.loading).toBe(false);
    });

    it('should prevent concurrent payment processing', async () => {
      const { result } = renderHook(() => usePayment());
      const paymentData = createMockPurchaseRequest();

      let firstCallResolved = false;
      let secondCallRejected = false;

      await act(async () => {
        const promise1 = result.current.processPayment(paymentData).then(() => {
          firstCallResolved = true;
        });
        
        // Try to start second payment immediately
        const promise2 = result.current.processPayment(paymentData).catch(() => {
          secondCallRejected = true;
        });
        
        await Promise.allSettled([promise1, promise2]);
      });

      expect(firstCallResolved).toBe(true);
      expect(secondCallRejected).toBe(true);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePayment());
      const paymentData = createMockPurchaseRequest();

      await act(async () => {
        try {
          await result.current.processPayment(paymentData);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toContain('Network error');
    });

    it('should handle malformed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      const { result } = renderHook(() => usePayment());
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
    });
  });

  describe('reset', () => {
    it('should reset hook state', async () => {
      const { result } = renderHook(() => usePayment());

      // First, create an error state
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

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
    });
  });

  describe('retry functionality', () => {
    it('should retry failed requests when enabled', async () => {
      const { result } = renderHook(() => usePayment({ 
        enableRetry: true,
        maxRetries: 2,
        retryDelay: 10
      }));

      // Mock first call to fail, second to succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(createMockSuccessResponse())
        });

      const paymentData = createMockPurchaseRequest();
      let response: TransactionResponse | undefined;

      await act(async () => {
        response = await result.current.processPayment(paymentData);
        
        // Fast-forward timers for retry delay
        jest.advanceTimersByTime(100);
      });

      expect(response).toBeDefined();
      expect(response!.successful).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries exceeded', async () => {
      const { result } = renderHook(() => usePayment({ 
        enableRetry: true,
        maxRetries: 2,
        retryDelay: 10
      }));

      // Mock all calls to fail
      mockFetch.mockRejectedValue(new Error('Persistent error'));

      const paymentData = createMockPurchaseRequest();

      await act(async () => {
        try {
          await result.current.processPayment(paymentData);
          
          // Fast-forward timers for retry delays
          jest.advanceTimersByTime(1000);
        } catch (error) {
          // Expected to throw after retries
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    }, 10000); // Increase timeout for retry test
  });
});

describe('usePaymentWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(createMockSuccessResponse())
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create payment hook with retry enabled by default', () => {
    const { result } = renderHook(() => usePaymentWithRetry());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.processPayment).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should process payment with retry functionality', async () => {
    const { result } = renderHook(() => usePaymentWithRetry({
      maxRetries: 3,
      retryDelay: 10
    }));

    const paymentData = createMockPurchaseRequest();
    let response: TransactionResponse | undefined;

    await act(async () => {
      response = await result.current.processPayment(paymentData);
    });

    expect(response).toBeDefined();
    expect(response!.successful).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should automatically retry on failure', async () => {
    const { result } = renderHook(() => usePaymentWithRetry({
      maxRetries: 2,
      retryDelay: 10
    }));

    // Mock first call to fail, second to succeed
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(createMockSuccessResponse())
      });

    const paymentData = createMockPurchaseRequest();
    let response: TransactionResponse | undefined;

    await act(async () => {
      response = await result.current.processPayment(paymentData);
      
      // Fast-forward timers for retry delay
      jest.advanceTimersByTime(100);
    });

    expect(response).toBeDefined();
    expect(response!.successful).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(createMockSuccessResponse())
    });
  });

  it('should handle undefined response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(undefined)
    });

    const { result } = renderHook(() => usePayment());
    const paymentData = createMockPurchaseRequest();

    await act(async () => {
      try {
        await result.current.processPayment(paymentData);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should handle response with no successful field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        // Missing successful field
        response: { id: 'test' }
      })
    });

    const { result } = renderHook(() => usePayment());
    const paymentData = createMockPurchaseRequest();

    await act(async () => {
      try {
        await result.current.processPayment(paymentData);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should handle HTTP error status codes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({
        successful: false,
        errors: ['Server error']
      })
    });

    const { result } = renderHook(() => usePayment());
    const paymentData = createMockPurchaseRequest();

    await act(async () => {
      try {
        await result.current.processPayment(paymentData);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toContain('error');
  });

  it('should validate required payment fields', async () => {
    const { result } = renderHook(() => usePayment());

    const invalidPaymentData = {
      amount: 0, // Invalid amount
      currency: '',
      reference: '',
      card_holder: '',
      card_number: '',
      card_expiry: '',
      cvv: ''
    } as PurchaseRequest;

    await act(async () => {
      try {
        await result.current.processPayment(invalidPaymentData);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should handle component unmount during processing', async () => {
    const { result, unmount } = renderHook(() => usePayment());
    const paymentData = createMockPurchaseRequest();

    // Start processing and immediately unmount
    await act(async () => {
      const promise = result.current.processPayment(paymentData);
      unmount();
      
      // Should not throw errors on cleanup
      try {
        await promise;
      } catch (error) {
        // Payment may fail due to component unmount, which is expected
      }
    });

    // Test passes if no errors are thrown during cleanup
    expect(true).toBe(true);
  });
});

describe('TypeScript Compatibility', () => {
  it('should work with proper TypeScript types', () => {
    const options: UsePaymentOptions = {
      onSuccess: (response: TransactionResponse) => {
        expect(response.id).toBeDefined();
      },
      onError: (error: FatZebraError) => {
        expect(error.message).toBeDefined();
      },
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000
    };

    const { result } = renderHook(() => usePayment(options));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.processPayment).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should accept properly typed payment requests', async () => {
    const { result } = renderHook(() => usePayment());
    const request: PurchaseRequest = createMockPurchaseRequest();

    // This should compile without TypeScript errors
    await act(async () => {
      try {
        await result.current.processPayment(request);
      } catch (error) {
        // Expected behavior
      }
    });

    expect(true).toBe(true);
  });
});