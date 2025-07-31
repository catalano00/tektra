import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    console.log('Received Webhook Payload:', json);

    // Store raw data in the staging table
    await prisma.stagingData.create({
      data: {
        rawData: json,
        status: 'pending', // Initial status
      },
    });

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    const err = error as Error;
    console.error('Webhook error:', err);
    return new NextResponse(JSON.stringify({ received: false, error: err.message }), { status: 500 });
  }
}