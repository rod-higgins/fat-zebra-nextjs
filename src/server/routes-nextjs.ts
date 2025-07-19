/**
 * Next.js specific route handlers
 * These handlers use Next.js specific features like NextRequest and NextResponse
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '../lib/client';
import { generateVerificationHash, extractErrorMessage, extractErrorDetails } from '../utils';
import type { 
  PurchaseRequest, 
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
  WebhookEvent 
} from '../types';

// Runtime configuration for Next.js Edge Runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Helper function to create Next.js JSON response
 */
function createNextResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Helper function to get client IP from Next.js request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown';
}

/**
 * Health check endpoint for Next.js
 */
export async function handleHealthCheck(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'GET') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    return createNextResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.3.8',
      mode: 'nextjs',
      edge: runtime === 'edge'
    });
  } catch (error) {
    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}

/**
 * Process a purchase transaction with Next.js
 */
export async function handlePurchase(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { purchaseData, config } = body;

    if (!purchaseData || !config) {
      return createNextResponse({
        successful: false,
        errors: ['purchaseData and config are required']
      }, 400);
    }

    const client = createFatZebraClient(config);
    const result = await client.purchase(purchaseData as PurchaseRequest);
    
    return createNextResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createNextResponse({
        successful: false,
        errors: error.errors,
        response: error.response
      }, 400);
    }

    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}

/**
 * Process an authorization transaction with Next.js
 */
export async function handleAuthorization(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { authData, config } = body;

    if (!authData || !config) {
      return createNextResponse({
        successful: false,
        errors: ['authData and config are required']
      }, 400);
    }

    const client = createFatZebraClient(config);
    const result = await client.authorize(authData as AuthorizationRequest);
    
    return createNextResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createNextResponse({
        successful: false,
        errors: error.errors,
        response: error.response
      }, 400);
    }

    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}

/**
 * Capture a previously authorized transaction with Next.js
 */
export async function handleCapture(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { transactionId, amount, config } = body;

    if (!transactionId || !config) {
      return createNextResponse({
        successful: false,
        errors: ['transactionId and config are required']
      }, 400);
    }

    const client = createFatZebraClient(config);
    const result = await client.capture(transactionId, amount);
    
    return createNextResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createNextResponse({
        successful: false,
        errors: error.errors,
        response: error.response
      }, 400);
    }

    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}

/**
 * Process a refund transaction with Next.js
 */
export async function handleRefund(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { refundData, config } = body;

    if (!refundData || !config) {
      return createNextResponse({
        successful: false,
        errors: ['refundData and config are required']
      }, 400);
    }

    const client = createFatZebraClient(config);
    const result = await client.refund(refundData as RefundRequest);
    
    return createNextResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createNextResponse({
        successful: false,
        errors: error.errors,
        response: error.response
      }, 400);
    }

    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}

/**
 * Tokenize card details with Next.js
 */
export async function handleTokenization(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { tokenData, config } = body;

    if (!tokenData || !config) {
      return createNextResponse({
        successful: false,
        errors: ['tokenData and config are required']
      }, 400);
    }

    const client = createFatZebraClient(config);
    const result = await client.tokenize(tokenData as TokenizationRequest);
    
    return createNextResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createNextResponse({
        successful: false,
        errors: error.errors,
        response: error.response
      }, 400);
    }

    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}

/**
 * Void a transaction with Next.js
 */
export async function handleVoid(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { transactionId, config } = body;

    if (!transactionId || !config) {
      return createNextResponse({
        successful: false,
        errors: ['transactionId and config are required']
      }, 400);
    }

    const client = createFatZebraClient(config);
    const result = await client.void(transactionId);
    
    return createNextResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createNextResponse({
        successful: false,
        errors: error.errors,
        response: error.response
      }, 400);
    }

    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}

/**
 * Get transaction status with Next.js
 */
export async function handleTransactionStatus(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { transactionId, config } = body;

    if (!transactionId || !config) {
      return createNextResponse({
        successful: false,
        errors: ['transactionId and config are required']
      }, 400);
    }

    const client = createFatZebraClient(config);
    const result = await client.getTransaction(transactionId);
    
    return createNextResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createNextResponse({
        successful: false,
        errors: error.errors,
        response: error.response
      }, 400);
    }

    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}

/**
 * Verify webhook signature with Next.js
 */
export async function handleVerifyWebhook(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { payload, sharedSecret } = body;
    const signature = request.headers.get('x-fatzebra-signature') || request.headers.get('x-fatzebra-hmac');

    if (!payload || !sharedSecret || !signature) {
      return createNextResponse({
        successful: false,
        errors: ['payload, sharedSecret, and signature are required']
      }, 400);
    }

    const expectedHash = generateVerificationHash(payload, sharedSecret);
    const isValid = expectedHash === signature;

    return createNextResponse({
      successful: true,
      verified: isValid,
      payload: isValid ? payload : null,
      clientIP: getClientIP(request)
    });
  } catch (error) {
    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}

/**
 * Generate verification hash with Next.js
 */
export async function handleGenerateHash(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { data, sharedSecret } = body;

    if (!data || !sharedSecret) {
      return createNextResponse({
        successful: false,
        errors: ['data and sharedSecret are required']
      }, 400);
    }

    const hash = generateVerificationHash(data, sharedSecret);

    return createNextResponse({
      successful: true,
      hash
    });
  } catch (error) {
    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}

/**
 * Enhanced webhook handler for Next.js with additional features
 */
export async function handleEnhancedWebhook(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const signature = request.headers.get('x-fatzebra-signature') || request.headers.get('x-fatzebra-hmac');
    const contentType = request.headers.get('content-type');
    const userAgent = request.headers.get('user-agent');
    const clientIP = getClientIP(request);

    // Log webhook attempt for debugging
    console.log('Webhook received:', {
      clientIP,
      contentType,
      userAgent,
      hasSignature: !!signature,
      bodySize: JSON.stringify(body).length
    });

    const { payload, sharedSecret } = body;

    if (!payload || !sharedSecret || !signature) {
      return createNextResponse({
        successful: false,
        errors: ['payload, sharedSecret, and signature are required']
      }, 400);
    }

    const expectedHash = generateVerificationHash(payload, sharedSecret);
    const isValid = expectedHash === signature;

    if (!isValid) {
      console.warn('Webhook signature verification failed:', {
        clientIP,
        expectedHash: expectedHash.substring(0, 8) + '...',
        receivedHash: signature.substring(0, 8) + '...'
      });
    }

    return createNextResponse({
      successful: true,
      verified: isValid,
      payload: isValid ? payload : null,
      metadata: {
        clientIP,
        timestamp: new Date().toISOString(),
        contentType,
        userAgent
      }
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return createNextResponse({
      successful: false,
      errors: [extractErrorMessage(error)]
    }, 500);
  }
}