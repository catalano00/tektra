// Centralized confidence scoring utilities
// Modes: 'strict' (penalize missing sections) | 'proportional' (ignore entirely missing sections)
// Each section has requiredKeys used to compute per-row completeness.

export type SectionConfig = {
  requiredKeys: string[];
  // future: weight, optional keys, etc.
};

export type ScoringMode = 'strict' | 'proportional';
export type PanelType = 'roof' | 'floor' | 'wall';

export interface ScoreBreakdown {
  sectionScores: Record<string, number>; // 0-100 per section (present rows)
  missingSections: string[]; // expected but absent
  presentSections: string[]; // present among expected
  overall: number; // 0-100
}

// Shared section schema definition (keep in sync with UI editable configs)
export const PANEL_SECTION_CONFIGS: Record<string, SectionConfig> = {
  RPSheathing: { requiredKeys: ['key_0','key_1','key_2'] },
  RPPartList: { requiredKeys: ['key_0','key_1','key_2','key_3'] },
  FPConnectors: { requiredKeys: ['key_0','key_1','key_2'] },
  FPPartList: { requiredKeys: ['key_0','key_1','key_2','key_3'] },
  FPSheathing: { requiredKeys: ['key_0','key_1','key_2'] },
  WPConnectors: { requiredKeys: ['key_0','key_1'] },
  WPFramingTL: { requiredKeys: ['key_0','key_1','key_2'] },
  WPPartList: { requiredKeys: ['key_0','key_1','key_2','key_3'] },
  WPSheathing: { requiredKeys: ['key_0','key_1','key_2'] },
  timestamps: { requiredKeys: ['key_0','key_1'] },
};

export function detectPanelType(raw: any): PanelType | null {
  const label = (raw?.panellabel || '').toString().toLowerCase();
  const sheet = (raw?.sheettitle || '').toString().toLowerCase();
  const source = label + ' ' + sheet;
  if (/\brp\b|roof/.test(source)) return 'roof';
  if (/\bfp\b|floor/.test(source)) return 'floor';
  if (/\bwp\b|wall/.test(source)) return 'wall';
  return null;
}

const PANEL_TYPE_EXPECTED: Record<PanelType, string[]> = {
  roof: ['RPSheathing','RPPartList','timestamps'],
  floor: ['FPConnectors','FPPartList','FPSheathing','timestamps'],
  wall: ['WPConnectors','WPFramingTL','WPPartList','WPSheathing','timestamps'],
};

export function computeSectionScore(rows: any[], cfg: SectionConfig): number {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  if (!cfg) return 0;
  let total = 0;
  rows.forEach(r => {
    let filled = 0;
    cfg.requiredKeys.forEach(k => {
      const v = r?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') filled++;
    });
    total += filled / cfg.requiredKeys.length;
  });
  return (total / rows.length) * 100;
}

interface OverallOptions {
  mode?: ScoringMode; // strict | proportional
  includeDetailsFieldGroup?: boolean; // default true
  penalizeMissing?: boolean; // if true in proportional mode, still subtract for missing
  panelType?: PanelType; // optional explicit panel type
  expectedSectionsOverride?: string[]; // manual override list (advanced)
}

const DEFAULT_OPTS: Pick<Required<OverallOptions>, 'includeDetailsFieldGroup' | 'penalizeMissing'> = {
  includeDetailsFieldGroup: true,
  penalizeMissing: true,
};

// Compute overall; in strict mode each expected section contributes (score or 0) and missing sections count as 0.
// In proportional mode only present sections are averaged (unless penalizeMissing true, then behave like strict for missing=0 but denominator still all expected?)
export function computeOverallScore(raw: any, mode: ScoringMode = 'proportional', opts: OverallOptions = {}): ScoreBreakdown {
  const { includeDetailsFieldGroup, penalizeMissing, panelType, expectedSectionsOverride } = { ...DEFAULT_OPTS, ...opts };

  // Determine expected sections based on panel type or override; fallback to all
  let expectedSections: string[];
  if (expectedSectionsOverride && expectedSectionsOverride.length) {
    expectedSections = expectedSectionsOverride;
  } else {
    const inferred = panelType || detectPanelType(raw);
    if (inferred && PANEL_TYPE_EXPECTED[inferred]) {
      expectedSections = PANEL_TYPE_EXPECTED[inferred];
    } else {
      // Fallback: all defined sections (original behavior)
      expectedSections = Object.keys(PANEL_SECTION_CONFIGS);
    }
  }

  const sectionScores: Record<string, number> = {};
  const presentSections: string[] = [];
  const missingSections: string[] = [];

  expectedSections.forEach(sec => {
    const cfg = PANEL_SECTION_CONFIGS[sec];
    const rows = raw?.[sec];
    if (Array.isArray(rows) && rows.length) {
      presentSections.push(sec);
      if (cfg) sectionScores[sec] = computeSectionScore(rows, cfg); else sectionScores[sec] = 0;
    } else {
      sectionScores[sec] = 0;
      missingSections.push(sec);
    }
  });

  // Ensure sectionScores has keys for any referenced configs even if not expected (avoid undefined lookups elsewhere)
  Object.keys(PANEL_SECTION_CONFIGS).forEach(sec => { if (sectionScores[sec] === undefined) sectionScores[sec] = 0; });

  // Optional component details pseudo-section
  let detailsScore: number | null = null;
  if (includeDetailsFieldGroup) {
    const detailFields = ['projectnametag','panellabel','sheettitle'];
    const anyPresent = detailFields.some(f => raw?.[f] !== undefined);
    if (anyPresent) {
      const filled = detailFields.filter(f => (raw?.[f]||'').toString().trim() !== '').length;
      detailsScore = (filled / detailFields.length) * 100;
    }
  }

  let overall = 0;
  if (mode === 'strict') {
    // denominator = expected sections (+ details section if used and any present)
    const denomSections = expectedSections.length + (detailsScore !== null ? 1 : 0);
    const sum = expectedSections.reduce((acc, sec) => acc + sectionScores[sec], 0) + (detailsScore !== null ? detailsScore : 0);
    overall = denomSections ? sum / denomSections : 0;
  } else { // proportional
    const contributing: number[] = [];
    presentSections.forEach(sec => contributing.push(sectionScores[sec]));
    if (detailsScore !== null) contributing.push(detailsScore);
    if (penalizeMissing) {
      // treat missing as zeros but do not inflate denominator beyond expected + details if detailsScore !== null
      missingSections.forEach(() => contributing.push(0));
    }
    overall = contributing.length ? (contributing.reduce((a,b) => a + b, 0) / contributing.length) : 0;
  }

  return { sectionScores, missingSections, presentSections, overall };
}

export function badgeColor(score: number) {
  if (score >= 95) return 'bg-emerald-600';
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  if (score > 0) return 'bg-red-500';
  return 'bg-gray-400';
}
