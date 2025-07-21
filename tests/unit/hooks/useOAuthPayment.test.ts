import '@testing-library/jest-dom';
import '../../types/jest-custom-matchers';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock dependencies properly before any imports
jest.mock('../../../src/types', () => ({
  FatZebraError: class FatZebraError extends Error {
    public errors: string[];
    public response?: any;
    
    constructor(message: string, errors: string[] = [], response?: any) {
      super(message);
      this.name = 'FatZebraError';
      this.errors = errors;
      this.response = response;
    }
  }
}));

// Mock global fetch and AbortController
global.fetch = jest.fn();
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: { 
    addEventListener: jest.fn(), 
    removeEventListener: jest.fn(),
    aborted: false 
  },
  abort: jest.fn()
}));

// Extend Window interface for TypeScript
declare global {
  interface Window {
    FatZebraSDK: any;
  }
}

describe('useOAuthPayment Hook - Real Implementation Tests', () => {
  let useOAuthPayment: any;
  let FatZebraError: any;
  
  // Mock SDK setup
  const mockSDKInstance = {
    purchase: jest.fn(),
    tokenizeAndPay: jest.fn(),
    handle3DSChallenge: jest.fn(),
    destroy: jest.fn()
  };

  const mockFatZebraSDK = jest.fn();

  beforeAll(async () => {
    try {
      // Set up window mock before importing
      mockFatZebraSDK.mockImplementation(() => mockSDKInstance);
      Object.defineProperty(window, 'FatZebraSDK', {
        value: mockFatZebraSDK,
        writable: true,
        configurable: true
      });

      // Import the ACTUAL hook implementation
      const hooks = await import('../../../src/hooks/useOAuthPayment');
      const types = await import('../../../src/types');
      
      useOAuthPayment = hooks.useOAuthPayment;
      FatZebraError = types.FatZebraError;
      
      console.log('useOAuthPayment hook imported successfully');
    } catch (error) {
      console.error('Failed to import useOAuthPayment hook:', error);
      throw error;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset window.FatZebraSDK
    mockFatZebraSDK.mockClear();
    mockFatZebraSDK.mockImplementation(() => mockSDKInstance);
    (window as any).FatZebraSDK = mockFatZebraSDK;
    
    // Reset SDK instance mocks with default successful responses
    mockSDKInstance.purchase.mockResolvedValue({
      successful: true,
      response: {
        id: 'txn-oauth-123',
        transaction_id: 'txn-oauth-123',
        amount: 2599,
        currency: 'AUD',
        reference: 'TEST-OAUTH-REF-123',
        message: 'Approved',
        successful: true,
        settlement_date: '2025-07-21',
        card_holder: 'John Doe',
        card_number: '************1111',
        card_type: 'visa',
        authorization: 'AUTH123',
        captured: true,
        created_at: '2025-07-20T10:30:00Z'
      },
      errors: [],
      test: true
    });

    mockSDKInstance.tokenizeAndPay.mockResolvedValue({
      successful: true,
      response: { id: 'txn-tokenized-123' },
      errors: [],
      test: true
    });

    mockSDKInstance.handle3DSChallenge.mockResolvedValue({
      successful: true,
      authentication_value: 'auth-123'
    });

    mockSDKInstance.purchase.mockClear();
    mockSDKInstance.tokenizeAndPay.mockClear();
    mockSDKInstance.handle3DSChallenge.mockClear();
    mockSDKInstance.destroy.mockClear();
  });

  // Test data helpers
  const createMockOAuthPaymentData = (overrides: any = {}) => ({
    amount: 25.99,
    currency: 'AUD',
    reference: 'TEST-OAUTH-REF-123',
    cardDetails: {
      card_holder: 'John Doe',
      card_number: '4111111111111111',
      card_expiry: '12/25',
      cvv: '123'
    },
    customer: {
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe'
    },
    threeDSMethod: true,
    metadata: {
      source: 'test'
    },
    ...overrides
  });

  describe('Hook Import and Basic Initialization', () => {
    it('should import useOAuthPayment successfully', () => {
      expect(typeof useOAuthPayment).toBe('function');
    });

    it('should initialize with basic structure', () => {
      const { result } = renderHook(() => 
        useOAuthPayment('test-token', 'test-username')
      );

      // Check that result.current exists and has expected properties
      expect(result.current).not.toBeNull();
      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('success');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('processPayment');
      expect(result.current).toHaveProperty('resetState');
    });

    it('should have correct initial state', () => {
      const { result } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username')
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
      expect(result.current.threeDSResult).toBe(null);
    });
  });

  describe('Authentication States', () => {
    it('should handle empty access token', () => {
      const { result } = renderHook(() =>
        useOAuthPayment('', 'test-username')
      );

      expect(result.current).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle empty username', () => {
      const { result } = renderHook(() =>
        useOAuthPayment('test-token', '')
      );

      expect(result.current).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should authenticate with valid credentials', async () => {
      const { result } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username')
      );

      // Wait a bit for useEffect to run
      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Should be authenticated when SDK is available
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Configuration Options', () => {
    it('should accept configuration options without crashing', () => {
      const options = {
        enableTokenization: true,
        enable3DS: true,
        sandbox: true,
        environment: 'sandbox' as const,
        onPaymentSuccess: jest.fn(),
        onPaymentError: jest.fn()
      };

      const { result } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username', options)
      );

      expect(result.current).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('State Management Functions', () => {
    it('should have working resetState function', () => {
      const { result } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username')
      );

      expect(result.current).not.toBeNull();
      expect(typeof result.current.resetState).toBe('function');

      // Should not throw when called
      act(() => {
        result.current.resetState();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
    });
  });

  describe('Payment Processing - Basic', () => {
    it('should have processPayment function', () => {
      const { result } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username')
      );

      expect(result.current).not.toBeNull();
      expect(typeof result.current.processPayment).toBe('function');
    });

    it('should process payment with valid data', async () => {
      const { result } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username')
      );

      // Wait for authentication
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const paymentData = createMockOAuthPaymentData();

      await act(async () => {
        const response = await result.current.processPayment(paymentData);
        expect(response).toBeDefined();
        expect(response.successful).toBe(true);
      });

      expect(result.current.success).toBe(true);
      expect(mockSDKInstance.purchase).toHaveBeenCalledTimes(1);
    });

    it('should validate payment amount', async () => {
      const { result } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username')
      );

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        try {
          await result.current.processPayment({
            ...createMockOAuthPaymentData(),
            amount: 0
          });
          fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toContain('Invalid payment amount');
        }
      });
    });
  });

  describe('Comprehensive Branch Coverage Tests', () => {

    describe('Authentication Branch Coverage', () => {
      it('should handle null access token', () => {
        const { result } = renderHook(() =>
          useOAuthPayment(null as any, 'test-username')
        );
        expect(result.current.isAuthenticated).toBe(false);
      });

      it('should handle undefined access token', () => {
        const { result } = renderHook(() =>
          useOAuthPayment(undefined as any, 'test-username')
        );
        expect(result.current.isAuthenticated).toBe(false);
      });

      it('should handle null username', () => {
        const { result } = renderHook(() =>
          useOAuthPayment('test-token', null as any)
        );
        expect(result.current.isAuthenticated).toBe(false);
      });

      it('should handle undefined username', () => {
        const { result } = renderHook(() =>
          useOAuthPayment('test-token', undefined as any)
        );
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    describe('Payment Validation Branch Coverage', () => {
      it('should reject negative amounts', async () => {
        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment({
              ...createMockOAuthPaymentData(),
              amount: -10
            });
            fail('Should have thrown error');
          } catch (error: any) {
            expect(error.message).toContain('Invalid payment amount');
          }
        });
      });

      it('should reject null amounts', async () => {
        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment({
              ...createMockOAuthPaymentData(),
              amount: null as any
            });
            fail('Should have thrown error');
          } catch (error: any) {
            expect(error.message).toContain('Invalid payment amount');
          }
        });
      });

      it('should reject missing card number', async () => {
        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment({
              ...createMockOAuthPaymentData(),
              cardDetails: {
                ...createMockOAuthPaymentData().cardDetails,
                card_number: ''
              }
            });
            fail('Should have thrown error');
          } catch (error: any) {
            expect(error.message).toContain('Card number is required');
          }
        });
      });

      it('should reject null card details', async () => {
        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment({
              ...createMockOAuthPaymentData(),
              cardDetails: null as any
            });
            fail('Should have thrown error');
          } catch (error: any) {
            expect(error.message).toContain('Card number is required');
          }
        });
      });
    });

    describe('3DS Challenge Branch Coverage', () => {
      it('should handle 3DS challenge with threeds_challenge_url', async () => {
        mockSDKInstance.purchase.mockResolvedValue({
          successful: true,
          response: {
            id: 'txn-123',
            threeds_challenge_url: 'https://challenge.example.com'
          }
        });

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          await result.current.processPayment(createMockOAuthPaymentData());
        });

        expect(result.current.threeDSResult?.status).toBe('3DS_SUCCESS');
      });

      it('should handle 3DS challenge with challenge_url fallback', async () => {
        mockSDKInstance.purchase.mockResolvedValue({
          successful: true,
          response: {
            id: 'txn-123',
            challenge_url: 'https://challenge.example.com' // Different property name
          }
        });

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          await result.current.processPayment(createMockOAuthPaymentData());
        });

        expect(result.current.threeDSResult?.status).toBe('3DS_SUCCESS');
      });

      it('should handle payment without 3DS challenge', async () => {
        mockSDKInstance.purchase.mockResolvedValue({
          successful: true,
          response: {
            id: 'txn-123'
            // No challenge URLs
          }
        });

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          await result.current.processPayment(createMockOAuthPaymentData());
        });

        expect(result.current.threeDSResult?.status).toBe('3DS_NOT_REQUIRED');
      });
    });

    describe('Error Handling Branch Coverage', () => {
      it('should handle FatZebraError specifically', async () => {
        const fzError = new FatZebraError('Payment declined', ['Insufficient funds'], { code: 'DECLINED' });
        mockSDKInstance.purchase.mockRejectedValue(fzError);

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment(createMockOAuthPaymentData());
            fail('Should have thrown error');
          } catch (error: any) {
            expect(error).toBeInstanceOf(FatZebraError);
          }
        });
      });

      it('should handle AbortError specifically', async () => {
        const abortError = new Error('Request aborted');
        abortError.name = 'AbortError';
        mockSDKInstance.purchase.mockRejectedValue(abortError);

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment(createMockOAuthPaymentData());
            fail('Should have thrown error');
          } catch (error: any) {
            expect(error.message).toBe('Payment request was cancelled');
          }
        });
      });

      it('should handle regular Error objects', async () => {
        const regularError = new Error('Network timeout');
        mockSDKInstance.purchase.mockRejectedValue(regularError);

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment(createMockOAuthPaymentData());
            fail('Should have thrown error');
          } catch (error: any) {
            expect(error.message).toBe('Network timeout');
          }
        });
      });

      it('should handle unexpected error types', async () => {
        mockSDKInstance.purchase.mockRejectedValue('String error');

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment(createMockOAuthPaymentData());
            fail('Should have thrown error');
          } catch (error: any) {
            expect(error.message).toBe('An unexpected error occurred during payment processing');
          }
        });
      });

      it('should handle failed payment response', async () => {
        mockSDKInstance.purchase.mockResolvedValue({
          successful: false,
          errors: ['Card declined', 'Insufficient funds'],
          response: null
        });

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment(createMockOAuthPaymentData());
            fail('Should have thrown error');
          } catch (error: any) {
            expect(error.message).toContain('Card declined, Insufficient funds');
          }
        });
      });

      it('should handle failed payment response without errors array', async () => {
        mockSDKInstance.purchase.mockResolvedValue({
          successful: false,
          response: null
        });

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment(createMockOAuthPaymentData());
            fail('Should have thrown error');
          } catch (error: any) {
            expect(error.message).toContain('Payment processing failed');
          }
        });
      });
    });

    describe('Customer Data Branch Coverage', () => {
      it('should include customer data when provided', async () => {
        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        const paymentData = createMockOAuthPaymentData();

        await act(async () => {
          await result.current.processPayment(paymentData);
        });

        const purchaseCall = mockSDKInstance.purchase.mock.calls[0][0];
        expect(purchaseCall.customer).toBeDefined();
      });

      it('should exclude customer data when not provided', async () => {
        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        const paymentData = {
          ...createMockOAuthPaymentData(),
          customer: undefined
        };

        await act(async () => {
          await result.current.processPayment(paymentData);
        });

        const purchaseCall = mockSDKInstance.purchase.mock.calls[0][0];
        expect(purchaseCall.customer).toBeUndefined();
      });
    });

    describe('Callback Branch Coverage', () => {
      it('should call onPaymentSuccess callback when provided', async () => {
        const onPaymentSuccess = jest.fn();

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username', { onPaymentSuccess })
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          await result.current.processPayment(createMockOAuthPaymentData());
        });

        expect(onPaymentSuccess).toHaveBeenCalledTimes(1);
      });

      it('should not call onPaymentSuccess when not provided', async () => {
        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          await result.current.processPayment(createMockOAuthPaymentData());
        });

        // Should not throw errors when callback is undefined
        expect(result.current.success).toBe(true);
      });

      it('should call onPaymentError callback when provided', async () => {
        const onPaymentError = jest.fn();
        mockSDKInstance.purchase.mockRejectedValue(new Error('Test error'));

        const { result } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username', { onPaymentError })
        );

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          try {
            await result.current.processPayment(createMockOAuthPaymentData());
            fail('Should have thrown');
          } catch (error) {
            // Expected
          }
        });

        expect(onPaymentError).toHaveBeenCalledWith('Test error');
      });
    });

    describe('Cleanup Branch Coverage', () => {
      it('should cleanup when SDK instance has destroy method', () => {
        const { unmount } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        unmount();

        expect(mockSDKInstance.destroy).toHaveBeenCalledTimes(1);
      });

      it('should handle cleanup when no SDK instance exists', () => {
        mockFatZebraSDK.mockImplementation(() => null);

        const { unmount } = renderHook(() =>
          useOAuthPayment('test-token', 'test-username')
        );

        expect(() => unmount()).not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle SDK errors gracefully', async () => {
      mockSDKInstance.purchase.mockRejectedValue(new Error('SDK Error'));

      const { result } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username')
      );

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const paymentData = createMockOAuthPaymentData();

      await act(async () => {
        try {
          await result.current.processPayment(paymentData);
          fail('Should have thrown error');
        } catch (error: any) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle authentication failure', async () => {
      const { result } = renderHook(() =>
        useOAuthPayment('', 'test-username') // No access token
      );

      const paymentData = createMockOAuthPaymentData();

      await act(async () => {
        try {
          await result.current.processPayment(paymentData);
          fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toContain('Not authenticated');
        }
      });
    });
  });

  describe('Missing SDK Handling', () => {
    it('should handle missing SDK gracefully', async () => {
      // Remove SDK before test
      delete (window as any).FatZebraSDK;

      const { result } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username')
      );

      // Wait for effect to run and set error
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isAuthenticated).toBe(false);
      
      // Restore SDK
      (window as any).FatZebraSDK = mockFatZebraSDK;
    });
  });

  describe('Tokenization Support', () => {
    it('should use tokenizeAndPay when tokenization enabled', async () => {
      const { result } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username', { enableTokenization: true })
      );

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const paymentData = createMockOAuthPaymentData();

      await act(async () => {
        await result.current.processPayment(paymentData);
      });

      expect(mockSDKInstance.tokenizeAndPay).toHaveBeenCalledTimes(1);
      expect(mockSDKInstance.purchase).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() =>
        useOAuthPayment('test-token', 'test-username')
      );

      expect(() => unmount()).not.toThrow();
    });
  });




});