/**
 * Next.js specific route handlers
 * These handlers use Next.js specific features like NextRequest and NextResponse
 * This file should only be imported when Next.js is available
 */

// Conditional imports - only import when Next.js is available
let NextRequest: any;
let NextResponse: any;

try {
  if (typeof require !== 'undefined') {
    const nextServer = require('next/server');
    NextRequest = nextServer.NextRequest;
    NextResponse = nextServer.NextResponse;
  } else {
    throw new Error('require not available');
  }
} catch (error) {
  // Next.js not available - create placeholder types
  NextRequest = class MockNextRequest {};
  NextResponse = {
    json: (data: any, init?: any) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(data),
      headers: new Map(),
      body: JSON.stringify(data),
    }),
  };
}

import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '../lib/client';
import { generateVerificationHash, extractErrorMessage } from '../utils';
import type {
  PurchaseRequest,
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
  WebhookEvent,
} from '../types';

// Runtime configuration for Next.js Edge Runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Helper function to create Next.js JSON response
 */
function createNextResponse(data: any, status: number = 200) {
  if (NextResponse && NextResponse.json) {
    return NextResponse.json(data, { status });
  }
  // Fallback for non-Next.js environments
  return {
    status,
    json: () => Promise.resolve(data),
    headers: new Map(),
    body: JSON.stringify(data),
  };
}

/**
 * Utility function to verify webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Compare signatures using a constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Health check endpoint for Next.js
 */
export async function handleHealthCheck(request: any): Promise<any> {
  try {
    if (request.method !== 'GET') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    return createNextResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.4.0',
      mode: 'nextjs',
      edge: runtime === 'edge',
    });
  } catch (error) {
    return createNextResponse(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      500
    );
  }
}

/**
 * Process a purchase transaction with Next.js
 */
