import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, FatZebraError, handleFatZebraResponse } from '../client';
import { generateVerificationHash, extractErrorMessage, validateAmount } from '../../utils';
import type { 
  PurchaseRequest, 
  AuthorizationRequest, 
  RefundRequest, 
  TokenizationRequest,
  OAuthConfig 
} from '../../types';

/**
 * Create Fat Zebra client from environment variables
 */
function createClientFromEnv() {
  const username = process.env.FATZEBRA_USERNAME;
  const token = process.env.FATZEBRA_TOKEN;
  const sharedSecret = process.env.FATZEBRA_SHARED_SECRET;
  
  if (!username || !token) {
    throw new FatZebraError('Missing Fat Zebra credentials in environment variables');
  }
  
  return createFatZebraClient({
    username,
    token,
    sharedSecret,
    isTestMode: process.env.NODE_ENV !== 'production'
  });
}

/**
 * Generate OAuth access token
 * POST /api/fat-zebra/oauth/token
 */
export async function generateOAuthToken(request: NextRequest) {
  try {
    const { scope = 'payment' } = await request.json();
    
    const client = createClientFromEnv();
    const oauthConfig: OAuthConfig = {
      clientId: process.env.FATZEBRA_CLIENT_ID!,
      clientSecret: process.env.FATZEBRA_CLIENT_SECRET!,
      scope
    };
    
    const response = await client.generateAccessToken(oauthConfig);
    const { access_token, expires_in } = handleFatZebraResponse(response);
    
    return NextResponse.json({
      access_token,
      expires_in,
      token_type: 'Bearer'
    });
  } catch (error) {
    console.error('OAuth token generation failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate OAuth token' },
      { status: 500 }
    );
  }
}

/**
 * Generate verification hash for tokenization
 * POST /api/fat-zebra/verification-hash
 */
export async function generateVerificationHashRoute(request: NextRequest) {
  try {
    const { reference, amount, currency } = await request.json();
    
    if (!reference || amount === undefined || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: reference, amount, currency' },
        { status: 400 }
      );
    }
    
    const sharedSecret = process.env.FATZEBRA_SHARED_SECRET;
    if (!sharedSecret) {
      return NextResponse.json(
        { error: 'Shared secret not configured' },
        { status: 500 }
      );
    }
    
    const hash = generateVerificationHash(
      { reference, amount, currency, timestamp: Date.now() },
      sharedSecret
    );
    
    return NextResponse.json({ hash });
  } catch (error) {
    console.error('Verification hash generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate verification hash' },
      { status: 500 }
    );
  }
}

/**
 * Process a direct purchase
 * POST /api/fat-zebra/payment
 */
