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
import Brochure, { PlanTotals, YearTotals } from '@/components/pdf/brochure';
import { useChartCapture } from '@/components/useChartCapture';

// ---------- Brand theme for both UI and PDF ----------
const BRAND = {
  company: 'TEKTRA',
  tagline: 'Precision-built. Faster cycles. Better returns.',
  logoPng: '/brand/tektra-logo.png',
  primary: '#0A0F1C',    // deep midnight blue-black
  secondary: '#1C2633',  // refined dark slate-blue
  accent: '#1B3A94',  // premium navy-blue
  ink: '#111827',        // cool black-blue ink
  muted: '#717784',      // premium steel gray
  contact: { name: 'TEKTRA Partnerships', email: 'partners@tektra.example', phone: '555-555-5555', web: 'tektra.example' },
};

// Chart palette (premium, print-safe)
const COLORS = {
  stickDev: '#8892A0',     // cool slate steel
  tektraDev: '#1E40AF',    // rich blue-800
  stickSales: '#4A5568',   // deep slate-gray
  tektraSales: '#1B3A94',  // premium navy-blue
};

// ---------- Utils ----------
const fmtCurrency = (n: number, digits = 0) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: digits });

// Add abbreviated USD formatter
function formatAbbreviatedUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtCurrency(n);
}

