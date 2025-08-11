// --- FILE: src/components/pdf/brochure.tsx (patched) ---
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// --- Types ---
type Brand = {
  company?: string;
  tagline?: string;
  logoPng?: string; // e.g. '/brand/tektra-logo.png' in /public
  primary?: string;   // deep brand color (cover band, headings)
  secondary?: string; // page accents (lines)
  accent?: string;    // highlight (KPIs, deltas)
  ink?: string;       // body text
  muted?: string;     // muted text
  contact?: { name?: string; email?: string; phone?: string; web?: string };
};

export type YearTotals = { year: number; devValue: number; sales: number; fee: number; carry: number; completions: number };
export type PlanTotals = { stick: YearTotals[]; tektra: YearTotals[]; delta: YearTotals[] };

export type Assets = {
  heroPng?: string | null;
  gallery?: string[]; // other brand/process/product imagery
  chartYear1Png?: string | null;
  chartAnnualPng?: string | null;
};

export type BrochureKPIs = { addCompletions: number; dev: number; fee: number; sales: number; carry: number; total: number };

export type Variant = 'brochure' | 'sellSheet' | 'investor';

// --- Styles ---
const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 42, paddingHorizontal: 42, fontSize: 10, fontFamily: 'Helvetica' },
  coverBand: { height: 60, marginBottom: 18, borderRadius: 8 },
  row: { flexDirection: 'row' },
  col: { flexDirection: 'column' },
  h1: { fontSize: 22, marginBottom: 6 },
  h2: { fontSize: 14, marginTop: 12, marginBottom: 6 },
  h3: { fontSize: 11, marginTop: 8, marginBottom: 4 },
  small: { fontSize: 9 },
  tiny: { fontSize: 8 },
  kpiCard: { borderWidth: 1, borderRadius: 6, padding: 8, marginRight: 10, marginBottom: 10 },
  table: { display: 'flex', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0, borderRadius: 6 },
  tr: { flexDirection: 'row' },
  th: { fontSize: 10, fontWeight: 700, padding: 6, borderRightWidth: 1, borderBottomWidth: 1 },
  td: { padding: 6, borderRightWidth: 1, borderBottomWidth: 1, fontSize: 10 },
  bullet: { marginBottom: 3 },
  divider: { height: 1, marginVertical: 10 },
  footer: { position: 'absolute', bottom: 24, left: 42, right: 42, fontSize: 9, textAlign: 'center' },
});

// --- Helpers ---
function money(n: number) {
  return isFinite(n as number)
    ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '-';
}

function formatAbbreviatedUSD(n: number) {
  if (!isFinite(n)) return '-';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return money(n);
}

function safe<T>(v: T | undefined, fallback: T): T { return (v as any) ?? fallback; }

// --- Copy blocks (data-driven) ---
function executiveNarrative(inputs: any) {
  const stick = safe(inputs?.stickDurationMonths, '10');
  const tektra = safe(inputs?.tektraDurationMonths, '6');
  const cap = safe(inputs?.wipCapHomes, '—');
  return (
    `By compressing cycle times from ${stick} to ${tektra} months, ${safe(inputs?.brandName, 'TEKTRA')} lets you start phases sooner and close more homes within a rolling 12-month window—without increasing your max concurrent homes (${cap}). The result is accelerated revenue recognition, earlier sales cash, and lower carry drag.`
  );
}

function modelingLine(inputs: any) {
  const phase = safe(inputs?.phaseSize, '—');
  const cadence = safe(inputs?.stickPhaseInterval, '—');
  const cap = safe(inputs?.wipCapHomes, '—');
  const stickDur = safe(inputs?.stickDurationMonths, '—');
  const tektraDur = safe(inputs?.tektraDurationMonths, '—');
  return (
    `We used your phased-start pattern: start ${phase} homes every ${cadence} months (stick), constrained to a max of ${cap} concurrent homes. ${safe(inputs?.brandName, 'TEKTRA')}'s shorter cycle (${tektraDur} vs ${stickDur} months) brings the next phase forward via a calculated cadence while holding the same WIP cap.`
  );
}

