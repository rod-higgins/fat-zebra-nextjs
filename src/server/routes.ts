import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '../lib/client';
import { sanitizeCardData, formatErrorMessage, isTestMode } from '../utils';
import {
  PurchaseRequest,
  RefundRequest,
  TokenizationRequest,
  OAuthConfig,
  VerificationHashData,
  WebhookEvent
} from '../types';

// Initialize Fat Zebra client
function getFatZebraClient() {
  return createFatZebraClient({
    username: process.env.FATZEBRA_USERNAME!,
    token: process.env.FATZEBRA_TOKEN!,
    sharedSecret: process.env.FATZEBRA_SHARED_SECRET,
    isTestMode: isTestMode()
  });
}

// OAuth token generation
export async function generateAccessToken(request: NextRequest) {
  try {
    const client = getFatZebraClient();
    
    const oauthConfig: OAuthConfig = {
      clientId: process.env.FATZEBRA_CLIENT_ID!,
      clientSecret: process.env.FATZEBRA_CLIENT_SECRET!,
      scope: 'api'
    };

    const tokenResponse = await client.generateAccessToken(oauthConfig);

    return NextResponse.json({
      success: true,
      accessToken: tokenResponse.access_token,
      expiresIn: tokenResponse.expires_in
    });

  } catch (error) {
    console.error('OAuth token generation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: formatErrorMessage(error)
    }, { status: 500 });
  }
}

// Generate verification hash
export async function generateVerificationHash(request: NextRequest) {
  try {
    const { reference, amount, currency } = await request.json();
    
    if (!reference || !amount || !currency) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: reference, amount, currency'
      }, { status: 400 });
    }

    const client = getFatZebraClient();
    
    const hashData: VerificationHashData = {
      reference,
      amount: parseFloat(amount),
      currency,
      timestamp: Math.floor(Date.now() / 1000)
    };

    const verificationHash = client.generateVerificationHash(hashData);

    return NextResponse.json({
      success: true,
      verificationHash,
      timestamp: hashData.timestamp
    });

  } catch (error) {
    console.error('Verification hash generation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: formatErrorMessage(error)
    }, { status: 500 });
  }
}

// Process standard payment
export async function processPayment(request: NextRequest) {
  try {
    const { amount, currency, reference, cardDetails, customer, customerIp } = await request.json();

    // Validate required fields
    if (!amount || !cardDetails || !reference) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: amount, cardDetails, reference'
      }, { status: 400 });
    }

    // Sanitize card data
    const sanitizedCardDetails = sanitizeCardData(cardDetails);

    const client = getFatZebraClient();
    
    const purchaseRequest: PurchaseRequest = {
      amount: parseFloat(amount),
      currency: currency || 'AUD',
      reference,
      card_details: sanitizedCardDetails,
      customer,
      customer_ip: customerIp || getClientIP(request)
    };

    const response = await client.createPurchase(purchaseRequest);
    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        successful: transaction.successful,
        message: transaction.response?.message || 'Payment successful',
        authorization: transaction.response?.authorization,
        card: transaction.response?.card ? {
          token: transaction.response.card.token,
          display_number: transaction.response.card.display_number,
          scheme: transaction.response.card.scheme
        } : undefined
      }
    });

  } catch (error) {
    console.error('Payment processing failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Payment processing failed'
    }, { status: 500 });
  }
}

// Process payment with 3DS
export async function processPaymentWith3DS(request: NextRequest) {
  try {
    const { amount, currency, reference, cardDetails, customer, customerIp, verificationData } = await request.json();

    // Validate required fields
    if (!amount || !cardDetails || !reference || !verificationData) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields for 3DS payment'
      }, { status: 400 });
    }

    // Sanitize card data
    const sanitizedCardDetails = sanitizeCardData(cardDetails);

    const client = getFatZebraClient();
    
    const purchaseRequest: PurchaseRequest = {
      amount: parseFloat(amount),
      currency: currency || 'AUD',
      reference,
      card_details: sanitizedCardDetails,
      customer,
      customer_ip: customerIp || getClientIP(request),
      extra: {
        threeds_data: verificationData
      }
    };

    const response = await client.createPurchase(purchaseRequest);
    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        successful: transaction.successful,
        message: transaction.response?.message || '3DS payment successful',
        authorization: transaction.response?.authorization,
        card: transaction.response?.card ? {
          token: transaction.response.card.token,
          display_number: transaction.response.card.display_number,
          scheme: transaction.response.card.scheme
        } : undefined
      }
    });

  } catch (error) {
    console.error('3DS payment processing failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: '3DS payment processing failed'
    }, { status: 500 });
  }
}

