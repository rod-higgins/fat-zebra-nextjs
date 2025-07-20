/**
 * Standalone route handlers that work without Next.js
 * These handlers can be used with Express, Koa, or any HTTP server
 */

import { createFatZebraClient, FatZebraError } from '../lib/client';
import { generateVerificationHash, extractErrorMessage } from '../utils';
import type {
  PurchaseRequest,
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
} from '../types';
import {
  createResponse,
  extractRequestData,
  type StandaloneRequest,
  type StandaloneResponse,
} from './types';

// Runtime configuration for serverless functions
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check endpoint
 */
export async function handleHealthCheck(request: StandaloneRequest): Promise<StandaloneResponse> {
  try {
    const { method } = await extractRequestData(request);

    if (method !== 'GET') {
      return createResponse({ error: 'Method not allowed' }, 405);
    }

    return createResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.4.5',
      mode: 'standalone',
    });
  } catch (error) {
    return createResponse(
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
export async function handlePurchase(request: StandaloneRequest): Promise<StandaloneResponse> {
  try {
    const { method, body } = await extractRequestData(request);

    if (method !== 'POST') {
      return createResponse({ error: 'Method not allowed' }, 405);
    }

    if (!body) {
      return createResponse(
        {
          successful: false,
          errors: ['Request body is required'],
        },
        400
      );
    }

    const { purchaseData, config } = body;

    if (!purchaseData || !config) {
      return createResponse(
        {
          successful: false,
          errors: ['purchaseData and config are required'],
        },
        400
      );
    }

    const client = createFatZebraClient(config);
    const result = await client.purchase(purchaseData as PurchaseRequest);

    return createResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createResponse(
        {
          successful: false,
          errors: error.errors,
          response: error.response,
        },
        400
      );
    }

    return createResponse(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      500
    );
  }
}

/**
 * Process an authorization transaction
 */
export async function handleAuthorization(request: StandaloneRequest): Promise<StandaloneResponse> {
  try {
    const { method, body } = await extractRequestData(request);

    if (method !== 'POST') {
      return createResponse({ error: 'Method not allowed' }, 405);
    }

    if (!body) {
      return createResponse(
        {
          successful: false,
          errors: ['Request body is required'],
        },
        400
      );
    }

    const { authData, config } = body;

    if (!authData || !config) {
      return createResponse(
        {
          successful: false,
          errors: ['authData and config are required'],
        },
        400
      );
    }

    const client = createFatZebraClient(config);
    const result = await client.authorize(authData as AuthorizationRequest);

    return createResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createResponse(
        {
          successful: false,
          errors: error.errors,
          response: error.response,
        },
        400
      );
    }

    return createResponse(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      500
    );
  }
}

/**
 * Capture a previously authorized transaction
 */
export async function handleCapture(request: StandaloneRequest): Promise<StandaloneResponse> {
  try {
    const { method, body } = await extractRequestData(request);

    if (method !== 'POST') {
      return createResponse({ error: 'Method not allowed' }, 405);
    }

    if (!body) {
      return createResponse(
        {
          successful: false,
          errors: ['Request body is required'],
        },
        400
      );
    }

    const { transactionId, amount, config } = body;

    if (!transactionId || !config) {
      return createResponse(
        {
          successful: false,
          errors: ['transactionId and config are required'],
        },
        400
      );
    }

    const client = createFatZebraClient(config);
    const result = await client.capture(transactionId, amount);

    return createResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createResponse(
        {
          successful: false,
          errors: error.errors,
          response: error.response,
        },
        400
      );
    }

    return createResponse(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      500
    );
  }
}

/**
 * Process a refund transaction
 */
export async function handleRefund(request: StandaloneRequest): Promise<StandaloneResponse> {
  try {
    const { method, body } = await extractRequestData(request);

    if (method !== 'POST') {
      return createResponse({ error: 'Method not allowed' }, 405);
    }

    if (!body) {
      return createResponse(
        {
          successful: false,
          errors: ['Request body is required'],
        },
        400
      );
    }

    const { refundData, config } = body;

    if (!refundData || !config) {
      return createResponse(
        {
          successful: false,
          errors: ['refundData and config are required'],
        },
        400
      );
    }

    const client = createFatZebraClient(config);
    const result = await client.refund(refundData as RefundRequest);

    return createResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createResponse(
        {
          successful: false,
          errors: error.errors,
          response: error.response,
        },
        400
      );
    }

    return createResponse(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      500
    );
  }
}

/**
 * Tokenize card details
 */
