import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '../../lib';
import type { 
  PaymentFormData, 
  FatZebraConfig, 
  OAuthConfig,
  PurchaseRequest,
  TokenizeRequest 
} from '../../types';

// Helper function to get client configuration
function getClientConfig(): FatZebraConfig {
  const config: FatZebraConfig = {
    username: process.env.FATZEBRA_USERNAME!,
    token: process.env.FATZEBRA_TOKEN!,
    isTestMode: process.env.NODE_ENV !== 'production',
    sharedSecret: process.env.FATZEBRA_SHARED_SECRET!
  };

  if (!config.username || !config.token) {
    throw new FatZebraError('Missing required Fat Zebra credentials');
  }

  if (!config.sharedSecret) {
    throw new FatZebraError('Missing required Fat Zebra shared secret');
  }

  return config;
}

// Helper function to get OAuth configuration
function getOAuthConfig(): OAuthConfig {
  return {
    clientId: process.env.FATZEBRA_CLIENT_ID!,
    clientSecret: process.env.FATZEBRA_CLIENT_SECRET!,
    scope: 'payments:create'
  };
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (real) {
    return real;
  }
  
  return '127.0.0.1';
}

/**
 * Generate OAuth access token
 * POST /api/auth/token
 */
export async function generateAccessToken(request: NextRequest) {
  try {
    const client = createFatZebraClient(getClientConfig());
    const oauthConfig = getOAuthConfig();
    
    const accessToken = await client.generateAccessToken(oauthConfig);
    
    return NextResponse.json({ 
      accessToken,
      expiresIn: 3600 // 1 hour
    });
  } catch (error) {
    console.error('Access token generation failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate access token' },
      { status: 500 }
    );
  }
}

/**
 * Generate verification hash for client-side SDK
 * POST /api/generate-verification-hash
 */
export async function generateVerificationHash(request: NextRequest) {
  try {
    const { reference, amount, currency } = await request.json();
    
    if (!reference || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required parameters: reference, amount, currency' },
        { status: 400 }
      );
    }
    
    const client = createFatZebraClient(getClientConfig());
    const hash = client.generateNewCardVerificationHash(reference, amount, currency);
    
    return NextResponse.json({ hash });
  } catch (error) {
    console.error('Verification hash generation failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate verification hash' },
      { status: 500 }
    );
  }
}

/**
 * Process payment with card details
 * POST /api/payments
 */
