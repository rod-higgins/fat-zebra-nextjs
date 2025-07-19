import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '@fwc/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production'
});

export async function POST(request: NextRequest) {
  try {
    const { transactionId, amount, reason } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Process the refund
    const response = await client.createRefund({
      transaction_id: transactionId,
      amount: amount, // Optional - if not provided, full refund
      reason: reason || 'Customer request'
    });

    const refund = handleFatZebraResponse(response);

    console.log('Refund successful:', {
      refundId: refund.id,
      originalTransactionId: transactionId,
      amount: refund.amount
    });

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        original_transaction_id: transactionId,
        message: refund.message
      }
    });

  } catch (error) {
    console.error('Refund processing failed:', error);

    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { 
          error: error.message, 
          details: error.errors,
          code: 'REFUND_FAILED'
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