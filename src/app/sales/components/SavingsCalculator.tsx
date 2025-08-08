"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  DollarSign,
  Gauge,
  CalendarClock,
  Factory,
  BarChart3,
  PiggyBank,
  FileCheck2,
  TrendingUp,
  Users,
  Wand2,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
  Legend,
  BarChart, // ← add this
} from "recharts";

/**
 * TEKTRA Savings & Benefits Page
 * Updated: Adds a stick‑built vs TEKTRA multi‑phase comparison planner for GCs/Developers.
 *
 * Accessibility: semantic landmarks, labeled inputs, aria-live for computed values,
 * high-contrast, keyboard-friendly, reduced motion support.
 */

// Defaults for calculator assumptions (simplified)
const DEFAULTS = {
  projectSqft: 120000,
  avgSalePerSqft: 350,   // Development sales revenue basis
  panelizedCostPerSqft: 210, // Construction revenue (TEKTRA contract)
  traditionalCostPerSqft: 235,
  marginTargetPct: 18,
};

function currency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function percent(n: number) {
  return `${n.toFixed(0)}%`;
}

function weeksBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (7 * 24 * 3600 * 1000)));
}

function monthsBetween(a: Date, b: Date) {
  const msPerMonth = 30.4375 * 24 * 3600 * 1000; // avg month
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / msPerMonth));
}

