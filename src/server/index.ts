/**
 * Fat Zebra Next.js Package - Server Module Exports
 * Now supports both Next.js and standalone environments
 */

// Re-export client for server-side use
export {
  createFatZebraClient,
  FatZebraClient,
  FatZebraError,
  handleFatZebraResponse,
} from '../lib/client';

// Re-export specific types needed for server-side operations
export type {
  FatZebraConfig,
  PurchaseRequest,
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
  FatZebraResponse,
  TransactionResponse,
  TokenizationResponse,
  SettlementResponse,
  VerificationHashData,
  WebhookEvent,
  OAuthConfig,
  Customer,
  CardDetails,
} from '../types';

// Re-export specific utilities needed for server-side operations
export {
  validateCard,
  validateAmount,
  formatCurrency,
  sanitizeCardNumber,
  generateReference,
  isTestCard,
  delay,
  retryWithBackoff,
  generateVerificationHash,
  extractErrorMessage,
  extractErrorDetails,
} from '../utils';

// Export standalone types and utilities
export type {
  StandaloneRequest,
  StandaloneResponse,
  RequestHandler,
} from './types';

export {
  createResponse,
  extractRequestData,
  getClientIP,
  isNextJSAvailable,
} from './types';

// Export standalone route handlers (work without Next.js)
export {
  handlePurchase,
  handleAuthorization,
  handleCapture,
  handleRefund,
  handleTokenization,
  handleVoid,
  handleTransactionStatus,
  handleVerifyWebhook,
  handleGenerateHash,
  handleHealthCheck,
  runtime,
  dynamic,
} from './routes-standalone';

// Import standalone handlers as fallbacks
import {
  handlePurchase as handlePurchaseStandalone,
  handleAuthorization as handleAuthorizationStandalone,
  handleCapture as handleCaptureStandalone,
  handleRefund as handleRefundStandalone,
  handleTokenization as handleTokenizationStandalone,
  handleVoid as handleVoidStandalone,
  handleTransactionStatus as handleTransactionStatusStandalone,
  handleVerifyWebhook as handleVerifyWebhookStandalone,
  handleGenerateHash as handleGenerateHashStandalone,
  handleHealthCheck as handleHealthCheckStandalone,
} from './routes-standalone';

// Function to check if Next.js is available
function checkNextJSAvailability(): boolean {
  try {
    // Use dynamic require to avoid TypeScript resolution issues
    if (typeof require !== 'undefined') {
      require('next/server');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Dynamic loading of Next.js specific routes
let nextjsRoutes: any = {};

// Only try to load Next.js routes if Next.js is available
if (checkNextJSAvailability()) {
  try {
    // Use dynamic import to avoid TypeScript compilation issues
    if (typeof require !== 'undefined') {
      nextjsRoutes = require('./routes-nextjs');
    }
  } catch (error) {
    console.debug('Failed to load Next.js routes, using standalone versions:', error);
    nextjsRoutes = {};
  }
} else {
  console.debug('Next.js not available, using standalone server routes');
}

// Export Next.js specific handlers if available, otherwise use standalone
export const handlePurchaseNextJS = nextjsRoutes.handlePurchase || handlePurchaseStandalone;
export const handleAuthorizationNextJS = nextjsRoutes.handleAuthorization || handleAuthorizationStandalone;
export const handleCaptureNextJS = nextjsRoutes.handleCapture || handleCaptureStandalone;
export const handleRefundNextJS = nextjsRoutes.handleRefund || handleRefundStandalone;
export const handleTokenizationNextJS = nextjsRoutes.handleTokenization || handleTokenizationStandalone;
export const handleVoidNextJS = nextjsRoutes.handleVoid || handleVoidStandalone;
export const handleTransactionStatusNextJS = nextjsRoutes.handleTransactionStatus || handleTransactionStatusStandalone;
export const handleVerifyWebhookNextJS = nextjsRoutes.handleVerifyWebhook || handleVerifyWebhookStandalone;
export const handleGenerateHashNextJS = nextjsRoutes.handleGenerateHash || handleGenerateHashStandalone;
export const handleHealthCheckNextJS = nextjsRoutes.handleHealthCheck || handleHealthCheckStandalone;

// Enhanced webhook handler for Next.js (if available)
export const handleEnhancedWebhookNextJS = nextjsRoutes.handleEnhancedWebhook || handleVerifyWebhookStandalone;

// Utility function to get appropriate handlers based on environment
export function getRouteHandlers() {
  const isNextJS = checkNextJSAvailability();
  
  return {
    isNextJS,
    handlers: {
      purchase: isNextJS ? handlePurchaseNextJS : handlePurchaseStandalone,
      authorization: isNextJS ? handleAuthorizationNextJS : handleAuthorizationStandalone,
      capture: isNextJS ? handleCaptureNextJS : handleCaptureStandalone,
      refund: isNextJS ? handleRefundNextJS : handleRefundStandalone,
      tokenization: isNextJS ? handleTokenizationNextJS : handleTokenizationStandalone,
      void: isNextJS ? handleVoidNextJS : handleVoidStandalone,
      transactionStatus: isNextJS ? handleTransactionStatusNextJS : handleTransactionStatusStandalone,
      verifyWebhook: isNextJS ? handleVerifyWebhookNextJS : handleVerifyWebhookStandalone,
      generateHash: isNextJS ? handleGenerateHashNextJS : handleGenerateHashStandalone,
      healthCheck: isNextJS ? handleHealthCheckNextJS : handleHealthCheckStandalone,
    }
  };
}

// Helper function for creating Express.js compatible middleware
export function createExpressHandler(handler: any) {
  return async (req: any, res: any) => {
    try {
      // Convert Express request to our standard format
      const request = {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(req.body),
        url: req.url,
        json: () => Promise.resolve(req.body)
      };

      const response = await handler(request);
      
      // Convert our response to Express format
      if (response && typeof response === 'object') {
        if (response.status) {
          res.status(response.status);
        }
        if (response.headers) {
          Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }
        if (response.body) {
          res.send(response.body);
        } else {
          res.json(response);
        }
      } else {
        res.json(response);
      }
    } catch (error) {
      console.error('Handler error:', error);
      res.status(500).json({
        successful: false,
        errors: [extractErrorMessage(error)]
      });
    }
  };
}

// Helper function for creating standard HTTP server handlers
export function createHttpHandler(handler: any) {
  return async (req: any, res: any) => {
    try {
      let body = '';
      
      // Read request body
      req.on('data', (chunk: any) => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          // Convert HTTP request to our standard format
          const request = {
            method: req.method,
            headers: req.headers,
            body: body || null,
            url: req.url,
            json: () => Promise.resolve(body ? JSON.parse(body) : null)
          };

          const response = await handler(request);
          
          // Convert our response to HTTP format
          if (response && typeof response === 'object') {
            if (response.status) {
              res.statusCode = response.status;
            }
            if (response.headers) {
              Object.entries(response.headers).forEach(([key, value]) => {
                res.setHeader(key, value as string);
              });
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(response.body || JSON.stringify(response));
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response));
          }
        } catch (parseError) {
          console.error('Request parsing error:', parseError);
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            successful: false,
            errors: ['Invalid request format']
          }));
        }
      });
    } catch (error) {
      console.error('Handler error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        successful: false,
        errors: [extractErrorMessage(error)]
      }));
    }
  };
}