// ---------- Types ----------
interface GlobalSettings {
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

export default function SavingsCalculator() {
  const [globals, setGlobals] = useState<GlobalSettings>({
    totalHomes: 24,
    phaseSize: 4,
    stickPhaseInterval: 3,
    wipCapHomes: 8,
    stickDurationMonths: 10,
    tektraDurationMonths: 6,
    projectSqFt: 3000,
    devCostPerSqFt: 650,
    salesPerSqFt: 850,
    homesSoldPerProject: 1,
    gcFeePercent: 8,
    carryPerMonth: 15000,
  });

  // Derived TEKTRA cadence (min 1 month)
  const tektraPhaseInterval = useMemo(() => {
    const ratio = globals.tektraDurationMonths / Math.max(1, globals.stickDurationMonths);
    return Math.max(1, Math.floor(globals.stickPhaseInterval * ratio));
  }, [globals.stickPhaseInterval, globals.stickDurationMonths, globals.tektraDurationMonths]);

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

    const capacityFreeEvents = new Map<number, number>(); // month -> count freeing
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

  const stickPlan = useMemo(
    () => buildCadencedSchedule(
      globals.totalHomes,
      globals.stickDurationMonths,
      globals.stickPhaseInterval,
      globals.phaseSize,
      globals.wipCapHomes,
      'stick',
      globals
    ),
    [globals]
  );

  const tektraPlan = useMemo(
    () => buildCadencedSchedule(
      globals.totalHomes,
      globals.tektraDurationMonths,
      tektraPhaseInterval,
      globals.phaseSize,
      globals.wipCapHomes,
      'tektra',
      globals
    ),
    [globals, tektraPhaseInterval]
  );

  // ---------- Year-1 series ----------
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
        brand={BRAND}
        inputs={globals}
        kpis={kpis}
        annuals={planTotals}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TEKTRA_Brochure_${new Date().toISOString().slice(0,10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Title + Export */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">TEKTRA Opportunity — Phased Starts (Year-1)</h1>
            <p className="text-sm text-slate-600 mt-1">
              Define phase size and cadence for stick-built. TEKTRA pulls phase starts forward based on cycle-time savings, under the same WIP cap.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center px-3 py-2 rounded bg-[#0B1220] text-white text-sm font-semibold hover:opacity-90"
          >
            Export PDF Brochure
          </button>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Additional Completions (Year-1)</div>
            <div className="text-2xl font-semibold" style={{ color: BRAND.accent }}>{additionalCompletions}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Δ Development Value</div>
            <div className="text-2xl font-semibold">{fmtCurrency(incrementalDevValue)}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Δ Fee Profit</div>
            <div className="text-2xl font-semibold">{fmtCurrency(incrementalFee)}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Carry Savings</div>
            <div className="text-2xl font-semibold" style={{ color: BRAND.accent }}>{fmtCurrency(carrySavings)}</div>
          </div>
        </div>

        {/* Global inputs */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">Total Homes (Pipeline)</label>
              <input type="number" min={0} value={globals.totalHomes}
                onChange={e => setGlobals(g => ({ ...g, totalHomes: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Homes per Phase</label>
              <input type="number" min={1} value={globals.phaseSize}
                onChange={e => setGlobals(g => ({ ...g, phaseSize: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Stick Phase Interval (mo)</label>
              <input type="number" min={1} value={globals.stickPhaseInterval}
                onChange={e => setGlobals(g => ({ ...g, stickPhaseInterval: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              <div className="text-[10px] text-slate-500 mt-1">
                TEKTRA interval ≈ {globals.stickPhaseInterval} × ({globals.tektraDurationMonths}/{globals.stickDurationMonths}) = <b>{tektraPhaseInterval}</b> mo
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Max Concurrent Homes (WIP cap)</label>
              <input type="number" min={1} value={globals.wipCapHomes}
                onChange={e => setGlobals(g => ({ ...g, wipCapHomes: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Stick Duration (mo)</label>
              <input type="number" min={1} value={globals.stickDurationMonths}
                onChange={e => setGlobals(g => ({ ...g, stickDurationMonths: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">TEKTRA Duration (mo)</label>
              <input type="number" min={1} value={globals.tektraDurationMonths}
                onChange={e => setGlobals(g => ({ ...g, tektraDurationMonths: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Avg Sq Ft / Home</label>
              <input type="number" min={0} value={globals.projectSqFt}
                onChange={e => setGlobals(g => ({ ...g, projectSqFt: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Dev Cost $/sf</label>
              <input type="number" min={0} value={globals.devCostPerSqFt}
                onChange={e => setGlobals(g => ({ ...g, devCostPerSqFt: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Sales $/sf</label>
              <input type="number" min={0} value={globals.salesPerSqFt}
                onChange={e => setGlobals(g => ({ ...g, salesPerSqFt: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">GC Fee % (on dev value)</label>
              <input type="number" min={0} max={100} value={globals.gcFeePercent}
                onChange={e => setGlobals(g => ({ ...g, gcFeePercent: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Carry / Active Home / mo</label>
              <input type="number" min={0} value={globals.carryPerMonth}
                onChange={e => setGlobals(g => ({ ...g, carryPerMonth: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
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
              </tr>
            </thead>
            <tbody>
              {stickPlan.map((h, i) => (
                <tr key={h.id} className="border-t border-slate-100">
                  <td className="px-2 py-2">{i + 1}</td>
                  <td className="px-2 py-2 text-right">{h.startMonth}</td>
                  <td className="px-2 py-2 text-right">{h.duration}</td>
                  <td className="px-2 py-2 text-right">{h.endMonth}</td>
                  <td className="px-2 py-2 text-right">{h.projectSqFt.toLocaleString()}</td>
                  <td className="px-2 py-2 text-right">{fmtCurrency(h.devCostPerSqFt)}</td>
                  <td className="px-2 py-2 text-right">{fmtCurrency(h.estimatedDevelopmentValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[11px] text-slate-500">
            Starts {globals.phaseSize} homes every {globals.stickPhaseInterval} months, capacity-limited to {globals.wipCapHomes} concurrent homes.
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
              </tr>
            </thead>
            <tbody>
              {tektraPlan.map((h, i) => (
                <tr key={h.id} className="border-t border-slate-100">
                  <td className="px-2 py-2">{i + 1}</td>
                  <td className="px-2 py-2 text-right">{h.startMonth}</td>
                  <td className="px-2 py-2 text-right">{h.duration}</td>
                  <td className="px-2 py-2 text-right">{h.endMonth}</td>
                  <td className="px-2 py-2 text-right">{h.projectSqFt.toLocaleString()}</td>
                  <td className="px-2 py-2 text-right">{fmtCurrency(h.devCostPerSqFt)}</td>
                  <td className="px-2 py-2 text-right">{fmtCurrency(h.estimatedDevelopmentValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[11px] text-slate-500">
            TEKTRA interval ≈ {globals.stickPhaseInterval} × ({globals.tektraDurationMonths}/{globals.stickDurationMonths}) = <b>{tektraPhaseInterval}</b> mo (min 1), under the same {globals.wipCapHomes}-home cap.
          </div>
        </div>

        {/* Year-1 Chart */}
        <div className="mb-8">
          <div className="text-lg font-bold text-slate-900 mb-2">Year-1 Results (Dev Value + Sales)</div>
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
            Development value recognized straight-line while active. Sales book at completion month. Carry applies only while active.
          </div>
        </div>

        {/* Annualized (3y) Chart */}
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
        </div>

        {/* Annual summary */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500">Total Year-1 Opportunity (All-in)</div>
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
    </div>
  );
}