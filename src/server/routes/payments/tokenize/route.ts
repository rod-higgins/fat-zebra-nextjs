import { NextRequest, NextResponse } from 'next/server';
import {
  createFatZebraClient,
  handleFatZebraResponse,
  FatZebraError,
} from '../../../../lib/client';
import { extractErrorMessage } from '../../../../utils';
import type { TokenizationRequest } from '../../../../types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: TokenizationRequest = await request.json();

    if (!body.card_number || !body.card_expiry || !body.card_holder) {
      return NextResponse.json(
        { successful: false, errors: ['Missing required card fields'] },
        { status: 400 }
      );
    }

    const client = createFatZebraClient({
      username: process.env.FAT_ZEBRA_USERNAME!,
      token: process.env.FAT_ZEBRA_TOKEN!,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    const response = await client.tokenize(body);
    return NextResponse.json(handleFatZebraResponse(response));
  } catch (error) {
    console.error('Tokenization error:', error);

    // Proper error type handling for TypeScript strict mode
    const errorMessage = extractErrorMessage(error);

    if (error instanceof FatZebraError) {
      return NextResponse.json(
        {
          successful: false,
          error: error.message,
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        successful: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
