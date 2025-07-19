/**
 * Next.js specific server routes
 * Only loaded when Next.js is available
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

// Helper function to get client IP from Next.js request
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

  return '127.0.0.1';
}

/**
 * Purchase transaction handler for Next.js
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
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
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
 * Authorization transaction handler for Next.js
 */
export async function handleAuthorization(request: NextRequest): Promise<NextResponse> {
  try {
    const body: AuthorizationRequest = await request.json();

    const customerIp = getClientIP(request);
    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const authData: AuthorizationRequest = {
      ...body,
      amount: Math.round(body.amount * 100),
      customer_ip: customerIp,
      capture: false,
    };

    const response = await client.authorize(authData);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return NextResponse.json(
      { successful: false, errors: [errorMessage] },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Capture transaction handler for Next.js
 */
export async function handleCapture(request: NextRequest): Promise<NextResponse> {
  try {
    const { transactionId, amount } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { successful: false, errors: ['Transaction ID is required'] },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.capture(transactionId, amount);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return NextResponse.json(
      { successful: false, errors: [errorMessage] },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Refund transaction handler for Next.js
 */
export async function handleRefund(request: NextRequest): Promise<NextResponse> {
  try {
    const body: RefundRequest = await request.json();

    if (!body.transaction_id) {
      return NextResponse.json(
        { successful: false, errors: ['Transaction ID is required'] },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.refund(body);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return NextResponse.json(
      { successful: false, errors: [errorMessage] },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Tokenization handler for Next.js
 */
export async function handleTokenization(request: NextRequest): Promise<NextResponse> {
  try {
    const body: TokenizationRequest = await request.json();

    if (!body.card_number || !body.card_expiry || !body.card_holder) {
      return NextResponse.json(
        { successful: false, errors: ['Missing required card fields'] },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.tokenize(body);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return NextResponse.json(
      { successful: false, errors: [errorMessage] },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Void transaction handler for Next.js
 */
export async function handleVoid(request: NextRequest): Promise<NextResponse> {
  try {
    const { transactionId } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { successful: false, errors: ['Transaction ID is required'] },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.void(transactionId);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return NextResponse.json(
      { successful: false, errors: [errorMessage] },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Transaction status handler for Next.js
 */
export async function handleTransactionStatus(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const transactionId = url.searchParams.get('id');

    if (!transactionId) {
      return NextResponse.json(
        { successful: false, errors: ['Transaction ID is required'] },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.getTransaction(transactionId);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return NextResponse.json(
      { successful: false, errors: [errorMessage] },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Generate verification hash handler for Next.js
 */
export async function handleGenerateHash(request: NextRequest): Promise<NextResponse> {
  try {
    const { amount, currency, reference, timestamp, card_token } = await request.json();

    if (!amount || !currency || !reference || !timestamp) {
      return NextResponse.json(
        { successful: false, errors: ['Missing required fields for hash generation'] },
        { status: 400 }
      );
    }

    const sharedSecret = process.env.FATZEBRA_SHARED_SECRET;
    if (!sharedSecret) {
      return NextResponse.json(
        { successful: false, errors: ['Shared secret not configured'] },
        { status: 500 }
      );
    }

    const hashData: VerificationHashData = {
      amount,
      currency,
      reference,
      timestamp,
      ...(card_token && { card_token }),
    };

    const hash = generateVerificationHash(hashData, sharedSecret);

    return NextResponse.json({
      successful: true,
      hash,
      timestamp,
    });
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return NextResponse.json(
      { successful: false, errors: [errorMessage] },
      { status: 500 }
    );
  }
}

/**
 * Webhook signature verification for Next.js
 */
export async function handleVerifyWebhook(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-fatzebra-signature');
    
    if (!signature) {
      return NextResponse.json(
        { successful: false, errors: ['Missing webhook signature'] },
        { status: 400 }
      );
    }

    // TODO: Implement actual webhook signature verification
    // This is a placeholder - implement according to Fat Zebra's webhook documentation
    
    return NextResponse.json({
      successful: true,
      verified: true,
      event: body,
    });
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return NextResponse.json(
      { successful: false, errors: [errorMessage] },
      { status: 500 }
    );
  }
}

/**
 * Health check handler for Next.js
 */
export async function handleHealthCheck(request: NextRequest): Promise<NextResponse> {
  try {
    return NextResponse.json({
      status: 'healthy',
      service: 'fat-zebra-nextjs',
      version: '0.3.7',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      framework: 'nextjs',
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

// Export configuration for Next.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';