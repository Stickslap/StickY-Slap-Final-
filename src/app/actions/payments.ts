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
  items: any[];
  agreement?: {
    signedAt: string;
    ipAddress: string;
    fullName: string;
    version: string;
  };
}) {
  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      throw new Error('SQUARE_ACCESS_TOKEN is not configured.');
    }

    const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || 'L2SFYZ87NJK49';
    
    // Construct the Service Agreement Note for legal persistence in Square
    const agreementNote = data.agreement 
      ? `SERVICE AGREEMENT CONTRACT SIGNED\nVersion: ${data.agreement.version}\nDate: ${data.agreement.signedAt}\nIP: ${data.agreement.ipAddress}\nSignatory: ${data.agreement.fullName}`
      : "No digital signature data attached.";

    const response = await client.checkoutApi.createPaymentLink({
      idempotencyKey: data.idempotencyKey,
      checkoutOptions: {
        askForShippingAddress: true,
        redirectUrl: data.redirectUrl,
        merchantSupportEmail: "STICKY@STICKYSLAP.COM"
      },
      order: {
        locationId: locationId,
        referenceId: data.orderId, // Add referenceId for webhook mapping
        ticketName: agreementNote.substring(0, 30), // Needs to be short
        metadata: {
          agreement_contract: "SIGNED",
          agreement_version: data.agreement?.version || "N/A"
        },
        lineItems: data.items.map(item => ({
          name: item.productName?.replace(/\s*\(Copy\)$/i, '') || 'Custom Print',
          quantity: Number(item.quantity).toString(),
          basePriceMoney: {
            amount: BigInt(Math.round((Number(item.pricePerUnit) || 0) * 100)),
            currency: data.currency
          },
          note: `[Contract: Signed] ${Object.entries(item.selectedOptions || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}`
        }))
      }
    });

    return {
      success: true,
      url: response.result.paymentLink?.url
    };
  } catch (error: any) {
    console.error('Full Square API Error:', JSON.stringify(error, error instanceof Error ? Object.getOwnPropertyNames(error) : error, 2));
    if (error.errors) {
      console.error('Square API Errors:', JSON.stringify(error.errors, null, 2));
    }
    logError(error, 'Square Payment Link Creation');
    return {
      success: false,
      error: getFriendlyErrorMessage(error)
    };
  }
}
