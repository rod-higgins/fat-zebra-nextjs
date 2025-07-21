/**
 * useOAuthPayment Hook - OAuth-enabled payment processing with 3DS2 support
 *
 * Enhanced payment hook that provides OAuth authentication and 3D Secure 2.0 support
 * for secure payment processing with the Fat Zebra payment gateway.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { FatZebraError } from '../types';
import type {
  PaymentFormData,
  PurchaseRequest,
  FatZebraResponse,
  TransactionResponse,
} from '../types';

// Extended response type for 3DS transactions
interface ThreeDSTransactionResponse extends TransactionResponse {
  threeds_challenge_url?: string;
  challenge_url?: string;
  acs_trans_id?: string;
  acsTransId?: string;
  threeds_server_trans_id?: string;
  threeDSServerTransId?: string;
}

// OAuth Payment specific types
export interface OAuthPaymentData extends PaymentFormData {
  currency?: string;
  reference?: string;
  metadata?: Record<string, any>;
  threeDSRequestorId?: string;
  threeDSMethod?: boolean;
}

export interface ThreeDSResult {
  transactionId: string;
  challengeUrl?: string;
  acsTransId?: string;
  threeDSServerTransId?: string;
  status: '3DS_CHALLENGE' | '3DS_SUCCESS' | '3DS_FAILED' | '3DS_NOT_REQUIRED';
  authenticationValue?: string;
}

export interface UseOAuthPaymentOptions {
  enableTokenization?: boolean;
  enable3DS?: boolean;
  sandbox?: boolean;
  clientId?: string;
  environment?: 'sandbox' | 'live';
  threeDSRequestorId?: string;
  onPaymentSuccess?: (result: any) => void;
  onPaymentError?: (error: string) => void;
  on3DSChallenge?: (challengeData: ThreeDSResult) => void;
}

export interface UseOAuthPaymentResult {
  loading: boolean;
  error: string | null;
  success: boolean;
  threeDSResult: ThreeDSResult | null;
  isAuthenticated: boolean;
  processPayment: (data: OAuthPaymentData) => Promise<FatZebraResponse<TransactionResponse>>;
  handle3DS2Challenge: (result: ThreeDSTransactionResponse) => Promise<void>;
  resetState: () => void;
}

/**
 * OAuth-enabled payment processing hook with 3DS2 support
 *
 * @param accessToken - OAuth access token for authentication
 * @param username - Fat Zebra username
 * @param options - Configuration options
 * @returns Payment processing interface with OAuth and 3DS2 support
 */
