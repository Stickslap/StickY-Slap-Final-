import { NextResponse } from 'next/server';
import { db } from '@/firebase'; // Assuming you have a firebase.ts that exports db
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import crypto from 'crypto';

// This secret must match the one in your Square Developer Dashboard
const WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

export async function POST(req: Request) {
  if (!WEBHOOK_SIGNATURE_KEY) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const signature = req.headers.get('x-square-hmacsha256-signature');
  const body = await req.text();

  // Verify signature
  const hmac = crypto.createHmac('sha256', WEBHOOK_SIGNATURE_KEY);
  hmac.update(body);
  const hash = hmac.digest('base64');

  if (signature !== hash) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  // Handle payment.updated event
  if (event.type === 'payment.updated') {
    const payment = event.data.object.payment;
    
    if (payment.status === 'COMPLETED') {
      const referenceId = payment.reference_id;
      
      if (referenceId) {
        try {
          // Find the order in Firestore by its orderId (which we stored as referenceId in Square)
          const orderDocRef = doc(db, 'orders', referenceId);
          await updateDoc(orderDocRef, {
            status: 'Submitted', // Or your confirmed status
            updatedAt: new Date().toISOString()
          });
          console.log(`Order ${referenceId} updated to Submitted.`);
        } catch (error) {
          console.error('Error updating order status:', error);
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
