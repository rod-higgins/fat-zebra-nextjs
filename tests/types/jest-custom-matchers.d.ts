// Type declarations for custom Jest matchers

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCardNumber(): R;
      toBeValidEmail(): R;
    }
  }
}

export {};