// Process payment with token
export async function processPaymentWithToken(request: NextRequest) {
  try {
    const { token, amount, currency, reference, customerIp } = await request.json();

    // Validate required fields
    if (!token || !amount || !reference) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: token, amount, reference'
      }, { status: 400 });
    }

    const client = getFatZebraClient();
    
    const response = await client.createPurchaseWithToken(
      token,
      parseFloat(amount),
      reference,
      currency || 'AUD',
      customerIp || getClientIP(request)
    );

    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        successful: transaction.successful,
        message: transaction.response?.message || 'Token payment successful',
        authorization: transaction.response?.authorization
      }
    });

  } catch (error) {
    console.error('Token payment processing failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Token payment processing failed'
    }, { status: 500 });
  }
}

// Tokenize card
export async function tokenizeCard(request: NextRequest) {
  try {
    const { cardDetails, verification } = await request.json();

    if (!cardDetails) {
      return NextResponse.json({
        success: false,
        error: 'Missing card details'
      }, { status: 400 });
    }

    // Sanitize card data
    const sanitizedCardDetails = sanitizeCardData(cardDetails);

    const client = getFatZebraClient();
    
    const tokenizationRequest: TokenizationRequest = {
      ...sanitizedCardDetails,
      verification
    };

    const response = await client.createToken(tokenizationRequest);
    const tokenData = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      token: tokenData.response.token,
      card: {
        display_number: tokenData.response.card_number,
        expiry: tokenData.response.card_expiry,
        holder: tokenData.response.card_holder
      }
    });

  } catch (error) {
    console.error('Card tokenization failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Card tokenization failed'
    }, { status: 500 });
  }
}

// Process refund
export async function processRefund(request: NextRequest) {
  try {
    const { transactionId, amount, reason, reference } = await request.json();

    if (!transactionId && !reference) {
      return NextResponse.json({
        success: false,
        error: 'Either transaction ID or reference is required'
      }, { status: 400 });
    }

    const client = getFatZebraClient();
    
    const refundRequest: RefundRequest = {
      transaction_id: transactionId,
      reference,
      amount: amount ? parseFloat(amount) : undefined,
      reason
    };

    const response = await client.createRefund(refundRequest);
    const refund = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        successful: refund.successful,
        message: refund.response?.message || 'Refund successful',
        reference: refund.reference
      }
    });

  } catch (error) {
    console.error('Refund processing failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Refund processing failed'
    }, { status: 500 });
  }
}

// Handle webhook
export async function handleWebhook(request: NextRequest) {
  try {
    const signature = request.headers.get('x-fatzebra-signature');
    
    if (!signature) {
      return NextResponse.json({
        error: 'Missing webhook signature'
      }, { status: 400 });
    }

    const body = await request.text();
    const client = getFatZebraClient();
    
    // Verify webhook signature
    const isValid = client.verifyWebhookSignature(body, signature);
    
    if (!isValid) {
      return NextResponse.json({
        error: 'Invalid webhook signature'
      }, { status: 400 });
    }

    const webhookData: WebhookEvent = JSON.parse(body);
    
    // Process webhook based on type
    switch (webhookData.type) {
      case 'purchase.created':
        console.log('Purchase created:', webhookData.data);
        break;
      case 'purchase.updated':
        console.log('Purchase updated:', webhookData.data);
        break;
      case 'refund.created':
        console.log('Refund created:', webhookData.data);
        break;
      default:
        console.log('Unknown webhook type:', webhookData.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    
    return NextResponse.json({
      error: 'Webhook processing failed'
    }, { status: 500 });
  }
}

// Get transaction details
export async function getTransaction(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('id');

    if (!transactionId) {
      return NextResponse.json({
        success: false,
        error: 'Transaction ID is required'
      }, { status: 400 });
    }

    const client = getFatZebraClient();
    const response = await client.getPurchase(transactionId);
    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        successful: transaction.successful,
        message: transaction.response?.message,
        settlement_date: transaction.response?.settlement?.date,
        created_at: transaction.response?.created_at
      }
    });

  } catch (error) {
    console.error('Transaction retrieval failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Transaction retrieval failed'
    }, { status: 500 });
  }
}

// Utility function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback for development
  return '127.0.0.1';
}

// Health check endpoint
export async function healthCheck(request: NextRequest) {
  try {
    const client = getFatZebraClient();
    const response = await client.ping();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: isTestMode() ? 'sandbox' : 'production',
      fatZebraStatus: response.successful ? 'connected' : 'disconnected'
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: formatErrorMessage(error)
    }, { status: 503 });
  }
}

// Export all route handlers
export const routes = {
  generateAccessToken,
  generateVerificationHash,
  processPayment,
  processPaymentWith3DS,
  processPaymentWithToken,
  tokenizeCard,
  processRefund,
  handleWebhook,
  getTransaction,
  healthCheck
};