// Card validation utilities
export function validateCard(cardNumber: string): { isValid: boolean; type?: string } {
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false };
  }

  // Luhn algorithm
  let sum = 0;
  let alternate = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let n = parseInt(cleaned.charAt(i), 10);
    
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n = (n % 10) + 1;
      }
    }
    
    sum += n;
    alternate = !alternate;
  }

  const isValid = (sum % 10) === 0;
  
  let type: string | undefined;
  if (cleaned.startsWith('4')) {
    type = 'VISA';
  } else if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
    type = 'MASTERCARD';
  } else if (/^3[47]/.test(cleaned)) {
    type = 'AMEX';
  }

  return { isValid, type };
}

export function formatCardExpiry(month: number | string, year: number | string): string {
  const m = month.toString().padStart(2, '0');
  const y = year.toString();
  return `${m}/${y}`;
}

export function formatAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// Error handling
export class FatZebraError extends Error {
  public readonly errors: string[];
  public readonly response?: any;

  constructor(message: string, errors: string[] = [], response?: any) {
    super(message);
    this.name = 'FatZebraError';
    this.errors = errors;
    this.response = response;
  }
}

export function handleFatZebraResponse<T>(response: any): T {
  if (!response.successful) {
    throw new FatZebraError(
      'Transaction failed',
      response.errors || [],
      response
    );
  }
  return response.response;
}

// Constants
export const CURRENCIES = {
  AUD: 'AUD',
  USD: 'USD',
  NZD: 'NZD',
  GBP: 'GBP',
  EUR: 'EUR'
} as const;

export const TEST_CARDS = {
  VISA_SUCCESS: '4005550000000001',
  VISA_DECLINE: '4005550000000019',
  MASTERCARD_SUCCESS: '5123456789012346',
  MASTERCARD_DECLINE: '5123456789012353',
  AMEX_SUCCESS: '345678901234564',
  AMEX_DECLINE: '345678901234572'
} as const;
