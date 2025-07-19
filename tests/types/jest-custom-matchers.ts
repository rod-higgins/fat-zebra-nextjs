/**
 * Jest custom matchers implementation for Fat Zebra tests
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidPaymentResponse(): R;
      toBeValidTokenResponse(): R;
      toHaveValidErrorStructure(): R;
      toMatchFatZebraErrorFormat(): R;
    }
  }
}

// Custom matcher for validating Fat Zebra payment responses
function toBeValidPaymentResponse(received: any) {
  const pass = received &&
    typeof received === 'object' &&
    typeof received.successful === 'boolean' &&
    (received.successful ? 
      (received.response && typeof received.response.id === 'string') :
      (Array.isArray(received.errors) && received.errors.length > 0)
    );

  return {
    message: () => 
      pass 
        ? `Expected ${JSON.stringify(received)} not to be a valid payment response`
        : `Expected ${JSON.stringify(received)} to be a valid payment response with either response.id or errors array`,
    pass
  };
}

// Custom matcher for validating tokenization responses
function toBeValidTokenResponse(received: any) {
  const pass = received &&
    typeof received === 'object' &&
    typeof received.successful === 'boolean' &&
    (received.successful ? 
      (received.response && typeof received.response.token === 'string') :
      (Array.isArray(received.errors) && received.errors.length > 0)
    );

  return {
    message: () => 
      pass 
        ? `Expected ${JSON.stringify(received)} not to be a valid token response`
        : `Expected ${JSON.stringify(received)} to be a valid token response with either response.token or errors array`,
    pass
  };
}

// Custom matcher for validating error structure
function toHaveValidErrorStructure(received: any) {
  const pass = received &&
    typeof received === 'object' &&
    received.successful === false &&
    Array.isArray(received.errors) &&
    received.errors.length > 0;

  return {
    message: () => 
      pass 
        ? `Expected ${JSON.stringify(received)} not to have valid error structure`
        : `Expected ${JSON.stringify(received)} to have valid error structure with successful=false and errors array`,
    pass
  };
}

// Custom matcher for Fat Zebra error format
function toMatchFatZebraErrorFormat(received: any) {
  const pass = received &&
    received.name === 'FatZebraError' &&
    typeof received.message === 'string' &&
    Array.isArray(received.errors);

  return {
    message: () => 
      pass 
        ? `Expected ${JSON.stringify(received)} not to match Fat Zebra error format`
        : `Expected ${JSON.stringify(received)} to match Fat Zebra error format with name, message, and errors`,
    pass
  };
}

// Register the matchers
expect.extend({
  toBeValidPaymentResponse,
  toBeValidTokenResponse,
  toHaveValidErrorStructure,
  toMatchFatZebraErrorFormat
});

export {};