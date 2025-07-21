/**
 * Integration Test Helper - Test Data
 * 
 * Sample data for integration tests.
 */

export const createTestPayment = (overrides = {}) => {
  return {
    amount: 1000, // $10.00
    currency: 'AUD',
    card_holder: 'John Doe',
    card_number: '4005550000000001',
    card_expiry: '12/25',
    cvv: '123',
    reference: `test-${Date.now()}`,
    ...overrides
  };
};

export const createTestCustomer = () => {
  return {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+61400000000'
  };
};
