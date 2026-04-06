'use server';

import { Client, Environment } from 'square';
import { getFriendlyErrorMessage, logError } from '@/lib/error-handler';

/**
 * Society Payment Engine: Server-side Square processing.
 * Enhanced to include Customer Identity, Shipping Data, and Order Reference.
 */

// We dynamically select the environment so Sandbox App IDs don't hit the Prod endpoint.
const isSandbox = process.env.NEXT_PUBLIC_SQUARE_APP_ID?.startsWith('sandbox') || false;

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: isSandbox ? Environment.Sandbox : Environment.Production, 
});

const { paymentsApi } = client;

interface ProcessPaymentData {
  sourceId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  customerEmail: string;
  orderNote: string;
  referenceId?: string;
  shippingAddress?: {
    addressLine1?: string;
    locality?: string;
    administrativeDistrictLevel1?: string;
    postalCode?: string;
    firstName?: string;
    lastName?: string;
  };
}

/**
 * Executes a high-security transaction via Square with full metadata attachment.
 * Explicitly uses Location ID L2SFYZ87NJK49 for correct branch routing.
 * Note: Square returns a 400 error if amount is 0.
 */
export async function processSquarePayment(data: ProcessPaymentData) {
  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      throw new Error('SQUARE_ACCESS_TOKEN is not configured in the registry.');
    }

    if (data.amount <= 0) {
      return { 
        success: false, 
        error: 'Amount must be greater than zero for card processing.' 
      };
    }
    
    // We must supply the EXACT Location ID the Application ID is tied to.
    const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || 'L2SFYZ87NJK49';

    const response = await paymentsApi.createPayment({
      sourceId: data.sourceId,
      idempotencyKey: data.idempotencyKey,
      amountMoney: {
        amount: BigInt(data.amount),
        currency: data.currency
      },
      locationId: locationId, // Routing transaction to physical branch
      buyerEmailAddress: data.customerEmail,
      note: data.orderNote,
      referenceId: data.referenceId,
      shippingAddress: data.shippingAddress ? {
        addressLine1: data.shippingAddress.addressLine1,
        locality: data.shippingAddress.locality,
        administrativeDistrictLevel1: data.shippingAddress.administrativeDistrictLevel1,
        postalCode: data.shippingAddress.postalCode,
        firstName: data.shippingAddress.firstName,
        lastName: data.shippingAddress.lastName,
      } : undefined
    });

    // We must serialize BigInt values for JSON safety across the boundary
    const payment = JSON.parse(JSON.stringify(response.result.payment, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    ));

    return { 
      success: true, 
      paymentId: payment.id,
      status: payment.status 
    };
  } catch (error: any) {
    logError(error, 'Square Transaction');
    return { 
      success: false, 
      error: getFriendlyErrorMessage(error)
    };
  }
}