// OAuth token generation handler that works in both environments
export async function generateAccessToken(request: any): Promise<any> {
  try {
    const method = request.method || 'POST';
    if (method !== 'POST') {
      const response = {
        successful: false,
        errors: ['Method not allowed']
      };
      
      if (checkNextJSAvailability()) {
        if (typeof require !== 'undefined') {
          const { NextResponse } = require('next/server');
          return NextResponse.json(response, { status: 405 });
        }
      }
      
      return {
        status: 405,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(response)
      };
    }

    const body = await request.json();
    const { clientId, clientSecret, scope } = body;

    if (!clientId || !clientSecret) {
      const response = {
        successful: false,
        errors: ['Missing client credentials']
      };
      
      if (checkNextJSAvailability()) {
        if (typeof require !== 'undefined') {
          const { NextResponse } = require('next/server');
          return NextResponse.json(response, { status: 400 });
        }
      }
      
      return {
        status: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(response)
      };
    }

    // Generate OAuth token logic here
    const token = {
      access_token: `fz_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: scope || 'payments'
    };

    if (checkNextJSAvailability()) {
      if (typeof require !== 'undefined') {
        const { NextResponse } = require('next/server');
        return NextResponse.json({
          successful: true,
          ...token
        });
      }
    }

    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        successful: true,
        ...token
      })
    };
  } catch (error) {
    console.error('OAuth token generation error:', error);

    const response = {
      successful: false,
      errors: [extractErrorMessage(error)]
    };

    if (checkNextJSAvailability()) {
      if (typeof require !== 'undefined') {
        const { NextResponse } = require('next/server');
        return NextResponse.json(response, { status: 500 });
      }
    }

    return {
      status: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(response)
    };
  }
}

// Enhanced verification hash generation
export async function generateVerificationHashRoute(request: any): Promise<any> {
  try {
    const method = request.method || 'POST';
    if (method !== 'POST') {
      const response = {
        successful: false,
        errors: ['Method not allowed']
      };
      
      if (checkNextJSAvailability()) {
        if (typeof require !== 'undefined') {
          const { NextResponse } = require('next/server');
          return NextResponse.json(response, { status: 405 });
        }
      }
      
      return {
        status: 405,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(response)
      };
    }

    const body = await request.json();
    const { reference, amount, currency } = body;

    if (!reference || amount === undefined || !currency) {
      const response = {
        successful: false,
        errors: ['Missing required fields: reference, amount, currency']
      };
      
      if (checkNextJSAvailability()) {
        if (typeof require !== 'undefined') {
          const { NextResponse } = require('next/server');
          return NextResponse.json(response, { status: 400 });
        }
      }
      
      return {
        status: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(response)
      };
    }

    const hash = generateVerificationHash({
      reference,
      amount,
      currency,
      sharedSecret: process.env.FAT_ZEBRA_SHARED_SECRET || '',
    });

    const responseData = {
      successful: true,
      hash,
      reference,
      amount,
      currency
    };

    if (checkNextJSAvailability()) {
      if (typeof require !== 'undefined') {
        const { NextResponse } = require('next/server');
        return NextResponse.json(responseData);
      }
    }

    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    console.error('Hash generation error:', error);

    const response = {
      successful: false,
      errors: [extractErrorMessage(error)]
    };

    if (checkNextJSAvailability()) {
      if (typeof require !== 'undefined') {
        const { NextResponse } = require('next/server');
        return NextResponse.json(response, { status: 500 });
      }
    }

    return {
      status: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(response)
    };
  }
}