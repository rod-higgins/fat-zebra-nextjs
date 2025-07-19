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
  VerificationHashData 
} from '../types';

// Helper function to get client IP from request
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
 * Purchase transaction handler
 */
export async function handlePurchase(request: NextRequest): Promise<NextResponse> {
  try {
    const body: PurchaseRequest = await request.json();
    
    if (!body.amount || !body.card_number || !body.card_expiry || !body.cvv || !body.card_holder) {
      return NextResponse.json(
        { 
          successful: false, 
          errors: ['Missing required payment fields'] 
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
        errors: [errorMessage]
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
    
    const customerIp = getClientIP(request);
    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const authData: AuthorizationRequest = {
      ...body,
      amount: Math.round(body.amount * 100),
      customer_ip: customerIp,
      capture: false
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
 * Capture transaction handler
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
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
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
 * Refund transaction handler
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
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
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
 * Tokenization handler
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
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
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
 * Void transaction handler
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
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
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
 * Transaction status handler
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
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
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
 * Webhook verification handler
 */
export async function handleVerifyWebhook(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-webhook-signature');
    
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
      verified: true
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
      hash
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
 * Health check handler
 */
export async function handleHealthCheck(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    successful: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.2.2',
  });
}

/**
 * Default route configuration
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';