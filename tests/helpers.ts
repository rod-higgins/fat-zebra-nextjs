// TypeScript-friendly test helpers

import type { PurchaseRequest, FatZebraResponse, TransactionResponse } from '../src/types';

// Import CommonJS helpers and re-export with types
const {
  mockFetchResponse: _mockFetchResponse,
  mockFetchError: _mockFetchError,
  createMockPurchaseRequest: _createMockPurchaseRequest,
  createMockTransactionResponse: _createMockTransactionResponse,
  createMockSuccessResponse: _createMockSuccessResponse,
  createMockFailureResponse: _createMockFailureResponse,
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

// Add the missing functions with proper typing
export const createMockSuccessResponse = (overrides: any = {}): FatZebraResponse<TransactionResponse> => 
  _createMockSuccessResponse ? _createMockSuccessResponse(overrides) : ({
    successful: true,
    response: {
      id: 'txn-123',
      amount: 2500,
      currency: 'AUD',
      reference: 'TEST-REF-123',
      message: 'Approved',
      successful: true,
      settlement_date: '2024-01-15',
      transaction_id: 'txn-123',
      card_holder: 'John Doe',
      card_number: '************1111',
      card_type: 'visa',
      authorization: 'AUTH123',
      captured: true,
      created_at: '2024-01-15T10:30:00Z',
      ...overrides
    },
    errors: [],
    test: true
  });

export const createMockFailureResponse = (
  message: string = 'Transaction declined', 
  overrides: any = {}
): FatZebraResponse => 
  _createMockFailureResponse ? _createMockFailureResponse(message, overrides) : ({
    successful: false,
    response: {
      id: null,
      amount: 2500,
      currency: 'AUD',
      reference: 'TEST-REF-123',
      message,
      successful: false,
      settlement_date: null,
      transaction_id: null,
      card_holder: 'John Doe',
      card_number: '************1111',
      card_type: 'visa',
      authorization: null,
      captured: false,
      created_at: '2024-01-15T10:30:00Z',
      ...overrides
    },
    errors: [message],
    test: true
  });

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