import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient } from '@fwcgovau/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  sharedSecret: process.env.FATZEBRA_SHARED_SECRET!,
  isTestMode: process.env.NODE_ENV !== 'production'
});

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-fz-signature');
    const payload = await request.text();

    if (!signature) {
      console.error('Webhook signature missing');
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = client.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(payload);
    console.log('Received webhook event:', event.type, event.id);

    // Process different event types
    switch (event.type) {
      case 'purchase.success':
        await handlePurchaseSuccess(event);
        break;
      
      case 'purchase.failed':
        await handlePurchaseFailure(event);
        break;
      
      case 'refund.success':
        await handleRefundSuccess(event);
        break;
      
      case 'settlement.completed':
        await handleSettlementCompleted(event);
        break;
      
      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePurchaseSuccess(event: any) {
  const { id, amount, reference, customer } = event.data;
  
  console.log('Purchase successful:', {
    transactionId: id,
    amount,
    reference,
    customerEmail: customer?.email
  });

  // Update your database
  // await updateOrderStatus(reference, 'paid');
  
  // Send confirmation email
  // await sendConfirmationEmail(customer?.email, { transactionId: id, amount });
}

async function handlePurchaseFailure(event: any) {
  const { id, reference, message } = event.data;
  
  console.log('Purchase failed:', {
    transactionId: id,
    reference,
    reason: message
  });

  // Update your database
  // await updateOrderStatus(reference, 'failed');
  
  // Send failure notification
  // await sendFailureNotification(reference, message);
}

async function handleRefundSuccess(event: any) {
  const { id, amount, original_transaction_id } = event.data;
  
  console.log('Refund successful:', {
    refundId: id,
    amount,
    originalTransactionId: original_transaction_id
  });

  // Update your database
  // await updateRefundStatus(original_transaction_id, 'refunded', amount);
}

async function handleSettlementCompleted(event: any) {
  const { id, date, total_amount } = event.data;
  
  console.log('Settlement completed:', {
    settlementId: id,
    date,
    totalAmount: total_amount
  });

  // Process settlement data
  // await processSettlement(id, date, total_amount);
}