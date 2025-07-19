/**
 * Standalone server types that work without Next.js
 */

// Basic HTTP types that work in any environment
export interface StandaloneRequest {
  method?: string;
  headers: Record<string, string | undefined>;
  body?: string | null;
  url?: string;
  json(): Promise<any>;
}

export interface StandaloneResponse {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  json(data: any): StandaloneResponse;
}

// Next.js types (conditional - only available when Next.js is present)
export type NextRequest = any;
export type NextResponse = any;

// Helper to check if Next.js is available
export function isNextJSAvailable(): boolean {
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

// Factory function to create appropriate response based on environment
export function createResponse(data: any, status: number = 200): any {
  if (isNextJSAvailable()) {
    try {
      // Use dynamic require to avoid TypeScript resolution issues
      if (typeof require !== 'undefined') {
        const { NextResponse } = require('next/server');
        return NextResponse.json(data, { status });
      }
    } catch (error) {
      // Fallback if NextResponse import fails
      console.debug('NextResponse import failed, using fallback');
    }
  }
  
  // Standalone response
  return {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json' },
    json: () => Promise.resolve(data),
    body: JSON.stringify(data)
  };
}

// Generic request handler type that works in both environments
export type RequestHandler = (
  request: StandaloneRequest | NextRequest
) => Promise<StandaloneResponse | NextResponse>;

// Utility to extract request data regardless of environment
export async function extractRequestData(request: any): Promise<{
  method: string;
  body: any;
  headers: Record<string, string>;
  url: string;
}> {
  // Handle Next.js request
  if (request && typeof request.json === 'function') {
    let body = null;
    try {
      if (request.method !== 'GET') {
        body = await request.json();
      }
    } catch {
      body = null;
    }

    const headers: Record<string, string> = {};
    
    // Handle different header formats
    if (request.headers) {
      if (typeof request.headers.entries === 'function') {
        // Headers object with entries method
        for (const [key, value] of request.headers.entries()) {
          headers[key] = value;
        }
      } else if (typeof request.headers.get === 'function') {
        // Headers object with get method
        const commonHeaders = [
          'authorization', 'content-type', 'user-agent', 'accept',
          'x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'
        ];
        for (const header of commonHeaders) {
          const value = request.headers.get(header);
          if (value) {
            headers[header] = value;
          }
        }
      } else {
        // Plain object
        Object.assign(headers, request.headers);
      }
    }

    return {
      method: request.method || 'GET',
      body,
      headers,
      url: request.url || ''
    };
  }

  // Handle standalone request
  return {
    method: request.method || 'GET',
    body: request.body ? JSON.parse(request.body) : null,
    headers: request.headers || {},
    url: request.url || ''
  };
}

// Helper to get client IP from various request types
export function getClientIP(request: any): string {
  const headers = request.headers || {};
  
  // Function to get header value regardless of header format
  const getHeader = (name: string): string | undefined => {
    if (typeof headers.get === 'function') {
      return headers.get(name);
    }
    return headers[name];
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

  return 'unknown';
}

// Extended server configuration types
export interface ServerConfig {
  enableCors?: boolean;
  corsOptions?: {
    origin?: string | string[] | boolean;
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };
  rateLimit?: RateLimitConfig;
  logging?: LoggerConfig;
  cache?: CacheConfig;
}

export interface EnhancedRequest extends StandaloneRequest {
  ip?: string;
  userAgent?: string;
  timestamp?: Date;
  requestId?: string;
}

export interface EnhancedResponse extends StandaloneResponse {
  requestId?: string;
  processingTime?: number;
  cached?: boolean;
}

export interface ServerError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export interface ErrorResponse {
  successful: false;
  error: string;
  code?: string;
  details?: any;
  requestId?: string;
  timestamp?: string;
}

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessful?: boolean;
  skipFailed?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export type MiddlewareFunction = (
  request: EnhancedRequest,
  response: EnhancedResponse,
  next: () => void
) => void | Promise<void>;

export interface MiddlewareConfig {
  cors?: boolean;
  rateLimit?: boolean;
  logging?: boolean;
  authentication?: boolean;
}

// OAuth related types
export interface OAuthTokenRequest {
  grant_type: 'client_credentials';
  client_id: string;
  client_secret: string;
  scope?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope?: string;
}

// Webhook types
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  signature?: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  event?: any;
  error?: string;
}

// Health check response
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version?: string;
  mode: 'nextjs' | 'standalone';
  uptime?: number;
  dependencies?: {
    [key: string]: 'ok' | 'error';
  };
}

// Caching types
export interface CacheConfig {
  enabled?: boolean;
  ttl?: number;
  maxSize?: number;
}

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Logging types
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: any;
}

export interface LoggerConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'text';
  destination?: 'console' | 'file' | 'remote';
  filename?: string;
  maxSize?: number;
  maxFiles?: number;
}