export async function processPayment(request: NextRequest) {
  try {
    const paymentData = await request.json();
    const client = createClientFromEnv();
    
    // Validate amount
    if (!validateAmount(paymentData.amount, paymentData.currency)) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }
    
    const purchaseRequest: PurchaseRequest = {
      amount: paymentData.amount,
      currency: paymentData.currency || 'AUD',
      reference: paymentData.reference,
      customer_ip: request.ip || '127.0.0.1',
      card_details: paymentData.cardDetails,
      customer: paymentData.customer,
      capture: true
    };
    
    const response = await client.createPurchase(purchaseRequest);
    const transaction = handleFatZebraResponse(response);
    
    return NextResponse.json({
      success: true,
      transaction,
      transaction_id: transaction.id
    });
  } catch (error) {
    console.error('Payment processing failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Process payment with token
 * POST /api/fat-zebra/payment-with-token
 */
export async function processPaymentWithToken(request: NextRequest) {
  try {
    const { token, amount, currency, reference, customer } = await request.json();
    
    if (!token || !amount || !reference) {
      return NextResponse.json(
        { error: 'Missing required fields: token, amount, reference' },
        { status: 400 }
      );
    }
    
    const client = createClientFromEnv();
    
    // Validate amount
    if (!validateAmount(amount, currency)) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }
    
    const response = await client.createPurchaseWithToken(
      token,
      amount,
      reference,
      currency || 'AUD',
      request.ip || '127.0.0.1',
      { customer }
    );
    
    const transaction = handleFatZebraResponse(response);
    
    return NextResponse.json({
      success: true,
      transaction,
      transaction_id: transaction.id
    });
  } catch (error) {
    console.error('Token payment processing failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Token payment processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Tokenize card details
 * POST /api/fat-zebra/tokenize
 */
export async function tokenizeCard(request: NextRequest) {
  try {
    const { cardDetails, verification } = await request.json();
    
    if (!cardDetails || !verification) {
      return NextResponse.json(
        { error: 'Missing required fields: cardDetails, verification' },
        { status: 400 }
      );
    }
    
    const client = createClientFromEnv();
    
    const tokenRequest: TokenizationRequest = {
      card_holder: cardDetails.card_holder,
      card_number: cardDetails.card_number,
      card_expiry: cardDetails.card_expiry,
      cvv: cardDetails.cvv,
      verification
    };
    
    const response = await client.createToken(tokenRequest);
    const tokenData = handleFatZebraResponse(response);
    
    return NextResponse.json({
      success: true,
      token: tokenData.token,
      authorized: tokenData.authorized
    });
  } catch (error) {
    console.error('Card tokenization failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Card tokenization failed' },
      { status: 500 }
    );
  }
}

/**
 * Verify card with 3DS
 * POST /api/fat-zebra/verify-card
 */
export async function verifyCard(request: NextRequest) {
  try {
    const { cardDetails, enable3DS = true } = await request.json();
    
    if (!cardDetails) {
      return NextResponse.json(
        { error: 'Missing cardDetails' },
        { status: 400 }
      );
    }
    
    // For card verification, we can use a $0 authorization
    const client = createClientFromEnv();
    
    const authRequest: AuthorizationRequest = {
      amount: 0,
      currency: 'AUD',
      reference: `VERIFY-${Date.now()}`,
      customer_ip: request.ip || '127.0.0.1',
      card_details: cardDetails
    };
    
    const response = await client.createAuthorization(authRequest);
    const authorization = handleFatZebraResponse(response);
    
    return NextResponse.json({
      success: true,
      verified: authorization.successful,
      authorization_id: authorization.id
    });
  } catch (error) {
    console.error('Card verification failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors, verified: false },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Card verification failed', verified: false },
      { status: 500 }
    );
  }
}

/**
 * Create authorization (pre-auth)
 * POST /api/fat-zebra/authorization
 */
export async function createAuthorization(request: NextRequest) {
  try {
    const authData = await request.json();
    const client = createClientFromEnv();
    
    // Validate amount
    if (!validateAmount(authData.amount, authData.currency)) {
      return NextResponse.json(
        { error: 'Invalid authorization amount' },
        { status: 400 }
      );
    }
    
    const authRequest: AuthorizationRequest = {
      amount: authData.amount,
      currency: authData.currency || 'AUD',
      reference: authData.reference,
      customer_ip: request.ip || '127.0.0.1',
      card_details: authData.cardDetails,
      customer: authData.customer
    };
    
    const response = await client.createAuthorization(authRequest);
    const authorization = handleFatZebraResponse(response);
    
    return NextResponse.json({
      success: true,
      authorization,
      authorization_id: authorization.id
    });
  } catch (error) {
    console.error('Authorization failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Authorization failed' },
      { status: 500 }
    );
  }
}

/**
 * Capture authorization
 * POST /api/fat-zebra/capture
 */
export async function captureAuthorization(request: NextRequest) {
  try {
    const { authorization_id, amount } = await request.json();
    
    if (!authorization_id) {
      return NextResponse.json(
        { error: 'Missing authorization_id' },
        { status: 400 }
      );
    }
    
    const client = createClientFromEnv();
    const response = await client.captureAuthorization(authorization_id, amount);
    const capture = handleFatZebraResponse(response);
    
    return NextResponse.json({
      success: true,
      capture,
      transaction_id: capture.id
    });
  } catch (error) {
    console.error('Capture failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Capture failed' },
      { status: 500 }
    );
  }
}

