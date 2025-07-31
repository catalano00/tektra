import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    console.log('Processing Data:', json);

    // Validate the incoming payload
    if (!json.document_id || !json.panellabel || !json.sheettitle) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields in payload' }),
        { status: 400 }
      );
    }

    // Store raw data in the staging table
    await prisma.stagingData.create({
      data: {
        rawData: json, // Store the entire JSON payload
        status: 'pending', // Initial status
      },
    });

    return new NextResponse(JSON.stringify({ stored: true }), { status: 200 });
  } catch (error) {
    console.error('Error storing data:', error);
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
    return new NextResponse(JSON.stringify({ stored: false, error: errorMessage }), { status: 500 });
  }
}