import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '@fwc/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production'
});

export async function POST(request: NextRequest) {
  try {
    const { 
      amount, 
      currency, 
      cardDetails, 
      customer, 
      plan 
    } = await request.json();

    // First, create a tokenized card for recurring payments
    const tokenResponse = await client.createToken({
      card_holder: cardDetails.cardHolder,
      card_number: cardDetails.cardNumber,
      card_expiry: cardDetails.cardExpiry,
      cvv: cardDetails.cvv
    });

    const tokenData = handleFatZebraResponse(tokenResponse);

    // Process initial payment with token
    const initialPaymentResponse = await client.createPurchaseWithToken(
      tokenData.token,
      amount,
      `SUB-INIT-${Date.now()}`,
      currency,
      request.ip || '127.0.0.1',
      { customer }
    );

    const initialPayment = handleFatZebraResponse(initialPaymentResponse);

    // Create subscription record (this would be in your database)
    const subscription = {
      id: `sub_${Date.now()}`,
      customer_id: customer.email, // Use a proper customer ID in production
      card_token: tokenData.token,
      plan_id: plan.id,
      amount: amount,
      currency: currency,
      frequency: plan.frequency, // 'monthly', 'yearly', etc.
      status: 'active',
      next_billing_date: getNextBillingDate(plan.frequency),
      created_at: new Date().toISOString(),
      initial_transaction_id: initialPayment.id
    };

    // In production, save subscription to your database
    console.log('Subscription created:', subscription);

    return NextResponse.json({
      success: true,
      subscription,
      initial_payment: {
        id: initialPayment.id,
        amount: initialPayment.amount,
        currency: initialPayment.currency
      }
    });

  } catch (error) {
    console.error('Subscription creation failed:', error);

    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { 
          error: error.message, 
          details: error.errors,
          code: 'SUBSCRIPTION_FAILED'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Subscription creation failed',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

function getNextBillingDate(frequency: string): string {
  const now = new Date();
  
  switch (frequency) {
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    default:
      now.setMonth(now.getMonth() + 1); // Default to monthly
  }
  
  return now.toISOString();
}