// --- Theme builder ---
function buildTheme(brand: Brand) {
  return {
    primary: brand.primary ?? '#0B1220',     // deep charcoal-navy
    secondary: brand.secondary ?? '#1F2B3A', // inkier accent
    accent: brand.accent ?? '#C6A667',       // warm luxe gold
    ink: brand.ink ?? '#0F172A',             // headline ink
    muted: brand.muted ?? '#6B7280',         // slate
    line: '#E5E7EB',
    card: '#F8FAFC',
  } as const;
}

// --- Small utilities for gallery ---
function chunk<T>(arr: T[] = [], size = 3): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < (arr?.length ?? 0); i += size) out.push(arr.slice(i, i + size));
  return out;
}

// --- Section primitives ---
function KPIGrid({ theme, kpis }: { theme: ReturnType<typeof buildTheme>; kpis: BrochureKPIs }) {
  return (
    <View style={[styles.row, { marginBottom: 12 }]}>      
      <View style={[styles.kpiCard, { borderColor: theme.line, backgroundColor: theme.card, flex: 1 }]}>        
        <Text style={{ color: theme.muted }}>Additional Completions (Year-1)</Text>
        <Text style={{ fontSize: 22, color: theme.accent }}>{safe(kpis?.addCompletions, 0)}</Text>
      </View>
      <View style={[styles.kpiCard, { borderColor: theme.line, flex: 1 }]}>        
        <Text style={{ color: theme.muted }}>Total Year-1 Opportunity</Text>
        <Text style={{ fontSize: 22 }}>{money(safe(kpis?.total, 0))}</Text>
      </View>
      <View style={[styles.kpiCard, { borderColor: theme.line, flex: 1 }]}>        
        <Text style={{ color: theme.muted }}>Δ Development Value</Text>
        <Text>{money(safe(kpis?.dev, 0))}</Text>
      </View>
      <View style={[styles.kpiCard, { borderColor: theme.line, flex: 1 }]}>        
        <Text style={{ color: theme.muted }}>Δ Fee Profit</Text>
        <Text>{money(safe(kpis?.fee, 0))}</Text>
      </View>
    </View>
  );
}

function SecondaryKPIGrid({ theme, kpis }: { theme: ReturnType<typeof buildTheme>; kpis: BrochureKPIs }) {
  return (
    <View style={[styles.row, { marginBottom: 16 }]}>      
      <View style={[styles.kpiCard, { borderColor: theme.line, flex: 1 }]}>        
        <Text style={{ color: theme.muted }}>Δ Sales @ Close</Text>
        <Text>{money(safe(kpis?.sales, 0))}</Text>
      </View>
      <View style={[styles.kpiCard, { borderColor: theme.line, flex: 1 }]}>        
        <Text style={{ color: theme.muted }}>Carry Savings</Text>
        <Text style={{ color: theme.accent }}>{money(safe(kpis?.carry, 0))}</Text>
      </View>
    </View>
  );
}

