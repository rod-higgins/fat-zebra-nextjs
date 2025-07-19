/**
 * Standalone server routes that work without Next.js dependency
 */

import { createFatZebraClient } from '../lib/client';
import { generateVerificationHash, extractErrorMessage } from '../utils';
import type {
  PurchaseRequest,
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
  VerificationHashData,
} from '../types';
import { FatZebraError } from '../types';
import { 
  createResponse, 
  extractRequestData, 
  getClientIP,
  type RequestHandler 
} from './types';

/**
 * Purchase transaction handler - works in any environment
 */
export const handlePurchase: RequestHandler = async (request) => {
  try {
    const { method, body, headers } = await extractRequestData(request);
    
    if (method !== 'POST') {
      return createResponse(
        { successful: false, errors: ['Method not allowed'] },
        405
      );
    }

    if (!body?.amount || !body?.card_number || !body?.card_expiry || !body?.cvv || !body?.card_holder) {
      return createResponse(
        { successful: false, errors: ['Missing required payment fields'] },
        400
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
    return createResponse(response);
  } catch (error) {
    console.error('Purchase error:', error);
    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return createResponse(
      { successful: false, errors: [errorMessage] },
      statusCode
    );
  }
};

/**
 * Authorization transaction handler
 */
export const handleAuthorization: RequestHandler = async (request) => {
  try {
    const { method, body } = await extractRequestData(request);
    
    if (method !== 'POST') {
      return createResponse(
        { successful: false, errors: ['Method not allowed'] },
        405
      );
    }

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
    return createResponse(response);
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return createResponse(
      { successful: false, errors: [errorMessage] },
      error instanceof FatZebraError ? 400 : 500
    );
  }
};

/**
 * Capture transaction handler
 */
export const handleCapture: RequestHandler = async (request) => {
  try {
    const { method, body } = await extractRequestData(request);
    
    if (method !== 'POST') {
      return createResponse(
        { successful: false, errors: ['Method not allowed'] },
        405
      );
    }

    if (!body?.transactionId) {
      return createResponse(
        { successful: false, errors: ['Transaction ID is required'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.capture(body.transactionId, body.amount);
    return createResponse(response);
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return createResponse(
      { successful: false, errors: [errorMessage] },
      error instanceof FatZebraError ? 400 : 500
    );
  }
};

/**
 * Refund transaction handler
 */
export const handleRefund: RequestHandler = async (request) => {
  try {
    const { method, body } = await extractRequestData(request);
    
    if (method !== 'POST') {
      return createResponse(
        { successful: false, errors: ['Method not allowed'] },
        405
      );
    }

    if (!body?.transaction_id) {
      return createResponse(
        { successful: false, errors: ['Transaction ID is required'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.refund(body as RefundRequest);
    return createResponse(response);
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return createResponse(
      { successful: false, errors: [errorMessage] },
      error instanceof FatZebraError ? 400 : 500
    );
  }
};

/**
 * Tokenization handler
 */
export const handleTokenization: RequestHandler = async (request) => {
  try {
    const { method, body } = await extractRequestData(request);
    
    if (method !== 'POST') {
      return createResponse(
        { successful: false, errors: ['Method not allowed'] },
        405
      );
    }

    if (!body?.card_number || !body?.card_expiry || !body?.card_holder) {
      return createResponse(
        { successful: false, errors: ['Missing required card fields'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.tokenize(body as TokenizationRequest);
    return createResponse(response);
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return createResponse(
      { successful: false, errors: [errorMessage] },
      error instanceof FatZebraError ? 400 : 500
    );
  }
};

/**
 * Void transaction handler
 */
export const handleVoid: RequestHandler = async (request) => {
  try {
    const { method, body } = await extractRequestData(request);
    
    if (method !== 'POST') {
      return createResponse(
        { successful: false, errors: ['Method not allowed'] },
        405
      );
    }

    if (!body?.transactionId) {
      return createResponse(
        { successful: false, errors: ['Transaction ID is required'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.void(body.transactionId);
    return createResponse(response);
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return createResponse(
      { successful: false, errors: [errorMessage] },
      error instanceof FatZebraError ? 400 : 500
    );
  }
};

/**
 * Transaction status handler
 */
export const handleTransactionStatus: RequestHandler = async (request) => {
  try {
    const { method, url } = await extractRequestData(request);
    
    if (method !== 'GET') {
      return createResponse(
        { successful: false, errors: ['Method not allowed'] },
        405
      );
    }

    const urlObj = new URL(url, 'http://localhost');
    const transactionId = urlObj.searchParams.get('id');

    if (!transactionId) {
      return createResponse(
        { successful: false, errors: ['Transaction ID is required'] },
        400
      );
    }

    const client = createFatZebraClient({
      username: process.env.FATZEBRA_USERNAME!,
      token: process.env.FATZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.getTransaction(transactionId);
    return createResponse(response);
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return createResponse(
      { successful: false, errors: [errorMessage] },
      error instanceof FatZebraError ? 400 : 500
    );
  }
};

/**
 * Generate verification hash handler
 */
export const handleGenerateHash: RequestHandler = async (request) => {
  try {
    const { method, body } = await extractRequestData(request);
    
    if (method !== 'POST') {
      return createResponse(
        { successful: false, errors: ['Method not allowed'] },
        405
      );
    }

    const { amount, currency, reference, timestamp, card_token } = body;

    if (!amount || !currency || !reference || !timestamp) {
      return createResponse(
        { successful: false, errors: ['Missing required fields for hash generation'] },
        400
      );
    }

    const sharedSecret = process.env.FATZEBRA_SHARED_SECRET;
    if (!sharedSecret) {
      return createResponse(
        { successful: false, errors: ['Shared secret not configured'] },
        500
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

    return createResponse({
      successful: true,
      hash,
      timestamp,
    });
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return createResponse(
      { successful: false, errors: [errorMessage] },
      500
    );
  }
};

/**
 * Health check handler
 */
export const handleHealthCheck: RequestHandler = async (request) => {
  try {
    const { method } = await extractRequestData(request);
    
    if (method !== 'GET') {
      return createResponse(
        { successful: false, errors: ['Method not allowed'] },
        405
      );
    }

    return createResponse({
      status: 'healthy',
      service: 'fat-zebra-nextjs',
      version: '7',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    return createResponse(
      { status: 'unhealthy', error: extractErrorMessage(error) },
      500
    );
  }
};

/**
 * Webhook signature verification (placeholder - implement based on your needs)
 */
export const handleVerifyWebhook: RequestHandler = async (request) => {
  try {
    const { method, body, headers } = await extractRequestData(request);
    
    if (method !== 'POST') {
      return createResponse(
        { successful: false, errors: ['Method not allowed'] },
        405
      );
    }

    // Extract signature from headers
    const signature = headers['x-fatzebra-signature'] || headers['X-FatZebra-Signature'];
    
    if (!signature) {
      return createResponse(
        { successful: false, errors: ['Missing webhook signature'] },
        400
      );
    }

    // TODO: Implement actual webhook signature verification
    // This is a placeholder - implement according to Fat Zebra's webhook documentation
    
    return createResponse({
      successful: true,
      verified: true,
      event: body,
    });
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    return createResponse(
      { successful: false, errors: [errorMessage] },
      500
    );
  }
};

// Export configuration for runtime detection
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';