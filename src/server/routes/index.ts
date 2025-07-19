/**
 * Fat Zebra Next.js Package - Server Route Handlers
 * Complete server-side route handlers with proper error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, FatZebraError, handleFatZebraResponse } from '../lib/client';
import { generateVerificationHash, extractErrorMessage, extractErrorDetails, validateAmount } from '../utils';
import type { 
  PurchaseRequest, 
  AuthorizationRequest, 
  RefundRequest, 
  TokenizationRequest,
  VerificationHashData 
} from '../types';

/**
 * Create purchase transaction handler
 */
export async function handlePurchase(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as PurchaseRequest & { username: string; token: string };
    
    if (!body.username || !body.token) {
      return NextResponse.json(
        { error: 'Username and token are required', details: ['Missing authentication credentials'], verified: false },
        { status: 400 }
      );
    }

    validateAmount(body.amount);

    const client = createFatZebraClient({
      username: body.username,
      token: body.token,
      isTestMode: true,
    });

    const response = await client.createPurchase({
      amount: body.amount,
      currency: body.currency,
      reference: body.reference,
      card_details: body.card_details,
      customer: body.customer,
      metadata: body.metadata,
    });

    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction,
      verified: true,
    });

  } catch (error) {
    console.error('Purchase error:', error);
    
    const errorMessage = extractErrorMessage(error);
    const errorDetails = extractErrorDetails(error);
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails, verified: false },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Create authorization transaction handler
 */
export async function handleAuthorization(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as AuthorizationRequest & { username: string; token: string };
    
    if (!body.username || !body.token) {
      return NextResponse.json(
        { error: 'Username and token are required', details: ['Missing authentication credentials'] },
        { status: 400 }
      );
    }

    validateAmount(body.amount);

    const client = createFatZebraClient({
      username: body.username,
      token: body.token,
      isTestMode: true,
    });

    const response = await client.createAuthorization({
      amount: body.amount,
      currency: body.currency,
      reference: body.reference,
      card_details: body.card_details,
      customer: body.customer,
      metadata: body.metadata,
    });

    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction,
    });

  } catch (error) {
    console.error('Authorization error:', error);
    
    const errorMessage = extractErrorMessage(error);
    const errorDetails = extractErrorDetails(error);
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Capture authorization handler
 */
export async function handleCapture(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { 
      transaction_id: string; 
      amount?: number; 
      username: string; 
      token: string 
    };
    
    if (!body.username || !body.token) {
      return NextResponse.json(
        { error: 'Username and token are required', details: ['Missing authentication credentials'] },
        { status: 400 }
      );
    }

    if (!body.transaction_id) {
      return NextResponse.json(
        { error: 'Transaction ID is required', details: ['Missing transaction ID'] },
        { status: 400 }
      );
    }

    if (body.amount) {
      validateAmount(body.amount);
    }

    const client = createFatZebraClient({
      username: body.username,
      token: body.token,
      isTestMode: true,
    });

    const response = await client.captureAuthorization(body.transaction_id, body.amount);
    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction,
    });

  } catch (error) {
    console.error('Capture error:', error);
    
    const errorMessage = extractErrorMessage(error);
    const errorDetails = extractErrorDetails(error);
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Create refund handler
 */
export async function handleRefund(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as RefundRequest & { username: string; token: string };
    
    if (!body.username || !body.token) {
      return NextResponse.json(
        { error: 'Username and token are required', details: ['Missing authentication credentials'] },
        { status: 400 }
      );
    }

    if (!body.transaction_id) {
      return NextResponse.json(
        { error: 'Transaction ID is required', details: ['Missing transaction ID'] },
        { status: 400 }
      );
    }

    if (body.amount) {
      validateAmount(body.amount);
    }

    const client = createFatZebraClient({
      username: body.username,
      token: body.token,
      isTestMode: true,
    });

    const response = await client.createRefund({
      transaction_id: body.transaction_id,
      amount: body.amount,
      reference: body.reference,
      reason: body.reason,
    });

    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction,
    });

  } catch (error) {
    console.error('Refund error:', error);
    
    const errorMessage = extractErrorMessage(error);
    const errorDetails = extractErrorDetails(error);
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Tokenize card handler
 */
export async function handleTokenization(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as TokenizationRequest & { username: string; token: string };
    
    if (!body.username || !body.token) {
      return NextResponse.json(
        { error: 'Username and token are required', details: ['Missing authentication credentials'] },
        { status: 400 }
      );
    }

    if (!body.card_details) {
      return NextResponse.json(
        { error: 'Card details are required', details: ['Missing card details'] },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: body.username,
      token: body.token,
      isTestMode: true,
    });

    const response = await client.tokenizeCard({
      card_details: body.card_details,
      customer: body.customer,
    });

    const tokenization = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      tokenization,
    });

  } catch (error) {
    console.error('Tokenization error:', error);
    
    const errorMessage = extractErrorMessage(error);
    const errorDetails = extractErrorDetails(error);
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Get transaction handler
 */
export async function handleGetTransaction(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const transactionId = url.pathname.split('/').pop();
    const username = url.searchParams.get('username');
    const token = url.searchParams.get('token');
    
    if (!username || !token) {
      return NextResponse.json(
        { error: 'Username and token are required', details: ['Missing authentication credentials'] },
        { status: 400 }
      );
    }

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required', details: ['Missing transaction ID'] },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username,
      token,
      isTestMode: true,
    });

    const response = await client.getTransaction(transactionId);
    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction,
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    
    const errorMessage = extractErrorMessage(error);
    const errorDetails = extractErrorDetails(error);
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Webhook verification handler
 */
export async function handleWebhookVerification(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      payload: any;
      signature: string;
      secret: string;
    };
    
    if (!body.secret) {
      return NextResponse.json(
        { error: 'Webhook secret is required', details: ['Missing webhook secret'] },
        { status: 400 }
      );
    }

    if (!body.signature) {
      return NextResponse.json(
        { error: 'Webhook signature is required', details: ['Missing webhook signature'] },
        { status: 400 }
      );
    }

    // Generate verification hash
    const verificationData: VerificationHashData = {
      amount: body.payload.amount || 0,
      currency: body.payload.currency || 'AUD',
      reference: body.payload.reference || '',
      card_token: body.payload.card_token,
      timestamp: body.payload.timestamp || Date.now(),
    };

    const expectedSignature = await generateVerificationHash(verificationData, body.secret);
    const isValid = expectedSignature === body.signature;

    return NextResponse.json({
      success: true,
      verified: isValid,
      payload: body.payload,
    });

  } catch (error) {
    console.error('Webhook verification error:', error);
    
    const errorMessage = extractErrorMessage(error);
    const errorDetails = extractErrorDetails(error);
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: error instanceof FatZebraError ? 400 : 500 }
    );
  }
}

/**
 * Health check handler
 */
export async function handleHealthCheck(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
}

/**
 * Default route configuration
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';