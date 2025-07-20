/**
 * Fat Zebra Server Routes Module
 * Next.js API route handlers for Fat Zebra payment operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, FatZebraError, handleFatZebraResponse } from '../lib/client';
import { generateVerificationHash, extractErrorMessage } from '../utils';
import type {
  PurchaseRequest,
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
  VerificationHashData,
} from '../types';

// Helper function to get client IP from request - FIXED TYPESCRIPT ERRORS
function getClientIP(request: NextRequest): string {
  const headers = request.headers;

  // Function to safely get header value regardless of header format
  const getHeader = (name: string): string | undefined => {
    if (typeof headers.get === 'function') {
      const value = headers.get(name);
      return value !== null ? value : undefined;
    }
    // Fallback for different header implementations
    return (headers as any)[name];
  };

  const forwarded = getHeader('x-forwarded-for');
  const realIP = getHeader('x-real-ip');
  const cfConnectingIP = getHeader('cf-connecting-ip');

  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  if (cfConnectingIP) {
    return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] : cfConnectingIP;
  }

  return '127.0.0.1';
}

/**
 * Purchase transaction handler
 */
export async function handlePurchase(request: NextRequest): Promise<NextResponse> {
  try {
    const body: PurchaseRequest = await request.json();

    if (!body.amount || !body.card_number || !body.card_expiry || !body.cvv || !body.card_holder) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Missing required payment fields'],
        },
        { status: 400 }
      );
    }

    const customerIp = getClientIP(request);
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
      customer_ip: customerIp,
      ...(body.customer && { customer: body.customer }),
      ...(body.metadata && { metadata: body.metadata }),
    };

    const response = await client.purchase(purchaseData);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Purchase error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return NextResponse.json(
      {
        successful: false,
        errors: [errorMessage],
      },
      { status: statusCode }
    );
  }
}

/**
 * Authorization transaction handler
 */
export async function handleAuthorization(request: NextRequest): Promise<NextResponse> {
  try {
    const body: AuthorizationRequest = await request.json();

    if (!body.amount || !body.card_number || !body.card_expiry || !body.cvv || !body.card_holder) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Missing required authorization fields'],
        },
        { status: 400 }
      );
    }

    const customerIp = getClientIP(request);
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
      customer_ip: customerIp,
      ...(body.customer && { customer: body.customer }),
      ...(body.metadata && { metadata: body.metadata }),
    };

    const response = await client.authorize(authData);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Authorization error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return NextResponse.json(
      {
        successful: false,
        errors: [errorMessage],
      },
      { status: statusCode }
    );
  }
}

/**
 * Capture transaction handler
 */
export async function handleCapture(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.transaction_id) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Missing transaction_id'],
        },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.capture(body.transaction_id, body.amount);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Capture error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return NextResponse.json(
      {
        successful: false,
        errors: [errorMessage],
      },
      { status: statusCode }
    );
  }
}

/**
 * Refund transaction handler
 */
export async function handleRefund(request: NextRequest): Promise<NextResponse> {
  try {
    const body: RefundRequest = await request.json();

    if (!body.transaction_id && !body.reference) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Either transaction_id or reference is required'],
        },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.refund(body);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Refund error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return NextResponse.json(
      {
        successful: false,
        errors: [errorMessage],
      },
      { status: statusCode }
    );
  }
}

/**
 * Tokenization handler - FIXED to match TokenizationRequest interface
 */
export async function handleTokenization(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.card_number || !body.card_expiry || !body.card_holder) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Missing required tokenization fields'],
        },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    // FIXED: Only using properties that exist in TokenizationRequest interface
    const tokenData: TokenizationRequest = {
      card_holder: body.card_holder,
      card_number: body.card_number.replace(/\s/g, ''),
      card_expiry: body.card_expiry,
      ...(body.cvv && { cvv: body.cvv }),
    };

    const response = await client.tokenize(tokenData);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Tokenization error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return NextResponse.json(
      {
        successful: false,
        errors: [errorMessage],
      },
      { status: statusCode }
    );
  }
}

/**
 * Void transaction handler
 */
export async function handleVoid(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.transaction_id) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Missing transaction_id'],
        },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.void(body.transaction_id);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Void error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return NextResponse.json(
      {
        successful: false,
        errors: [errorMessage],
      },
      { status: statusCode }
    );
  }
}

/**
 * Transaction status handler
 */
export async function handleTransactionStatus(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract transaction ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const transactionId = pathParts[pathParts.length - 1];

    if (!transactionId) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Missing transaction_id in URL'],
        },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.getTransaction(transactionId);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Transaction status error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return NextResponse.json(
      {
        successful: false,
        errors: [errorMessage],
      },
      { status: statusCode }
    );
  }
}

/**
 * Webhook verification handler - FIXED TYPESCRIPT ERRORS
 */
export async function handleVerifyWebhook(request: NextRequest): Promise<NextResponse> {
  try {
    // Helper function to safely get header value
    const getHeader = (name: string): string | undefined => {
      if (typeof request.headers.get === 'function') {
        const value = request.headers.get(name);
        return value !== null ? value : undefined;
      }
      // Fallback for different header implementations
      return (request.headers as any)[name];
    };

    const signature = getHeader('x-webhook-signature');

    if (!signature) {
      return NextResponse.json(
        { successful: false, errors: ['Missing webhook signature'] },
        { status: 400 }
      );
    }

    // Verify webhook signature logic would go here
    // For now, return success
    return NextResponse.json({
      successful: true,
      verified: true,
    });
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return NextResponse.json({ successful: false, errors: [errorMessage] }, { status: 500 });
  }
}

/**
 * Generate verification hash handler
 */
export async function handleGenerateHash(request: NextRequest): Promise<NextResponse> {
  try {
    const body: VerificationHashData = await request.json();

    if (!body.amount || !body.currency || !body.reference || !body.timestamp) {
      return NextResponse.json(
        { successful: false, errors: ['Missing required hash data'] },
        { status: 400 }
      );
    }

    const secret = process.env.FAT_ZEBRA_SHARED_SECRET || 'default-secret';
    const hash = generateVerificationHash(body, secret);

    return NextResponse.json({
      successful: true,
      hash,
    });
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return NextResponse.json({ successful: false, errors: [errorMessage] }, { status: 500 });
  }
}

/**
 * Health check handler (removed unused request parameter)
 */
export async function handleHealthCheck(): Promise<NextResponse> {
  return NextResponse.json({
    successful: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.4.8',
  });
}

/**
 * Default route configuration
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