// --- Pages ---
function CoverPage({ brand, theme, assets, kpis, inputs }: any) {
  const company = brand.company ?? 'TEKTRA';
  const tagline = brand.tagline ?? 'Precision-built. Faster cycles. Better returns.';
  const today = new Date().toLocaleDateString();

  return (
    <Page size="A4" style={[styles.page, { color: theme.ink }]}>      
      <View style={[styles.coverBand, { backgroundColor: theme.primary }]} />

      <View style={[styles.row, { alignItems: 'center', marginBottom: 14 }]}>        
        {brand.logoPng ? (
          <Image src={brand.logoPng} style={{ width: 96, height: 24, marginRight: 10 }} />
        ) : (
          <Text style={{ fontSize: 16, color: theme.secondary, marginRight: 10 }}>{company}</Text>
        )}
        <Text style={{ color: theme.muted }}>Prepared {today}</Text>
      </View>

      <Text style={[styles.h1, { color: theme.ink }]}>{company} Value Brochure</Text>
      <Text style={{ color: theme.muted, marginBottom: 12 }}>{tagline}</Text>

      {/* Optional hero */}
      {assets?.heroPng && (
        <Image src={assets.heroPng} style={{ width: '100%', height: 140, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: theme.line }} />
      )}

      <KPIGrid theme={theme} kpis={kpis} />

      <View style={[styles.row, { marginBottom: 10 }]}>        
        <View style={{ flex: 2, paddingLeft: 6 }}>
          <Text style={[styles.h3, { color: theme.secondary }]}>Executive Narrative</Text>
          <Text style={{ color: theme.ink }}>{executiveNarrative(inputs)}</Text>
        </View>
      </View>

      {assets?.chartYear1Png && (
        <>
          <Text style={[styles.h2, { color: theme.secondary }]}>Year-1 Results (Dev Value + Sales)</Text>
          <Image src={assets.chartYear1Png} style={{ width: '100%', height: 220, borderRadius: 6, borderWidth: 1, borderColor: theme.line }} />
        </>
      )}

      <Text style={[styles.footer, { color: theme.muted }]}>{company} • Off-Site Manufacturing Advantage</Text>
    </Page>
  );
}

function WhyPage({ theme, inputs, brand }: any) {
  const company = brand.company ?? 'TEKTRA';
  return (
    <Page size="A4" style={[styles.page, { color: theme.ink }]}>      
      <Text style={[styles.h1, { color: theme.ink }]}>Why {company} for Luxury Residential</Text>

      <View style={{ marginTop: 4, marginBottom: 8 }}>
        <Text style={styles.bullet}>• <Text style={{ fontWeight: 700 }}>Time Advantage:</Text> Factory-precision panels and parallelized workflows cut months off site cycles.</Text>
        <Text style={styles.bullet}>• <Text style={{ fontWeight: 700 }}>Quality & Consistency:</Text> Controlled conditions reduce rework and punchlists—premium finishes, repeatable outcomes.</Text>
        <Text style={styles.bullet}>• <Text style={{ fontWeight: 700 }}>Predictability:</Text> Tighter schedules and fewer weather delays de-risk capital plans and sales timelines.</Text>
        <Text style={styles.bullet}>• <Text style={{ fontWeight: 700 }}>Carry & Cash:</Text> Faster completions reduce interest and overhead drag while pulling sales cash forward.</Text>
        <Text style={styles.bullet}>• <Text style={{ fontWeight: 700 }}>Sustainability:</Text> Less waste and fewer site deliveries improve both ESG and neighborhood impact.</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.line }]} />

      <Text style={[styles.h2, { color: theme.secondary }]}>How This Proposal Was Modeled</Text>
      <Text style={{ marginBottom: 6 }}>{modelingLine(inputs)}</Text>
      <Text style={styles.small}>Dev value is recognized straight-line while active; sales book at completion; carry accrues only while active.</Text>

      <Text style={[styles.h3, { color: theme.secondary, marginTop: 10 }]}>Key Inputs</Text>

      <View style={[styles.table, { borderColor: theme.line }]}>        
        <View style={styles.tr}>
          <Text style={[{...styles.th, backgroundColor: '#F3F4F6', borderColor: theme.line, color: theme.secondary}, { width: '33%' }]}>Pipeline & Phasing</Text>
          <Text style={[{...styles.th, backgroundColor: '#F3F4F6', borderColor: theme.line, color: theme.secondary}, { width: '33%' }]}>Cycles</Text>
          <Text style={[{...styles.th, backgroundColor: '#F3F4F6', borderColor: theme.line, color: theme.secondary}, { width: '34%' }]}>Economics</Text>
        </View>
        <View style={styles.tr}>          
          <Text style={[{...styles.td, borderColor: theme.line, color: theme.ink}, { width: '33%' }]}>
            {safe(inputs?.totalHomes, '—')} homes • {safe(inputs?.phaseSize, '—')}/phase • cadence {safe(inputs?.stickPhaseInterval, '—')} mo • WIP cap {safe(inputs?.wipCapHomes, '—')}
          </Text>
          <Text style={[{...styles.td, borderColor: theme.line, color: theme.ink}, { width: '33%' }]}>
            Stick {safe(inputs?.stickDurationMonths, '—')} mo • {safe(inputs?.brandName, 'TEKTRA')} {safe(inputs?.tektraDurationMonths, '—')} mo
          </Text>
          <Text style={[{...styles.td, borderColor: theme.line, color: theme.ink}, { width: '34%' }]}>
            {safe(inputs?.projectSqFt, '—').toLocaleString ? safe(inputs?.projectSqFt, 0).toLocaleString() : safe(inputs?.projectSqFt, '—')} sf/home • Dev ${safe(inputs?.devCostPerSqFt, '—')}/sf • Sales ${safe(inputs?.salesPerSqFt, '—')}/sf • Fee {safe(inputs?.gcFeePercent, '—')}% • Carry {money(safe(inputs?.carryPerMonth, 0))}/active/mo
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={[styles.h3, { color: theme.secondary }]}>What This Means</Text>
        <Text>• More closings in Year‑1 without adding crews.</Text>
        <Text>• Lower interest and overhead drag per home due to shortened active months.</Text>
        <Text>• Smoother buyer experience, cleaner punch, and earlier occupancy for premium clients.</Text>
      </View>
    </Page>
  );
}