export async function processPayment(request: NextRequest) {
  try {
    const paymentData: PaymentFormData = await request.json();
    
    if (!paymentData.amount || !paymentData.reference || !paymentData.cardDetails) {
      return NextResponse.json(
        { error: 'Missing required payment data' },
        { status: 400 }
      );
    }
    
    const client = createFatZebraClient(getClientConfig());
    const clientIP = getClientIP(request);
    
    const purchaseRequest: PurchaseRequest = {
      amount: paymentData.amount,
      currency: paymentData.currency || 'AUD',
      reference: paymentData.reference,
      customer_ip: clientIP,
      customer: paymentData.customer,
      card_details: {
        card_holder: paymentData.cardDetails.card_holder,
        card_number: paymentData.cardDetails.card_number,
        card_expiry: paymentData.cardDetails.card_expiry,
        cvv: paymentData.cardDetails.cvv
      }
    };
    
    const response = await client.createPurchase(purchaseRequest);
    const transaction = handleFatZebraResponse(response);
    
    return NextResponse.json({ 
      success: true, 
      transaction,
      message: 'Payment processed successfully'
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
 * POST /api/payments/with-token
 */
export async function processPaymentWithToken(request: NextRequest) {
  try {
    const { token, amount, currency = 'AUD', reference, customer } = await request.json();
    
    if (!token || !amount || !reference) {
      return NextResponse.json(
        { error: 'Missing required parameters: token, amount, reference' },
        { status: 400 }
      );
    }
    
    const client = createFatZebraClient(getClientConfig());
    const clientIP = getClientIP(request);
    
    const response = await client.createPurchaseWithToken(
      token,
      amount,
      reference,
      currency,
      clientIP,
      { customer }
    );
    
    const transaction = handleFatZebraResponse(response);
    
    return NextResponse.json({ 
      success: true, 
      transaction,
      message: 'Payment processed successfully with token'
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
 * Tokenize card (server-side for legacy support)
 * POST /api/tokenize-card
 */
export async function tokenizeCard(request: NextRequest) {
  try {
    const { cardDetails, verification, reference, amount, currency } = await request.json();
    
    if (!cardDetails || !verification) {
      return NextResponse.json(
        { error: 'Missing required parameters: cardDetails, verification' },
        { status: 400 }
      );
    }
    
    const client = createFatZebraClient(getClientConfig());
    
    const tokenizeRequest: TokenizeRequest = {
      card_holder: cardDetails.card_holder,
      card_number: cardDetails.card_number,
      card_expiry: cardDetails.card_expiry,
      cvv: cardDetails.cvv,
      verification_hash: verification
    };
    
    const response = await client.createToken(tokenizeRequest);
    const tokenData = handleFatZebraResponse(response);
    
    return NextResponse.json({ 
      success: true, 
      token: tokenData.token,
      card_number: tokenData.card_number,
      card_type: tokenData.card_type
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
 * Verify existing card token
 * POST /api/verify-card
 */
export async function verifyCard(request: NextRequest) {
  try {
    const { cardToken, accessToken, username } = await request.json();
    
    if (!cardToken) {
      return NextResponse.json(
        { error: 'Missing required parameter: cardToken' },
        { status: 400 }
      );
    }
    
    const client = createFatZebraClient(getClientConfig());
    
    // Generate verification hash for existing card
    const verificationHash = client.generateExistingCardVerificationHash(cardToken);
    
    // In a real implementation, you would use the SDK's VerifyExistingCard component
    // For now, we'll just validate that the token exists
    try {
      const response = await client.getToken(cardToken);
      const tokenData = handleFatZebraResponse(response);
      
      return NextResponse.json({ 
        verified: true,
        token: tokenData.token,
        card_number: tokenData.card_number,
        card_type: tokenData.card_type
      });
    } catch (tokenError) {
      return NextResponse.json({ 
        verified: false,
        error: 'Card token not found or invalid'
      });
    }
    
  } catch (error) {
    console.error('Card verification failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Card verification failed' },
      { status: 500 }
    );
  }
}

/**
 * Get payment/transaction details
 * GET /api/payments/:id
 */
export async function getPayment(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }
    
    const client = createFatZebraClient(getClientConfig());
    const response = await client.getPurchase(id);
    const transaction = handleFatZebraResponse(response);
    
    return NextResponse.json({ 
      success: true, 
      transaction 
    });
    
  } catch (error) {
    console.error('Get payment failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to retrieve payment' },
      { status: 500 }
    );
  }
}

/**
 * Process refund
 * POST /api/refunds
 */
export async function processRefund(request: NextRequest) {
  try {
    const { transaction_id, amount, reference, reason } = await request.json();
    
    if (!transaction_id || !amount || !reference) {
      return NextResponse.json(
        { error: 'Missing required parameters: transaction_id, amount, reference' },
        { status: 400 }
      );
    }
    
    const client = createFatZebraClient(getClientConfig());
    
    const response = await client.createRefund({
      transaction_id,
      amount,
      reference,
      reason
    });
    
    const refund = handleFatZebraResponse(response);
    
    return NextResponse.json({ 
      success: true, 
      refund,
      message: 'Refund processed successfully'
    });
    
  } catch (error) {
    console.error('Refund processing failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Refund processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Webhook handler for Fat Zebra notifications
 * POST /api/webhooks/fatzebra
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
    
    const client = createFatZebraClient(getClientConfig());
    
    // Verify webhook signature
    const isValid = client.verifyWebhookSignature(payload, signature);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }
    
    const webhookData = JSON.parse(payload);
    
    // Process webhook event based on type
    switch (webhookData.type) {
      case 'purchase.successful':
        // Handle successful purchase
        console.log('Purchase successful:', webhookData.data);
        break;
      case 'purchase.failed':
        // Handle failed purchase
        console.log('Purchase failed:', webhookData.data);
        break;
      case 'refund.successful':
        // Handle successful refund
        console.log('Refund successful:', webhookData.data);
        break;
      default:
        console.log('Unhandled webhook type:', webhookData.type);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook processing failed:', error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 * GET /api/health
 */
export async function healthCheck(request: NextRequest) {
  try {
    const client = createFatZebraClient(getClientConfig());
    const response = await client.ping();
    const result = handleFatZebraResponse(response);
    
    return NextResponse.json({ 
      status: 'healthy',
      fatzebra: result.ping,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}