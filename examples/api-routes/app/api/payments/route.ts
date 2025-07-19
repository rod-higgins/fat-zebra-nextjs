// Standard payment processing endpoint for Next.js app directory

import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '@fwc/fat-zebra-nextjs/server';
import { PurchaseRequest } from '@fwc/fat-zebra-nextjs';

// Initialize Fat Zebra client
const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production',
  sharedSecret: process.env.FATZEBRA_SHARED_SECRET
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { amount, currency, reference, cardDetails, customer } = await request.json();

    // Validate required fields
    if (!amount || !cardDetails || !reference) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: amount, cardDetails, reference' 
        },
        { status: 400 }
      );
    }

    // Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    // Prepare purchase request
    const purchaseRequest: PurchaseRequest = {
      amount: parseFloat(amount),
      currency: currency || 'AUD',
      reference,
      card_details: {
        card_holder: cardDetails.card_holder,
        card_number: cardDetails.card_number.replace(/\s/g, ''),
        card_expiry: cardDetails.card_expiry,
        cvv: cardDetails.cvv
      },
      customer_ip: clientIP,
      customer
    };

    // Process payment
    const response = await client.createPurchase(purchaseRequest);
    const transaction = handleFatZebraResponse(response);

    // Log successful transaction (optional)
    console.log(`Payment successful: ${transaction.id} - ${amount} ${currency}`);

    // Return success response
    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        successful: transaction.successful,
        message: transaction.response?.message || 'Payment successful',
        authorization: transaction.response?.authorization,
        card: transaction.response?.card ? {
          token: transaction.response.card.token,
          display_number: transaction.response.card.display_number,
          scheme: transaction.response.card.scheme
        } : undefined
      }
    });

  } catch (error) {
    console.error('Payment processing error:', error);

    if (error instanceof FatZebraError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve payment details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('id');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const response = await client.getPurchase(transactionId);
    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        successful: transaction.successful,
        message: transaction.response?.message,
        created_at: transaction.response?.created_at,
        settlement_date: transaction.response?.settlement?.date
      }
    });

  } catch (error) {
    console.error('Transaction retrieval error:', error);

    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// examples/api-routes/app/api/payments/with-token/route.ts
// Payment processing with tokenized cards

import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '@fwc/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production'
});

export async function POST(request: NextRequest) {
  try {
    const { token, amount, reference, currency = 'AUD' } = await request.json();

    if (!token || !amount || !reference) {
      return NextResponse.json(
        { error: 'Missing required fields: token, amount, reference' },
        { status: 400 }
      );
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    const response = await client.createPurchaseWithToken(
      token,
      parseFloat(amount),
      reference,
      currency,
      clientIP
    );

    const transaction = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        successful: transaction.successful,
        message: transaction.response?.message || 'Token payment successful'
      }
    });

  } catch (error) {
    console.error('Token payment error:', error);

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

// examples/api-routes/app/api/auth/token/route.ts
// OAuth token generation for 3DS2

import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient } from '@fwc/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production'
});

export async function POST(request: NextRequest) {
  try {
    const oauthConfig = {
      clientId: process.env.FATZEBRA_CLIENT_ID!,
      clientSecret: process.env.FATZEBRA_CLIENT_SECRET!,
      scope: 'api'
    };

    const tokenResponse = await client.generateAccessToken(oauthConfig);

    return NextResponse.json({
      success: true,
      accessToken: tokenResponse.access_token,
      expiresIn: tokenResponse.expires_in
    });

  } catch (error) {
    console.error('OAuth token generation failed:', error);

    return NextResponse.json(
      { error: 'Failed to generate access token' },
      { status: 500 }
    );
  }
}

// examples/api-routes/app/api/tokenize/route.ts
// Card tokenization endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '@fwc/fat-zebra-nextjs/server';
import { TokenizationRequest } from '@fwc/fat-zebra-nextjs';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production',
  sharedSecret: process.env.FATZEBRA_SHARED_SECRET
});

