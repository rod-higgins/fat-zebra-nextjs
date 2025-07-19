import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '@fwc/fat-zebra-nextjs/server';
import { validateAmount, isValidEmail } from '@fwc/fat-zebra-nextjs/utils';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  sharedSecret: process.env.FATZEBRA_SHARED_SECRET!,
  isTestMode: process.env.NODE_ENV !== 'production'
});

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, reference, cardDetails, customer } = await request.json();

    // Validate input
    if (!amount || !currency || !reference || !cardDetails) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, currency, reference, cardDetails' },
        { status: 400 }
      );
    }

    // Validate amount
    if (!validateAmount(amount, currency)) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    // Validate customer email if provided
    if (customer?.email && !isValidEmail(customer.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Process the payment
    const response = await client.createPurchase({
      amount,
      currency,
      reference,
      customer_ip: request.ip || '127.0.0.1',
      card_details: {
        card_holder: cardDetails.cardHolder,
        card_number: cardDetails.cardNumber,
        card_expiry: cardDetails.cardExpiry,
        cvv: cardDetails.cvv
      },
      customer: customer ? {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone
      } : undefined,
      capture: true
    });

    const transaction = handleFatZebraResponse(response);

    // Log successful transaction (in production, use proper logging)
    console.log('Payment successful:', {
      transactionId: transaction.id,
      amount,
      currency,
      reference
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        authorization: transaction.authorization,
        message: transaction.message
      }
    });

  } catch (error) {
    console.error('Payment processing failed:', error);

    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { 
          error: error.message, 
          details: error.errors,
          code: 'PAYMENT_FAILED'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}