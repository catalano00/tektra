import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }

    const blob = await response.blob();
    const headers = new Headers({
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
    });

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Error fetching file:', error);
    return new NextResponse('Failed to fetch file', { status: 500 });
  }
}