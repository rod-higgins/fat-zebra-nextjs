/**
 * Type declarations for optional Next.js dependencies
 * This file provides fallback types when Next.js is not available
 */

declare module 'next/server' {
  export interface NextRequest {
    method?: string;
    url?: string;
    headers: Headers | Map<string, string> | Record<string, string>;
    json(): Promise<any>;
    text(): Promise<string>;
  }

  export interface NextResponse {
    status?: number;
    headers?: Headers | Map<string, string> | Record<string, string>;
    json(): Promise<any>;
  }

  export class NextResponse {
    static json(data: any, init?: { status?: number }): NextResponse;
  }

  export interface NextRequest extends Request {
    nextUrl: URL;
    cookies: any;
    geo?: any;
    ip?: string;
  }
}

// Global type augmentation for when Next.js modules might not be available
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      FAT_ZEBRA_USERNAME?: string;
      FAT_ZEBRA_TOKEN?: string;
      FAT_ZEBRA_SHARED_SECRET?: string;
      FAT_ZEBRA_CLIENT_ID?: string;
      FAT_ZEBRA_CLIENT_SECRET?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      npm_package_version?: string;
    }
  }
}

// Fallback types for when Next.js is not available
export interface MockNextRequest {
  method?: string;
  url?: string;
  headers: Record<string, string>;
  json(): Promise<any>;
  text(): Promise<string>;
}

export interface MockNextResponse {
  status?: number;
  headers?: Record<string, string>;
  json(): Promise<any>;
  body?: string;
}

export interface MockNextResponseConstructor {
  json(data: any, init?: { status?: number }): MockNextResponse;
}

// Export types for use in other files
export type NextRequestType = MockNextRequest;
export type NextResponseType = MockNextResponse;
