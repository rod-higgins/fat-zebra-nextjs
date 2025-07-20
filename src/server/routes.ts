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
 * Capture authorization handler
 */
export async function handleCapture(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.transaction_id) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Transaction ID is required'],
        },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const captureData = {
      amount: body.amount ? Math.round(body.amount * 100) : undefined,
    };

    const response = await client.capture(body.transaction_id, captureData.amount);
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
 * Refund transaction handler - FIXED to match RefundRequest interface
 */
export async function handleRefund(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.transaction_id || !body.amount) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Transaction ID and amount are required'],
        },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    // FIXED: Only using properties that exist in RefundRequest interface
    const refundData: RefundRequest = {
      transaction_id: body.transaction_id,
      amount: Math.round(body.amount * 100),
      reference: body.reference || `REF-${Date.now()}`,
      ...(body.reason && { reason: body.reason }),
    };

    const response = await client.refund(refundData);
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
 * Tokenization handler - FIXED to match TokenizationRequest interface (line ~287)
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
 * Generate verification hash - FIXED to match the actual function signature
 */
export async function handleVerificationHash(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // FIXED: Using the correct field names that match the generateVerificationHash function
    const { amount, currency, reference, card_token } = body;

    if (!amount || !currency || !reference) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Amount, currency, and reference are required'],
        },
        { status: 400 }
      );
    }

    // FIXED: Create VerificationHashData object and pass secret as second parameter
    const hashData: VerificationHashData = {
      amount: Math.round(amount * 100),
      currency,
      reference,
      timestamp: Date.now(),
      ...(card_token && { card_token }),
    };

    const secret = process.env.FAT_ZEBRA_SHARED_SECRET || '';
    const hash = generateVerificationHash(hashData, secret);

    return NextResponse.json({
      successful: true,
      hash,
    });
  } catch (error) {
    console.error('Verification hash error:', error);
    const errorMessage = extractErrorMessage(error);

    return NextResponse.json(
      {
        successful: false,
        errors: [errorMessage],
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function handleHealthCheck(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'GET') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.3.10',
      mode: 'nextjs',
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      { status: 500 }
    );
  }
}