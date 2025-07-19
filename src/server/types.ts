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

  return '127.0.0.1';
}