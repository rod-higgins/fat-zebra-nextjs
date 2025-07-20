import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '../../../lib/client';
import { validateCard, extractErrorMessage } from '../../../utils';
import type { PurchaseRequest } from '../../../types';

// Helper function to get client IP from request - FIXED TYPESCRIPT ERRORS
function getClientIP(request: NextRequest): string {
  const headers = request.headers;

  // Function to safely get header value regardless of header format
  const getHeader = (name: string): string | undefined => {
    if (typeof headers.get === 'function') {
      const value = headers.get(name);
      return value !== null ? value : undefined;
    }
    // Fallback for different header implementations
    return (headers as any)[name];
  };

  const forwarded = getHeader('x-forwarded-for');
  const realIP = getHeader('x-real-ip');
  const cfConnectingIP = getHeader('cf-connecting-ip');

  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  if (cfConnectingIP) {
    return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] : cfConnectingIP;
  }

  // Fallback to a default IP for development
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    const body: PurchaseRequest = await request.json();

    // Validate required fields
    if (!body.amount || !body.card_number || !body.card_expiry || !body.cvv || !body.card_holder) {
      return NextResponse.json(
        {
          successful: false,
          errors: ['Missing required payment fields'],
        },
        { status: 400 }
      );
    }

    // Validate card details
    const cardValidation = validateCard({
      card_holder: body.card_holder,
      card_number: body.card_number,
      card_expiry: body.card_expiry,
      cvv: body.cvv,
    });

    if (!cardValidation.valid) {
      return NextResponse.json(
        {
          successful: false,
          errors: cardValidation.errors,
        },
        { status: 400 }
      );
    }

    // Get client IP
    const customerIp = getClientIP(request);

    // Create Fat Zebra client
    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    // Prepare purchase data
    const purchaseData: PurchaseRequest = {
      amount: Math.round(body.amount * 100), // Convert to cents
      currency: body.currency || 'AUD',
      reference: body.reference || `TXN-${Date.now()}`,
      card_holder: body.card_holder,
      card_number: body.card_number.replace(/\s/g, ''), // Remove spaces
      card_expiry: body.card_expiry,
      cvv: body.cvv,
      customer_ip: customerIp,
      ...(body.customer && { customer: body.customer }),
      ...(body.metadata && { metadata: body.metadata }),
    };

    // Process the purchase
    const response = await client.purchase(purchaseData);

    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Payment processing error:', error);

    const errorMessage = extractErrorMessage(error);
    const statusCode = error instanceof FatZebraError ? 400 : 500;

    return NextResponse.json(
      {
        successful: false,
        errors: [errorMessage],
      },
      { status: statusCode }
    );
  }
}
