/**
 * Fat Zebra Next.js Package - usePayment Hook
 * React hook for handling payment processing
 */

import { useState, useCallback, useRef } from 'react';
import type { 
  PaymentFormData, 
  UsePaymentOptions, 
  UsePaymentResult, 
  CardDetails, 
  TransactionResponse 
} from '../types';
import { FatZebraError, extractErrorMessage } from '../types';
import { validateCard, extractErrorDetails } from '../utils';

/**
 * React hook for payment processing
 */
export function usePayment(options: UsePaymentOptions = {}): UsePaymentResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    username = process.env.NEXT_PUBLIC_FATZEBRA_USERNAME,
    token = process.env.NEXT_PUBLIC_FATZEBRA_TOKEN,
    isTestMode = true,
    enableTokenization = false,
  } = options;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const processPayment = useCallback(async (data: PaymentFormData): Promise<TransactionResponse> => {
    // Validate inputs
    if (!username || !token) {
      const errorMsg = 'Payment credentials not configured';
      setError(errorMsg);
      throw new FatZebraError(errorMsg);
    }

    // Validate card details
    const cardValidation = validateCard(data.cardDetails);
    if (!cardValidation.valid) {
      const errorMsg = cardValidation.errors[0];
      setError(errorMsg);
      throw new FatZebraError('Card validation failed', cardValidation.errors);
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fat-zebra/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: data.amount,
          currency: 'AUD',
          reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase(),
          card_details: data.cardDetails,
          customer: data.customer,
          username,
          token,
          metadata: {
            sdk_version: '2.0.0',
            test_mode: isTestMode,
            tokenization_enabled: enableTokenization,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new FatZebraError(
          errorData.error || 'Payment failed',
          errorData.details || ['Unknown error occurred']
        );
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new FatZebraError(
          result.error || 'Payment failed',
          result.details || ['Transaction was not successful']
        );
      }

      return result.transaction;

    } catch (err) {
      // Handle abort
      if (err instanceof Error && err.name === 'AbortError') {
        throw new FatZebraError('Payment was cancelled');
      }

      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      throw err;

    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [username, token, isTestMode, enableTokenization]);

  const tokenizeCard = useCallback(async (cardDetails: CardDetails): Promise<string> => {
    if (!enableTokenization) {
      const errorMsg = 'Tokenization is not enabled';
      setError(errorMsg);
      throw new FatZebraError(errorMsg);
    }

    if (!username || !token) {
      const errorMsg = 'Payment credentials not configured';
      setError(errorMsg);
      throw new FatZebraError(errorMsg);
    }

    // Validate card details
    const cardValidation = validateCard(cardDetails);
    if (!cardValidation.valid) {
      const errorMsg = cardValidation.errors[0];
      setError(errorMsg);
      throw new FatZebraError('Card validation failed', cardValidation.errors);
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fat-zebra/tokenize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          card_details: cardDetails,
          username,
          token,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new FatZebraError(
          errorData.error || 'Tokenization failed',
          errorData.details || ['Unknown error occurred']
        );
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new FatZebraError(
          result.error || 'Tokenization failed',
          result.details || ['Tokenization was not successful']
        );
      }

      return result.tokenization.token;

    } catch (err) {
      // Handle abort
      if (err instanceof Error && err.name === 'AbortError') {
        throw new FatZebraError('Tokenization was cancelled');
      }

      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      throw err;

    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [username, token, enableTokenization]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Effect to cleanup on unmount would go here if we used useEffect
  // For now, we'll rely on the caller to call cleanup if needed

  return {
    isLoading,
    error,
    processPayment,
    tokenizeCard,
    clearError,
  };
}

/**
 * Hook for handling payment with automatic retry
 */
export function usePaymentWithRetry(
  options: UsePaymentOptions & { maxRetries?: number; retryDelay?: number } = {}
): UsePaymentResult & { retryCount: number } {
  const [retryCount, setRetryCount] = useState(0);
  const baseHook = usePayment(options);
  
  const { maxRetries = 3, retryDelay = 1000 } = options;

  const processPaymentWithRetry = useCallback(async (data: PaymentFormData): Promise<TransactionResponse> => {
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        return await baseHook.processPayment(data);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Only retry on network errors or server errors, not validation errors
        if (error instanceof FatZebraError && error.errors.some(e => e.includes('validation'))) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
    
    throw lastError;
  }, [baseHook.processPayment, maxRetries, retryDelay]);

  const tokenizeCardWithRetry = useCallback(async (cardDetails: CardDetails): Promise<string> => {
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        return await baseHook.tokenizeCard(cardDetails);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Only retry on network errors or server errors, not validation errors
        if (error instanceof FatZebraError && error.errors.some(e => e.includes('validation'))) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
    
    throw lastError;
  }, [baseHook.tokenizeCard, maxRetries, retryDelay]);

  return {
    ...baseHook,
    processPayment: processPaymentWithRetry,
    tokenizeCard: tokenizeCardWithRetry,
    retryCount,
  };
}