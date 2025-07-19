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

// Next.js types (optional - only imported when Next.js is available)
export type NextRequest = any;
export type NextResponse = any;

// Helper to check if Next.js is available
export function isNextJSAvailable(): boolean {
  try {
    require('next/server');
    return true;
  } catch {
    return false;
  }
}

// Factory function to create appropriate response based on environment
export function createResponse(data: any, status: number = 200): any {
  if (isNextJSAvailable()) {
    try {
      const { NextResponse } = require('next/server');
      return NextResponse.json(data, { status });
    } catch {
      // Fallback if NextResponse isn't available
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

    return {
      method: request.method || 'GET',
      body,
      headers: Object.fromEntries(request.headers?.entries?.() || []),
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
  
  // Try different header formats
  const forwarded = headers.get?.('x-forwarded-for') || headers['x-forwarded-for'];
  const realIP = headers.get?.('x-real-ip') || headers['x-real-ip'];
  const cfConnectingIP = headers.get?.('cf-connecting-ip') || headers['cf-connecting-ip'];

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

// Configuration interface for server handlers
export interface ServerConfig {
  fatZebra: {
    username: string;
    token: string;
    sandbox?: boolean;
    sharedSecret?: string;
    timeout?: number;
  };
  webhook?: {
    verifySignature?: boolean;
    allowedIPs?: string[];
    enableLogging?: boolean;
  };
  cors?: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
  };
}

// Enhanced request interface with additional metadata
export interface EnhancedRequest extends StandaloneRequest {
  clientIP?: string;
  userAgent?: string;
  timestamp?: Date;
  requestId?: string;
}

// Enhanced response interface with metadata
export interface EnhancedResponse extends StandaloneResponse {
  requestId?: string;
  processingTime?: number;
  metadata?: Record<string, any>;
}

// Error handling types
export interface ServerError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface ErrorResponse {
  successful: false;
  errors: string[];
  code?: string;
  requestId?: string;
  timestamp?: string;
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Middleware types
export type MiddlewareFunction = (
  request: EnhancedRequest,
  response: EnhancedResponse,
  next: () => Promise<void>
) => Promise<void>;

export interface MiddlewareConfig {
  cors?: boolean;
  rateLimit?: RateLimitConfig;
  logging?: boolean;
  authentication?: boolean;
  validation?: boolean;
}

// OAuth specific types for server-side operations
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

// Webhook specific types
export interface WebhookPayload {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  version: string;
}

export interface WebhookVerificationResult {
  verified: boolean;
  payload: WebhookPayload | null;
  error?: string;
}

// Health check types
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  mode: 'standalone' | 'nextjs';
  services?: {
    fatZebra: 'connected' | 'disconnected' | 'unknown';
    database?: 'connected' | 'disconnected' | 'unknown';
    cache?: 'connected' | 'disconnected' | 'unknown';
  };
  uptime?: number;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
}

// Cache types for standalone operation
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items
  checkPeriod?: number; // How often to check for expired items
}

export interface CacheItem<T = any> {
  value: T;
  expires: number;
  created: number;
}

// Logging types
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  requestId?: string;
  clientIP?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  processingTime?: number;
  error?: any;
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  level: 'info' | 'warn' | 'error' | 'debug';
  format: 'json' | 'text';
  destination: 'console' | 'file' | 'both';
  filename?: string;
  maxFileSize?: number;
  maxFiles?: number;
}