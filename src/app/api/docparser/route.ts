import { NextRequest } from 'next/server';

async function getDocparserResults(documentId: string) {
  const apiKey = '9eb56d3111a6969146392cc0e9fcfb038569373c'; // <-- Use this key
  const response = await fetch(
    `https://api.docparser.com/v1/results/${documentId}?api_key=${apiKey}`
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Docparser API error:', response.status, errorText);
    throw new Error(errorText || 'Failed to fetch results');
  }
  const data = await response.json();
  return data;
}

// Upload a file to Docparser
async function uploadToDocparser(fileBuffer: Buffer, filename: string, parserId: string) {
  const apiKey = '9eb56d3111a6969146392cc0e9fcfb038569373c';
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), filename);

  const response = await fetch(
    `https://api.docparser.com/v1/document/upload/${parserId}?api_key=${apiKey}`,
    {
      method: 'POST',
      body: formData,
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Docparser upload error:', response.status, errorText);
    throw new Error(errorText || 'Failed to upload file');
  }
  const data = await response.json();
  return data;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get('documentId');
  if (!documentId) {
    return new Response(JSON.stringify({ error: 'Missing documentId' }), { status: 400 });
  }
  try {
    const data = await getDocparserResults(documentId);
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    console.error('API route error:', err);
    // Return the error stack/message for debugging
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500 });
  }
}

// Handle file upload via PUT
export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parserId = searchParams.get('parserId');
  if (!parserId) {
    return new Response(JSON.stringify({ error: 'Missing parserId' }), { status: 400 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response(JSON.stringify({ error: 'Missing file' }), { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await uploadToDocparser(buffer, file.name, parserId);
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    console.error('API upload error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to upload file' }), { status: 500 });
  }
}