/**
 * Process refund
 * POST /api/fat-zebra/refund
 */
export async function processRefund(request: NextRequest) {
  try {
    const { transaction_id, amount, reason } = await request.json();
    
    if (!transaction_id) {
      return NextResponse.json(
        { error: 'Missing transaction_id' },
        { status: 400 }
      );
    }
    
    const client = createClientFromEnv();
    
    const refundRequest: RefundRequest = {
      transaction_id,
      amount,
      reason: reason || 'Customer request'
    };
    
    const response = await client.createRefund(refundRequest);
    const refund = handleFatZebraResponse(response);
    
    return NextResponse.json({
      success: true,
      refund,
      refund_id: refund.id
    });
  } catch (error) {
    console.error('Refund failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Refund failed' },
      { status: 500 }
    );
  }
}

/**
 * Get transaction details
 * GET /api/fat-zebra/transaction/[id]
 */
export async function getTransaction(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const transactionId = url.pathname.split('/').pop();
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Missing transaction ID' },
        { status: 400 }
      );
    }
    
    const client = createClientFromEnv();
    const response = await client.getPurchase(transactionId);
    const transaction = handleFatZebraResponse(response);
    
    return NextResponse.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Failed to get transaction:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get transaction' },
      { status: 500 }
    );
  }
}

/**
 * Handle webhook events
 * POST /api/fat-zebra/webhook
 */
export async function handleWebhook(request: NextRequest) {
  try {
    const signature = request.headers.get('x-fz-signature');
    const payload = await request.text();
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }
    
    const client = createClientFromEnv();
    
    // Verify webhook signature
    const isValid = client.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }
    
    const event = JSON.parse(payload);
    
    // Process webhook event
    console.log('Received webhook event:', event);
    
    // Add your webhook processing logic here
    // For example: update database, send notifications, etc.
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Get settlements
 * GET /api/fat-zebra/settlements
 */
export async function getSettlements(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    
    const client = createClientFromEnv();
    const response = await client.getSettlements(from || undefined, to || undefined);
    const settlements = handleFatZebraResponse(response);
    
    return NextResponse.json({
      success: true,
      settlements
    });
  } catch (error) {
    console.error('Failed to get settlements:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get settlements' },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 * GET /api/fat-zebra/ping
 */
export async function healthCheck(request: NextRequest) {
  try {
    const client = createClientFromEnv();
    const response = await client.ping();
    const result = handleFatZebraResponse(response);
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: extractErrorMessage(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Subscription management
 * POST /api/fat-zebra/subscription
 */
export async function createSubscription(request: NextRequest) {
  try {
    const { customerId, planId, frequency, startDate } = await request.json();
    
    if (!customerId || !planId || !frequency) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, planId, frequency' },
        { status: 400 }
      );
    }
    
    // Implementation depends on your subscription system
    // This is a placeholder for subscription creation logic
    
    const subscription = {
      id: `SUB-${Date.now()}`,
      customer_id: customerId,
      plan_id: planId,
      frequency,
      start_date: startDate || new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Subscription creation failed:', error);
    return NextResponse.json(
      { error: 'Subscription creation failed' },
      { status: 500 }
    );
  }
}

/**
 * Cancel subscription
 * DELETE /api/fat-zebra/subscription/[id]
 */
export async function cancelSubscription(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const subscriptionId = url.pathname.split('/').pop();
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscription ID' },
        { status: 400 }
      );
    }
    
    // Implementation depends on your subscription system
    // This is a placeholder for subscription cancellation logic
    
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription_id: subscriptionId
    });
  } catch (error) {
    console.error('Subscription cancellation failed:', error);
    return NextResponse.json(
      { error: 'Subscription cancellation failed' },
      { status: 500 }
    );
  }
}

// Export all route handlers
export const routes = {
  generateOAuthToken,
  generateVerificationHashRoute,
  processPayment,
  processPaymentWithToken,
  tokenizeCard,
  verifyCard,
  createAuthorization,
  captureAuthorization,
  processRefund,
  getTransaction,
  handleWebhook,
  getSettlements,
  healthCheck,
  createSubscription,
  cancelSubscription
};