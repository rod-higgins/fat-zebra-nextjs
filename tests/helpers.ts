// TypeScript-friendly test helpers

import type { PurchaseRequest, FatZebraResponse, TransactionResponse } from '../src/types';

// Import CommonJS helpers and re-export with types
const {
  mockFetchResponse: _mockFetchResponse,
  mockFetchError: _mockFetchError,
  createMockPurchaseRequest: _createMockPurchaseRequest,
  createMockTransactionResponse: _createMockTransactionResponse,
  createMockErrorResponse: _createMockErrorResponse
} = require('./setup');

// Type-safe helper functions
export const mockFetchResponse = (
  data: any, 
  ok: boolean = true, 
  status: number = 200
): Promise<Response> => _mockFetchResponse(data, ok, status);

export const mockFetchError = (error: Error): Promise<never> => _mockFetchError(error);

export const createMockPurchaseRequest = (): PurchaseRequest => _createMockPurchaseRequest();

export const createMockTransactionResponse = (): FatZebraResponse<TransactionResponse> => 
  _createMockTransactionResponse();

export const createMockErrorResponse = (
  message: string = 'Test error', 
  errors: string[] = []
): FatZebraResponse => _createMockErrorResponse(message, errors);

// Additional test utilities
export const createMinimalPurchaseRequest = (): PurchaseRequest => ({
  amount: 1000, // $10.00
  currency: 'AUD',
  card_holder: 'Test User',
  card_number: '4005550000000001',
  card_expiry: '12/25',
  cvv: '123'
});

export const createFailingPurchaseRequest = (): PurchaseRequest => ({
  amount: 100,
  currency: 'AUD',
  card_holder: 'Test User',
  card_number: '4005550000000019', // Decline card
  card_expiry: '12/25',
  cvv: '123'
});

export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));