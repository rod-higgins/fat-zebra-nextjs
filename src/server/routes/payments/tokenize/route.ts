import { NextRequest, NextResponse } from 'next/server';
import { fatZebraClient, handleFatZebraResponse, FatZebraError } from '@/lib/fat-zebra-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardDetails } = body;

    if (!cardDetails) {
      return NextResponse.json(
        { error: 'Missing cardDetails' },
        { status: 400 }
      );
    }

    const response = await fatZebraClient.tokenizeCard(cardDetails);
    const token = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      token: {
        token: token.token,
        card_number: token.card_number,
        card_type: token.card_type,
        card_expiry: token.card_expiry
      }
    });

  } catch (error) {
    console.error('Card tokenization error:', error);

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