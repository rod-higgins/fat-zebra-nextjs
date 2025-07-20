/**
 * Next.js specific route handlers
 * These handlers use Next.js specific features like NextRequest and NextResponse
 * This file should only be imported when Next.js is available
 */

// Conditional imports - only import when Next.js is available
let NextResponse: any;

try {
  if (typeof require !== 'undefined') {
    const nextServer = require('next/server');
    NextResponse = nextServer.NextResponse;
  } else {
    throw new Error('require not available');
  }
} catch (error) {
  // Next.js not available - create placeholder types
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
 * Process a purchase transaction
 */
export async function handlePurchase(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body: PurchaseRequest = await request.json();

    if (!body.amount || !body.card_number || !body.card_expiry || !body.cvv || !body.card_holder) {
      return createNextResponse(
        {
          successful: false,
          errors: ['Missing required payment fields'],
        },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const purchaseData: PurchaseRequest = {
      amount: Math.round(body.amount * 100),
      currency: body.currency || 'AUD',
      reference: body.reference || `TXN-${Date.now()}`,
      card_holder: body.card_holder,
      card_number: body.card_number.replace(/\s/g, ''),
      card_expiry: body.card_expiry,
      cvv: body.cvv,
      customer_ip: '127.0.0.1', // Default for edge runtime
      ...(body.customer && { customer: body.customer }),
      ...(body.metadata && { metadata: body.metadata }),
    };

    const response = await client.purchase(purchaseData);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Purchase error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return createNextResponse(
      {
        successful: false,
        errors: [errorMessage],
      },
      statusCode
    );
  }
}

/**
 * Process an authorization transaction
 */
export async function handleAuthorization(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body: AuthorizationRequest = await request.json();

    if (!body.amount || !body.card_number || !body.card_expiry || !body.cvv || !body.card_holder) {
      return createNextResponse(
        {
          successful: false,
          errors: ['Missing required authorization fields'],
        },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const authData: AuthorizationRequest = {
      amount: Math.round(body.amount * 100),
      currency: body.currency || 'AUD',
      reference: body.reference || `AUTH-${Date.now()}`,
      card_holder: body.card_holder,
      card_number: body.card_number.replace(/\s/g, ''),
      card_expiry: body.card_expiry,
      cvv: body.cvv,
      customer_ip: '127.0.0.1',
      ...(body.customer && { customer: body.customer }),
      ...(body.metadata && { metadata: body.metadata }),
    };

    const response = await client.authorize(authData);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Authorization error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return createNextResponse(
      {
        successful: false,
        errors: [errorMessage],
      },
      statusCode
    );
  }
}

/**
 * Process a capture transaction
 */
export async function handleCapture(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();

    if (!body.transaction_id) {
      return createNextResponse(
        {
          successful: false,
          errors: ['Missing transaction_id'],
        },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.capture(body.transaction_id, body.amount);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Capture error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return createNextResponse(
      {
        successful: false,
        errors: [errorMessage],
      },
      statusCode
    );
  }
}

/**
 * Process a refund transaction
 */
export async function handleRefund(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body: RefundRequest = await request.json();

    if (!body.transaction_id && !body.reference) {
      return createNextResponse(
        {
          successful: false,
          errors: ['Either transaction_id or reference is required'],
        },
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
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return createNextResponse(
      {
        successful: false,
        errors: [errorMessage],
      },
      statusCode
    );
  }
}

/**
 * Process a tokenization request
 */
export async function handleTokenization(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body: TokenizationRequest = await request.json();

    if (!body.card_number || !body.card_expiry || !body.card_holder) {
      return createNextResponse(
        {
          successful: false,
          errors: ['Missing required card fields'],
        },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const tokenData: TokenizationRequest = {
      card_holder: body.card_holder,
      card_number: body.card_number.replace(/\s/g, ''),
      card_expiry: body.card_expiry,
      ...(body.cvv && { cvv: body.cvv }),
    };

    const response = await client.tokenize(tokenData);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Tokenization error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return createNextResponse(
      {
        successful: false,
        errors: [errorMessage],
      },
      statusCode
    );
  }
}

/**
 * Void a transaction
 */
export async function handleVoid(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();

    if (!body.transaction_id) {
      return createNextResponse(
        {
          successful: false,
          errors: ['Missing transaction_id'],
        },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.void(body.transaction_id);
    return createNextResponse(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Void error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return createNextResponse(
      {
        successful: false,
        errors: [errorMessage],
      },
      statusCode
    );
  }
}

/**
 * Get transaction status
 */
export async function handleTransactionStatus(request: any): Promise<any> {
  try {
    if (request.method !== 'GET') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    // Extract transaction ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const transactionId = pathParts[pathParts.length - 1];

    if (!transactionId) {
      return createNextResponse(
        {
          successful: false,
          errors: ['Missing transaction_id in URL'],
        },
        400
      );
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
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return createNextResponse(
      {
        successful: false,
        errors: [errorMessage],
      },
      statusCode
    );
  }
}

/**
 * Verify webhook signature and process webhook event
 */
export async function handleVerifyWebhook(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.text();
    const signature =
      request.headers.get?.('x-webhook-signature') || request.headers['x-webhook-signature'];

    if (!signature) {
      return createNextResponse({ successful: false, errors: ['Missing webhook signature'] }, 400);
    }

    const secret = process.env.FAT_ZEBRA_SHARED_SECRET;
    if (!secret) {
      return createNextResponse(
        { successful: false, errors: ['Webhook secret not configured'] },
        500
      );
    }

    const isValid = verifyWebhookSignature(body, signature, secret);
    if (!isValid) {
      return createNextResponse({ successful: false, errors: ['Invalid webhook signature'] }, 401);
    }

    const webhookEvent: WebhookEvent = JSON.parse(body);
    return createNextResponse({
      successful: true,
      verified: true,
      event: webhookEvent,
    });
  } catch (error) {
    console.error('Webhook verification error:', error);
    const errorMessage = extractErrorMessage(error);
    return createNextResponse({ successful: false, errors: [errorMessage] }, 500);
  }
}

/**
 * Generate verification hash
 */
export async function handleGenerateHash(request: any): Promise<any> {
  try {
    if (request.method !== 'POST') {
      return createNextResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await request.json();

    if (!body.amount || !body.currency || !body.reference || !body.timestamp) {
      return createNextResponse({ successful: false, errors: ['Missing required hash data'] }, 400);
    }

    const secret = process.env.FAT_ZEBRA_SHARED_SECRET || 'default-secret';
    const hash = generateVerificationHash(body, secret);

    return createNextResponse({
      successful: true,
      hash,
    });
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return createNextResponse({ successful: false, errors: [errorMessage] }, 500);
  }
}