function MultiYearTableView({ theme, annuals }: { theme: ReturnType<typeof buildTheme>; annuals: PlanTotals }) {
  return (
    <View style={{ marginTop: 8, marginBottom: 10, borderColor: theme.line }}>        
      <View style={[styles.table, { borderColor: theme.line }]}>        
        <View style={styles.tr}>
          <Text style={[{...styles.th, backgroundColor: '#F3F4F6', borderColor: theme.line, color: '#1F2B3A'}, { width: '10%' }]}>Year</Text>
          <Text style={[{...styles.th, backgroundColor: '#F3F4F6', borderColor: theme.line, color: '#1F2B3A'}, { width: '18%' }]}>Stick Dev</Text>
          <Text style={[{...styles.th, backgroundColor: '#F3F4F6', borderColor: theme.line, color: '#1F2B3A'}, { width: '18%' }]}>TEKTRA Dev</Text>
          <Text style={[{...styles.th, backgroundColor: '#F3F4F6', borderColor: theme.line, color: '#1F2B3A'}, { width: '18%' }]}>Δ Dev</Text>
          <Text style={[{...styles.th, backgroundColor: '#F3F4F6', borderColor: theme.line, color: '#1F2B3A'}, { width: '18%' }]}>Δ Sales</Text>
          <Text style={[{...styles.th, backgroundColor: '#F3F4F6', borderColor: theme.line, color: '#1F2B3A'}, { width: '18%' }]}>Δ Fee</Text>
        </View>
        {(annuals?.delta ?? []).map((d, idx) => (
          <View key={idx} style={styles.tr}>
            <Text style={[{...styles.td, borderColor: theme.line, color: theme.ink}, { width: '10%' }]}>{d.year}</Text>
            <Text style={[{...styles.td, borderColor: theme.line, color: theme.ink}, { width: '18%' }]}>{money(annuals?.stick?.[idx]?.devValue || 0)}</Text>
            <Text style={[{...styles.td, borderColor: theme.line, color: theme.ink}, { width: '18%' }]}>{money(annuals?.tektra?.[idx]?.devValue || 0)}</Text>
            <Text style={[{...styles.td, borderColor: theme.line, color: '#C6A667'}, { width: '18%' }]}>{money(d.devValue)}</Text>
            <Text style={[{...styles.td, borderColor: theme.line, color: '#C6A667'}, { width: '18%' }]}>{money(d.sales)}</Text>
            <Text style={[{...styles.td, borderColor: theme.line, color: '#C6A667'}, { width: '18%' }]}>{money(d.fee)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MultiYearPage({ theme, annuals }: { theme: ReturnType<typeof buildTheme>; annuals: PlanTotals }) {
  return (
    <Page size="A4" style={[styles.page, { color: theme.ink }]}>      
      <Text style={[styles.h1, { color: theme.ink }]}>Multi-Year Impact (3 Years)</Text>
      <MultiYearTableView theme={theme} annuals={annuals} />
      <Text style={{ color: theme.muted, marginBottom: 8 }}>
        Completions uplift by year: {(annuals?.delta ?? []).map(d => d.completions).join(' / ')} (Y1 / Y2 / Y3)
      </Text>
    </Page>
  );
}

function Year1DetailPage({ theme, assets }: { theme: ReturnType<typeof buildTheme>; assets: Assets }) {
  return (
    <Page size="A4" style={[styles.page, { color: theme.ink }]}>      
      <Text style={[styles.h1, { color: theme.ink }]}>Year‑1 Detail</Text>
      <Text style={{ marginBottom: 8 }}>
        Below, we visualize month‑by‑month development value and sales at close for Stick vs TEKTRA. Sales cash pulls forward as cycles compress, while development value recognition smooths through the build.
      </Text>

      {assets?.chartYear1Png && (
        <Image src={assets.chartYear1Png} style={{ width: '100%', height: 300, borderRadius: 6, borderWidth: 1, borderColor: theme.line, marginBottom: 10 }} />
      )}

      <View style={{ marginTop: 4 }}>
        <Text>• Development value recognized straight‑line while active.</Text>
        <Text>• Sales book at home completion month.</Text>
        <Text>• Carry accrues only while a home is active; shorter cycles reduce carry.</Text>
      </View>
    </Page>
  );
}

function GalleryPage({
  theme,
  assets,
  title = 'Project Gallery',
  columns = 3,
}: {
  theme: ReturnType<typeof buildTheme>;
  assets: Assets;
  title?: string;
  columns?: number;
}) {
  const rows = chunk<string>(assets?.gallery ?? [], columns);
  if (!rows.length) return null;

  return (
    <Page size="A4" style={[styles.page, { color: theme.ink }]}>      
      <Text style={[styles.h1, { color: theme.ink }]}>{title}</Text>
      <Text style={{ color: theme.muted, marginBottom: 8 }}>
        Highlights from recent factory builds and on‑site assemblies. Replace with your branded photography.
      </Text>

      {rows.map((row, rIdx) => (
        <View key={rIdx} style={[styles.row, { marginBottom: 8 }]}>          
          {row.map((src, cIdx) => (
            <View key={cIdx} style={{ flex: 1, marginRight: cIdx < row.length - 1 ? 8 : 0 }}>
              <Image src={src} style={{ width: '100%', height: 90, borderRadius: 6, borderWidth: 1, borderColor: theme.line }} />
            </View>
          ))}
          {Array.from({ length: Math.max(0, columns - row.length) }).map((_, i) => (
            <View key={`pad-${i}`} style={{ flex: 1, marginLeft: 8 }} />
          ))}
        </View>
      ))}

      <Text style={[styles.footer, { color: theme.muted }]}>Imagery is representative; swap with client‑specific assets.</Text>
    </Page>
  );
}

function NextStepsPage({ theme, brand, inputs }: any) {
  const company = brand.company ?? 'TEKTRA';
  const contact = brand.contact ?? { name: 'Your TEKTRA Team', email: 'hello@tektra.example', phone: '555-555-5555', web: 'tektra.example' };
  return (
    <Page size="A4" style={[styles.page, { color: theme.ink }]}>      
      <Text style={[styles.h1, { color: theme.ink }]}>Next Steps</Text>
      <Text style={{ marginBottom: 8 }}>To convert this analysis into a build plan, we recommend the following sequence:</Text>
      <Text style={styles.bullet}>1. Scope alignment: confirm home mix, standard options, and finish schedule.</Text>
      <Text style={styles.bullet}>2. Site logistics study: deliveries, staging, crane windows, neighborhood constraints.</Text>
      <Text style={styles.bullet}>3. Detailed schedule: integrate {company} phase cadence with trade calendars.</Text>
      <Text style={styles.bullet}>4. Financial model: lender carry, draw schedule, and sales release timing.</Text>
      <Text style={styles.bullet}>5. Pilot phase: first {Math.min(4, safe(inputs?.phaseSize, 4))} homes to baseline QA and logistics.</Text>

      <View style={[styles.divider, { backgroundColor: theme.line }]} />

      <Text style={[styles.h2, { color: theme.secondary }]}>Your Contacts</Text>
      <View style={[styles.row, { alignItems: 'center', marginTop: 6 }]}>        
        {brand.logoPng ? (
          <Image src={brand.logoPng} style={{ width: 80, height: 20, marginRight: 10 }} />
        ) : (
          <Text style={{ fontSize: 14, marginRight: 10 }}>{company}</Text>
        )}
        <View>
          <Text style={{ fontSize: 11 }}>{contact.name ?? '—'}</Text>
          <Text style={styles.small}>{contact.email ?? '—'}</Text>
          <Text style={styles.small}>{contact.phone ?? '—'}</Text>
          <Text style={styles.small}>{contact.web ?? '—'}</Text>
        </View>
      </View>
    </Page>
  );
}

// --- SELL SHEET (single-page variant) ---
function SellSheetPage({ brand, theme, assets, kpis }: any) {
  const company = brand.company ?? 'TEKTRA';
  const today = new Date().toLocaleDateString();
  return (
    <Page size="A4" style={[styles.page, { color: theme.ink }]}>      
      <View style={[styles.coverBand, { backgroundColor: theme.primary }]} />

      <View style={[styles.row, { alignItems: 'center', marginBottom: 10 }]}>        
        {brand.logoPng ? (
          <Image src={brand.logoPng} style={{ width: 96, height: 24, marginRight: 10 }} />
        ) : (
          <Text style={{ fontSize: 16, color: theme.secondary, marginRight: 10 }}>{company}</Text>
        )}
        <Text style={{ color: theme.muted }}>Prepared {today}</Text>
      </View>

      <Text style={[styles.h1, { color: theme.ink }]}>{company} • Off‑Site Advantage</Text>
      {assets?.heroPng && (
        <Image src={assets.heroPng} style={{ width: '100%', height: 120, borderRadius: 6, marginBottom: 10, borderWidth: 1, borderColor: theme.line }} />
      )}

      <KPIGrid theme={theme} kpis={kpis} />
      <SecondaryKPIGrid theme={theme} kpis={kpis} />

      <Text style={[styles.h3, { color: theme.secondary, marginTop: 6 }]}>Why It Wins</Text>
      <View style={[styles.row]}>        
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.bullet}>• Finish months sooner—without more crews.</Text>
          <Text style={styles.bullet}>• Precision panels = premium finishes, less rework.</Text>
          <Text style={styles.bullet}>• Predictable schedules de‑risk capital & sales.</Text>
        </View>
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <Text style={styles.bullet}>• Lower carry—shorter active months.</Text>
          <Text style={styles.bullet}>• Cleaner buyer experience & earlier occupancy.</Text>
          <Text style={styles.bullet}>• ESG‑friendly: fewer deliveries, less waste.</Text>
        </View>
      </View>

      {assets?.chartYear1Png && (
        <>
          <Text style={[styles.h3, { color: theme.secondary, marginTop: 10 }]}>Year‑1 Results</Text>
          <Image src={assets.chartYear1Png} style={{ width: '100%', height: 160, borderRadius: 6, borderWidth: 1, borderColor: theme.line }} />
        </>
      )}

      <Text style={[styles.footer, { color: theme.muted }]}>{company} • Build Smarter. Finish Sooner. Profit More.</Text>
    </Page>
  );
}

// --- INVESTOR (data-forward) variant ---
function InvestorPage({ brand, theme, annuals, kpis, assets }: any) {
  const company = brand.company ?? 'TEKTRA';
  return (
    <Page size="A4" style={[styles.page, { color: theme.ink }]}>      
      <Text style={[styles.h1, { color: theme.ink }]}>{company} • Program Impact Summary</Text>
      <View style={[styles.row, { marginBottom: 8 }]}>        
        <View style={[styles.kpiCard, { borderColor: theme.line, flex: 1, backgroundColor: theme.card }]}>          
          <Text style={{ color: theme.muted }}>Year‑1 Opportunity</Text>
          <Text style={{ fontSize: 20 }}>{formatAbbreviatedUSD(kpis?.total ?? 0)}</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: theme.line, flex: 1 }]}>          
          <Text style={{ color: theme.muted }}>Additional Completions</Text>
          <Text style={{ fontSize: 20, color: theme.accent }}>{kpis?.addCompletions ?? 0}</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: theme.line, flex: 1 }]}>          
          <Text style={{ color: theme.muted }}>Carry Savings</Text>
          <Text style={{ fontSize: 20 }}>{formatAbbreviatedUSD(kpis?.carry ?? 0)}</Text>
        </View>
      </View>

      {/* Use table-as-view to avoid nested Page */}
      <MultiYearTableView theme={theme} annuals={annuals} />

      {assets?.chartAnnualPng && (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.h2, { color: theme.secondary }]}>Annualized Revenue & Sales</Text>
          <Image src={assets.chartAnnualPng} style={{ width: '100%', height: 200, borderRadius: 6, borderWidth: 1, borderColor: theme.line }} />
        </View>
      )}

      <Text style={[styles.footer, { color: theme.muted }]}>{company} • Program Economics</Text>
    </Page>
  );
}

