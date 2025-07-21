/**
 * Integration Test Helper - API Client
 * 
 * Helper functions for making real Fat Zebra API calls in tests.
 */

export const createTestClient = () => {
  // Helper to create Fat Zebra client with test credentials
};

export const getTestCards = () => {
  // Test card numbers for different scenarios
  return {
    VISA_SUCCESS: '4005550000000001',
    VISA_DECLINE: '4005550000000019',
    MASTERCARD_SUCCESS: '5123456789012346',
    VISA_3DS: '4005554444444460'
  };
};
