import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data, stagingId, overrideComponentId, overwriteProduction = false, dryRun = false } = body; // extended inputs

    if (!data || !data.projectnametag) {
      return NextResponse.json({ error: 'Missing projectnametag in request body' }, { status: 400 });
    }

    // Ensure project exists
    await prisma.project.upsert({
      where: { projectId: data.projectnametag },
      update: {},
      create: {
        projectId: data.projectnametag,
        currentStatus: 'Active',
        Client: { connect: { id: data.clientId || 'some-existing-client-id' } },
        streetaddress: '',
        city: '',
        state: '',
        zipcode: 0,
        contractAmount: 0,
        contingency: 0,
        totalContract: 0,
      },
    });

    // New panel-based section handling
    const panelPrefixes = ['RP', 'FP', 'WP'] as const;
    type Prefix = typeof panelPrefixes[number];
    const sectionPresence: Record<Prefix, boolean> = {
      RP: !!(data.RPSheathing || data.RPPartList),
      FP: !!(data.FPSheathing || data.FPPartList || data.FPConnectors),
      WP: !!(data.WPSheathing || data.WPPartList || data.WPConnectors || data.WPFramingTL),
    };

    const createdComponents: any[] = [];

    const basePanelLabel: string = (overrideComponentId?.trim()) || data.panellabel || data.sheettitle || data.document_id || data.id || 'COMP';
    // Before creating any components, enforce per‑project uniqueness of componentId
    const existing = await prisma.component.findFirst({ where: { projectId: data.projectnametag, componentId: basePanelLabel } });
    if (existing) {
      if (!overwriteProduction) {
        return NextResponse.json({ error: 'DUPLICATE_COMPONENT', projectId: data.projectnametag, componentId: basePanelLabel }, { status: 409 });
      }
    }

    const componentTypeMap: Record<Prefix, string> = {
      RP: 'Roof Panel',
      FP: 'Floor Panel',
      WP: 'Wall Panel',
    };

    // Helper to safely parse int/float
    const toInt = (v: any) => {
      const n = parseInt(String(v), 10);
      return Number.isNaN(n) ? 0 : n;
    };
    const toFloat = (v: any) => {
      const n = parseFloat(String(v));
      return Number.isNaN(n) ? 0 : n;
    };

    // Indicates whether we used new panel logic
    let usedPanelLogic = false;

    for (const prefix of panelPrefixes) {
      if (!sectionPresence[prefix]) continue;
      usedPanelLogic = true;

      // Create a component first to obtain UUID
      const component = existing && overwriteProduction ? await prisma.component.update({
        where: { id: existing.id },
        data: {
          componentType: componentTypeMap[prefix] || (data.sheettitle || ''),
          designUrl: data.media_link || '',
          currentStatus: 'Approved',
        },
      }) : await prisma.component.create({
        data: {
          componentId: basePanelLabel,
          componentType: componentTypeMap[prefix] || (data.sheettitle || ''),
          designUrl: data.media_link || '',
          currentStatus: 'Approved',
          percentComplete: 0,
          projectId: data.projectnametag,
        },
      });

      const compId = component.id; // UUID primary key

      // if overwriteProduction, clear related rows before re-inserting
      if (existing && overwriteProduction) {
        await prisma.part.deleteMany({ where: { componentId: compId } });
        await prisma.connectors.deleteMany({ where: { componentId: compId } });
        await prisma.sheathing.deleteMany({ where: { componentId: compId } });
        await prisma.framingTL.deleteMany({ where: { componentId: compId } });
      }

      // PART LISTS
      const partSectionKey = `${prefix}PartList` as keyof typeof data;
      const partRows = Array.isArray((data as any)[partSectionKey]) ? (data as any)[partSectionKey] : [];
      for (const row of partRows) {
        if (!row) continue;
        // Section-specific ordering differences
        let size = ''; let label = ''; let count = 0; let cutLength = '';
        if (prefix === 'WP') { // WPPartList: size, label, count, cut length
          size = row.key_0 || '';
          label = row.key_1 || '';
          count = toInt(row.key_2);
          cutLength = row.key_3 || '';
        } else { // RP / FP PartLists: type(size), label, cut length, count
          size = row.key_0 || '';
          label = row.key_1 || '';
          cutLength = row.key_2 || '';
          count = toInt(row.key_3);
        }
        if (size || label || cutLength || count) {
          await prisma.part.create({
            data: { componentId: compId, size, label, count, cutLength },
          });
        }
      }

      // CONNECTORS
      const connectorsKey = `${prefix}Connectors` as keyof typeof data;
      const connectorsRows = Array.isArray((data as any)[connectorsKey]) ? (data as any)[connectorsKey] : [];
      if (connectorsRows.length) {
        const first = connectorsRows.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2));
        if (first) {
          await prisma.connectors.create({
            data: {
              componentId: compId,
              componentCode: first.key_0 || '', // treat label as code
              label: first.key_0 || '',
              description: first.key_1 || '',
              count: toInt(first.key_2 || first.key_1), // WPConnectors may only have label+count (key_0, key_1)
            },
          });
        }
      }

      // FRAMING TOTAL LENGTH (only expected for WP currently)
      if (prefix === 'WP') {
        const framingRows = Array.isArray((data as any).WPFramingTL) ? (data as any).WPFramingTL : [];
        const fr = framingRows.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2));
        if (fr) {
          await prisma.framingTL.create({
            data: {
              componentId: compId,
              componentCode: fr.componentCode || '',
              ftype: fr.key_0 || '',
              totalLength: fr.key_1 || '',
              count: toInt(fr.key_2),
            },
          });
        }
      }

      // SHEATHING
      const sheathingKey = `${prefix}Sheathing` as keyof typeof data;
      const sheathingRows = Array.isArray((data as any)[sheathingKey]) ? (data as any)[sheathingKey] : [];
      const sh = sheathingRows.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2));
      if (sh) {
        await prisma.sheathing.create({
          data: {
            componentId: compId,
            componentCode: sh.key_0 || '',
            panelArea: sh.key_1 || '',
            count: toFloat(sh.key_2),
            description: sh.key_3 || sh.key_0 || '',
          },
        });
      }

      createdComponents.push({ prefix, componentUUID: compId });
    }

    // Legacy fallback if no new panel sections detected
    if (!usedPanelLogic) {
      const legacyComponentId = data.document_id || data.id;
      if (!legacyComponentId) {
        return NextResponse.json({ error: 'Missing component identifier' }, { status: 400 });
      }

      const component = await prisma.component.upsert({
        where: { id: legacyComponentId },
        update: {
          componentId: basePanelLabel,
          componentType: data.sheettitle || '',
          designUrl: data.media_link || '',
          currentStatus: 'Approved',
          percentComplete: 0,
          projectId: data.projectnametag,
        },
        create: {
          id: legacyComponentId,
          componentId: basePanelLabel,
          componentType: data.sheettitle || '',
          designUrl: data.media_link || '',
          currentStatus: 'Approved',
          percentComplete: 0,
          projectId: data.projectnametag,
        },
      });

      const compId = component.id;

      if (data.assemblypartlist && Array.isArray(data.assemblypartlist)) {
        await prisma.part.deleteMany({ where: { componentId: compId } });
        for (const part of data.assemblypartlist) {
          if (part.key_0 || part.key_1 || part.key_2 || part.key_3) {
            await prisma.part.create({
              data: {
                componentId: compId,
                size: part.key_0 || '',
                label: part.key_1 || '',
                count: toInt(part.key_2),
                cutLength: part.key_3 || '',
              },
            });
          }
        }
      }

      if (data.framingtl && Array.isArray(data.framingtl)) {
        await prisma.framingTL.deleteMany({ where: { componentId: compId } });
        const validFraming = data.framingtl.find((f: any) => f.key_0 || f.key_1 || f.key_2);
        if (validFraming) {
          await prisma.framingTL.create({
            data: {
              componentId: compId,
              componentCode: validFraming.componentCode || '',
              ftype: validFraming.key_0 || '',
              totalLength: validFraming.key_1 || '',
              count: toInt(validFraming.key_2),
            },
          });
        }
      }

      if (data.sheathing && Array.isArray(data.sheathing)) {
        await prisma.sheathing.deleteMany({ where: { componentId: compId } });
        const validSheathing = data.sheathing.find((s: any) => s.key_0 || s.key_1 || s.key_2);
        if (validSheathing) {
          await prisma.sheathing.create({
            data: {
              componentId: compId,
              componentCode: validSheathing.key_0 || '',
              panelArea: validSheathing.key_1 || '',
              count: toFloat(validSheathing.key_2),
              description: validSheathing.key_3 || '',
            },
          });
        }
      }

      createdComponents.push({ legacy: true, componentUUID: compId });
    }

    if (dryRun) {
      return NextResponse.json({ message: 'DRY_RUN_OK', componentId: basePanelLabel, createdComponents });
    }

    // Update staging data status
    if (stagingId) {
      await prisma.stagingData.update({ where: { id: stagingId }, data: { status: 'approved' } });
    }

    return NextResponse.json({
      message: 'Data successfully approved and written to production tables',
      createdComponents,
      componentId: basePanelLabel,
    });
  } catch (error) {
    console.error('Error writing to production tables:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}