function addMonths(d: Date, months: number) {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + months);
  return nd;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function SavingsPage() {
  const prefersReducedMotion = useReducedMotion();
  const [unit, setUnit] = useState<"imperial" | "metric">("imperial");

  // Inputs (simplified to core value props)
  const [projectName, setProjectName] = useState("Aspen Villas");
  const [developer, setDeveloper] = useState("Summit Peak Dev Co.");
  const [leadName, setLeadName] = useState("Gary Johnson");
  const [market, setMarket] = useState("Mountain West");
  const [projectSqft, setProjectSqft] = useState(DEFAULTS.projectSqft);
  const [avgSalePerSqft, setAvgSalePerSqft] = useState(DEFAULTS.avgSalePerSqft);
  const [panelCost, setPanelCost] = useState(DEFAULTS.panelizedCostPerSqft);
  const [tradCost, setTradCost] = useState(DEFAULTS.traditionalCostPerSqft);
  const [marginTargetPct, setMarginTargetPct] = useState(DEFAULTS.marginTargetPct);

  // Key Dates
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [closingDate, setClosingDate] = useState<string>(new Date(Date.now() + 120 * 24 * 3600 * 1000).toISOString().slice(0, 10));

  // Multi‑phase planner inputs
  const [totalHomes, setTotalHomes] = useState(24);
  const [phases, setPhases] = useState(6);
  const [homesPerPhase, setHomesPerPhase] = useState(4);
  const [phaseSpacingMonths, setPhaseSpacingMonths] = useState(3);
  const [stickMonthsPerPhase, setStickMonthsPerPhase] = useState(10);
  const [tektraMonthsPerPhase, setTektraMonthsPerPhase] = useState(6);
  const [tektraJit, setTektraJit] = useState(true);

  // Computations (financials) — focus on two revenue paths
  const calc = useMemo(() => {
    const developmentSalesRevenue = projectSqft * avgSalePerSqft; // Path 2
    const constructionRevenue = projectSqft * panelCost;          // Path 1 (TEKTRA contract)
    const onsiteCost = projectSqft * tradCost;                     // For ROI / savings context
    const savings = onsiteCost - constructionRevenue;
    const marginAtTarget = developmentSalesRevenue * (marginTargetPct / 100);
    const roi = savings / (constructionRevenue || 1);

    return {
      developmentSalesRevenue,
      constructionRevenue,
      onsiteCost,
      savings,
      marginAtTarget,
      roi,
    };
  }, [projectSqft, avgSalePerSqft, panelCost, tradCost, marginTargetPct]);

  // Computations (phasing timelines)
  const phasing = useMemo(() => {
    const start = new Date(startDate);
    let lastTektraEnd = addMonths(start, 0);

    const phasesArr = Array.from({ length: phases }, (_, i) => {
      const phaseIdx = i + 1;

      // Stick (phase-locked)
      const stickStart = addMonths(start, i * phaseSpacingMonths);
      const stickEnd = addMonths(stickStart, stickMonthsPerPhase);

      // TEKTRA: planned start, optionally pull-forward if JIT
      const plannedTektraStart = addMonths(start, i * phaseSpacingMonths);
      const tektraStart =
        i === 0
          ? plannedTektraStart
          : (tektraJit
              ? new Date(Math.min(plannedTektraStart.getTime(), lastTektraEnd.getTime()))
              : plannedTektraStart);
      const tektraEnd = addMonths(tektraStart, tektraMonthsPerPhase);
      lastTektraEnd = tektraEnd;

      return {
        phase: phaseIdx,
        homes: homesPerPhase,
        stickStart,
        stickEnd,
        tektraStart,
        tektraEnd,
        stickOffsetWk: weeksBetween(start, stickStart),
        tektraOffsetWk: weeksBetween(start, tektraStart),
        stickDurationWk: weeksBetween(stickStart, stickEnd),
        tektraDurationWk: weeksBetween(tektraStart, tektraEnd),
      };
    });

    const stickProjectEnd = phasesArr.reduce((d, p) => (p.stickEnd > d ? p.stickEnd : d), start);
    const tektraProjectEnd = phasesArr.reduce((d, p) => (p.tektraEnd > d ? p.tektraEnd : d), start);

    return { phasesArr, stickProjectEnd, tektraProjectEnd };
  }, [
    startDate,
    phases,
    phaseSpacingMonths,
    stickMonthsPerPhase,
    tektraMonthsPerPhase,
    homesPerPhase,
    tektraJit, // dependency so toggle recomputes
  ]);

  // Derived: time saved across the whole plan
  const projectWeeksSaved = Math.max(0, weeksBetween(phasing.tektraProjectEnd, phasing.stickProjectEnd));
  const projectMonthsStick = Math.max(1, monthsBetween(new Date(startDate), phasing.stickProjectEnd));
  const projectMonthsTektra = Math.max(1, monthsBetween(new Date(startDate), phasing.tektraProjectEnd));

  // Cashflow view: monthly recognition (simple even spread over project duration)
  const cashflowData = useMemo(() => {
    const months = Math.max(projectMonthsStick, projectMonthsTektra);
    const devPerMonthStick = calc.developmentSalesRevenue / projectMonthsStick;
    const devPerMonthTektra = calc.developmentSalesRevenue / projectMonthsTektra;
    const constructionPerMonthTektra = calc.constructionRevenue / projectMonthsTektra;

    return Array.from({ length: months }, (_, i) => {
      const m = i + 1;
      return {
        month: m,
        stickDev: m <= projectMonthsStick ? devPerMonthStick : 0,
        tektraDev: m <= projectMonthsTektra ? devPerMonthTektra : 0,
        tektraConst: m <= projectMonthsTektra ? constructionPerMonthTektra : 0,
      };
    });
  }, [calc.developmentSalesRevenue, calc.constructionRevenue, projectMonthsStick, projectMonthsTektra]);

  const liveRegionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `Updated: development sales ${currency(
        calc.developmentSalesRevenue
      )}, construction revenue ${currency(calc.constructionRevenue)}, time saved ${projectWeeksSaved} weeks.`;
    }
  }, [calc, projectWeeksSaved]);

  // Build stacked-bar data for Gantt‑like schedule visualization (in weeks)
  const timelineData = useMemo(() => {
    return phasing.phasesArr.map((p) => ({
      phase: `P${p.phase}`,
      stickOffset: p.stickOffsetWk,
      stickDuration: p.stickDurationWk,
      tektraOffset: p.tektraOffsetWk,
      tektraDuration: p.tektraDurationWk,
      stickLabel: `${toISO(p.stickStart)} → ${toISO(p.stickEnd)}`,
      tektraLabel: `${toISO(p.tektraStart)} → ${toISO(p.tektraEnd)}`,
    }));
  }, [phasing]);

  const totalHomesPlanned = phases * homesPerPhase;

  return (
    <main role="main" className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-black focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Hero */}
      <section aria-label="TEKTRA value proposition" className="relative overflow-hidden border-b bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-2 md:py-16">
          <div>
            <Badge variant="secondary" className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1">
              <Factory className="h-4 w-4" aria-hidden /> Off‑Site • Panelized • Precisely Built
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Faster Schedules, Tighter Budgets, Higher Quality.
            </h1>
            <p className="mt-3 max-w-prose text-lg text-slate-600">
              Show your investors, lenders, and city stakeholders how TEKTRA’s off‑site
              model reduces risk and unlocks margin on day one — with transparent math.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" className="rounded-2xl">
                <FileCheck2 className="mr-2 h-5 w-5" aria-hidden /> Generate Pro Forma
              </Button>
              <Button variant="outline" size="lg" className="rounded-2xl">
                <BarChart3 className="mr-2 h-5 w-5" aria-hidden /> Download Summary PDF
              </Button>
            </div>
          </div>
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 gap-4"
          >
            <KpiCard title="Development Sales" icon={DollarSign} value={currency(calc.developmentSalesRevenue)} sub="Total potential" />
            <KpiCard title="Construction Revenue" icon={PiggyBank} value={currency(calc.constructionRevenue)} sub="TEKTRA contract" />
            <KpiCard title="Time Saved" icon={CalendarClock} value={`${projectWeeksSaved} wk`} sub="Project-wide vs. stick" />
            <KpiCard title="ROI vs On‑site" icon={Gauge} value={`${(calc.roi * 100).toFixed(0)}%`} sub="From cost delta" />
          </motion.div>
        </div>
      </section>

      {/* Live region for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRegionRef} />

      {/* Content */}
      <section id="content" className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: inputs */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5" aria-hidden /> Project Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="project-name">Project name</Label>
                <Input id="project-name" value={projectName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectName(e.target.value)} placeholder="e.g., Aspen Villas" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="developer">Developer</Label>
                <Input id="developer" value={developer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeveloper(e.target.value)} placeholder="Your company" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="lead-name">Lead / Client</Label>
                <Input id="lead-name" value={leadName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeadName(e.target.value)} placeholder="e.g., Gary Johnson" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="market">Market</Label>
                <Input id="market" value={market} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarket(e.target.value)} placeholder="Region / city" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="start-date">Project start date</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="close-date">Projected closing date</Label>
                <Input id="close-date" type="date" value={closingDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClosingDate(e.target.value)} />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="unit">Units</Label>
                <Select value={unit} onValueChange={(v: any) => setUnit(v)}>
                  <SelectTrigger id="unit" aria-label="Select units">
                    <SelectValue placeholder="Select units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Measurement</SelectLabel>
                      <SelectItem value="imperial">Imperial (ft²)</SelectItem>
                      <SelectItem value="metric">Metric (m²)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="sqft">Buildable area ({unit === "imperial" ? "ft²" : "m²"})</Label>
                <Input id="sqft" inputMode="numeric" value={projectSqft} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectSqft(Number(e.target.value || 0))} />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="rev">Average sale price / {unit === "imperial" ? "ft²" : "m²"}</Label>
                <Input id="rev" inputMode="decimal" value={avgSalePerSqft} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvgSalePerSqft(Number(e.target.value || 0))} />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="panel">TEKTRA cost / {unit === "imperial" ? "ft²" : "m²"}</Label>
                <Input id="panel" inputMode="decimal" value={panelCost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPanelCost(Number(e.target.value || 0))} />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="trad">Traditional cost / {unit === "imperial" ? "ft²" : "m²"}</Label>
                <Input id="trad" inputMode="decimal" value={tradCost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTradCost(Number(e.target.value || 0))} />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="margin">Target gross margin %</Label>
                <Input id="margin" inputMode="decimal" value={marginTargetPct} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarginTargetPct(Number(e.target.value || 0))} />
              </div>

              <Button className="w-full rounded-2xl" variant="secondary">
                <FileCheck2 className="mr-2 h-5 w-5" aria-hidden /> Save Scenario
              </Button>
            </CardContent>
          </Card>

          {/* Right column: results */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="text-xl">Business Outcomes</span>
                  <Badge variant="outline" className="rounded-xl">
                    {projectName} • {developer}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Development Sales (total)</span>
                    <span className="font-medium text-slate-900">{currency(calc.developmentSalesRevenue)}</span>
                  </div>
                  <Progress value={100} aria-label="Development sales" />

                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Construction Revenue (TEKTRA)</span>
                    <span className="font-medium text-slate-900">{currency(calc.constructionRevenue)}</span>
                  </div>
                  <Progress value={Math.min(100, (calc.constructionRevenue / calc.developmentSalesRevenue) * 100)} aria-label="Construction share" />

                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Savings vs On‑site</span>
                    <span className="font-semibold text-emerald-700">{currency(calc.savings)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Target Margin" value={`${DEFAULTS.marginTargetPct}%`} icon={TrendingUp} />
                  <MiniStat label="ROI vs On‑site" value={`${(calc.roi * 100).toFixed(0)}%`} icon={Gauge} />
                  <MiniStat label="Start" value={startDate} icon={CalendarClock} />
                  <MiniStat label="Closing" value={closingDate} icon={CalendarClock} />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="cashflow" className="w-full">
              <TabsList aria-label="Charts">
                <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
                <TabsTrigger value="phasing">Stick vs TEKTRA (Phases)</TabsTrigger>
              </TabsList>

              <TabsContent value="cashflow">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Revenue Recognition</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={cashflowData} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" label={{ value: "Month", position: "insideRight", offset: -5 }} />
                        <YAxis
                          tickFormatter={(v) =>
                            v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`
                          }
                        />
                        <Tooltip
                          formatter={(v: number, name: string) =>
                            v >= 1_000_000 ? [`$${(v / 1_000_000).toFixed(2)}M`, name] : [`$${(v / 1_000).toFixed(0)}K`, name]
                          }
                        />
                        <Legend />
                        <Bar dataKey="stickDev" name="Dev Sales (Stick)" fill="#ef4444" />
                        <Bar dataKey="tektraDev" name="Dev Sales (TEKTRA)" fill="#10b981" />
                        <Line type="monotone" dataKey="tektraConst" name="Construction (TEKTRA)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="mt-3 text-xs text-slate-600">
                      TEKTRA recognizes development sales earlier by compressing the build schedule, while construction
                      revenue is recognized during the shortened TEKTRA timeline.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Phasing tab remains as in your current file */}
              <TabsContent value="phasing">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" aria-hidden /> Multi‑phase Plan — Stick vs TEKTRA</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="grid gap-2">
                        <Label htmlFor="total-homes">Total homes</Label>
                        <Input id="total-homes" inputMode="numeric" value={totalHomes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotalHomes(Number(e.target.value || 0))} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phases">Phases</Label>
                        <Input id="phases" inputMode="numeric" value={phases} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhases(Number(e.target.value || 0))} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="homes-per-phase">Homes per phase</Label>
                        <Input id="homes-per-phase" inputMode="numeric" value={homesPerPhase} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHomesPerPhase(Number(e.target.value || 0))} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phase-spacing">Start a new phase every (months)</Label>
                        <Input id="phase-spacing" inputMode="numeric" value={phaseSpacingMonths} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhaseSpacingMonths(Number(e.target.value || 0))} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="stick-months">Stick‑built duration / phase (months)</Label>
                        <Input id="stick-months" inputMode="numeric" value={stickMonthsPerPhase} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStickMonthsPerPhase(Number(e.target.value || 0))} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="tektra-months">TEKTRA duration / phase (months)</Label>
                        <Input id="tektra-months" inputMode="numeric" value={tektraMonthsPerPhase} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTektraMonthsPerPhase(Number(e.target.value || 0))} />
                      </div>
                    </div>

                    <div className="rounded-xl border bg-white p-4 text-sm text-slate-700">
                      <div className="flex flex-wrap gap-4">
                        <div><strong>Stick finish:</strong> {toISO(phasing.stickProjectEnd)}</div>
                        <div><strong>TEKTRA finish:</strong> {toISO(phasing.tektraProjectEnd)}</div>
                        <div><strong>Total homes planned:</strong> {totalHomesPlanned}</div>
                      </div>
                    </div>

                    {/* Phasing chart (fix tooltip + improve colors) */}
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timelineData} margin={{ left: 10, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="phase" />
                          <YAxis label={{ value: "Weeks from project start", angle: -90, position: "insideLeft" }} />
                          <Tooltip
                            formatter={(value: any, name: any, ctx: any) => {
                              if (name === "TEKTRA duration") return [`${value} wk`, ctx?.payload?.tektraLabel];
                              if (name === "Stick duration") return [`${value} wk`, ctx?.payload?.stickLabel];
                              return [value, name];
                            }}
                            contentStyle={{ fontSize: 12 }}
                          />
                          {/* Invisible offsets to create Gantt stacking */}
                          <Bar dataKey="stickOffset" stackId="stick" fill="rgba(0,0,0,0)" name="_offset" />
                          <Bar dataKey="stickDuration" stackId="stick" name="Stick duration" fill="#ef4444" />
                          <Bar dataKey="tektraOffset" stackId="tektra" fill="rgba(0,0,0,0)" name="_offset" />
                          <Bar dataKey="tektraDuration" stackId="tektra" name="TEKTRA duration" fill="#10b981" />
                          <Legend />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      {phasing.phasesArr.map((p) => (
                        <div key={p.phase} className="rounded-xl border bg-white p-4">
                          <div className="mb-1 text-sm font-semibold">Phase {p.phase} • {p.homes} homes</div>
                          <div className="text-xs text-slate-600">Stick: {toISO(p.stickStart)} → {toISO(p.stickEnd)}</div>
                          <div className="text-xs text-slate-600">TEKTRA: {toISO(p.tektraStart)} → {toISO(p.tektraEnd)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-600">Give your client transparency and control—adjust variables and export a polished comparison.</div>
                      <div className="flex gap-3">
                        <Button size="lg" className="rounded-2xl"><Wand2 className="mr-2 h-5 w-5" aria-hidden /> Generate Client PDF</Button>
                        <Button size="lg" variant="outline" className="rounded-2xl">Export CSV</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Credibility / Proof points */}
            <Card>
              <CardHeader>
                <CardTitle>Why Developers Choose TEKTRA</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <ProofPoint title="Bankable Schedules" body="Parallel path factory production shaves weeks off your critical path with predictable deliveries." />
                <ProofPoint title="Cost Certainty" body="Guaranteed line‑item pricing per panel and transparent BOMs reduce scope creep and surprises." />
                <ProofPoint title="Quality at Scale" body="Enclosed plant environment, jigs, and QA checks deliver straighter walls, tighter envelopes, fewer call‑backs." />
              </CardContent>
            </Card>

            {/* Call to action */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-6">
              <div>
                <h3 className="text-xl font-semibold">Ready for a project‑specific takeoff?</h3>
                <p className="text-slate-600">Upload drawings to generate an itemized quote with per‑panel costs and timeline.</p>
              </div>
              <div className="flex gap-3">
                <Button size="lg" className="rounded-2xl">Upload CAD / PDF</Button>
                <Button size="lg" variant="outline" className="rounded-2xl">Talk to an Engineer</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-10 max-w-7xl px-4 pb-16 text-sm text-slate-500">© {new Date().getFullYear()} TEKTRA • Off‑site Manufacturing</footer>
    </main>
  );
}

// ===== Components =====

function KpiCard({ title, value, sub, icon: Icon }: { title: string; value: string; sub?: string; icon: any }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-slate-600">
          <Icon className="h-4 w-4" aria-hidden /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {sub ? <div className="text-xs text-slate-500">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
      <Icon className="h-5 w-5" aria-hidden />
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function ProofPoint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-1 text-sm font-semibold">{title}</div>
      <p className="text-sm text-slate-600">{body}</p>
    </div>
  );
}