export function useOAuthPayment(
  accessToken: string,
  username: string,
  options: UseOAuthPaymentOptions = {}
): UseOAuthPaymentResult {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [threeDSResult, setThreeDSResult] = useState<ThreeDSResult | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Refs for cleanup and SDK management
  const sdkInstanceRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    enableTokenization = false,
    enable3DS = false,
    sandbox = process.env.NODE_ENV !== 'production',
    environment = sandbox ? 'sandbox' : 'live',
    threeDSRequestorId,
    onPaymentSuccess,
    onPaymentError,
    on3DSChallenge,
  } = options;

  // Initialize SDK and validate authentication
  useEffect(() => {
    const validateAuthentication = async () => {
      if (!accessToken || !username) {
        setIsAuthenticated(false);
        return;
      }

      try {
        // Initialize Fat Zebra SDK with OAuth credentials
        if (typeof window !== 'undefined' && (window as any).FatZebraSDK) {
          const sdkConfig = {
            username,
            accessToken,
            environment,
            threeDSRequestorId: threeDSRequestorId || username,
            enable3DS,
          };

          sdkInstanceRef.current = new (window as any).FatZebraSDK(sdkConfig);
          setIsAuthenticated(true);
        } else {
          throw new Error('Fat Zebra SDK not loaded');
        }
      } catch (err) {
        console.error('OAuth authentication failed:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setIsAuthenticated(false);
      }
    };

    validateAuthentication();

    return () => {
      // Cleanup SDK instance
      if (sdkInstanceRef.current && typeof sdkInstanceRef.current.destroy === 'function') {
        sdkInstanceRef.current.destroy();
      }
    };
  }, [accessToken, username, environment, threeDSRequestorId, enable3DS]);

  // Reset state function
  const resetState = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    setThreeDSResult(null);

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Handle 3DS2 challenges
  const handle3DS2Challenge = useCallback(
    async (result: ThreeDSTransactionResponse): Promise<void> => {
      const challengeUrl = result.threeds_challenge_url || result.challenge_url;

      if (!result || !challengeUrl) {
        throw new Error('Invalid 3DS challenge data - missing challenge URL');
      }

      setLoading(true);
      setError(null);

      try {
        // Extract optional values first
        const acsTransId = result.acs_trans_id || result.acsTransId;
        const threeDSServerTransId = result.threeds_server_trans_id || result.threeDSServerTransId;

        // Build the result object with conditional properties to satisfy exactOptionalPropertyTypes
        const challengeResult: ThreeDSResult = {
          transactionId: result.id || result.transaction_id,
          challengeUrl,
          status: '3DS_CHALLENGE',
          // Only include optional properties if they have actual string values
          ...(acsTransId && { acsTransId }),
          ...(threeDSServerTransId && { threeDSServerTransId }),
        };

        setThreeDSResult(challengeResult);

        // Trigger challenge callback if provided
        if (on3DSChallenge) {
          on3DSChallenge(challengeResult);
        }

        // If using SDK, handle challenge through SDK
        if (
          sdkInstanceRef.current &&
          typeof sdkInstanceRef.current.handle3DSChallenge === 'function'
        ) {
          const challengeResponse = await sdkInstanceRef.current.handle3DSChallenge(result);

          if (challengeResponse.successful) {
            setThreeDSResult(prev =>
              prev
                ? {
                    ...prev,
                    status: '3DS_SUCCESS',
                    authenticationValue: challengeResponse.authentication_value,
                  }
                : null
            );
            setSuccess(true);
          } else {
            throw new Error(challengeResponse.error || '3DS authentication failed');
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '3DS challenge failed';
        setError(errorMessage);
        setThreeDSResult(prev => (prev ? { ...prev, status: '3DS_FAILED' } : null));

        if (onPaymentError) {
          onPaymentError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [on3DSChallenge, onPaymentError]
  );

  // Main payment processing function
  const processPayment = useCallback(
    async (data: OAuthPaymentData): Promise<FatZebraResponse<TransactionResponse>> => {
      if (!isAuthenticated) {
        throw new FatZebraError('Not authenticated. Please provide valid OAuth credentials.');
      }

      if (!sdkInstanceRef.current) {
        throw new FatZebraError('SDK not initialized');
      }

      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setSuccess(false);
      setThreeDSResult(null);

      try {
        // Validate required payment data
        if (!data.amount || data.amount <= 0) {
          throw new FatZebraError('Invalid payment amount');
        }

        if (!data.cardDetails?.card_number) {
          throw new FatZebraError('Card number is required');
        }

        // Build purchase request
        const purchaseRequest: PurchaseRequest = {
          amount: data.amount,
          currency: data.currency || 'AUD',
          reference: data.reference || `oauth-${Date.now()}`,
          card_holder: data.cardDetails.card_holder,
          card_number: data.cardDetails.card_number,
          card_expiry: data.cardDetails.card_expiry,
          cvv: data.cardDetails.cvv,
          ...(data.customer && { customer: data.customer }), // Only include if defined
          metadata: {
            ...data.metadata,
            oauth_payment: true,
            sdk_version: '0.5.9',
            environment,
          },
        };

        // Add 3DS2 specific fields if enabled
        if (enable3DS && data.threeDSRequestorId) {
          purchaseRequest.metadata = {
            ...purchaseRequest.metadata,
            threeds_requestor_id: data.threeDSRequestorId || threeDSRequestorId || username,
            threeds_method_completion: data.threeDSMethod ? 'Y' : 'N',
          };
        }

        // Process payment through SDK
        let response: FatZebraResponse<TransactionResponse>;

        if (enableTokenization && typeof sdkInstanceRef.current.tokenizeAndPay === 'function') {
          // Use tokenization flow
          response = await sdkInstanceRef.current.tokenizeAndPay(purchaseRequest, {
            signal: abortControllerRef.current.signal,
          });
        } else {
          // Standard payment flow
          response = await sdkInstanceRef.current.purchase(purchaseRequest, {
            signal: abortControllerRef.current.signal,
          });
        }

        // Handle response
        if (response.successful && response.response) {
          const txnResponse = response.response as ThreeDSTransactionResponse;

          // Check if 3DS challenge is required
          if (txnResponse.threeds_challenge_url || txnResponse.challenge_url) {
            // Don't set success yet, handle 3DS first
            await handle3DS2Challenge(txnResponse);
          } else {
            // Payment successful without 3DS
            setSuccess(true);
            setThreeDSResult({
              transactionId: txnResponse.id,
              status: '3DS_NOT_REQUIRED',
            });
          }

          if (onPaymentSuccess) {
            onPaymentSuccess(response);
          }

          return response;
        } else {
          // Payment failed
          const errorMessage = response.errors
            ? response.errors.join(', ')
            : 'Payment processing failed';
          throw new FatZebraError(errorMessage, response.errors);
        }
      } catch (err) {
        // Handle different error types
        let errorMessage: string;

        if (err instanceof FatZebraError) {
          errorMessage = err.message;
        } else if (err instanceof Error) {
          if (err.name === 'AbortError') {
            errorMessage = 'Payment request was cancelled';
          } else {
            errorMessage = err.message;
          }
        } else {
          errorMessage = 'An unexpected error occurred during payment processing';
        }

        setError(errorMessage);

        if (onPaymentError) {
          onPaymentError(errorMessage);
        }

        // Re-throw to allow caller to handle
        throw new FatZebraError(errorMessage);
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      isAuthenticated,
      enable3DS,
      enableTokenization,
      environment,
      username,
      threeDSRequestorId,
      onPaymentSuccess,
      onPaymentError,
      handle3DS2Challenge,
    ]
  );

  return {
    loading,
    error,
    success,
    threeDSResult,
    isAuthenticated,
    processPayment,
    handle3DS2Challenge,
    resetState,
  };
}
