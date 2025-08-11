import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data, stagingId } = body; // Also get stagingId to update status

    if (!data || !data.projectnametag) {
      return NextResponse.json({ error: 'Missing projectnametag in request body' }, { status: 400 });
    }

    // Use document_id as the component ID (this should be the unique identifier)
    const componentId = data.document_id || data.id;

    if (!componentId) {
      return NextResponse.json({ error: 'Missing component identifier' }, { status: 400 });
    }

    // First, ensure the project exists
    await prisma.project.upsert({
      where: { projectId: data.projectnametag },
      update: {}, // Don't update existing project
      create: {
        projectId: data.projectnametag,
        currentStatus: 'Active',
        // Client relation is required by your Prisma schema
        Client: {
          connect: { id: data.clientId || 'some-existing-client-id' }
        },
        streetaddress: '',
        city: '',
        state: '', 
        zipcode: 0,
        contractAmount: 0,
        contingency: 0,
        totalContract: 0,
      },
    });

    // Upsert Component Details
    await prisma.component.upsert({
      where: { id: componentId },
      update: {
        componentId: data.panellabel || '',
        componentType: data.sheettitle || '',
        designUrl: data.media_link || '',
        currentStatus: 'Approved', // Set to approved status
        percentComplete: 0,
        projectId: data.projectnametag,
      },
      create: {
        id: componentId,
        componentId: data.panellabel || '',
        componentType: data.sheettitle || '',
        designUrl: data.media_link || '',
        currentStatus: 'Approved',
        percentComplete: 0,
        projectId: data.projectnametag,
      },
    });

    // Handle Assembly Part List - Clear existing parts first
    if (data.assemblypartlist && Array.isArray(data.assemblypartlist)) {
      // Delete existing parts for this component
      await prisma.part.deleteMany({
        where: { componentId: componentId }
      });

      // Create new parts
      for (const part of data.assemblypartlist) {
        if (part.key_0 || part.key_1 || part.key_2 || part.key_3) { // Only create if has data
          await prisma.part.create({
            data: {
              componentId: componentId,
              size: part.key_0 || '',
              label: part.key_1 || '',
              count: parseInt(part.key_2, 10) || 0,
              cutLength: part.key_3 || '',
            },
          });
        }
      }
    }

    // Handle Framing Total Length - Clear existing first due to unique constraint
    if (data.framingtl && Array.isArray(data.framingtl)) {
      // Delete existing framing record for this component
      await prisma.framingTL.deleteMany({
        where: { componentId: componentId }
      });

      // Create new framing record (only one due to unique constraint)
      const validFraming = data.framingtl.find((f: any) => f.key_0 || f.key_1 || f.key_2);
      if (validFraming) {
        await prisma.framingTL.create({
          data: {
            componentId: componentId,
            componentCode: validFraming.componentCode || '',
            ftype: validFraming.key_0 || '',
            totalLength: validFraming.key_1 || '',
            count: parseInt(validFraming.key_2, 10) || 0,
          },
        });
      }
    }

    // Handle Sheathing - Clear existing first due to unique constraint
    if (data.sheathing && Array.isArray(data.sheathing)) {
      // Delete existing sheathing record for this component
      await prisma.sheathing.deleteMany({
        where: { componentId: componentId }
      });

      // Create new sheathing record (only one due to unique constraint)
      const validSheathing = data.sheathing.find((s: any) => s.key_0 || s.key_1 || s.key_2);
      if (validSheathing) {
        await prisma.sheathing.create({
          data: {
            componentId: componentId,
            componentCode: validSheathing.key_0 || '',
            panelArea: validSheathing.key_1 || '',
            count: parseFloat(validSheathing.key_2) || 0,
            description: validSheathing.key_3 || '',
          },
        });
      }
    }

    // Update the staging data status to approved
    if (stagingId) {
      await prisma.stagingData.update({
        where: { id: stagingId },
        data: { status: 'approved' }
      });
    }

    return NextResponse.json({ 
      message: 'Data successfully approved and written to production tables',
      componentId: componentId 
    }, { status: 200 });
  } catch (error) {
    console.error('Error writing to production tables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}