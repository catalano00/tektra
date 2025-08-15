// Duplicate detection & resolution helpers
import { prisma } from './prisma';

export interface DuplicateSummary {
  projectId: string;
  componentId: string;
  stagingIds: string[]; // all stagingData rows sharing (project, componentId)
  productionExists: boolean;
}

// Build a map of duplicates from a set of stagingData records (raw rows already fetched)
export function analyzeStagingDuplicates(rows: Array<{ id: string; rawData: any }>): Record<string, DuplicateSummary> {
  const map: Record<string, DuplicateSummary> = {};
  for (const r of rows) {
    const projectId = r.rawData?.projectnametag;
    const componentId = r.rawData?.panellabel;
    if (!projectId || !componentId) continue;
    const key = projectId + '|' + componentId;
    if (!map[key]) {
      map[key] = { projectId, componentId, stagingIds: [], productionExists: false };
    }
    map[key].stagingIds.push(r.id);
  }
  return map;
}

export async function markProductionConflicts(dups: Record<string, DuplicateSummary>) {
  const entries = Object.values(dups);
  if (!entries.length) return dups;
  const projects = Array.from(new Set(entries.map(e => e.projectId)));
  // fetch production components for those projects
  const comps = await prisma.component.findMany({ where: { projectId: { in: projects } }, select: { projectId: true, componentId: true } });
  const prodSet = new Set(comps.map(c => c.projectId + '|' + c.componentId));
  entries.forEach(e => { if (prodSet.has(e.projectId + '|' + e.componentId)) e.productionExists = true; });
  return dups;
}

export interface ComparisonPayload {
  staging: any; // staging rawData
  production?: any; // production component & related (if exists)
  otherStaging: Array<{ id: string; createdAt: string, rawData: any }>; // other staging duplicates minimal info
}

// Fetch comparison data for a given staging record id
export async function buildComparison(stagingId: string): Promise<ComparisonPayload | null> {
  const staging = await prisma.stagingData.findUnique({ where: { id: stagingId } });
  if (!staging) return null;
  const projectId = (staging as any).rawData?.projectnametag;
  const componentId = (staging as any).rawData?.panellabel;
  if (!projectId || !componentId) return { staging: staging.rawData, production: undefined, otherStaging: [] };
  const prod = await prisma.component.findFirst({ where: { projectId, componentId }, include: { part: true, connectors: true, sheathing: true, framingTL: true } });
  // Fetch other staging records for same (project, componentId) including rawData
  const others = await prisma.stagingData.findMany({ where: { id: { not: stagingId } } });
  const otherFiltered = others
    .filter(o => (o as any).rawData?.projectnametag === projectId && (o as any).rawData?.panellabel === componentId)
    .map(o => ({ id: o.id, createdAt: o.createdAt.toISOString(), rawData: o.rawData }));
  return { staging: staging.rawData, production: prod, otherStaging: otherFiltered };
}
