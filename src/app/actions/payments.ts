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
export async function createPaymentLink(data: {
  amount: number;
  currency: string;
  idempotencyKey: string;
  orderId: string;
  customerEmail: string;
  redirectUrl: string;
}) {
  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      throw new Error('SQUARE_ACCESS_TOKEN is not configured.');
    }

    const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || 'L2SFYZ87NJK49';

    const response = await client.checkoutApi.createPaymentLink({
      idempotencyKey: data.idempotencyKey,
      checkoutOptions: {
        ask_for_shipping_address: true,
        redirectUrl: data.redirectUrl,
        merchantSupportEmail: "STICKY@STICKYSLAP.COM"
      },
      quickPay: {
        locationId: locationId,
        name: `Order #${data.orderId}`,
        priceMoney: {
          amount: BigInt(Math.round(data.amount)),
          currency: data.currency
        }
      }
    });

    return {
      success: true,
      url: response.result.paymentLink?.url
    };
  } catch (error: any) {
    logError(error, 'Square Payment Link Creation');
    return {
      success: false,
      error: getFriendlyErrorMessage(error)
    };
  }
}
