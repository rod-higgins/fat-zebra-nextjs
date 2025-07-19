import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '../../../../../lib/client';
import { extractErrorMessage } from '../../../../../utils';
import type { RefundRequest } from '../../../../../types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const transactionId = params.id;
    const body = await request.json();
    
    if (!transactionId) {
      return NextResponse.json(
        { successful: false, errors: ['Transaction ID is required'] },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const refundData: RefundRequest = {
      transaction_id: transactionId,
      amount: body.amount,
      reason: body.reason || 'Customer request',
      reference: body.reference || `REFUND-${Date.now()}`,
    };

    const response = await client.refund(refundData);
    return NextResponse.json(handleFatZebraResponse(response));

  } catch (error) {
    console.error('Refund error:', error);
    
    // Proper error type handling
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { 
          successful: false, 
          error: error.message, 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    const errorMessage = extractErrorMessage(error);
    return NextResponse.json(
      { 
        successful: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}