'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  CartesianGrid,
  XAxis, YAxis,
  Tooltip, Legend,
} from 'recharts';
import { pdf } from '@react-pdf/renderer';
import Brochure from '@/components/pdf/brochure';
import { useChartCapture } from '@/components/useChartCapture';

// ---------- Brand theme for both UI and PDF ----------
const BRAND = {
  company: 'TEKTRA',
  tagline: 'Precision-built. Faster cycles. Better returns.',
  logoPng: '/brand/tektra-logo.png',
  primary: '#0A0F1C',
  secondary: '#1C2633',
  accent: '#1B3A94',
  ink: '#111827',
  muted: '#717784',
  contact: { name: 'TEKTRA Partnerships', email: 'partners@tektra.example', phone: '555-555-5555', web: 'tektra.example' },
};

// Chart palette (premium, print-safe)
const COLORS = {
  stickDev: '#8892A0',
  tektraDev: '#1E40AF',
  stickSales: '#4A5568',
  tektraSales: '#1B3A94',
};

// ---------- Utils ----------
const fmtCurrency = (n: number, digits = 0) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: digits });

function formatAbbreviatedUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtCurrency(n);
}

// ---------- Types ----------
interface GlobalSettings {
  tektraPhaseInterval: number;
  totalHomes: number;
  phaseSize: number;
  stickPhaseInterval: number;
  wipCapHomes: number;
  stickDurationMonths: number;
  tektraDurationMonths: number;
  projectSqFt: number;
  devCostPerSqFt: number;
  salesPerSqFt: number;
  homesSoldPerProject: number;
  gcFeePercent: number;
  carryPerMonth: number;
}

interface HomeRow {
  id: string;
  startMonth: number;
  endMonth: number;
  duration: number;
  projectSqFt: number;
  devCostPerSqFt: number;
  salesPerSqFt: number;
  homesSold: number;
  estimatedDevelopmentValue: number;
}

// ---- New: lightweight Tabs API (local, no dependency) ----
function Tabs({ value, onChange, items }: { value: string; onChange: (v: string)=>void; items: { value: string; label: string }[] }) {
  return (
    <div className="border-b border-slate-200 mb-4">
      <div className="flex gap-2 overflow-x-auto">
        {items.map(it => {
          const active = value === it.value;
          return (
            <button
              key={it.value}
              onClick={() => onChange(it.value)}
              className={[
                'px-3 py-2 text-sm font-medium rounded-t',
                active ? 'bg-white border border-b-white border-slate-200 text-slate-900' : 'text-slate-600 hover:text-slate-900'
              ].join(' ')}
            >{it.label}</button>
          );
        })}
    </div>
  </div>
  );
} 