export async function handleTokenization(request: StandaloneRequest): Promise<StandaloneResponse> {
  try {
    const { method, body } = await extractRequestData(request);

    if (method !== 'POST') {
      return createResponse({ error: 'Method not allowed' }, 405);
    }

    if (!body) {
      return createResponse(
        {
          successful: false,
          errors: ['Request body is required'],
        },
        400
      );
    }

    const { tokenData, config } = body;

    if (!tokenData || !config) {
      return createResponse(
        {
          successful: false,
          errors: ['tokenData and config are required'],
        },
        400
      );
    }

    const client = createFatZebraClient(config);
    const result = await client.tokenize(tokenData as TokenizationRequest);

    return createResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createResponse(
        {
          successful: false,
          errors: error.errors,
          response: error.response,
        },
        400
      );
    }

    return createResponse(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      500
    );
  }
}

/**
 * Void a transaction
 */
export async function handleVoid(request: StandaloneRequest): Promise<StandaloneResponse> {
  try {
    const { method, body } = await extractRequestData(request);

    if (method !== 'POST') {
      return createResponse({ error: 'Method not allowed' }, 405);
    }

    if (!body) {
      return createResponse(
        {
          successful: false,
          errors: ['Request body is required'],
        },
        400
      );
    }

    const { transactionId, config } = body;

    if (!transactionId || !config) {
      return createResponse(
        {
          successful: false,
          errors: ['transactionId and config are required'],
        },
        400
      );
    }

    const client = createFatZebraClient(config);
    const result = await client.void(transactionId);

    return createResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createResponse(
        {
          successful: false,
          errors: error.errors,
          response: error.response,
        },
        400
      );
    }

    return createResponse(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      500
    );
  }
}

/**
 * Get transaction status
 */
export async function handleTransactionStatus(
  request: StandaloneRequest
): Promise<StandaloneResponse> {
  try {
    const { method, body } = await extractRequestData(request);

    if (method !== 'POST') {
      return createResponse({ error: 'Method not allowed' }, 405);
    }

    if (!body) {
      return createResponse(
        {
          successful: false,
          errors: ['Request body is required'],
        },
        400
      );
    }

    const { transactionId, config } = body;

    if (!transactionId || !config) {
      return createResponse(
        {
          successful: false,
          errors: ['transactionId and config are required'],
        },
        400
      );
    }

    const client = createFatZebraClient(config);
    const result = await client.getTransaction(transactionId);

    return createResponse(result);
  } catch (error) {
    if (error instanceof FatZebraError) {
      return createResponse(
        {
          successful: false,
          errors: error.errors,
          response: error.response,
        },
        400
      );
    }

    return createResponse(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      500
    );
  }
}

/**
 * Verify webhook signature
 */
export async function handleVerifyWebhook(request: StandaloneRequest): Promise<StandaloneResponse> {
  try {
    const { method, body, headers } = await extractRequestData(request);

    if (method !== 'POST') {
      return createResponse({ error: 'Method not allowed' }, 405);
    }

    if (!body) {
      return createResponse(
        {
          successful: false,
          errors: ['Request body is required'],
        },
        400
      );
    }

    const { payload, sharedSecret } = body;
    const signature = headers['x-fatzebra-signature'] || headers['x-fatzebra-hmac'];

    if (!payload || !sharedSecret || !signature) {
      return createResponse(
        {
          successful: false,
          errors: ['payload, sharedSecret, and signature are required'],
        },
        400
      );
    }

    const expectedHash = generateVerificationHash(payload, sharedSecret);
    const isValid = expectedHash === signature;

    return createResponse({
      successful: true,
      verified: isValid,
      payload: isValid ? payload : null,
    });
  } catch (error) {
    return createResponse(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      500
    );
  }
}

/**
 * Generate verification hash
 */
export async function handleGenerateHash(request: StandaloneRequest): Promise<StandaloneResponse> {
  try {
    const { method, body } = await extractRequestData(request);

    if (method !== 'POST') {
      return createResponse({ error: 'Method not allowed' }, 405);
    }

    if (!body) {
      return createResponse(
        {
          successful: false,
          errors: ['Request body is required'],
        },
        400
      );
    }

    const { data, sharedSecret } = body;

    if (!data || !sharedSecret) {
      return createResponse(
        {
          successful: false,
          errors: ['data and sharedSecret are required'],
        },
        400
      );
    }

    const hash = generateVerificationHash(data, sharedSecret);

    return createResponse({
      successful: true,
      hash,
    });
  } catch (error) {
    return createResponse(
      {
        successful: false,
        errors: [extractErrorMessage(error)],
      },
      500
    );
  }
}
