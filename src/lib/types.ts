export interface FatZebraConfig {
  username: string;
  token: string;
  isTestMode?: boolean;
  baseUrl?: string;
}

export interface CardDetails {
  card_holder: string;
  card_number: string;
  card_expiry: string; // MM/YYYY format
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
  amount: number; // Amount in cents
  currency: string;
  reference: string;
  customer_ip?: string;
  customer?: Customer;
  card_details?: CardDetails;
  card_token?: string;
  capture?: boolean;
  extra?: {
    ecm?: string;
    card_on_file?: boolean;
    stored_credential_indicator?: 'I' | 'S';
    authorization_tracking_id?: string;
    [key: string]: any;
  };
}

export interface AuthorizationRequest {
  amount: number;
  currency: string;
  reference: string;
  customer_ip?: string;
  customer?: Customer;
  card_details?: CardDetails;
  card_token?: string;
  extra?: {
    [key: string]: any;
  };
}

export interface CaptureRequest {
  amount?: number; // If not provided, captures full authorized amount
  extra?: {
    [key: string]: any;
  };
}

export interface RefundRequest {
  amount: number;
  reference?: string;
  extra?: {
    [key: string]: any;
  };
}

export interface TokenizeRequest {
  card_holder: string;
  card_number: string;
  card_expiry: string;
  cvv?: string;
}

export interface FatZebraResponse<T = any> {
  successful: boolean;
  response: T;
  errors: string[];
  test: boolean;
}

export interface TransactionResponse {
  authorization: string;
  id: string;
  card_number: string;
  card_holder: string;
  card_expiry: string;
  card_token?: string;
  card_type: string;
  card_category: string;
  card_subcategory?: string;
  amount: number;
  decimal_amount: number;
  successful: boolean;
  message: string;
  reference: string;
  currency: string;
  transaction_id: string;
  settlement_date: string;
  transaction_date: string;
  response_code: string;
  captured: boolean;
  captured_amount?: number;
  rrn: string;
  cvv_match?: string;
  metadata?: {
    authorization_tracking_id?: string;
    original_transaction_reference?: string;
    [key: string]: any;
  };
  addendum_data?: any;
}

export interface TokenResponse {
  token: string;
  card_holder: string;
  card_number: string;
  card_expiry: string;
  card_type: string;
  card_category: string;
  card_subcategory?: string;
}

export interface WalletRequest {
  amount: number;
  currency: string;
  reference: string;
  customer_ip?: string;
  customer?: Customer;
  wallet: {
    type: 'apple_pay' | 'google_pay';
    payload: string; // Encrypted wallet payload
  };
  extra?: {
    [key: string]: any;
  };
}