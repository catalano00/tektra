import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextAvailableId, suggestSuffix } from '@/lib/idSuffix';
import { getSessionUser } from '@/lib/getSessionUser';

function generateNextSuffix(prev: string): string {
  if (!prev) return 'A';
  // Increment A..Z then AA..ZZ simple
  const chars = prev.split('');
  let i = chars.length - 1;
  while (i >= 0) {
    const code = chars[i].charCodeAt(0);
    if (code < 90) { // 'Z'
      chars[i] = String.fromCharCode(code + 1);
      return chars.join('');
    } else {
      chars[i] = 'A';
      i--;
    }
  }
  return 'A'.repeat(prev.length + 1);
}

export async function POST(req: Request) {
  try {
    const su = await getSessionUser();
    if (!su?.email) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const userEmail = su.email;
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

    const panelPrefixes = ['RP', 'FP', 'WP'] as const;
    type Prefix = typeof panelPrefixes[number];
    const sectionPresence: Record<Prefix, boolean> = {
      RP: !!(data.RPSheathing || data.RPPartList),
      FP: !!(data.FPSheathing || data.FPPartList || data.FPConnectors || data.FPScheduleA || data.FPScheduleB),
      WP: !!(data.WPSheathing || data.WPPartList || data.WPConnectors || data.WPFramingTL || data.WPScheduleA || data.WPScheduleB),
    };

    const createdComponents: any[] = [];

    const basePanelLabel: string = (overrideComponentId?.trim()) || data.panellabel || data.sheettitle || data.document_id || data.id || 'COMP';

    const componentTypeMap: Record<Prefix, string> = { RP: 'Roof Panel', FP: 'Floor Panel', WP: 'Wall Panel' };

    const toInt = (v: any) => { const n = parseInt(String(v),10); return Number.isNaN(n)?0:n; };
    const toFloat = (v: any) => { const n = parseFloat(String(v)); return Number.isNaN(n)?0:n; };

    let usedPanelLogic = false;

    // Preload existing componentIds for suffix uniqueness per project
    const existingAll = await prisma.component.findMany({ where: { projectId: data.projectnametag }, select: { componentId: true } });
    const existingIdsSet = new Set(existingAll.map(c => c.componentId));

    for (const prefix of panelPrefixes) {
      if (!sectionPresence[prefix]) continue;
      usedPanelLogic = true;

      // Special merged schedule logic ONLY for WP right now
      if (prefix === 'WP') {
        const schedA = Array.isArray(data.WPScheduleA) ? data.WPScheduleA : [];
        const schedB = Array.isArray(data.WPScheduleB) ? data.WPScheduleB : [];
        if (schedA.length) {
          // index B rows by Component ID (key_0)
          const bMap = new Map<string, any>();
            schedB.forEach((r: any) => { if (r?.key_0) bMap.set(String(r.key_0).trim(), r); });
          // Validate: any B rows without matching A row -> halt
          const orphanB: string[] = [];
          bMap.forEach((_v, k) => {
            const hasA = schedA.some((ar: any) => String(ar.key_0).trim() === k);
            if (!hasA) orphanB.push(k);
          });
          if (orphanB.length) {
            return NextResponse.json({ error: 'ORPHAN_SCHEDULE_B_ROWS', message: 'Schedule B rows missing corresponding Schedule A rows', componentIds: orphanB }, { status: 400 });
          }
          // Create one component per A row, merge fields from B (weight)
          for (const row of schedA) {
            if (!row || !row.key_0) continue;
            const compBaseId = `${basePanelLabel}-${String(row.key_0).toString().trim()}`;
            let uniqueId = compBaseId;
            // Ensure per-project uniqueness using suffix utility if needed
            let attempt = 0; let suffixSeed = '';
            while (existingIdsSet.has(uniqueId)) {
              suffixSeed = generateNextSuffix(suffixSeed);
              uniqueId = `${compBaseId}-${suffixSeed}`;
              attempt++; if (attempt>100) { uniqueId = `${compBaseId}-${Date.now()}`; break; }
            }
            existingIdsSet.add(uniqueId);

            const b = bMap.get(String(row.key_0).trim());
            const weightVal = b?.key_1 ? parseFloat(b.key_1) : undefined;
            const sqftVal = row.key_3 ? parseFloat(row.key_3) : undefined; // A key_3 is SqFt per requirements

            const component = await prisma.component.create({
              data: {
                componentId: uniqueId,
                projectId: data.projectnametag,
                componentType: componentTypeMap[prefix] || (data.sheettitle || ''),
                designUrl: data.media_link || '',
                currentStatus: 'Submitted',
                percentComplete: 0,
                sequence: row.key_0 ? String(row.key_0) : null,
                Level: row.key_4 ? String(row.key_4) : null, // A key_4 Level per mapping
                maxWidth: row.key_1 ? String(row.key_1) : null, // A key_1 Max Length -> map to maxWidth field (naming legacy)
                maxHeight: row.key_2 ? String(row.key_2) : null, // A key_2 Max Height
                weight: typeof weightVal === 'number' && !Number.isNaN(weightVal) ? weightVal : null,
                componentsqft: typeof sqftVal === 'number' && !Number.isNaN(sqftVal) ? sqftVal : null,
              },
            });
            const compId = component.id;

            // Attach shared section data
            const partRows = Array.isArray(data.WPPartList) ? data.WPPartList : [];
            for (const prow of partRows) {
              if (!prow) continue;
              const size = prow.key_0||''; const label = prow.key_1||''; const count = toInt(prow.key_2); const cutLength = prow.key_3||'';
              if (size || label || cutLength || count) {
                await prisma.part.create({ data: { componentId: compId, size, label, count, cutLength } });
              }
            }
            const connectorsRows = Array.isArray(data.WPConnectors) ? data.WPConnectors : [];
            if (connectorsRows.length) {
              const firstC = connectorsRows.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2));
              if (firstC) {
                await prisma.connectors.create({ data: { componentId: compId, componentCode: firstC.key_0||'', label: firstC.key_0||'', description: firstC.key_1||'', count: toInt(firstC.key_2 || firstC.key_1) } });
              }
            }
            const framingRows = Array.isArray(data.WPFramingTL) ? data.WPFramingTL : [];
            const fr = framingRows.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2));
            if (fr) {
              await prisma.framingTL.create({ data: { componentId: compId, componentCode: fr.componentCode||'', ftype: fr.key_0||'', totalLength: fr.key_1||'', count: toInt(fr.key_2) } });
            }
            const sheathingRows = Array.isArray(data.WPSheathing) ? data.WPSheathing : [];
            const sh = sheathingRows.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2));
            if (sh) {
              await prisma.sheathing.create({ data: { componentId: compId, componentCode: sh.key_0||'', panelArea: sh.key_1||'', count: toFloat(sh.key_2), description: sh.key_3 || sh.key_0 || '' } });
            }
            createdComponents.push({ prefix, componentUUID: compId, componentId: uniqueId });
          }
          continue; // skip generic schedule logic for WP
        }
      }

      // For FP / RP (and WP without schedules) retain existing logic but change status to Submitted and map SqFt if present in scheduleA first row
      const scheduleKeys = prefix === 'WP' ? ['WPScheduleA','WPScheduleB'] : prefix === 'FP' ? ['FPScheduleA','FPScheduleB'] : [];
      let scheduleRows: any[] = [];
      scheduleKeys.forEach(sk => { const rows = Array.isArray((data as any)[sk]) ? (data as any)[sk] : []; rows.forEach((r: any) => scheduleRows.push({ source: sk, row: r })); });
      if (scheduleRows.length) {
        for (const { source, row } of scheduleRows) {
          let desiredId = basePanelLabel; const seq = row?.key_0 || (row as any)?.sequence; if (seq) desiredId = `${basePanelLabel}-${String(seq).toString().trim()}`;
          let finalId = desiredId; let i=1; while (existingIdsSet.has(finalId)) { finalId = `${desiredId}-${i++}`; }
          existingIdsSet.add(finalId);
          const sqftVal = row.key_3 ? parseFloat(row.key_3) : undefined;
          const component = await prisma.component.create({ data: { componentId: finalId, projectId: data.projectnametag, componentType: componentTypeMap[prefix] || (data.sheettitle || ''), designUrl: data.media_link || '', currentStatus: 'Submitted', percentComplete: 0, sequence: row.key_0 ? String(row.key_0) : null, Level: row.key_1 ? String(row.key_1) : null, maxWidth: row.key_2 ? String(row.key_2) : null, maxHeight: row.key_3 ? String(row.key_3) : null, weight: row.key_4 && !isNaN(parseFloat(row.key_4)) ? parseFloat(row.key_4) : null, componentsqft: typeof sqftVal==='number' && !Number.isNaN(sqftVal)? sqftVal: null } });
          const compId = component.id;
          // Attach shared data (same as before)
          const partSectionKey = `${prefix}PartList` as keyof typeof data; const partRows = Array.isArray((data as any)[partSectionKey]) ? (data as any)[partSectionKey] : [];
          for (const prow of partRows) { if (!prow) continue; let size=''; let label=''; let count=0; let cutLength=''; if (prefix === 'WP') { size = prow.key_0||''; label = prow.key_1||''; count = toInt(prow.key_2); cutLength = prow.key_3||''; } else { size = prow.key_0||''; label = prow.key_1||''; cutLength = prow.key_2||''; count = toInt(prow.key_3); } if (size || label || cutLength || count) { await prisma.part.create({ data: { componentId: compId, size, label, count, cutLength } }); } }
          const connectorsKey = `${prefix}Connectors` as keyof typeof data; const connectorsRows = Array.isArray((data as any)[connectorsKey]) ? (data as any)[connectorsKey] : []; if (connectorsRows.length) { const firstC = connectorsRows.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2)); if (firstC) { await prisma.connectors.create({ data: { componentId: compId, componentCode: firstC.key_0||'', label: firstC.key_0||'', description: firstC.key_1||'', count: toInt(firstC.key_2 || firstC.key_1) } }); } }
          if (prefix === 'WP') { const framingRows = Array.isArray((data as any).WPFramingTL) ? (data as any).WPFramingTL : []; const fr = framingRows.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2)); if (fr) { await prisma.framingTL.create({ data: { componentId: compId, componentCode: fr.componentCode||'', ftype: fr.key_0||'', totalLength: fr.key_1||'', count: toInt(fr.key_2) } }); } }
          const sheathingKey = `${prefix}Sheathing` as keyof typeof data; const sheathingRows = Array.isArray((data as any)[sheathingKey]) ? (data as any)[sheathingKey] : []; const sh = sheathingRows.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2)); if (sh) { await prisma.sheathing.create({ data: { componentId: compId, componentCode: sh.key_0||'', panelArea: sh.key_1||'', count: toFloat(sh.key_2), description: sh.key_3 || sh.key_0 || '' } }); }
          createdComponents.push({ prefix, scheduleSource: source, componentUUID: compId, componentId: finalId });
        }
        continue;
      }

      // ORIGINAL single-component path (no schedules)
      const existing = await prisma.component.findFirst({ where: { projectId: data.projectnametag, componentId: basePanelLabel } });
      const component = existing && overwriteProduction ? await prisma.component.update({ where: { id: existing.id }, data: { componentType: componentTypeMap[prefix] || (data.sheettitle || ''), designUrl: data.media_link || '', currentStatus: 'Submitted' } }) : await prisma.component.create({ data: { componentId: basePanelLabel, componentType: componentTypeMap[prefix] || (data.sheettitle || ''), designUrl: data.media_link || '', currentStatus: 'Submitted', percentComplete: 0, projectId: data.projectnametag } });
      const compId = component.id;
      const scheduleKeysSingle = prefix === 'WP' ? ['WPScheduleA','WPScheduleB'] : prefix === 'FP' ? ['FPScheduleA','FPScheduleB'] : [];
      for (const sk of scheduleKeysSingle) { const rows = Array.isArray((data as any)[sk]) ? (data as any)[sk] : []; if (rows.length) { const first = rows[0]; const updateData: any = {}; if (first.key_0) updateData.sequence = String(first.key_0); if (first.key_1) updateData.Level = String(first.key_1); if (first.key_2) updateData.maxWidth = String(first.key_2); if (first.key_3) { updateData.maxHeight = String(first.key_3); const sqft = parseFloat(first.key_3); if (!Number.isNaN(sqft)) updateData.componentsqft = sqft; } if (first.key_4) { const w = parseFloat(first.key_4); if (!Number.isNaN(w)) updateData.weight = w; else updateData.weight = String(first.key_4); } if (Object.keys(updateData).length) { await prisma.component.update({ where: { id: compId }, data: updateData }); } break; } }
      // clear and reattach related rows if overwriting
      if (existing && overwriteProduction) { await prisma.part.deleteMany({ where: { componentId: compId } }); await prisma.connectors.deleteMany({ where: { componentId: compId } }); await prisma.sheathing.deleteMany({ where: { componentId: compId } }); await prisma.framingTL.deleteMany({ where: { componentId: compId } }); }
      const partSectionKey = `${prefix}PartList` as keyof typeof data; const partRows2 = Array.isArray((data as any)[partSectionKey]) ? (data as any)[partSectionKey] : []; for (const row of partRows2) { if (!row) continue; let size=''; let label=''; let count=0; let cutLength=''; if (prefix === 'WP') { size = row.key_0||''; label = row.key_1||''; count = toInt(row.key_2); cutLength = row.key_3||''; } else { size = row.key_0||''; label = row.key_1||''; cutLength = row.key_2||''; count = toInt(row.key_3); } if (size || label || cutLength || count) { await prisma.part.create({ data: { componentId: compId, size, label, count, cutLength } }); } }
      const connectorsKey2 = `${prefix}Connectors` as keyof typeof data; const connectorsRows2 = Array.isArray((data as any)[connectorsKey2]) ? (data as any)[connectorsKey2] : []; if (connectorsRows2.length) { const first2 = connectorsRows2.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2)); if (first2) { await prisma.connectors.create({ data: { componentId: compId, componentCode: first2.key_0||'', label: first2.key_0||'', description: first2.key_1||'', count: toInt(first2.key_2 || first2.key_1) } }); } }
      if (prefix === 'WP') { const framingRows2 = Array.isArray((data as any).WPFramingTL) ? (data as any).WPFramingTL : []; const fr2 = framingRows2.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2)); if (fr2) { await prisma.framingTL.create({ data: { componentId: compId, componentCode: fr2.componentCode||'', ftype: fr2.key_0||'', totalLength: fr2.key_1||'', count: toInt(fr2.key_2) } }); } }
      const sheathingKey2 = `${prefix}Sheathing` as keyof typeof data; const sheathingRows2 = Array.isArray((data as any)[sheathingKey2]) ? (data as any)[sheathingKey2] : []; const sh2 = sheathingRows2.find((r: any) => r && (r.key_0 || r.key_1 || r.key_2)); if (sh2) { await prisma.sheathing.create({ data: { componentId: compId, componentCode: sh2.key_0||'', panelArea: sh2.key_1||'', count: toFloat(sh2.key_2), description: sh2.key_3 || sh2.key_0 || '' } }); }
      createdComponents.push({ prefix, componentUUID: compId });
    }

    if (!usedPanelLogic) {
      const legacyComponentId = data.document_id || data.id;
      if (!legacyComponentId) {
        return NextResponse.json({ error: 'Missing component identifier' }, { status: 400 });
      }
      const component = await prisma.component.upsert({ where: { id: legacyComponentId }, update: { componentId: basePanelLabel, componentType: data.sheettitle || '', designUrl: data.media_link || '', currentStatus: 'Submitted', percentComplete: 0, projectId: data.projectnametag }, create: { id: legacyComponentId, componentId: basePanelLabel, componentType: data.sheettitle || '', designUrl: data.media_link || '', currentStatus: 'Submitted', percentComplete: 0, projectId: data.projectnametag } });
      const compId = component.id;
      if (data.assemblypartlist && Array.isArray(data.assemblypartlist)) { await prisma.part.deleteMany({ where: { componentId: compId } }); for (const part of data.assemblypartlist) { if (part.key_0 || part.key_1 || part.key_2 || part.key_3) { await prisma.part.create({ data: { componentId: compId, size: part.key_0 || '', label: part.key_1 || '', count: toInt(part.key_2), cutLength: part.key_3 || '' } }); } } }
      if (data.framingtl && Array.isArray(data.framingtl)) { await prisma.framingTL.deleteMany({ where: { componentId: compId } }); const validFraming = data.framingtl.find((f: any) => f.key_0 || f.key_1 || f.key_2); if (validFraming) { await prisma.framingTL.create({ data: { componentId: compId, componentCode: validFraming.componentCode || '', ftype: validFraming.key_0 || '', totalLength: validFraming.key_1 || '', count: toInt(validFraming.key_2) } }); } }
      if (data.sheathing && Array.isArray(data.sheathing)) { await prisma.sheathing.deleteMany({ where: { componentId: compId } }); const validSheathing = data.sheathing.find((s: any) => s.key_0 || s.key_1 || s.key_2); if (validSheathing) { await prisma.sheathing.create({ data: { componentId: compId, componentCode: validSheathing.key_0 || '', panelArea: validSheathing.key_1 || '', count: toFloat(validSheathing.key_2), description: validSheathing.key_3 || '' } }); } }
      createdComponents.push({ legacy: true, componentUUID: compId });
    }

    if (dryRun) { return NextResponse.json({ message: 'DRY_RUN_OK', componentId: basePanelLabel, createdComponents }); }
    if (stagingId) {
      // Audit fields (cast to any in case Prisma client types not yet refreshed in editor)
      await prisma.stagingData.update({
        where: { id: stagingId },
        data: { status: 'approved', approvedAt: new Date(), approvedBy: userEmail } as any,
      });
    }
    return NextResponse.json({ message: 'Data successfully approved and written to production tables', createdComponents, componentId: basePanelLabel });
  } catch (error) {
    console.error('Error writing to production tables:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}