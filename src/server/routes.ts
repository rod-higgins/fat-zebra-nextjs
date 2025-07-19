import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, FatZebraError } from '../lib/client';
import type {
  FatZebraConfig,
  PurchaseRequest,
  TokenizationRequest,
  VerificationHashData,
  OAuthConfig
} from '../types';

/**
 * Get Fat Zebra configuration from environment variables
 */
function getFatZebraConfig(): FatZebraConfig {
  const username = process.env.FATZEBRA_USERNAME;
  const token = process.env.FATZEBRA_TOKEN;
  const sharedSecret = process.env.FATZEBRA_SHARED_SECRET;

  if (!username || !token) {
    throw new Error('FATZEBRA_USERNAME and FATZEBRA_TOKEN environment variables are required');
  }

  return {
    username,
    token,
    sharedSecret,
    isTestMode: process.env.NODE_ENV !== 'production'
  };
}

/**
 * Get OAuth configuration from environment variables
 */
function getOAuthConfig(): OAuthConfig {
  const clientId = process.env.FATZEBRA_CLIENT_ID;
  const clientSecret = process.env.FATZEBRA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('FATZEBRA_CLIENT_ID and FATZEBRA_CLIENT_SECRET environment variables are required for OAuth');
  }

  return {
    clientId,
    clientSecret,
    scope: 'purchases:create cards:create'
  };
}

/**
 * Generate OAuth access token
 */
export async function generateAccessToken(request: NextRequest): Promise<NextResponse> {
  try {
    const config = getOAuthConfig();
    
    const tokenResponse = await fetch('https://auth.fatzebra.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: config.scope || 'purchases:create cards:create'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to generate access token');
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in
    });

  } catch (error) {
    console.error('OAuth token generation failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate access token',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process a payment
 */
export async function processPayment(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as PurchaseRequest;
    const config = getFatZebraConfig();
    const client = createFatZebraClient(config);

    // Add server-side metadata
    const purchaseRequest: PurchaseRequest = {
      ...body,
      metadata: {
        ...body.metadata,
        server_timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent') || 'unknown',
        source: '@fwc/fat-zebra-nextjs'
      }
    };

    const result = await client.createPurchase(purchaseRequest);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Payment processing failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { 
          successful: false,
          errors: error.errors,
          message: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        successful: false,
        errors: ['Payment processing failed'],
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process payment with token
 */
export async function processPaymentWithToken(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { cardToken, amount, reference, currency = 'AUD', customerIp, extra } = body;

    const config = getFatZebraConfig();
    const client = createFatZebraClient(config);

    const result = await client.createPurchaseWithToken(
      cardToken,
      amount,
      reference,
      currency,
      customerIp,
      extra
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Token payment processing failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { 
          successful: false,
          errors: error.errors,
          message: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        successful: false,
        errors: ['Token payment processing failed'],
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Tokenize a card
 */
export async function tokenizeCard(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as TokenizationRequest;
    const config = getFatZebraConfig();
    const client = createFatZebraClient(config);

    const result = await client.tokenizeCard(body);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Card tokenization failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { 
          successful: false,
          errors: error.errors,
          message: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        successful: false,
        errors: ['Card tokenization failed'],
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate verification hash
 */
export async function generateVerificationHash(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as VerificationHashData;
    const config = getFatZebraConfig();
    const client = createFatZebraClient(config);

    const hash = await client.generateVerificationHash(body);

    return NextResponse.json({
      hash,
      timestamp: body.timestamp || Date.now()
    });

  } catch (error) {
    console.error('Verification hash generation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate verification hash',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle Fat Zebra webhooks
 */
export async function handleWebhook(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-fz-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    const config = getFatZebraConfig();
    const client = createFatZebraClient(config);

    const isValid = await client.verifyWebhookSignature(body, signature);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const webhookData = JSON.parse(body);
    
    // Process webhook data here
    console.log('Webhook received:', webhookData);

    // You can add your webhook processing logic here
    // For example, update order status, send notifications, etc.

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Verify a card (authorization only)
 */
export async function verifyCard(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const config = getFatZebraConfig();
    const client = createFatZebraClient(config);

    const authRequest = {
      ...body,
      capture: false // Authorization only
    };

    const result = await client.createAuthorization(authRequest);

    // If successful, void the authorization immediately
    if (result.successful && result.response.id) {
      try {
        await client.voidAuthorization(result.response.id);
      } catch (voidError) {
        console.warn('Failed to void verification authorization:', voidError);
        // Continue anyway - the authorization will expire
      }
    }

    return NextResponse.json({
      successful: result.successful,
      verified: result.successful,
      message: result.successful ? 'Card verified successfully' : 'Card verification failed'
    });

  } catch (error) {
    console.error('Card verification failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { 
          successful: false,
          verified: false,
          errors: error.errors,
          message: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        successful: false,
        verified: false,
        errors: ['Card verification failed'],
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get transaction details
 */
export async function getTransaction(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const transactionId = url.pathname.split('/').pop();

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const config = getFatZebraConfig();
    const client = createFatZebraClient(config);

    const result = await client.getPurchase(transactionId);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Transaction retrieval failed:', error);
    
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { 
          successful: false,
          errors: error.errors,
          message: error.message
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        successful: false,
        errors: ['Transaction retrieval failed'],
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function healthCheck(request: NextRequest): Promise<NextResponse> {
  try {
    const config = getFatZebraConfig();
    const client = createFatZebraClient(config);

    const result = await client.ping();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      fatzebra: result.successful ? 'connected' : 'error'
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}