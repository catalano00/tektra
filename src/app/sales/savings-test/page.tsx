"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Info, RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/**
 * TEKTRA SavingsCalculator
 *
 * Goal: Let a developer/GC play with a few high‑leverage inputs to see
 * throughput gains (more closings per year) and holding‑cost savings
 * from cycle‑time compression when switching from Stick‑Built to TEKTRA.
 *
 * Assumptions (kept intentionally simple):
 * - Starts are steady through the year (uniform cadence)
 * - Capacity is governed by average months in construction
 * - With shorter cycle time, annual completions scale by (stickMonths / tektraMonths)
 * - Carrying/site overhead savings only apply to the baseline 1:1 projects
 *   that would have been built anyway (not the incremental projects enabled by speed)
 * - Optional: include a per‑project TEKTRA delta (premium or savings)
 */

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const percent = (n: number) => `${(n * 100).toFixed(0)}%`;

export default function SavingsCalculator() {
  const [inputs, setInputs] = useState({
    baselineProjectsPerYear: 12,
    stickMonths: 10,
    tektraMonths: 6,
    avgSalesPrice: 1000000,
    grossMarginPct: 0.2,
    monthlyCarryPerProject: 8000, // interest, taxes, insurance, utilities
    siteOverheadPerMonth: 15000, // superintendent, rentals, temp facilities
    tektraDeltaPerProject: 0, // + cost or - savings
    showAdvanced: false,
  });

  const onChangeNum = (key: keyof typeof inputs) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.replace(/,/g, "");
      setInputs((s) => ({ ...s, [key]: Number(v) }));
    };

  const onChangePct = (key: keyof typeof inputs) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      const pct = Math.min(1, Math.max(0, Number(v) / 100));
      setInputs((s) => ({ ...s, [key]: pct }));
    };

  const reset = () =>
    setInputs({
      baselineProjectsPerYear: 12,
      stickMonths: 10,
      tektraMonths: 6,
      avgSalesPrice: 1000000,
      grossMarginPct: 0.2,
      monthlyCarryPerProject: 8000,
      siteOverheadPerMonth: 15000,
      tektraDeltaPerProject: 0,
      showAdvanced: inputs.showAdvanced,
    });

  const calc = useMemo(() => {
    const {
      baselineProjectsPerYear,
      stickMonths,
      tektraMonths,
      avgSalesPrice,
      grossMarginPct,
      monthlyCarryPerProject,
      siteOverheadPerMonth,
      tektraDeltaPerProject,
    } = inputs;

    const throughputFactor = stickMonths > 0 && tektraMonths > 0 ? stickMonths / tektraMonths : 0;

    // Annual projects possible with TEKTRA time compression
    const tektraProjectsPerYear = Math.floor(baselineProjectsPerYear * throughputFactor);

    const extraProjects = Math.max(0, tektraProjectsPerYear - baselineProjectsPerYear);

    const monthsSavedPerProject = Math.max(0, stickMonths - tektraMonths);

    // Carry/site savings only on the baseline set that would have been built anyway
    const perProjectMonthlyBurn = monthlyCarryPerProject + siteOverheadPerMonth;
    const carrySavingsPerProject = monthsSavedPerProject * perProjectMonthlyBurn;
    const annualCarrySavings = Math.min(tektraProjectsPerYear, baselineProjectsPerYear) * carrySavingsPerProject;

    // Optional TEKTRA delta applies to all TEKTRA builds completed per year
    const annualTektraDelta = tektraProjectsPerYear * tektraDeltaPerProject;

    // Revenue & margin uplift from incremental homes enabled by speed
    const incrementalRevenue = extraProjects * avgSalesPrice;
    const incrementalGrossMargin = incrementalRevenue * grossMarginPct;

    const totalFinancialImpact = annualCarrySavings + incrementalGrossMargin - annualTektraDelta;

    const paybackMonths = totalFinancialImpact > 0
      ? Math.max(0.5, (tektraDeltaPerProject > 0 ? tektraDeltaPerProject : 1) / (carrySavingsPerProject / monthsSavedPerProject || 1))
      : undefined;

    const chartData = [
      {
        name: "Annual Completions",
        StickBuilt: baselineProjectsPerYear,
        TEKTRA: tektraProjectsPerYear,
      },
      {
        name: "Annual Revenue",
        StickBuilt: baselineProjectsPerYear * avgSalesPrice,
        TEKTRA: tektraProjectsPerYear * avgSalesPrice,
      },
      {
        name: "Annual Gross Margin",
        StickBuilt: baselineProjectsPerYear * avgSalesPrice * grossMarginPct,
        TEKTRA: tektraProjectsPerYear * avgSalesPrice * grossMarginPct,
      },
    ];

    return {
      throughputFactor,
      tektraProjectsPerYear,
      extraProjects,
      monthsSavedPerProject,
      carrySavingsPerProject,
      annualCarrySavings,
      annualTektraDelta,
      incrementalRevenue,
      incrementalGrossMargin,
      totalFinancialImpact,
      paybackMonths,
      chartData,
    };
  }, [inputs]);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">TEKTRA Savings Calculator</h1>
        <Button variant="ghost" className="gap-2" onClick={reset}>
          <RefreshCw className="h-4 w-4" /> Reset defaults
        </Button>
      </div>

      <Tabs defaultValue="inputs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
        </TabsList>

        <TabsContent value="inputs">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Project & Financial Inputs</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Field
                label="Baseline projects / year"
                value={inputs.baselineProjectsPerYear}
                onChange={onChangeNum("baselineProjectsPerYear")}
                hint="How many homes you complete in a typical year today."
              />
              <Field
                label="Stick‑Built avg months"
                value={inputs.stickMonths}
                onChange={onChangeNum("stickMonths")}
                hint="Avg duration from start to close for stick construction."
              />
              <Field
                label="TEKTRA avg months"
                value={inputs.tektraMonths}
                onChange={onChangeNum("tektraMonths")}
                hint="Avg duration from start to close using TEKTRA."
              />
              <Field
                label="Average sales price ($)"
                value={inputs.avgSalesPrice}
                onChange={onChangeNum("avgSalesPrice")}
                money
              />
              <Field
                label="Gross margin %"
                value={inputs.grossMarginPct * 100}
                onChange={onChangePct("grossMarginPct")}
                suffix="%"
              />
              <Field
                label="Monthly carry / project ($)"
                value={inputs.monthlyCarryPerProject}
                onChange={onChangeNum("monthlyCarryPerProject")}
                hint="Interest, taxes, insurance, utilities."
                money
              />
              <Field
                label="Site overhead / month ($)"
                value={inputs.siteOverheadPerMonth}
                onChange={onChangeNum("siteOverheadPerMonth")}
                hint="Supers, rentals, temp facilities."
                money
              />
              <div className="md:col-span-2 flex items-center justify-between rounded-xl border p-4">
                <div>
                  <Label className="mb-1 block">Advanced options</Label>
                  <p className="text-sm text-muted-foreground">Toggle to include TEKTRA per‑project delta.</p>
                </div>
                <Switch
                  checked={inputs.showAdvanced}
                  onCheckedChange={(v) => setInputs((s) => ({ ...s, showAdvanced: v }))}
                />
              </div>
              {inputs.showAdvanced && (
                <Field
                  label="TEKTRA delta / project ($)"
                  value={inputs.tektraDeltaPerProject}
                  onChange={onChangeNum("tektraDeltaPerProject")}
                  hint="Enter a positive number for premium or negative for savings."
                  money
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SummaryCard
              title="Annual Completions"
              primary={`${calc.tektraProjectsPerYear} with TEKTRA`}
              secondary={`${inputs.baselineProjectsPerYear} baseline`}
              footnote={`Throughput factor ${calc.throughputFactor.toFixed(2)}×`}
            />
            <SummaryCard
              title="Incremental Projects"
              primary={`${calc.extraProjects}`}
              secondary={`from ${inputs.stickMonths}→${inputs.tektraMonths} months`}
              footnote={`${calc.monthsSavedPerProject} months saved per home`}
            />
            <SummaryCard
              title="Annualized Opportunity"
              primary={`${currency(calc.totalFinancialImpact)}`}
              secondary={`${currency(calc.annualCarrySavings)} carry + ${currency(calc.incrementalGrossMargin)} margin − ${currency(calc.annualTektraDelta)} delta`}
              footnote={calc.paybackMonths ? `Simple payback ~ ${calc.paybackMonths.toFixed(1)} months` : ""}
              highlight
            />
          </div>

          <Card className="shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Revenue & Completions (Annual)</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calc.chartData}>
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                  <Tooltip formatter={(value: any) => (typeof value === "number" ? currency(value) : value)} />
                  <Legend />
                  <Bar dataKey="StickBuilt" /* color auto */ fillOpacity={0.6} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="TEKTRA" /* color auto */ radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assumptions">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Info className="h-4 w-4"/> Modeling Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li>Annual completions scale with cycle time: <strong>TEKTRA annual units = baseline units × (stick months ÷ TEKTRA months)</strong> (rounded down).</li>
                <li>Carrying & site overhead savings apply only to the baseline set of homes you would build either way, not to incremental homes unlocked by speed.</li>
                <li>Incremental revenue is <strong>extra units × average sales price</strong>. The calculator shows gross margin uplift at your entered %.</li>
                <li>Use the Advanced toggle to include a per‑home TEKTRA delta (premium or savings). This applies to all TEKTRA homes completed per year.</li>
                <li>Starts are assumed to be level through the year with no other bottlenecks (land, trades, capital). For more realism, add a max‑starts constraint or WIP cap.</li>
                <li>If you sell/close before construction completes (pre‑sales), adjust the revenue timing assumption accordingly.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  suffix,
  money,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
  suffix?: string;
  money?: boolean;
}) {
  const display = money ? value.toLocaleString() : value;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        {money && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">$</span>}
        <Input
          inputMode="decimal"
          value={display}
          onChange={onChange}
          className={`${money ? "pl-7" : ""}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SummaryCard({
  title,
  primary,
  secondary,
  footnote,
  highlight,
}: {
  title: string;
  primary: string;
  secondary?: string;
  footnote?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`shadow-sm ${highlight ? "border-emerald-500" : ""}`}>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{primary}</div>
        {secondary && <div className="mt-1 text-sm text-muted-foreground">{secondary}</div>}
        {footnote && <div className="mt-4 text-xs text-muted-foreground">{footnote}</div>}
      </CardContent>
    </Card>
  );
}