export default function SavingsCalculator() {
  const [activeTab, setActiveTab] = useState<'dashboard'|'projects'|'costs'>('projects');
  // Split stick and TEKTRA inputs
  const [stickGlobals, setStickGlobals] = useState<GlobalSettings>({
    totalHomes: 24,
    phaseSize: 4,
    stickPhaseInterval: 3,
    tektraPhaseInterval: 1, // default value for stick, not used
    wipCapHomes: 8,
    stickDurationMonths: 10,
    tektraDurationMonths: 6, // not used for stick
    projectSqFt: 3000,
    devCostPerSqFt: 650,
    salesPerSqFt: 850,
    homesSoldPerProject: 1,
    gcFeePercent: 8,
    carryPerMonth: 15000,
  });
  const [tektraGlobals, setTektraGlobals] = useState<GlobalSettings>({
    totalHomes: 24,
    phaseSize: 4,
    stickPhaseInterval: 3, // legacy, not used for TEKTRA
    tektraPhaseInterval: 3, // <-- add this for independent TEKTRA interval
    wipCapHomes: 8,
    stickDurationMonths: 10, // not used for TEKTRA
    tektraDurationMonths: 6,
    projectSqFt: 3000,
    devCostPerSqFt: 650,
    salesPerSqFt: 850,
    homesSoldPerProject: 1,
    gcFeePercent: 8,
    carryPerMonth: 15000,
  });

  // Derived TEKTRA cadence (min 0.25 month, fractional allowed)
  const tektraPhaseInterval = tektraGlobals.tektraPhaseInterval ?? 1;

  // ---------- Scheduler ----------
  function buildCadencedSchedule(
    totalHomes: number,
    durationMonths: number,
    cadence: number,
    phaseSize: number,
    wipCapHomes: number,
    idPrefix: 'stick' | 'tektra',
    econ: Pick<GlobalSettings, 'projectSqFt'|'devCostPerSqFt'|'salesPerSqFt'|'homesSoldPerProject'>
  ): HomeRow[] {
    const rows: HomeRow[] = [];
    if (totalHomes <= 0) return rows;

    const dur = Math.max(1, Math.ceil(durationMonths));
    const capacity = Math.max(1, Math.floor(wipCapHomes));
    const step = Math.max(1, Math.floor(cadence));

    let scheduled = 0;
    let month = 1;
    let nextPhaseStart = 1;

    const capacityFreeEvents = new Map<number, number>();
    let active = 0;
    const hardStopMonth = 12 * 30;

    while (scheduled < totalHomes && month <= hardStopMonth) {
      const freed = capacityFreeEvents.get(month) || 0;
      if (freed > 0) active -= freed;

      if (month === nextPhaseStart && scheduled < totalHomes) {
        let toStart = Math.min(phaseSize, totalHomes - scheduled);
        const free = Math.max(0, capacity - active);
        toStart = Math.min(toStart, free);

        if (toStart > 0) {
          for (let i = 0; i < toStart; i++) {
            const start = month;
            const end = start + dur - 1;
            rows.push({
              id: `${idPrefix}-${scheduled + i + 1}`,
              startMonth: start,
              endMonth: end,
              duration: dur,
              projectSqFt: econ.projectSqFt,
              devCostPerSqFt: econ.devCostPerSqFt,
              salesPerSqFt: econ.salesPerSqFt,
              homesSold: econ.homesSoldPerProject,
              estimatedDevelopmentValue: econ.projectSqFt * econ.devCostPerSqFt,
            });
            capacityFreeEvents.set(end + 1, (capacityFreeEvents.get(end + 1) || 0) + 1);
          }
          active += toStart;
          scheduled += toStart;
          nextPhaseStart += step;
        } else {
          nextPhaseStart += 1; // slip due to capacity
        }
      }
      month += 1;
    }

    return rows;
  }

  // Use stickGlobals for stickPlan, tektraGlobals for tektraPlan
  const stickPlan = useMemo(
    () => buildCadencedSchedule(
      stickGlobals.totalHomes,
      stickGlobals.stickDurationMonths,
      stickGlobals.stickPhaseInterval,
      stickGlobals.phaseSize,
      stickGlobals.wipCapHomes,
      'stick',
      stickGlobals
    ),
    [stickGlobals]
  );

  const tektraPlan = useMemo(
    () => buildCadencedSchedule(
      tektraGlobals.totalHomes,
      tektraGlobals.tektraDurationMonths,
      tektraPhaseInterval,
      tektraGlobals.phaseSize,
      tektraGlobals.wipCapHomes,
      'tektra',
      tektraGlobals
    ),
    [tektraGlobals, tektraPhaseInterval]
  );

  // ---------- Year-1 series ----------
  const globals = stickGlobals; // or choose tektraGlobals if needed
  const feeRate = (globals.gcFeePercent || 0) / 100;

  function valueAtCompletion(h: HomeRow) {
    return (h.projectSqFt || 0) * (h.salesPerSqFt || 0) * (h.homesSold || 0);
  }

  function seriesFor(plan: HomeRow[]) {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      let devRevenue = 0, devSales = 0, feeProfit = 0, carryCost = 0;

      plan.forEach(h => {
        const active = m >= h.startMonth && m <= h.endMonth;
        if (active && h.duration > 0) {
          const monthlyDev = h.estimatedDevelopmentValue / h.duration; // straight-line
          devRevenue += monthlyDev;
          feeProfit += monthlyDev * feeRate;
          carryCost += globals.carryPerMonth;
        }
        if (m === h.endMonth) devSales += valueAtCompletion(h);
      });

      return { month: m, devRevenue, devSales, feeProfit, carryCost };
    });
  }

  const stickSeries = useMemo(() => seriesFor(stickPlan), [stickPlan, globals.gcFeePercent, globals.carryPerMonth]);
  const tektraSeries = useMemo(() => seriesFor(tektraPlan), [tektraPlan, globals.gcFeePercent, globals.carryPerMonth]);

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const s = stickSeries[i];
      const t = tektraSeries[i];
      return {
        month: i + 1,
        stickRevenue: s.devRevenue,
        tektraRevenue: t.devRevenue,
        stickDevSales: s.devSales,
        tektraDevSales: t.devSales,
        stickFee: s.feeProfit,
        tektraFee: t.feeProfit,
        stickCarry: s.carryCost,
        tektraCarry: t.carryCost,
      };
    });
  }, [stickSeries, tektraSeries]);

  // ---------- KPIs (Year-1) ----------
  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, r) => {
        acc.revStick += r.stickRevenue;
        acc.revTektra += r.tektraRevenue;
        acc.salesStick += r.stickDevSales;
        acc.salesTektra += r.tektraDevSales;
        acc.feeStick += r.stickFee;
        acc.feeTektra += r.tektraFee;
        acc.carryStick += r.stickCarry;
        acc.carryTektra += r.tektraCarry;
        return acc;
      },
      { revStick: 0, revTektra: 0, salesStick: 0, salesTektra: 0, feeStick: 0, feeTektra: 0, carryStick: 0, carryTektra: 0 }
    );
  }, [chartData]);

  const completionsInYear = (plan: HomeRow[]) => plan.filter(h => h.endMonth <= 12).length;
  const additionalCompletions = Math.max(0, completionsInYear(tektraPlan) - completionsInYear(stickPlan));

  const incrementalDevValue = totals.revTektra - totals.revStick;
  const incrementalSales = totals.salesTektra - totals.salesStick;
  const incrementalFee = totals.feeTektra - totals.feeStick;
  const carrySavings = Math.max(0, totals.carryStick - totals.carryTektra);
  const annualOpportunity = incrementalDevValue + incrementalSales + incrementalFee + carrySavings;

  // ---------- Multi-year (3y) for PDF ----------
  const sum = (a: number, b: number) => a + b;

  function seriesForMonths(plan: HomeRow[], months: number, feeRate: number, carryPerMonth: number) {
    return Array.from({ length: months }, (_, i) => {
      const m = i + 1;
      let devRevenue = 0, devSales = 0, feeProfit = 0, carryCost = 0;

      plan.forEach(h => {
        const active = m >= h.startMonth && m <= h.endMonth;
        if (active && h.duration > 0) {
          const monthlyDev = h.estimatedDevelopmentValue / h.duration;
          devRevenue += monthlyDev;
          feeProfit += monthlyDev * feeRate;
          carryCost += carryPerMonth;
        }
        if (m === h.endMonth) devSales += valueAtCompletion(h);
      });

      return { m, devRevenue, devSales, feeProfit, carryCost };
    });
  }

  type YearTotals = { year: number; devValue: number; sales: number; fee: number; carry: number; completions: number };

  function aggregateByYear(rows: ReturnType<typeof seriesForMonths>, plan: HomeRow[], monthsPerYear = 12): YearTotals[] {
    const years = Math.ceil(rows.length / monthsPerYear);
    const completionsByMonth = new Map<number, number>();
    plan.forEach(h => completionsByMonth.set(h.endMonth, (completionsByMonth.get(h.endMonth) || 0) + 1));

    const out: YearTotals[] = [];
    for (let y = 1; y <= years; y++) {
      const start = (y - 1) * monthsPerYear;
      const yearRows = rows.slice(start, start + monthsPerYear);
      const devValue = yearRows.map(r => r.devRevenue).reduce(sum, 0);
      const sales    = yearRows.map(r => r.devSales).reduce(sum, 0);
      const fee      = yearRows.map(r => r.feeProfit).reduce(sum, 0);
      const carry    = yearRows.map(r => r.carryCost).reduce(sum, 0);
      let completions = 0;
      for (let m = start + 1; m <= start + monthsPerYear; m++) completions += (completionsByMonth.get(m) || 0);
      out.push({ year: y, devValue, sales, fee, carry, completions });
    }
    return out;
  }

  function multiYearTotals(stickPlan: HomeRow[], tektraPlan: HomeRow[], years = 3, monthsPerYear = 12, feeRate = 0, carryPerMonth = 0) {
    const months = years * monthsPerYear;
    const sRows = seriesForMonths(stickPlan, months, feeRate, carryPerMonth);
    const tRows = seriesForMonths(tektraPlan, months, feeRate, carryPerMonth);

    const stick = aggregateByYear(sRows, stickPlan, monthsPerYear);
    const tektra = aggregateByYear(tRows, tektraPlan, monthsPerYear);

    const delta = stick.map((s, i) => ({
      year: s.year,
      devValue: (tektra[i]?.devValue || 0) - s.devValue,
      sales:    (tektra[i]?.sales    || 0) - s.sales,
      fee:      (tektra[i]?.fee      || 0) - s.fee,
      carry:    Math.max(0, s.carry - (tektra[i]?.carry || 0)),
      completions: Math.max(0, (tektra[i]?.completions || 0) - s.completions),
    }));
    return { stick, tektra, delta };
  }

  const yearsToShow = 3;
  const planTotals = useMemo(
    () => multiYearTotals(stickPlan, tektraPlan, yearsToShow, 12, feeRate, globals.carryPerMonth),
    [stickPlan, tektraPlan, yearsToShow, feeRate, globals.carryPerMonth]
  );

  // ---------- Capture + PDF ----------
  const year1Chart = useChartCapture();
  const annualChart = useChartCapture();

  const inputs = {
    totalHomes: globals.totalHomes,
    phaseSize: globals.phaseSize,
    stickPhaseInterval: globals.stickPhaseInterval,
    wipCapHomes: globals.wipCapHomes,
    stickDurationMonths: globals.stickDurationMonths,
    tektraDurationMonths: globals.tektraDurationMonths,
    projectSqFt: globals.projectSqFt,
    devCostPerSqFt: globals.devCostPerSqFt,
    salesPerSqFt: globals.salesPerSqFt,
    homesSoldPerProject: globals.homesSoldPerProject,
    gcFeePercent: globals.gcFeePercent,
    carryPerMonth: globals.carryPerMonth,
  };

  async function handleExportPDF() {
    const year1Png = await year1Chart.capturePng();
    const annualPng = await annualChart.capturePng();

    const kpis = {
      addCompletions: additionalCompletions,
      dev: incrementalDevValue,
      fee: incrementalFee,
      sales: incrementalSales,
      carry: carrySavings,
      total: annualOpportunity,
    };

    const blob = await pdf(
      <Brochure
        brand={{
          company: 'TEKTRA',
          tagline: 'Precision-built. Faster cycles. Better returns.',
          logoPng: '/brand/tektra-logo.png',
          primary: '#0B1220',
          accent: '#C6A667',
          contact: { name: 'TEKTRA Partnerships', email: 'tektrabuilt.com', phone: '555-555-5555', web: 'tektrabuilt.com' },
        }}
        inputs={inputs}
        kpis={kpis}
        annuals={planTotals}
        assets={{
          heroPng: '/images/hero-yard.png',
          chartYear1Png: year1Png,
          chartAnnualPng: annualPng,
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
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TEKTRA_Brochure_${new Date().toISOString().slice(0,10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --------------- Views ---------------
  function DashboardView() {
    // Helper for annualized table
    const annualizedTableData = planTotals.stick.map((s, i) => ({
      year: `Y${i + 1}`,
      stick: s.devValue + s.sales,
      tektra: (planTotals.tektra[i]?.devValue || 0) + (planTotals.tektra[i]?.sales || 0),
      delta: ((planTotals.tektra[i]?.devValue || 0) + (planTotals.tektra[i]?.sales || 0)) - (s.devValue + s.sales),
      completionsStick: s.completions,
      completionsTektra: planTotals.tektra[i]?.completions || 0,
    }));

    return (
      <div>
        {/* Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">Total Year‑1 Opportunity</div>
            <div className="text-3xl font-semibold" style={{ color: BRAND.accent }}>{fmtCurrency(annualOpportunity)}</div>
            <div className="text-xs text-slate-500 mt-1">Δ Dev + Δ Sales</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">Additional Completions (Year‑1)</div>
            <div className="text-3xl font-semibold">{additionalCompletions}</div>
            <div className="text-xs text-slate-500 mt-1">TEKTRA vs Stick under same WIP cap</div>
          </div>
        </div>

        {/* KPI summary (grouped Stick/TEKTRA stats) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* TEKTRA Stats */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs font-semibold text-blue-900 mb-2">TEKTRA (Year‑1)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Total Revenue</div>
                <div className="text-xl font-bold" style={{ color: BRAND.accent }}>
                  {fmtCurrency(totals.revTektra + totals.salesTektra + totals.feeTektra)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Dev Value</div>
                <div className="text-xl font-semibold">{fmtCurrency(totals.revTektra)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Sales @ Close</div>
                <div className="text-xl font-semibold">{fmtCurrency(totals.salesTektra)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Fee Profit</div>
                <div className="text-xl font-semibold">{fmtCurrency(totals.feeTektra)}</div>
              </div>
            </div>
          </div>
          {/* Stick Stats */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-900 mb-2">Stick Built (Year‑1)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Total Revenue</div>
                <div className="text-xl font-bold">
                  {fmtCurrency(totals.revStick + totals.salesStick)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Dev Value</div>
                <div className="text-xl font-semibold">{fmtCurrency(totals.revStick)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Sales @ Close</div>
                <div className="text-xl font-semibold">{fmtCurrency(totals.salesStick)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Fee Profit</div>
                <div className="text-xl font-semibold">{fmtCurrency(totals.feeStick)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Delta/Opportunity Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Δ Development Value</div>
            <div className="text-2xl font-semibold">{fmtCurrency(incrementalDevValue)}</div>
            <div className="text-xs text-slate-500 mt-1">TEKTRA vs Stick</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Δ Sales @ Close</div>
            <div className="text-2xl font-semibold">{fmtCurrency(incrementalSales)}</div>
            <div className="text-xs text-slate-500 mt-1">TEKTRA vs Stick</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Δ Fee Profit</div>
            <div className="text-2xl font-semibold">{fmtCurrency(incrementalFee)}</div>
            <div className="text-xs text-slate-500 mt-1">TEKTRA vs Stick</div>
          </div>
        </div>

        {/* Year-1 Chart (shared) */}
        <div className="mb-8">
          <div className="text-lg font-bold text-slate-900 mb-2">Year‑1 Results (Dev Value + Sales)</div>
          <div ref={year1Chart.ref}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatAbbreviatedUSD} />
                <Tooltip formatter={formatAbbreviatedUSD} />
                <Legend />
                <Bar dataKey="stickRevenue" fill={COLORS.stickDev} name="Stick Dev Value" />
                <Bar dataKey="tektraRevenue" fill={COLORS.tektraDev} name="TEKTRA Dev Value" />
                <Bar dataKey="stickDevSales" fill={COLORS.stickSales} name="Stick Sales @ Close" />
                <Bar dataKey="tektraDevSales" fill={COLORS.tektraSales} name="TEKTRA Sales @ Close" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Development value recognized straight‑line while active. Sales book at completion month.
          </div>
        </div>

        {/* Year-1 Monthly Table */}
        <div className="mb-8">
          <div className="text-lg font-bold text-slate-900 mb-2">Year‑1 Monthly Breakdown</div>
          <table className="min-w-full border border-slate-200 rounded text-xs mb-2">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-2 py-2">Month</th>
                <th className="px-2 py-2 text-right">Stick Revenue</th>
                <th className="px-2 py-2 text-right">TEKTRA Revenue</th>
                <th className="px-2 py-2 text-right">Stick Sales @ Close</th>
                <th className="px-2 py-2 text-right">TEKTRA Sales @ Close</th>
                <th className="px-2 py-2 text-right">Stick Fee</th>
                <th className="px-2 py-2 text-right">TEKTRA Fee</th>
                <th className="px-2 py-2 text-right">Δ Revenue</th>
                <th className="px-2 py-2 text-right">Running Δ Revenue</th>
                <th className="px-2 py-2 text-right">Δ Fee</th>
                <th className="px-2 py-2 text-right">Running Δ Fee</th>
                <th className="px-2 py-2 text-right">Δ Sales</th>
                <th className="px-2 py-2 text-right">Running Δ Sales</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => {
                const deltaRevenue = row.tektraRevenue - row.stickRevenue;
                const runningDeltaRevenue = chartData.slice(0, i + 1).reduce((sum, r) => sum + (r.tektraRevenue - r.stickRevenue), 0);

                const deltaFee = row.tektraFee - row.stickFee;
                const runningDeltaFee = chartData.slice(0, i + 1).reduce((sum, r) => sum + (r.tektraFee - r.stickFee), 0);

                const deltaSales = row.tektraDevSales - row.stickDevSales;
                const runningDeltaSales = chartData.slice(0, i + 1).reduce((sum, r) => sum + (r.tektraDevSales - r.stickDevSales), 0);

                return (
                  <tr key={row.month} className="border-t border-slate-100">
                    <td className="px-2 py-2">{row.month}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(row.stickRevenue)}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(row.tektraRevenue)}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(row.stickDevSales)}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(row.tektraDevSales)}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(row.stickFee)}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(row.tektraFee)}</td>
                    <td className={`px-2 py-2 text-right ${deltaRevenue > 0 ? 'text-green-700' : deltaRevenue < 0 ? 'text-red-700' : ''}`}>
                      {deltaRevenue > 0 ? '+' : ''}{fmtCurrency(deltaRevenue)}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">{fmtCurrency(runningDeltaRevenue)}</td>
                    <td className={`px-2 py-2 text-right ${deltaFee > 0 ? 'text-green-700' : deltaFee < 0 ? 'text-red-700' : ''}`}>
                      {deltaFee > 0 ? '+' : ''}{fmtCurrency(deltaFee)}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">{fmtCurrency(runningDeltaFee)}</td>
                    <td className={`px-2 py-2 text-right ${deltaSales > 0 ? 'text-green-700' : deltaSales < 0 ? 'text-red-700' : ''}`}>
                      {deltaSales > 0 ? '+' : ''}{fmtCurrency(deltaSales)}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">{fmtCurrency(runningDeltaSales)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Annualized (3y) */}
        <div className="mb-8">
          <div className="text-lg font-bold text-slate-900 mb-2">Annualized (3 Years)</div>
          <div ref={annualChart.ref}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={planTotals.stick.map((s, i) => ({
                year: `Y${i+1}`,
                stick: s.devValue + s.sales,
                tektra: (planTotals.tektra[i]?.devValue || 0) + (planTotals.tektra[i]?.sales || 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={formatAbbreviatedUSD} />
                <Tooltip formatter={formatAbbreviatedUSD} />
                <Legend />
                <Bar dataKey="stick"  fill={COLORS.stickDev} name="Stick (Dev+Sales)" />
                <Bar dataKey="tektra" fill={COLORS.tektraDev} name="TEKTRA (Dev+Sales)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Annualized Table */}
          <div className="mt-4">
            <table className="min-w-full border border-slate-200 rounded text-xs mb-2">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-2 py-2">Year</th>
                  <th className="px-2 py-2 text-right">Stick Revenue</th>
                  <th className="px-2 py-2 text-right">TEKTRA Revenue</th>
                  <th className="px-2 py-2 text-right">Δ Revenue</th>
                  <th className="px-2 py-2 text-right">Stick Completions</th>
                  <th className="px-2 py-2 text-right">TEKTRA Completions</th>
                </tr>
              </thead>
              <tbody>
                {annualizedTableData.map((row, i) => (
                  <tr key={row.year} className="border-t border-slate-100">
                    <td className="px-2 py-2">{row.year}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(row.stick)}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(row.tektra)}</td>
                    <td className={`px-2 py-2 text-right ${row.delta > 0 ? 'text-green-700' : row.delta < 0 ? 'text-red-700' : ''}`}>
                      {row.delta > 0 ? '+' : ''}{fmtCurrency(row.delta)}
                    </td>
                    <td className="px-2 py-2 text-right">{row.completionsStick}</td>
                    <td className="px-2 py-2 text-right">{row.completionsTektra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center px-3 py-2 rounded bg-[#0B1220] text-white text-sm font-semibold hover:opacity-90"
          >
            Export PDF Brochure
          </button>
        </div>
      </div>
    );
  }

  function ProjectsView() {
    return (
      <div>
        {/* Title + explainer */}
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">TEKTRA Opportunity — Phased Starts (Year‑1)</h1>
          <p className="text-sm text-slate-600 mt-1">
            Define phase size and cadence for stick‑built. TEKTRA pulls phase starts forward based on cycle‑time savings, under the same WIP cap.
          </p>
        </div>

        {/* KPI summary (compact) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Total Year‑1 Opportunity (All‑in)</div>
            <div className="text-2xl font-semibold">{fmtCurrency(annualOpportunity)}</div>
            <div className="text-xs text-slate-500 mt-1">Δ Dev + Δ Sales</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Total TEKTRA (Year‑1)</div>
            <div className="text-2xl font-semibold" style={{ color: BRAND.accent }}>{fmtCurrency(totals.revTektra + totals.salesTektra + totals.feeTektra)}</div>
            <div className="text-xs text-slate-500 mt-1">TEKTRA Dev + Sales + Fee</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Total Stick (Year‑1)</div>
            <div className="text-2xl font-semibold">{fmtCurrency(totals.revStick + totals.salesStick + totals.feeStick)}</div>
            <div className="text-xs text-slate-500 mt-1">Stick Dev + Sales + Fee</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Δ Development Value</div>
            <div className="text-2xl font-semibold">{fmtCurrency(incrementalDevValue)}</div>
            <div className="text-xs text-slate-500 mt-1">TEKTRA vs Stick</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Δ Sales @ Close</div>
            <div className="text-2xl font-semibold">{fmtCurrency(incrementalSales)}</div>
            <div className="text-xs text-slate-500 mt-1">TEKTRA vs Stick</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Δ Fee Profit</div>
            <div className="text-2xl font-semibold">{fmtCurrency(incrementalFee)}</div>
            <div className="text-xs text-slate-500 mt-1">TEKTRA vs Stick</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Additional Completions (Year‑1)</div>
            <div className="text-2xl font-semibold">{additionalCompletions}</div>
            <div className="text-xs text-slate-500 mt-1">TEKTRA vs Stick under same WIP cap</div>
          </div>
        </div>

        {/* TEKTRA Inputs */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
          <div className="font-semibold text-blue-900 mb-2">TEKTRA Inputs</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Example improved input UI for all TEKTRA fields */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Total Homes (Pipeline)</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, totalHomes: Math.max(0, g.totalHomes - 1) }))}>−</button>
                <input
                  type="number"
                  min={0}
                  value={tektraGlobals.totalHomes}
                  onChange={e => setTektraGlobals(g => ({ ...g, totalHomes: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, totalHomes: g.totalHomes + 1 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Homes per Phase</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, phaseSize: Math.max(1, g.phaseSize - 1) }))}>−</button>
                <input
                  type="number"
                  min={1}
                  value={tektraGlobals.phaseSize}
                  onChange={e => setTektraGlobals(g => ({ ...g, phaseSize: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, phaseSize: g.phaseSize + 1 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phase Interval (mo)</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button
                  type="button"
                  className="px-2 text-lg text-blue-700"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setTektraGlobals(g => ({
                    ...g,
                    tektraPhaseInterval: Math.max(0.25, Math.round(((g.tektraPhaseInterval ?? 1) - 0.25) * 4) / 4)
                  }))}
                >−</button>
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={tektraPhaseInterval}
                  onChange={e => setTektraGlobals(g => ({
                    ...g,
                    tektraPhaseInterval: Math.max(0.25, Number(e.target.value))
                  }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="px-2 text-lg text-blue-700"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setTektraGlobals(g => ({
                    ...g,
                    tektraPhaseInterval: Math.round(((g.tektraPhaseInterval ?? 1) + 0.25) * 4) / 4
                  }))}
                >+</button>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                TEKTRA interval (independent): <b>{tektraPhaseInterval}</b> mo
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Concurrent Homes (WIP cap)</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, wipCapHomes: Math.max(1, g.wipCapHomes - 1) }))}>−</button>
                <input
                  type="number"
                  min={1}
                  value={tektraGlobals.wipCapHomes}
                  onChange={e => setTektraGlobals(g => ({ ...g, wipCapHomes: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, wipCapHomes: g.wipCapHomes + 1 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Duration (mo)</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, tektraDurationMonths: Math.max(1, g.tektraDurationMonths - 1) }))}>−</button>
                <input
                  type="number"
                  min={1}
                  value={tektraGlobals.tektraDurationMonths}
                  onChange={e => setTektraGlobals(g => ({ ...g, tektraDurationMonths: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, tektraDurationMonths: g.tektraDurationMonths + 1 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Avg Sq Ft / Home</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, projectSqFt: Math.max(0, g.projectSqFt - 100) }))}>−</button>
                <input
                  type="number"
                  min={0}
                  value={tektraGlobals.projectSqFt}
                  onChange={e => setTektraGlobals(g => ({ ...g, projectSqFt: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, projectSqFt: g.projectSqFt + 100 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dev Cost $/sf</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, devCostPerSqFt: Math.max(0, g.devCostPerSqFt - 10) }))}>−</button>
                <input
                  type="number"
                  min={0}
                  value={tektraGlobals.devCostPerSqFt}
                  onChange={e => setTektraGlobals(g => ({ ...g, devCostPerSqFt: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, devCostPerSqFt: g.devCostPerSqFt + 10 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sales $/sf</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, salesPerSqFt: Math.max(0, g.salesPerSqFt - 10) }))}>−</button>
                <input
                  type="number"
                  min={0}
                  value={tektraGlobals.salesPerSqFt}
                  onChange={e => setTektraGlobals(g => ({ ...g, salesPerSqFt: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setTektraGlobals(g => ({ ...g, salesPerSqFt: g.salesPerSqFt + 10 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">GC Fee % (on dev value)</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button
                  type="button"
                  className="px-2 text-lg text-blue-700"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setTektraGlobals(g => ({
                    ...g,
                    gcFeePercent: Math.max(0, Math.round((g.gcFeePercent - 0.25) * 4) / 4)
                  }))}
                >−</button>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.25}
                  value={tektraGlobals.gcFeePercent}
                  onChange={e => setTektraGlobals(g => ({
                    ...g,
                    gcFeePercent: Math.max(0, Number(e.target.value))
                  }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="px-2 text-lg text-blue-700"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setTektraGlobals(g => ({
                    ...g,
                    gcFeePercent: Math.min(100, Math.round((g.gcFeePercent + 0.25) * 4) / 4)
                  }))}
                >+</button>
              </div>
            </div>
          </div>
        </div>
        {/* Stick Inputs */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
          <div className="font-semibold text-blue-900 mb-2">Stick Built Inputs</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Example improved input UI for all Stick fields */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Total Homes (Pipeline)</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, totalHomes: Math.max(0, g.totalHomes - 1) }))}>−</button>
                <input
                  type="number"
                  min={0}
                  value={stickGlobals.totalHomes}
                  onChange={e => setStickGlobals(g => ({ ...g, totalHomes: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, totalHomes: g.totalHomes + 1 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Homes per Phase</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, phaseSize: Math.max(1, g.phaseSize - 1) }))}>−</button>
                <input
                  type="number"
                  min={1}
                  value={stickGlobals.phaseSize}
                  onChange={e => setStickGlobals(g => ({ ...g, phaseSize: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, phaseSize: g.phaseSize + 1 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phase Interval (mo)</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button
                  type="button"
                  className="px-2 text-lg text-blue-700"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setStickGlobals(g => ({
                    ...g,
                    stickPhaseInterval: Math.max(0.25, Math.round((g.stickPhaseInterval - 0.25) * 4) / 4)
                  }))}
                >−</button>
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={stickGlobals.stickPhaseInterval}
                  onChange={e => setStickGlobals(g => ({
                    ...g,
                    stickPhaseInterval: Math.max(0.25, Number(e.target.value))
                  }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="px-2 text-lg text-blue-700"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setStickGlobals(g => ({
                    ...g,
                    stickPhaseInterval: Math.round((g.stickPhaseInterval + 0.25) * 4) / 4
                  }))}
                >+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Concurrent Homes (WIP cap)</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, wipCapHomes: Math.max(1, g.wipCapHomes - 1) }))}>−</button>
                <input
                  type="number"
                  min={1}
                  value={stickGlobals.wipCapHomes}
                  onChange={e => setStickGlobals(g => ({ ...g, wipCapHomes: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, wipCapHomes: g.wipCapHomes + 1 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Duration (mo)</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, stickDurationMonths: Math.max(1, g.stickDurationMonths - 1) }))}>−</button>
                <input
                  type="number"
                  min={1}
                  value={stickGlobals.stickDurationMonths}
                  onChange={e => setStickGlobals(g => ({ ...g, stickDurationMonths: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, stickDurationMonths: g.stickDurationMonths + 1 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Avg Sq Ft / Home</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, projectSqFt: Math.max(0, g.projectSqFt - 100) }))}>−</button>
                <input
                  type="number"
                  min={0}
                  value={stickGlobals.projectSqFt}
                  onChange={e => setStickGlobals(g => ({ ...g, projectSqFt: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, projectSqFt: g.projectSqFt + 100 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dev Cost $/sf</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, devCostPerSqFt: Math.max(0, g.devCostPerSqFt - 10) }))}>−</button>
                <input
                  type="number"
                  min={0}
                  value={stickGlobals.devCostPerSqFt}
                  onChange={e => setStickGlobals(g => ({ ...g, devCostPerSqFt: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, devCostPerSqFt: g.devCostPerSqFt + 10 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sales $/sf</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, salesPerSqFt: Math.max(0, g.salesPerSqFt - 10) }))}>−</button>
                <input
                  type="number"
                  min={0}
                  value={stickGlobals.salesPerSqFt}
                  onChange={e => setStickGlobals(g => ({ ...g, salesPerSqFt: Number(e.target.value) }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button type="button" className="px-2 text-lg text-blue-700" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => setStickGlobals(g => ({ ...g, salesPerSqFt: g.salesPerSqFt + 10 }))}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">GC Fee % (on dev value)</label>
              <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                <button
                  type="button"
                  className="px-2 text-lg text-blue-700"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setStickGlobals(g => ({
                    ...g,
                    gcFeePercent: Math.max(0, Math.round((g.gcFeePercent - 0.25) * 4) / 4)
                  }))}
                >−</button>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.25}
                  value={stickGlobals.gcFeePercent}
                  onChange={e => setStickGlobals(g => ({
                    ...g,
                    gcFeePercent: Math.max(0, Number(e.target.value))
                  }))}
                  className="w-full bg-transparent border-none text-sm text-center focus:ring-0"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="px-2 text-lg text-blue-700"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setStickGlobals(g => ({
                    ...g,
                    gcFeePercent: Math.min(100, Math.round((g.gcFeePercent + 0.25) * 4) / 4)
                  }))}
                >+</button>
              </div>
            </div>
          </div>
        </div>
        {/* Stick Table */}
        <div className="mb-8">
          <div className="text-lg font-bold text-[#1F2B3A] mb-2">Stick Built — Phased Starts</div>
          <table className="min-w-full border border-slate-200 rounded text-xs mb-2">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2 text-right">Start</th>
                <th className="px-2 py-2 text-right">Duration</th>
                <th className="px-2 py-2 text-right">End</th>
                <th className="px-2 py-2 text-right">Sq Ft</th>
                <th className="px-2 py-2 text-right">Dev $/sf</th>
                <th className="px-2 py-2 text-right">Dev Value</th>
                <th className="px-2 py-2 text-right">Sales Revenue</th>
                <th className="px-2 py-2 text-right">Fee ($)</th> {/* New column */}
              </tr>
            </thead>
            <tbody>
              {stickPlan.map((h, i) => {
                const fee = (h.estimatedDevelopmentValue * (stickGlobals.gcFeePercent / 100));
                return (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="px-2 py-2">{i + 1}</td>
                    <td className="px-2 py-2 text-right">{h.startMonth}</td>
                    <td className="px-2 py-2 text-right">{h.duration}</td>
                    <td className="px-2 py-2 text-right">{h.endMonth}</td>
                    <td className="px-2 py-2 text-right">{h.projectSqFt.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(h.devCostPerSqFt)}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(h.estimatedDevelopmentValue)}</td>
                    <td className="px-2 py-2 text-right">
                      {fmtCurrency((h.projectSqFt || 0) * (h.salesPerSqFt || 0) * (h.homesSold || 1))}
                    </td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(fee)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="text-[11px] text-slate-500">
            Starts {stickGlobals.phaseSize} homes every {stickGlobals.stickPhaseInterval} months, capacity‑limited to {stickGlobals.wipCapHomes} concurrent homes.
          </div>
        </div>

        {/* TEKTRA Table */}
        <div className="mb-8">
          <div className="text-lg font-bold" style={{ color: BRAND.accent }}>TEKTRA — Phased Starts (Accelerated)</div>
          <table className="min-w-full border border-slate-200 rounded text-xs mb-2">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2 text-right">Start</th>
                <th className="px-2 py-2 text-right">Duration</th>
                <th className="px-2 py-2 text-right">End</th>
                <th className="px-2 py-2 text-right">Sq Ft</th>
                <th className="px-2 py-2 text-right">Dev $/sf</th>
                <th className="px-2 py-2 text-right">Dev Value</th>
                <th className="px-2 py-2 text-right">Sales Revenue</th>
                <th className="px-2 py-2 text-right">Fee ($)</th> {/* New column */}
              </tr>
            </thead>
            <tbody>
              {tektraPlan.map((h, i) => {
                const fee = (h.estimatedDevelopmentValue * (tektraGlobals.gcFeePercent / 100));
                return (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="px-2 py-2">{i + 1}</td>
                    <td className="px-2 py-2 text-right">{h.startMonth}</td>
                    <td className="px-2 py-2 text-right">{h.duration}</td>
                    <td className="px-2 py-2 text-right">{h.endMonth}</td>
                    <td className="px-2 py-2 text-right">{h.projectSqFt.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(h.devCostPerSqFt)}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(h.estimatedDevelopmentValue)}</td>
                    <td className="px-2 py-2 text-right">
                      {fmtCurrency((h.projectSqFt || 0) * (h.salesPerSqFt || 0) * (h.homesSold || 1))}
                    </td>
                    <td className="px-2 py-2 text-right">{fmtCurrency(fee)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="text-[11px] text-slate-500">
            TEKTRA interval ≈ {stickGlobals.stickPhaseInterval} × ({tektraGlobals.tektraDurationMonths}/{stickGlobals.stickDurationMonths}) = <b>{tektraPhaseInterval}</b> mo (min 1), under the same {tektraGlobals.wipCapHomes}-home cap.
          </div>
        </div>

        {/* Annual summary (compact) */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500">Total Year‑1 Opportunity (All‑in)</div>
              <div className="text-2xl font-semibold">{fmtCurrency(annualOpportunity)}</div>
            </div>
            <div className="text-sm text-slate-600">
              <div>Δ Dev Value: <span className="font-medium">{fmtCurrency(incrementalDevValue)}</span></div>
              <div>Δ Fee Profit: <span className="font-medium">{fmtCurrency(incrementalFee)}</span></div>
              <div>Δ Sales @ Close: <span className="font-medium">{fmtCurrency(incrementalSales)}</span></div>
              <div>Carry Savings: <span className="font-medium" style={{ color: BRAND.accent }}>{fmtCurrency(carrySavings)}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function CostsView() {
    // --- Division 1 cost categories ---
    const division1CostCategories = [
      { key: 'architecturalDesign', label: 'Architectural Design', code: 'ARCH-DES', description: "less CA required on site during project (RFI's, CO's, etc)" },
      { key: 'engineeringDesign', label: 'Engineering Design', code: 'ENG-DES', description: "less CA required on site during project (RFI's, CO's, etc)" },
      { key: 'buildersRiskInsurance', label: "Builder's Risk and GL Insurance", code: 'BLDR-INS', description: 'ability to provide product quicker can reduce Ins costs' },
      { key: 'carryCost', label: 'Carry Cost', code: 'CARRY', description: 'Active home carrying cost avoided (user input, replaces Lot and Property Cost)' },
      { key: 'adminLoanMarketingFees', label: 'Admin, Loan, Marketing, Broker fees', code: 'ADMIN-FEE', description: 'quicker product delivery means less fees' },
      { key: 'supervision', label: 'Supervision', code: 'SUPERV', description: 'quicker product delivery equals much less PM/Supervision labor' },
      { key: 'genSkilledLabor', label: 'Gen & Skilled Labor', code: 'GEN-LAB', description: 'quicker product delivery equals much less Gen/Skilled labor' },
      { key: 'preConServices', label: 'Pre Con Services', code: 'PRECON', description: "pre-con costs are mostly absorbed in Tektra's scope" },
      { key: 'tempFencing', label: 'Temp Fencing', code: 'TEMP-FENCE', description: 'less project duration means less monthly costs' },
      { key: 'bundledUtilities', label: 'Bundled Utilities', code: 'UTILITIES', description: 'less project duration means less monthly costs' },
      { key: 'jobsiteTrailer', label: 'Jobsite Trailer', code: 'TRAILER', description: 'less project duration means less monthly costs' },
      { key: 'jobToilet', label: 'Job Toilet', code: 'TOILET', description: 'less project duration means less monthly costs' },
      { key: 'storage', label: 'Storage', code: 'STORAGE', description: 'less project duration means less monthly costs' },
      { key: 'dumpsters', label: 'Dumpsters', code: 'DUMPSTER', description: 'less project duration means less monthly costs, less waste w/TEKTRA' },
      { key: 'infrastructureExcavation', label: 'Infrastructure, Excavation and Fill', code: 'INFRA-EXC', description: 'quicker framing means no re-mobilization' }
    ];
    const totalSqFt = stickGlobals.totalHomes * stickGlobals.projectSqFt;

    const primaryCostElements = [
      { key: 'framingMaterials', label: 'Framing Materials incl Waste', code: 'FRAM-MAT', description: 'Materials and waste for framing construction', unit: '/sqft', rate: 35 },
      { key: 'framingLabor', label: "Framing Labor including CO's", code: 'FRAM-LAB', description: 'Labor costs including change orders for framing', unit: '/sqft', rate: 30 },
      { key: 'doorWindowInstall', label: 'Door and Window Install', code: 'DW-INST', description: 'Installation costs for doors and windows', unit: '/sqft', rate: 8 }
    ];

    // --- Add cost state for cost tab ---
    const [costData, setCostData] = useState(() => ({
      framingMaterials: 35.00,
      framingLabor: 30.00,
      doorWindowInstall: 8,
      architecturalDesign: 300.00,
      engineeringDesign: 100.00,
      buildersRiskInsurance: 55.20,
      carryCost: 1000, // new field for Carry Cost, user input
      adminLoanMarketingFees: 138.00,
      supervision: 750.00,
      genSkilledLabor: 350.00,
      preConServices: 255.00,
      tempFencing: 46.15,
      bundledUtilities: 23.08,
      jobsiteTrailer: 18.46,
      jobToilet: 10.00,
      storage: 20.00,
      dumpsters: 125.00,
      infrastructureExcavation: 60.00,
      gcDeveloperFeePercent: 0,
      generalLiabilityInsurancePercent: 0,
      workdaysSaved: 0,
      gcFeePercent: stickGlobals.gcFeePercent,
      primaryCostElements,
      stickDurationMonths: stickGlobals.stickDurationMonths,
      tektraDurationMonths: tektraGlobals.tektraDurationMonths,
    }));

    // --- Cost calculation logic ---
    function calculateCosts(data: typeof costData, totalSqFt: number) {
      // Primary Construction Costs
      const primaryConstructionTotal = totalSqFt > 0 && data.primaryCostElements
        ? data.primaryCostElements.reduce((sum: number, element: { rate: number }) => sum + (element.rate * totalSqFt), 0)
        : 0;

      // Division 1 Costs
      // Duration difference in months, convert to days (assume 21.67 workdays per month)
      const durationDiffMonths = (data.stickDurationMonths || 0) - (data.tektraDurationMonths || 0);
      const durationDiffDays = Math.max(0, durationDiffMonths * 21.67);

      const division1DailyCosts = division1CostCategories.reduce((sum, category) => {
        const cost = Number(data[category.key as keyof typeof costData]) || 0;
        return sum + cost;
      }, 0);

      const division1DailyCostsWithFees = division1DailyCosts > 0
        ? division1DailyCosts + (division1DailyCosts * (data.gcDeveloperFeePercent / 100)) + (division1DailyCosts * (data.generalLiabilityInsurancePercent / 100))
        : 0;

      const division1TraditionalCost = division1DailyCostsWithFees * durationDiffDays;

      // Client GC Fee
      const clientGcFee = primaryConstructionTotal > 0
        ? (primaryConstructionTotal + division1TraditionalCost) * (data.gcFeePercent / 100)
        : 0;


      // Total Costs
      const traditionalTotalCost = primaryConstructionTotal + division1TraditionalCost + clientGcFee;
      const tektraTotalCost = totalSqFt > 0 ? (88 * totalSqFt) : 0;

      // Total Savings
      const totalSavings = traditionalTotalCost - tektraTotalCost;

      return {
        totalSavings: totalSavings > 0 ? totalSavings : 0,
        savingsPerSqFt: totalSqFt > 0 ? (traditionalTotalCost / totalSqFt) - (tektraTotalCost / totalSqFt) : 0,
        roiPercent: tektraTotalCost > 0 ? ((totalSavings) / tektraTotalCost) * 100 : 0,
        traditionalTotalCost,
        tektraTotalCost,
        durationDiffMonths,
        durationDiffDays,
      };
    }

    // --- Helper for currency formatting ---
    function formatCurrency(amount: number) {
      return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    }

    // --- Cost tab rendering ---
    const calculations = calculateCosts(costData, totalSqFt);

    return (
           <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4">Cost Analysis</h2>
        <div className="mb-2 text-sm text-slate-600">
          <b>Stick Built Duration:</b> <input
            type="number"
            value={costData.stickDurationMonths}
            min={1}
            onChange={e => setCostData(prev => ({ ...prev, stickDurationMonths: Number(e.target.value) }))}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-16 text-right mr-2"
          /> months
          <b className="ml-4">TEKTRA Duration:</b> <input
            type="number"
            value={costData.tektraDurationMonths}
            min={1}
            onChange={e => setCostData(prev => ({ ...prev, tektraDurationMonths: Number(e.target.value) }))}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-16 text-right mr-2"
          /> months
          <span className="ml-4 text-xs text-slate-500">Duration difference: <b>{calculations.durationDiffMonths}</b> months / <b>{calculations.durationDiffDays.toFixed(0)}</b> days</span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Cost Element</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Unit Cost</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-slate-600 bg-slate-50">Stick Built</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-slate-600 bg-blue-50">TEKTRA</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Difference</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Badge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Division 1 Costs */}
            {division1CostCategories.map((category) => {
             
              const stickBuiltDailyCost = Number(costData[category.key as keyof typeof costData]) || 0;
              // Use durationDiffDays for total cost calculation
              const stickBuiltCost = stickBuiltDailyCost * calculations.durationDiffDays;
              const tektraCost = 0;
              const diff = tektraCost - stickBuiltCost;
              const badge = diff < 0
                ? <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Savings</span>
                : diff > 0
                  ? <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">Extra Cost</span>
                  : <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold">No Change</span>;

              return (
                <tr key={category.key} className="hover:bg-slate-50/30 transition-colors">
                  <td className="py-3 px-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{category.label}</div>
                      <div className="text-xs text-slate-500">{category.description}</div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-sm">
                    <div className="flex items-center justify-end">
                      {(() => {
                        const v = costData[category.key as keyof typeof costData];
                        const valueForInput: number | '' = typeof v === 'number' ? v : '';

                        return (
                          <input
                            type="number"
                            inputMode="decimal"
                            value={valueForInput}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, '');
                              setCostData(prev => ({
                                ...prev,
                                [category.key]: raw === '' ? 0 : Number(raw), // or keep ''/undefined if your model allows
                              }));
                            }}
                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-0"
                          />
                        );
                      })()}
                      <span className="ml-2 text-xs text-slate-500">/day</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-sm bg-slate-50 text-red-600">
                    {formatCurrency(stickBuiltCost)}
                  </td>
                  <td className="py-3 px-2 text-right text-sm bg-blue-50 text-blue-600">
                    {formatCurrency(tektraCost)}
                  </td>
                  <td className={`py-3 px-2 text-right text-sm ${diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {diff < 0 ? `-${formatCurrency(Math.abs(diff))}` : diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(0)}
                  </td>
                  <td className="py-3 px-2 text-right">{badge}</td>
                </tr>
              );
            })}

            {/* Primary Construction Costs */}
            {primaryCostElements.map((element, idx) => {
              const stickBuiltCost = element.rate * totalSqFt;
              // Make rate editable
              const tektraCost = 0;
              const diff = tektraCost - stickBuiltCost;
              const badge = diff < 0
                ? <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Savings</span>
                : diff > 0
                  ? <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">Extra Cost</span>
                  : <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold">No Change</span>;

              return (
                <tr key={element.key} className="hover:bg-slate-50/30 transition-colors">
                  <td className="py-3 px-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{element.label}</div>
                      <div className="text-xs text-slate-500">{element.description}</div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-sm">
                    <div className="flex items-center justify-end">
                      <input
                        type="number"
                        value={costData.primaryCostElements[idx].rate}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/[^0-9.]/g, '');
                          setCostData(prev => ({
                            ...prev,
                            primaryCostElements: prev.primaryCostElements.map((el, i) =>
                              i === idx
                                ? { ...el, rate: Number(rawValue) }
                                : el
                            )
                          }));
                        }}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-0"
                      />
                      <span className="ml-2 text-xs text-slate-500">{element.unit}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-sm bg-slate-50 text-red-600">
                    {formatCurrency(stickBuiltCost)}
                  </td>
                  <td className="py-3 px-2 text-right text-sm bg-blue-50 text-blue-700 font-bold">
                    {formatCurrency(tektraCost)}
                  </td>
                  <td className={`py-3 px-2 text-right text-sm ${diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {diff < 0 ? `-${formatCurrency(Math.abs(diff))}` : diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(0)}
                  </td>
                  <td className="py-3 px-2 text-right">{badge}</td>
                </tr>
              );
            })}

            {/* GC Fee */}
            <tr className="hover:bg-slate-50/30 transition-colors">
              <td className="py-3 px-2">
                <div>
                  <div className="text-sm font-medium text-slate-800">GC Fee</div>
                  <div className="text-xs text-slate-500">Calculated based on total construction costs</div>
                </div>
              </td>
              <td className="py-3 px-2 text-right text-sm">
                <input
                  type="number"
                  value={costData.gcFeePercent || ''}
                  onChange={(e) => setCostData(prev => ({ ...prev, gcFeePercent: Number(e.target.value) }))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-0"
                  placeholder="Enter fee percentage"
                  min="0"
                  max="100"
                />
              </td>
              <td className="py-3 px-2 text-right text-sm bg-slate-50 text-red-600">
                {formatCurrency(calculations.traditionalTotalCost * (costData.gcFeePercent / 100) || 0)}
              </td>
              <td className="py-3 px-2 text-right text-sm bg-blue-50 text-blue-600">
                {formatCurrency(calculations.tektraTotalCost * (costData.gcFeePercent / 100) || 0)}
              </td>
              <td className={`py-3 px-2 text-right text-sm ${calculations.tektraTotalCost < calculations.traditionalTotalCost ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(calculations.traditionalTotalCost - calculations.tektraTotalCost))}
              </td>
              <td className="py-3 px-2 text-right">
                {calculations.tektraTotalCost < calculations.traditionalTotalCost
                  ? <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Savings</span>
                  : <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">Extra Cost</span>
                }
              </td>
            </tr>

            {/* TEKTRA Package Line */}
            <tr className="hover:bg-blue-50/30 transition-colors font-semibold">
              <td className="py-3 px-2">
                <div>
                  <div className="text-sm font-bold text-blue-800">TEKTRA Package</div>
                  <div className="text-xs text-blue-600">All primary construction costs included</div>
                </div>
              </td>
              <td className="py-3 px-2 text-right text-sm">
                <span className="text-blue-700 font-bold"></span>
              </td>
              <td className="py-3 px-2 text-right text-sm bg-slate-50 text-slate-400">—</td>
              <td className="py-3 px-2 text-right text-sm bg-blue-50 text-blue-700 font-bold">
                {formatCurrency(88 * totalSqFt)}
              </td>
              <td className="py-3 px-2 text-right text-blue-700">Included</td>
              <td className="py-3 px-2 text-right">
                <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold">TEKTRA</span>
              </td>
            </tr>

            {/* Summary Row */}
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-lg">
              <td className="py-6 px-2 text-slate-800">Total Project Cost</td>
              <td className="py-6 px-2 text-right text-slate-400">N/A</td>
              <td className="py-6 px-2 text-right text-red-600 bg-slate-50">
                {formatCurrency(calculations.traditionalTotalCost || 0)}
              </td>
              <td className="py-6 px-2 text-right text-blue-600 bg-blue-50">
                {formatCurrency(calculations.tektraTotalCost || 0)}
              </td>
              <td className={`py-6 px-2 text-right text-xl ${calculations.totalSavings > 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(calculations.traditionalTotalCost - calculations.tektraTotalCost)}
              </td>
              <td className="py-6 px-2 text-right">
                {calculations.totalSavings > 0
                  ? <span className="inline-block px-3 py-2 rounded bg-green-100 text-green-700 text-sm font-bold">Portfolio Savings</span>
                  : <span className="inline-block px-3 py-2 rounded bg-red-100 text-red-700 text-sm font-bold">Portfolio Extra Cost</span>
                }
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header + Instructions */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">TEKTRA Savings Calculator</h1>
          <p className="text-lg text-slate-700 mb-4">
            Welcome! This tool helps you compare phased construction scenarios for stick-built vs TEKTRA, analyze costs, and visualize revenue acceleration.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-slate-800 shadow-sm mx-auto max-w-2xl">
            <ul className="list-disc pl-5 space-y-2 text-base">
              <li>
                <b>Projects Tab:</b> Define your pipeline, phase size, cadence, durations, and cost assumptions for both stick-built and TEKTRA.
              </li>
              <li>
                <b>Dashboard Tab:</b> View KPIs, charts, and monthly/annual breakdowns for revenue, sales, and completions.
              </li>
              <li>
                <b>Costs Tab:</b> Adjust cost categories and see portfolio-level savings based on duration and cost inputs.
              </li>
              <li>
                <b>Export:</b> Download a PDF summary for sharing or client presentations.
              </li>
            </ul>
            <div className="mt-4 text-sm text-slate-600">
              <b>Tip:</b> Use the plus/minus buttons to quickly adjust values. All calculations update instantly.
            </div>
          </div>
        </div>
      </div>
      {/* Tabs and Views */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <Tabs
          value={activeTab}
          onChange={tab => setActiveTab(tab as 'dashboard'|'projects'|'costs')}
          items={[
            { value: 'dashboard', label: 'Dashboard' },
            { value: 'projects', label: 'Projects' },
            { value: 'costs', label: 'Costs' },
          ]}
        />
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'projects' && <ProjectsView />}
        {activeTab === 'costs' && <CostsView />}
      </div>
    </div>
  );
}
