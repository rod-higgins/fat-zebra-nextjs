// Re-export types from @fat-zebra/sdk
export {
  Environment,
  Payment,
  PaymentIntent,
  PaymentConfig,
  PublicEvent,
  Handlers
} from '@fat-zebra/sdk/dist';

// Custom types for our library
export interface FatZebraConfig {
  username: string;
  token: string;
  isTestMode?: boolean;
  baseUrl?: string;
}

export interface CardDetails {
  card_holder: string;
  card_number: string;
  card_expiry: string;
  cvv: string;
}

export interface Customer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface PurchaseRequest {
  amount: number;
  currency: string;
  reference: string;
  customer_ip?: string;
  customer?: Customer;
  card_details?: CardDetails;
  card_token?: string;
  capture?: boolean;
  extra?: Record<string, any>;
}

export interface TransactionResponse {
  id: string;
  authorization: string;
  amount: number;
  decimal_amount: number;
  successful: boolean;
  message: string;
  reference: string;
  currency: string;
  transaction_id: string;
  settlement_date: string;
  transaction_date: string;
  captured: boolean;
  card_number: string;
  card_holder: string;
  card_expiry: string;
  card_type: string;
}

export interface PaymentFormData {
  amount: number;
  cardDetails: CardDetails;
  reference: string;
  customer?: Customer;
  customerIp?: string;
}