export async function handlePurchase(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body: PurchaseRequest = await request.json();

    if (!body.amount || !body.currency) {
      return createNextResponse(
        { successful: false, errors: ['Missing required fields: amount, currency'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.purchase(body);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Purchase error:', error);

    if (error instanceof FatZebraError) {
      return createNextResponse(
        {
          successful: false,
          error: error.message,
          details: error.errors,
        },
        400
      );
    }

    return createNextResponse(
      {
        successful: false,
        error: extractErrorMessage(error),
      },
      500
    );
  }
}

/**
 * Process an authorization transaction with Next.js
 */
export async function handleAuthorization(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body: AuthorizationRequest = await request.json();

    if (!body.amount || !body.currency || !body.card_number) {
      return createNextResponse(
        { successful: false, errors: ['Missing required fields: amount, currency, card_number'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.authorize(body);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Authorization error:', error);

    if (error instanceof FatZebraError) {
      return createNextResponse(
        {
          successful: false,
          error: error.message,
          details: error.errors,
        },
        400
      );
    }

    return createNextResponse(
      {
        successful: false,
        error: extractErrorMessage(error),
      },
      500
    );
  }
}

/**
 * Capture an authorized transaction with Next.js
 */
export async function handleCapture(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { transactionId, amount } = body;

    if (!transactionId) {
      return createNextResponse(
        { successful: false, errors: ['Missing required field: transactionId'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.capture(transactionId, amount);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Capture error:', error);

    if (error instanceof FatZebraError) {
      return createNextResponse(
        {
          successful: false,
          error: error.message,
          details: error.errors,
        },
        400
      );
    }

    return createNextResponse(
      {
        successful: false,
        error: extractErrorMessage(error),
      },
      500
    );
  }
}

/**
 * Process a refund transaction with Next.js
 */
export async function handleRefund(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body: RefundRequest = await request.json();

    if (!body.transaction_id) {
      return createNextResponse(
        { successful: false, errors: ['Missing required field: transaction_id'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.refund(body);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Refund error:', error);

    if (error instanceof FatZebraError) {
      return createNextResponse(
        {
          successful: false,
          error: error.message,
          details: error.errors,
        },
        400
      );
    }

    return createNextResponse(
      {
        successful: false,
        error: extractErrorMessage(error),
      },
      500
    );
  }
}

/**
 * Process a tokenization request with Next.js
 */
export async function handleTokenization(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body: TokenizationRequest = await request.json();

    if (!body.card_number || !body.card_expiry || !body.card_holder) {
      return createNextResponse(
        { successful: false, errors: ['Missing required card fields'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.tokenize(body);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Tokenization error:', error);

    if (error instanceof FatZebraError) {
      return createNextResponse(
        {
          successful: false,
          error: error.message,
          details: error.errors,
        },
        400
      );
    }

    return createNextResponse(
      {
        successful: false,
        error: extractErrorMessage(error),
      },
      500
    );
  }
}

/**
 * Void a transaction with Next.js
 */
export async function handleVoid(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return createNextResponse(
        { successful: false, errors: ['Missing required field: transactionId'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.void(transactionId);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Void error:', error);

    if (error instanceof FatZebraError) {
      return createNextResponse(
        {
          successful: false,
          error: error.message,
          details: error.errors,
        },
        400
      );
    }

    return createNextResponse(
      {
        successful: false,
        error: extractErrorMessage(error),
      },
      500
    );
  }
}

/**
 * Get transaction status with Next.js
 */
export async function handleTransactionStatus(request: any): Promise<any> {
  try {
    if (request.method !== 'GET') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const url = new URL(request.url);
    const transactionId = url.searchParams.get('id');

    if (!transactionId) {
      return createNextResponse({ successful: false, errors: ['Missing transaction ID'] }, 400);
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.getTransaction(transactionId);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Transaction status error:', error);

    if (error instanceof FatZebraError) {
      return createNextResponse(
        {
          successful: false,
          error: error.message,
          details: error.errors,
        },
        400
      );
    }

    return createNextResponse(
      {
        successful: false,
        error: extractErrorMessage(error),
      },
      500
    );
  }
}

/**
 * Verify webhook with Next.js
 */
export async function handleVerifyWebhook(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.text();
    const signature = request.headers.get?.('x-fz-signature') || request.headers['x-fz-signature'];

    if (!signature) {
      return createNextResponse({ successful: false, errors: ['Missing webhook signature'] }, 400);
    }

    const sharedSecret = process.env.FAT_ZEBRA_SHARED_SECRET;
    if (!sharedSecret) {
      return createNextResponse(
        { successful: false, errors: ['Shared secret not configured'] },
        500
      );
    }

    const isValid = verifyWebhookSignature(body, signature, sharedSecret);

    if (!isValid) {
      return createNextResponse({ successful: false, errors: ['Invalid webhook signature'] }, 401);
    }

    const webhookData: WebhookEvent = JSON.parse(body);

    return createNextResponse({
      successful: true,
      verified: true,
      event: webhookData,
    });
  } catch (error) {
    console.error('Webhook verification error:', error);

    return createNextResponse(
      {
        successful: false,
        error: extractErrorMessage(error),
      },
      500
    );
  }
}

/**
 * Generate verification hash with Next.js
 */
export async function handleGenerateHash(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();
    const { reference, amount, currency, timestamp } = body;

    if (!reference || amount === undefined || !currency) {
      return createNextResponse(
        { successful: false, errors: ['Missing required fields: reference, amount, currency'] },
        400
      );
    }

    const sharedSecret = process.env.FAT_ZEBRA_SHARED_SECRET;
    if (!sharedSecret) {
      return createNextResponse(
        { successful: false, errors: ['Shared secret not configured'] },
        500
      );
    }

    const hashData = {
      reference,
      amount,
      currency,
      timestamp: timestamp || Date.now(),
    };

    const hash = generateVerificationHash(hashData, sharedSecret);

    return createNextResponse({
      successful: true,
      hash,
      reference,
      amount,
      currency,
    });
  } catch (error) {
    console.error('Hash generation error:', error);

    return createNextResponse(
      {
        successful: false,
        error: extractErrorMessage(error),
      },
      500
    );
  }
}

/**
 * Enhanced webhook handler with database integration (Next.js specific)
 */
export async function handleEnhancedWebhook(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.text();
    const signature = request.headers.get?.('x-fz-signature') || request.headers['x-fz-signature'];

    if (!signature) {
      return createNextResponse({ successful: false, errors: ['Missing webhook signature'] }, 400);
    }

    const sharedSecret = process.env.FAT_ZEBRA_SHARED_SECRET;
    if (!sharedSecret) {
      return createNextResponse(
        { successful: false, errors: ['Shared secret not configured'] },
        500
      );
    }

    const isValid = verifyWebhookSignature(body, signature, sharedSecret);

    if (!isValid) {
      return createNextResponse({ successful: false, errors: ['Invalid webhook signature'] }, 401);
    }

    const webhookData: WebhookEvent = JSON.parse(body);

    // Extract the appropriate identifier based on the response type
    let transactionId: string | undefined;
    const responseObject = webhookData.data.object;

    if ('id' in responseObject) {
      // TransactionResponse or SettlementResponse
      transactionId = responseObject.id;
    } else if ('token' in responseObject) {
      // TokenizationResponse
      transactionId = responseObject.token;
    }

    // Here you would typically update your database
    // Example: await updatePaymentStatus(webhookData);

    return createNextResponse({
      successful: true,
      verified: true,
      processed: true,
      event_type: webhookData.type,
      transaction_id: transactionId,
    });
  } catch (error) {
    console.error('Enhanced webhook error:', error);

    return createNextResponse(
      {
        successful: false,
        error: extractErrorMessage(error),
      },
      500
    );
  }
}
