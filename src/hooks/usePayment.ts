/**
 * Fat Zebra Payment Hook Implementation
 *
 * This hook provides payment processing functionality with retry logic,
 * loading state management, and error handling.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createFatZebraClient, handleFatZebraResponse } from '../lib/client';
import { FatZebraError } from '../types';
import type {
  PurchaseRequest,
  TransactionResponse,
  UsePaymentOptions,
  UsePaymentResult,
} from '../types';

export function usePayment(options: UsePaymentOptions = {}): UsePaymentResult {
  const { onSuccess, onError, enableRetry = false, maxRetries = 3, retryDelay = 1000 } = options;

  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const processPayment = useCallback(
    async (data: PurchaseRequest): Promise<TransactionResponse> => {
      // Prevent concurrent requests
      if (loading) {
        throw new FatZebraError('Payment already in progress');
      }

      // Validate required fields
      if (!data.amount || data.amount <= 0) {
        const error = new FatZebraError('Invalid amount provided');
        setError(error.message);
        if (onError) onError(error);
        throw error;
      }

      if (!data.card_number || !data.card_expiry || !data.cvv) {
        const error = new FatZebraError('Missing required card details');
        setError(error.message);
        if (onError) onError(error);
        throw error;
      }

      setLoading(true);
      setError(null);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        // Create Fat Zebra client
        const client = createFatZebraClient({
          username: process.env.FATZEBRA_USERNAME || 'test',
          token: process.env.FATZEBRA_TOKEN || 'test',
          sandbox: process.env.NODE_ENV !== 'production',
          ...(process.env.FATZEBRA_GATEWAY && { gatewayUrl: process.env.FATZEBRA_GATEWAY }),
        });

        // Add customer IP if not provided
        const enrichedData: PurchaseRequest = {
          ...data,
          customer_ip: data.customer_ip || getClientIP(),
        };

        // Process the payment
        const response = await client.purchase(enrichedData);
        const handledResponse = handleFatZebraResponse(response);

        if (handledResponse.successful && handledResponse.response) {
          const transactionResponse = handledResponse.response as TransactionResponse;

          // Call success handler if provided
          if (onSuccess) {
            onSuccess(transactionResponse);
          }

          return transactionResponse;
        } else {
          // Handle payment failure
          const errors = handledResponse.errors || ['Payment failed'];
          throw new FatZebraError(errors.join(', '), errors);
        }
      } catch (err) {
        let errorMessage = 'Payment processing failed';

        if (err instanceof FatZebraError) {
          errorMessage = err.message;
        } else if (err instanceof Error) {
          if (err.name === 'AbortError') {
            errorMessage = 'Payment was cancelled';
          } else if (err.message.includes('fetch')) {
            errorMessage = 'Network error occurred';
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);

        const fatZebraError = err instanceof FatZebraError ? err : new FatZebraError(errorMessage);

        // Call error handler if provided
        if (onError) {
          onError(fatZebraError);
        }

        // Retry logic
        if (enableRetry && maxRetries > 0) {
          return retryPayment(data, maxRetries, retryDelay);
        }

        throw fatZebraError;
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [loading, onSuccess, onError, enableRetry, maxRetries, retryDelay]
  );

  const retryPayment = useCallback(
    async (
      data: PurchaseRequest,
      retriesLeft: number,
      delay: number
    ): Promise<TransactionResponse> => {
      if (retriesLeft <= 0) {
        throw new FatZebraError('Maximum retry attempts exceeded');
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        return await processPayment(data);
      } catch (err) {
        if (retriesLeft > 1) {
          return retryPayment(data, retriesLeft - 1, delay * 2); // Exponential backoff
        }
        throw err;
      }
    },
    [processPayment]
  );

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    processPayment,
    loading,
    error,
    reset,
  };
}

// Helper function to get client IP (fallback)
function getClientIP(): string {
  // This is a fallback - in practice, the server should determine the real IP
  return '127.0.0.1';
}

// Enhanced hook with additional retry capabilities
export function usePaymentWithRetry(
  options: UsePaymentOptions & {
    retryCondition?: (error: FatZebraError) => boolean;
  } = {}
): UsePaymentResult {
  const { retryCondition, ...paymentOptions } = options;

  const defaultRetryCondition = (error: FatZebraError) => {
    // Retry on network errors or temporary failures
    const retryableErrors = ['network error', 'timeout', 'server error', 'temporary unavailable'];
    return retryableErrors.some(keyword => error.message.toLowerCase().includes(keyword));
  };

  const finalOptions: UsePaymentOptions = {
    ...paymentOptions,
    enableRetry: true,
    maxRetries: paymentOptions.maxRetries || 3,
    retryDelay: paymentOptions.retryDelay || 1000,
    onError: error => {
      const shouldRetry = retryCondition ? retryCondition(error) : defaultRetryCondition(error);

      if (!shouldRetry && paymentOptions.onError) {
        paymentOptions.onError(error);
      }
    },
  };

  return usePayment(finalOptions);
}
