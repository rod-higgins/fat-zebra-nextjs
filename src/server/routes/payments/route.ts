import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '@/lib/fat-zebra';

const fatZebraClient = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, cardDetails, reference, currency = 'AUD', customerIp, customer } = body;

    // Validate required fields
    if (!amount || !cardDetails || !reference) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, cardDetails, reference' },
        { status: 400 }
      );
    }

    // Create purchase request
    const purchaseRequest = {
      amount,
      currency,
      reference,
      customer_ip: customerIp || request.ip,
      customer,
      card_details: cardDetails,
      capture: true
    };

    const response = await fatZebraClient.createPurchase(purchaseRequest);
    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        authorization: transaction.authorization,
        amount: transaction.decimal_amount,
        currency: transaction.currency,
        reference: transaction.reference,
        successful: transaction.successful,
        message: transaction.message,
        transaction_date: transaction.transaction_date
      }
    });

  } catch (error) {
    console.error('Payment processing error:', error);

    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}