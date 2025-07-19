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

// Conditional Next.js exports (only available when Next.js is present)
let nextjsRoutes: any = {};

try {
  // Only import Next.js specific routes if Next.js is available
  if (typeof require !== 'undefined') {
    try {
      require('next/server');
      // Next.js is available, we can safely import Next.js specific routes
      nextjsRoutes = require('./routes-nextjs');
    } catch (error) {
      // Next.js not available, use standalone versions
      console.debug('Next.js not available, using standalone server routes');
    }
  }
} catch {
  // Fallback to standalone
}

// Export Next.js specific handlers if available, otherwise use standalone
export const handlePurchaseNextJS = nextjsRoutes.handlePurchase || handlePurchase;
export const handleAuthorizationNextJS = nextjsRoutes.handleAuthorization || handleAuthorization;
export const handleCaptureNextJS = nextjsRoutes.handleCapture || handleCapture;
export const handleRefundNextJS = nextjsRoutes.handleRefund || handleRefund;
export const handleTokenizationNextJS = nextjsRoutes.handleTokenization || handleTokenization;
export const handleVoidNextJS = nextjsRoutes.handleVoid || handleVoid;
export const handleTransactionStatusNextJS = nextjsRoutes.handleTransactionStatus || handleTransactionStatus;
export const handleVerifyWebhookNextJS = nextjsRoutes.handleVerifyWebhook || handleVerifyWebhook;
export const handleGenerateHashNextJS = nextjsRoutes.handleGenerateHash || handleGenerateHash;
export const handleHealthCheckNextJS = nextjsRoutes.handleHealthCheck || handleHealthCheck;

// Utility function to get appropriate handlers based on environment
export function getRouteHandlers() {
  const isNextJS = isNextJSAvailable();
  
  return {
    isNextJS,
    handlers: {
      purchase: isNextJS ? handlePurchaseNextJS : handlePurchase,
      authorization: isNextJS ? handleAuthorizationNextJS : handleAuthorization,
      capture: isNextJS ? handleCaptureNextJS : handleCapture,
      refund: isNextJS ? handleRefundNextJS : handleRefund,
      tokenization: isNextJS ? handleTokenizationNextJS : handleTokenization,
      void: isNextJS ? handleVoidNextJS : handleVoid,
      transactionStatus: isNextJS ? handleTransactionStatusNextJS : handleTransactionStatus,
      verifyWebhook: isNextJS ? handleVerifyWebhookNextJS : handleVerifyWebhook,
      generateHash: isNextJS ? handleGenerateHashNextJS : handleGenerateHash,
      healthCheck: isNextJS ? handleHealthCheckNextJS : handleHealthCheck,
    }
  };
}

// Helper function for creating Express.js compatible middleware
export function createExpressHandler(handler: RequestHandler) {
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
export function createHttpHandler(handler: RequestHandler) {
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
            res.statusCode = response.status || 200;
            
            if (response.headers) {
              Object.entries(response.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
              });
            }
            
            res.setHeader('Content-Type', 'application/json');
            
            if (response.body) {
              res.end(response.body);
            } else {
              res.end(JSON.stringify(response));
            }
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response));
          }
        } catch (error) {
          console.error('Handler error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            successful: false,
            errors: [extractErrorMessage(error)]
          }));
        }
      });
    } catch (error) {
      console.error('Request processing error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        successful: false,
        errors: [extractErrorMessage(error)]
      }));
    }
  };
}