// --- Main component ---
export default function Brochure({
  brand = {},
  inputs,
  kpis,
  annuals,
  assets = {},
  variant = 'brochure',
  includeGallery = false,
  galleryTitle = 'Project Gallery',
  galleryColumns = 3,
}: {
  brand?: Brand;
  inputs: any;
  kpis: BrochureKPIs;
  annuals: PlanTotals;
  assets?: Assets;
  variant?: Variant;
  includeGallery?: boolean;
  galleryTitle?: string;
  galleryColumns?: number;
}) {
  const theme = buildTheme(brand);

  if (variant === 'sellSheet') {
    return (
      <Document>
        <SellSheetPage brand={brand} theme={theme} assets={assets} kpis={kpis} />
      </Document>
    );
  }

  if (variant === 'investor') {
    return (
      <Document>
        <InvestorPage brand={brand} theme={theme} annuals={annuals} kpis={kpis} assets={assets} />
      </Document>
    );
  }

  // Default: multi-page brochure
  return (
    <Document>
      <CoverPage brand={brand} theme={theme} assets={assets} kpis={kpis} inputs={inputs} />
      <WhyPage brand={brand} theme={theme} inputs={inputs} />
      <MultiYearPage theme={theme} annuals={annuals} />
      <Year1DetailPage theme={theme} assets={assets} />
      {includeGallery && (assets?.gallery?.length ?? 0) > 0 && (
        <GalleryPage theme={theme} assets={assets} title={galleryTitle} columns={galleryColumns} />
      )}
      <NextStepsPage brand={brand} theme={theme} inputs={inputs} />
    </Document>
  );
}



// --- FILE: src/app/(wherever)/SavingsCalculator.tsx — patch for export hook ---
// In your handleExportPDF, pass the CAPTURED chart images instead of static files.
// Replace the assets object inside pdf(<Brochure ... />) with the following:
/*
assets={{
  heroPng: '/images/hero-yard.png',
  chartYear1Png: year1Png,   // <— use captured chart image
  chartAnnualPng: annualPng, // <— use captured chart image
  gallery: [
    '/gallery/factory-cutting.jpg',
    '/gallery/panel-assembly.jpg',
    '/gallery/crane-set-1.jpg',
    '/gallery/crane-set-2.jpg',
    '/gallery/interior-finish.jpg',
    '/gallery/exterior-elevation.jpg',
  ],
}}
includeGallery
galleryTitle="TEKTRA Project Gallery"
galleryColumns={3}
variant="brochure"
*/
