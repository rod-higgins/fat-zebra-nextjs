/**
 * Jest custom matchers implementation for Fat Zebra tests
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      // Fat Zebra specific matchers
      toBeValidPaymentResponse(): R;
      toBeValidTokenResponse(): R;
      toHaveValidErrorStructure(): R;
      toMatchFatZebraErrorFormat(): R;
      
      // DOM/Component testing matchers (for component tests)
      toBeDisabled(): R;
      toHaveClass(className: string): R;
      toHaveTextContent(text: string): R;
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

// DOM/Component testing matchers
function toBeDisabled(received: any) {
  const pass = received.disabled === true || received.hasAttribute('disabled');
  if (pass) {
    return {
      message: () => `expected element not to be disabled`,
      pass: true,
    };
  } else {
    return {
      message: () => `expected element to be disabled`,
      pass: false,
    };
  }
}

function toHaveClass(received: any, className: string) {
  const pass = received.classList.contains(className);
  if (pass) {
    return {
      message: () => `expected element not to have class "${className}"`,
      pass: true,
    };
  } else {
    return {
      message: () => `expected element to have class "${className}"`,
      pass: false,
    };
  }
}

function toHaveTextContent(received: any, text: string) {
  const pass = received.textContent === text || received.textContent?.includes(text);
  if (pass) {
    return {
      message: () => `expected element not to have text content "${text}"`,
      pass: true,
    };
  } else {
    return {
      message: () => `expected element to have text content "${text}", but got "${received.textContent}"`,
      pass: false,
    };
  }
}

// Register the matchers
expect.extend({
  toBeValidPaymentResponse,
  toBeValidTokenResponse,
  toHaveValidErrorStructure,
  toMatchFatZebraErrorFormat,
  toBeDisabled,
  toHaveClass,
  toHaveTextContent
});

export {};