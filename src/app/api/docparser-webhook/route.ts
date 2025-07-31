import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Example using Prisma ORM

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    console.log('Docparser Webhook Data:', json);

    // Insert into Component table
    await prisma.component.create({
      data: {
        id: json.document_id,
        componentId: json.panellabel, // Added missing comma here
        componentType: json.sheettitle,
        currentStatus: 'processed',
        designUrl: json.media_link,
        createdAt: new Date(json.uploaded_at),
        updatedAt: new Date(json.processed_at),
        percentComplete: 0, // or set to a value from json if available
        Project: {
          connect: { projectId: json.project_id }, // replace 'projectId' with your actual unique field name if different
        },
      },
    });

    // Insert into Part table
    for (const part of json.assemblypartlist) {
      await prisma.part.create({
        data: {
          componentId: json.document_id,
          size: part.key_0,
          label: part.key_1,
          count: parseInt(part.key_2, 10),
          cutLength: part.key_3,
        },
      });
    }

    // Insert into FramingTL table
    for (const framing of json.framingtl) {
      await prisma.framingTL.create({
        data: {
          componentId: json.document_id,
          ftype: framing.key_0,
          totalLength: framing.key_1,
          count: parseInt(framing.key_2, 10),
          componentCode: framing.componentCode ?? '', // Provide appropriate value or fallback
          component: framing.component ?? '', // Provide appropriate value or fallback
        },
      });
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    const err = error as Error;
    console.error('Webhook error:', err);
    return new NextResponse(JSON.stringify({ received: false, error: err.message }), { status: 500 });
  }
}