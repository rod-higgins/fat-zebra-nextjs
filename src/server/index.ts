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
  ServerConfig,
  EnhancedRequest,
  EnhancedResponse,
  ServerError,
  ErrorResponse,
  RateLimitConfig,
  RateLimitInfo,
  MiddlewareFunction,
  MiddlewareConfig,
  OAuthTokenRequest,
  OAuthTokenResponse,
  WebhookPayload,
  WebhookVerificationResult,
  HealthCheckResponse,
  CacheConfig,
  CacheItem,
  LogEntry,
  LoggerConfig,
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
  const isNextJS = isNextJSAvailable();
  
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
            if (response.status) {
              res.statusCode = response.status;
            }
            if (response.headers) {
              Object.entries(response.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
              });
            }
            if (response.body) {
              res.end(response.body);
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(response));
            }
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response));
          }
        } catch (error) {
          console.error('Request processing error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            successful: false,
            errors: [extractErrorMessage(error)]
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

// Helper function for creating Fastify handlers
export function createFastifyHandler(handler: RequestHandler) {
  return async (request: any, reply: any) => {
    try {
      // Convert Fastify request to our standard format
      const standardRequest = {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(request.body),
        url: request.url,
        json: () => Promise.resolve(request.body)
      };

      const response = await handler(standardRequest);
      
      // Convert our response to Fastify format
      if (response && typeof response === 'object') {
        if (response.status) {
          reply.code(response.status);
        }
        if (response.headers) {
          Object.entries(response.headers).forEach(([key, value]) => {
            reply.header(key, value);
          });
        }
        return response.body ? response.body : response;
      } else {
        return response;
      }
    } catch (error) {
      console.error('Handler error:', error);
      reply.code(500);
      return {
        successful: false,
        errors: [extractErrorMessage(error)]
      };
    }
  };
}

// Helper function for creating Koa handlers
export function createKoaHandler(handler: RequestHandler) {
  return async (ctx: any) => {
    try {
      // Convert Koa context to our standard format
      const request = {
        method: ctx.method,
        headers: ctx.headers,
        body: JSON.stringify(ctx.request.body),
        url: ctx.url,
        json: () => Promise.resolve(ctx.request.body)
      };

      const response = await handler(request);
      
      // Convert our response to Koa format
      if (response && typeof response === 'object') {
        if (response.status) {
          ctx.status = response.status;
        }
        if (response.headers) {
          Object.entries(response.headers).forEach(([key, value]) => {
            ctx.set(key, value);
          });
        }
        ctx.body = response.body ? response.body : response;
      } else {
        ctx.body = response;
      }
    } catch (error) {
      console.error('Handler error:', error);
      ctx.status = 500;
      ctx.body = {
        successful: false,
        errors: [extractErrorMessage(error)]
      };
    }
  };
}

// Helper function to create AWS Lambda handlers
export function createLambdaHandler(handler: RequestHandler) {
  return async (event: any, context: any) => {
    try {
      // Convert Lambda event to our standard format
      const request = {
        method: event.httpMethod || event.requestContext?.http?.method,
        headers: event.headers || {},
        body: event.body,
        url: event.path || event.rawPath,
        json: () => Promise.resolve(event.body ? JSON.parse(event.body) : null)
      };

      const response = await handler(request);
      
      // Convert our response to Lambda format
      return {
        statusCode: response.status || 200,
        headers: response.headers || {},
        body: response.body || JSON.stringify(response)
      };
    } catch (error) {
      console.error('Handler error:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          successful: false,
          errors: [extractErrorMessage(error)]
        })
      };
    }
  };
}

// Convenience export for common server frameworks
export const frameworks = {
  express: createExpressHandler,
  fastify: createFastifyHandler,
  koa: createKoaHandler,
  http: createHttpHandler,
  lambda: createLambdaHandler,
  nextjs: getRouteHandlers
};

// Environment detection utility
export function detectEnvironment(): string {
  if (typeof window !== 'undefined') {
    return 'browser';
  }
  
  if (isNextJSAvailable()) {
    return 'nextjs';
  }
  
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return 'lambda';
  }
  
  if (process.env.VERCEL) {
    return 'vercel';
  }
  
  if (process.env.NETLIFY) {
    return 'netlify';
  }
  
  return 'nodejs';
}

// Configuration helper
export function createServerConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    fatZebra: {
      username: process.env.FATZEBRA_USERNAME || '',
      token: process.env.FATZEBRA_TOKEN || '',
      sandbox: process.env.NODE_ENV !== 'production',
      sharedSecret: process.env.FATZEBRA_SHARED_SECRET,
      timeout: 30000,
      ...overrides.fatZebra
    },
    webhook: {
      verifySignature: true,
      enableLogging: process.env.NODE_ENV !== 'production',
      ...overrides.webhook
    },
    cors: {
      origins: ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      headers: ['Content-Type', 'Authorization'],
      ...overrides.cors
    }
  };
}