export async function POST(request: NextRequest) {
  try {
    const { cardDetails } = await request.json();

    if (!cardDetails) {
      return NextResponse.json(
        { error: 'Card details are required' },
        { status: 400 }
      );
    }

    // Generate verification hash for security
    const verificationData = {
      reference: `TOKEN-${Date.now()}`,
      amount: 0,
      currency: 'AUD'
    };

    const verification = client.generateVerificationHash(verificationData);

    const tokenizationRequest: TokenizationRequest = {
      card_holder: cardDetails.card_holder,
      card_number: cardDetails.card_number.replace(/\s/g, ''),
      card_expiry: cardDetails.card_expiry,
      cvv: cardDetails.cvv,
      verification
    };

    const response = await client.createToken(tokenizationRequest);
    const tokenData = handleFatZebraResponse(response);

    return NextResponse.json({
      success: true,
      token: tokenData.response.token,
      card: {
        display_number: tokenData.response.card_number,
        expiry: tokenData.response.card_expiry,
        holder: tokenData.response.card_holder
      }
    });

  } catch (error) {
    console.error('Tokenization error:', error);

    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Tokenization failed' },
      { status: 500 }
    );
  }
}

// examples/api-routes/app/api/refunds/route.ts
// Refund processing endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '@fwc/fat-zebra-nextjs/server';
import { RefundRequest } from '@fwc/fat-zebra-nextjs';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production'
});

export async function POST(request: NextRequest) {
  try {
    const { transactionId, amount, reason, reference } = await request.json();

    if (!transactionId && !reference) {
      return NextResponse.json(
        { error: 'Either transaction ID or reference is required' },
        { status: 400 }
      );
    }

    const refundRequest: RefundRequest = {
      transaction_id: transactionId,
      reference,
      amount: amount ? parseFloat(amount) : undefined,
      reason
    };

    const response = await client.createRefund(refundRequest);
    const refund = handleFatZebraResponse(response);

    console.log(`Refund processed: ${refund.id} - ${refund.amount}`);

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        successful: refund.successful,
        message: refund.response?.message || 'Refund successful',
        reference: refund.reference
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
      { error: 'Refund processing failed' },
      { status: 500 }
    );
  }
}

// examples/api-routes/app/api/webhooks/fatzebra/route.ts
// Webhook handler for Fat Zebra events

import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient } from '@fwc/fat-zebra-nextjs/server';
import { WebhookEvent } from '@fwc/fat-zebra-nextjs';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production',
  sharedSecret: process.env.FATZEBRA_SHARED_SECRET!
});

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get('x-fatzebra-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();
    
    // Verify webhook signature
    const isValid = client.verifyWebhookSignature(body, signature);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Parse webhook data
    const webhookData: WebhookEvent = JSON.parse(body);
    
    // Process webhook based on event type
    switch (webhookData.type) {
      case 'purchase.created':
        console.log('Purchase created webhook:', webhookData.data.id);
        // Add your business logic here
        // e.g., update order status, send confirmation email
        break;

      case 'purchase.updated':
        console.log('Purchase updated webhook:', webhookData.data.id);
        // Handle payment status updates
        break;

      case 'refund.created':
        console.log('Refund created webhook:', webhookData.data.id);
        // Handle refund notifications
        break;

      case 'settlement.created':
        console.log('Settlement created webhook:', webhookData.data.settlement_date);
        // Handle settlement notifications
        break;

      default:
        console.log('Unknown webhook type:', webhookData.type);
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// examples/api-routes/app/api/health/route.ts
// Health check endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient } from '@fwc/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production'
});

export async function GET(request: NextRequest) {
  try {
    // Test connection to Fat Zebra
    const response = await client.ping();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV !== 'production' ? 'sandbox' : 'production',
      fatZebraStatus: response.successful ? 'connected' : 'disconnected',
      version: '0.2.0'
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}