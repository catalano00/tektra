import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data } = body;

    if (!data || !data.projectnametag) {
      return NextResponse.json({ error: 'Missing projectnametag in request body' }, { status: 400 });
    }

    const componentId = data.id; // Map `doc_parser_id` from JSON to `id` in Component table

    // Upsert Component Details
    if (!componentId) {
      console.warn(`Skipping component due to missing id`);
    } else {
      await prisma.component.upsert({
        where: { id: componentId },
        update: {
          componentId: data.panellabel,
          componentType: data.sheettitle,
          designUrl: data.media_link,
          currentStatus: data.currentStatus ?? 'Scheduling',
          percentComplete: data.percentComplete ?? 0,
          Project: {
            connect: { projectId: data.projectnametag },
          },
        },
        create: {
          id: componentId,
          componentId: data.panellabel,
          componentType: data.sheettitle,
          designUrl: data.media_link,
          currentStatus: data.currentStatus ?? '',
          percentComplete: data.percentComplete ?? 0,
          Project: {
            connect: { projectId: data.projectnametag },
          },
        },
      });
    }

    // Handle Assembly Part List
    for (const part of data.assemblypartlist) {
      if (!part.id) {
        // Perform create operation if `id` is missing
        await prisma.part.create({
          data: {
            componentId: componentId, // Link to Component table
            size: part.key_0,
            label: part.key_1,
            count: parseInt(part.key_2, 10), // Ensure `count` is an integer
            cutLength: part.key_3,
          },
        });
      } else {
        // Perform upsert operation if `id` is present
        await prisma.part.upsert({
          where: { id: part.id },
          update: {
            componentId: componentId, // Link to Component table
            size: part.key_0,
            label: part.key_1,
            count: parseInt(part.key_2, 10), // Ensure `count` is an integer
            cutLength: part.key_3,
          },
          create: {
            id: part.id, // Use provided `id`
            componentId: componentId, // Link to Component table
            size: part.key_0,
            label: part.key_1,
            count: parseInt(part.key_2, 10), // Ensure `count` is an integer
            cutLength: part.key_3,
          },
        });
      }
    }

    // Upsert Framing Total Length
    for (const framing of data.framingtl) {
      if (!framing.id) {
        // Perform create operation if `id` is missing
        await prisma.framingTL.create({
          data: {
            componentId: componentId,
            ftype: framing.key_0,
            totalLength: framing.key_1,
            count: framing.key_2,
            componentCode: framing.componentCode ?? '',
            component: framing.component ?? '',
          },
        });
      } else {
        // Perform upsert operation if `id` is present
        await prisma.framingTL.upsert({
          where: { id: framing.id },
          update: {
            componentId: componentId,
            ftype: framing.key_0,
            totalLength: framing.key_1,
            count: framing.key_2,
            componentCode: framing.componentCode ?? '',
            component: framing.component ?? '',
          },
          create: {
            id: framing.id,
            componentId: componentId,
            ftype: framing.key_0,
            totalLength: framing.key_1,
            count: framing.key_2,
            componentCode: framing.componentCode ?? '',
            component: framing.component ?? '',
          },
        });
      }
    }

    return NextResponse.json({ message: 'Data successfully written to production tables' }, { status: 200 });
  } catch (error) {
    console.error('Error writing to production tables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}