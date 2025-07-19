import { useState, useCallback, useRef } from 'react';
import { FatZebraError } from '../types';
import { validateCard, extractErrorMessage } from '../utils';
import type { UsePaymentOptions, UsePaymentResult, PurchaseRequest, TransactionResponse } from '../types';

export function usePayment(options: UsePaymentOptions = {}): UsePaymentResult {
  const {
    onSuccess,
    onError,
    enableRetry = false,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const processPayment = useCallback(async (data: PurchaseRequest): Promise<TransactionResponse> => {
    setLoading(true);
    setError(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Validate card details before sending
      const cardValidation = validateCard({
        card_holder: data.card_holder,
        card_number: data.card_number,
        card_expiry: data.card_expiry,
        cvv: data.cvv
      });

      if (!cardValidation.valid) {
        throw new FatZebraError('Card validation failed', cardValidation.errors);
      }

      // Prepare the request
      const requestData = {
        ...data,
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency || 'AUD',
        reference: data.reference || `TXN-${Date.now()}`,
        customer_ip: data.customer_ip || getClientIP(),
      };

      const response = await fetch('/api/fat-zebra/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new FatZebraError(
          errorData.message || `HTTP ${response.status}`,
          errorData.errors || []
        );
      }

      const result = await response.json();

      if (!result.successful) {
        throw new FatZebraError(
          result.response?.message || 'Transaction failed',
          result.errors || []
        );
      }

      const transaction = result.response;

      // Call success handler if provided
      if (onSuccess) {
        onSuccess(transaction);
      }

      return transaction;

    } catch (err) {
      // Handle abort
      if (err instanceof Error && err.name === 'AbortError') {
        throw new FatZebraError('Request was cancelled');
      }

      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);

      // Create FatZebraError if it's not already one
      const fatZebraError = err instanceof FatZebraError 
        ? err 
        : new FatZebraError(errorMessage);

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
  }, [onSuccess, onError, enableRetry, maxRetries, retryDelay]);

  const retryPayment = useCallback(async (
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
  }, [processPayment]);

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
export function usePaymentWithRetry(options: UsePaymentOptions & {
  retryCondition?: (error: FatZebraError) => boolean;
} = {}) {
  const { retryCondition, ...paymentOptions } = options;
  
  const defaultRetryCondition = (error: FatZebraError) => {
    // Retry on network errors or temporary failures
    const retryableErrors = [
      'network error',
      'timeout',
      'server error',
      'temporary unavailable'
    ];
    
    return retryableErrors.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  };

  const finalOptions: UsePaymentOptions = {
    ...paymentOptions,
    enableRetry: true,
    onError: (error) => {
      const shouldRetry = retryCondition ? retryCondition(error) : defaultRetryCondition(error);
      
      if (!shouldRetry && paymentOptions.onError) {
        paymentOptions.onError(error);
      }
    }
  };

  return usePayment(finalOptions);
}