import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('Docparser Webhook Data:', data);

    // Extract document ID from the webhook data
    const documentId = data.document_id;

    // Process the data or store the document ID for later retrieval
    // You can now fetch the results from Docparser using the document ID

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse(JSON.stringify({ received: false }), { status: 500 });
  }
}