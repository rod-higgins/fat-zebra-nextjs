// Mock implementation of @fat-zebra/sdk for tests
const mockFatZebraSDK = {
  FatZebra: {
    verify: jest.fn().mockResolvedValue({
      successful: true,
      verified: true,
      response: {
        id: 'verify-123',
        token: 'card-token-123',
        card_holder: 'John Doe',
        card_number: '************1111',
        card_type: 'visa',
        expiry_date: '12/25'
      }
    }),
    purchase: jest.fn().mockResolvedValue({
      successful: true,
      response: {
        id: 'txn-123',
        amount: 2500,
        currency: 'AUD',
        reference: 'TEST-REF-123',
        message: 'Approved',
        successful: true,
        authorization: 'AUTH123',
        captured: true,
        transaction_id: 'txn-123',
        card_holder: 'John Doe',
        card_number: '************1111',
        card_type: 'visa'
      }
    }),
    tokenize: jest.fn().mockResolvedValue({
      successful: true,
      response: {
        token: 'card-token-123',
        card_holder: 'John Doe',
        card_number: '************1111',
        card_type: 'visa',
        expiry_date: '12/25'
      }
    }),
    authorize: jest.fn().mockResolvedValue({
      successful: true,
      response: {
        id: 'auth-123',
        amount: 2500,
        currency: 'AUD',
        reference: 'AUTH-REF-123',
        message: 'Authorized',
        successful: true,
        authorization: 'AUTH123',
        captured: false
      }
    }),
    capture: jest.fn().mockResolvedValue({
      successful: true,
      response: {
        id: 'cap-123',
        amount: 2500,
        currency: 'AUD',
        reference: 'CAP-REF-123',
        message: 'Captured',
        successful: true,
        captured: true
      }
    }),
    refund: jest.fn().mockResolvedValue({
      successful: true,
      response: {
        id: 'ref-123',
        amount: 2500,
        currency: 'AUD',
        reference: 'REF-REF-123',
        message: 'Refunded',
        successful: true
      }
    })
  },
  generateAccessToken: jest.fn().mockResolvedValue({
    access_token: 'mock-access-token',
    token_type: 'Bearer',
    expires_in: 3600
  })
};

module.exports = mockFatZebraSDK;