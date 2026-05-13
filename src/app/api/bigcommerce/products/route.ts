import { NextResponse } from 'next/server';
import { getBigCommerceProducts } from '@/lib/bigcommerce';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const products = await getBigCommerceProducts(params);
    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('Failed to get products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
