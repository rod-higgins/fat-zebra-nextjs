import { NextRequest, NextResponse } from 'next/server';
import { fatZebraClient, handleFatZebraResponse, FatZebraError } from '@/lib/fat-zebra-config';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { amount, reference } = body;
    const purchaseId = params.id;

    if (!amount) {
      return NextResponse.json(
        { error: 'Missing required field: amount' },
        { status: 400 }
      );
    }

    const refundRequest = {
      amount,
      reference: reference || `Refund for ${purchaseId}`
    };

    const response = await fatZebraClient.createRefund(purchaseId, refundRequest);
    const refund = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.decimal_amount,
        currency: refund.currency,
        reference: refund.reference,
        successful: refund.successful,
        message: refund.message,
        transaction_date: refund.transaction_date
      }
    });

  } catch (error) {
    console.error('Refund processing error:', error);

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