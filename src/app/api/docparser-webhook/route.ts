import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('Docparser Webhook Data:', data);

    const documentId = data.document_id;

    if (!documentId) {
      console.error('Missing document_id in webhook payload');
      return new NextResponse(JSON.stringify({ error: 'Missing document_id' }), { status: 400 });
    }

    // Fetch parsed results from Docparser
    const apiKey = 'YOUR_DOCPARSER_API_KEY'; // Replace with your actual API key
    const response = await fetch(`https://api.docparser.com/v1/results/${documentId}?api_key=${apiKey}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching Docparser results:', errorText);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch results' }), { status: 500 });
    }

    const parsedResults = await response.json();
    console.log('Parsed Results:', parsedResults);

    return new NextResponse(JSON.stringify({ received: true, results: parsedResults }), { status: 200 });
  } catch (error) {
    // Explicitly cast error to Error type
    const err = error as Error;
    console.error('Webhook error:', err);
    return new NextResponse(JSON.stringify({ received: false, error: err.message }), { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return new NextResponse(JSON.stringify({ error: 'Missing documentId' }), { status: 400 });
  }

  try {
    const apiKey = 'YOUR_DOCPARSER_API_KEY'; // Replace with your actual API key
    const response = await fetch(`https://api.docparser.com/v1/results/${documentId}?api_key=${apiKey}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching Docparser results:', errorText);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch results' }), { status: 500 });
    }

    const parsedResults = await response.json();
    return new NextResponse(JSON.stringify({ results: parsedResults }), { status: 200 });
  } catch (error) {
    // Explicitly cast error to Error type
    const err = error as Error;
    console.error('Error fetching results:', err);
    return new NextResponse(JSON.stringify({ error: err.message }), { status: 500 });
  }
}