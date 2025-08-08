'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar // <-- Add these imports
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Percent, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  Clock,
  Zap,
  Award,
  BarChart3,
  Calculator,
  Building,
  Users,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus
} from 'lucide-react';

interface ProjectData {
  daysSaved: string;
  id: string;
  projectName: string;
  projectAddress: string;
  projectSqFt: number;
  estimatedDevelopmentValue?: number;
  developmentCostPerSqFt?: number;
  estimateDate: string;
  projectDuration?: number;
  phase?: number; // <-- Add phase
  startMonth?: number; // <-- NEW: drives project start (1-based month)
}

interface SavingsData {
  primaryCostElements: {
    key: string;
    label: string;
    code: string;
    description: string;
    unit: string;
    rate: number;
  }[];
  // Client Details
  projectsPerYear: number;
  gcFeePercent: number;

  // Project Info
  client: string;
  projects: ProjectData[];

  // Project Cost Elements (from cost codes)
  framingMaterials: number;
  framingLabor: number;
  doorWindowInstall: number;
  architecturalDesign: number;
  engineeringDesign: number;
  buildersRiskInsurance: number;
  lotPropertyCost: number;
  adminLoanMarketingFees: number;
  supervision: number;
  genSkilledLabor: number;
  preConServices: number;
  tempFencing: number;
  bundledUtilities: number;
  jobsiteTrailer: number;
  jobToilet: number;
  storage: number;
  dumpsters: number;
  infrastructureExcavation: number;

  // Fees and Insurance
  gcDeveloperFeePercent: number;
  generalLiabilityInsurancePercent: number;

  // TEKTRA Reductions (percentages)
  overallReductionPercent: number;
  timeReductionPercent: number;

  // Timeline
  traditionalTimelineWeeks: number;
  workdaysSaved: number;

  // NEW: Sales assumptions
  salesPricePerSqFt: number;
  homesSoldPerPhase: Record<number, number>;
}

const primaryCostElements = [
  { key: 'framingMaterials', label: 'Framing Materials incl Waste', code: 'FRAM-MAT', description: 'Materials and waste for framing construction', unit: '/sqft', rate: 35 },
  { key: 'framingLabor', label: 'Framing Labor including CO\'s', code: 'FRAM-LAB', description: 'Labor costs including change orders for framing', unit: '/sqft', rate: 30 },
  { key: 'doorWindowInstall', label: 'Door and Window Install', code: 'DW-INST', description: 'Installation costs for doors and windows', unit: '/sqft', rate: 8 }
];

const initialSavingsData: SavingsData = {
  // Client Details
  projectsPerYear: 0,
  gcFeePercent: 0,

  // Project Info
  client: '',
  projects: [
    {
      id: '1',
      projectName: '',
      projectAddress: '',
      projectSqFt: 3000, // Default: 3000 sqft
      estimateDate: '',
      daysSaved: '20',   // Default: 20 work days saved
      projectDuration: 10, // Default: 10 months
      developmentCostPerSqFt: 650, // Default: $650 per sqft
      estimatedDevelopmentValue: 3000 * 650, // Default calculated value
      phase: 1,
      startMonth: 1, // <-- default start
    }
  ],

  // Project Cost Elements (from cost codes with calculated values)
  framingMaterials: 35.00,
  framingLabor: 30.00,
  doorWindowInstall: 8,
  architecturalDesign: 300.00,
  engineeringDesign: 100.00,
  buildersRiskInsurance: 55.20,
  lotPropertyCost: 0,
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

  // Fees and Insurance (percentages)
  gcDeveloperFeePercent: 0,
  generalLiabilityInsurancePercent: 0,

  // Timeline
  traditionalTimelineWeeks: 0,
  workdaysSaved: 0,

  overallReductionPercent: 0,
  timeReductionPercent: 0,
  primaryCostElements: primaryCostElements, // Initialize with the predefined array

  // NEW: Sales assumptions
  salesPricePerSqFt: 850,               // luxury sales basis
  homesSoldPerPhase: { 1: 0 },          // editable per phase below
};

const division1CostCategories = [
  { key: 'architecturalDesign', label: 'Architectural Design', code: 'ARCH-DES', description: 'less CA required on site during project (RFI\'s, CO\'s, etc)' },
  { key: 'engineeringDesign', label: 'Engineering Design', code: 'ENG-DES', description: 'less CA required on site during project (RFI\'s, CO\'s, etc)' },
  { key: 'buildersRiskInsurance', label: 'Builder\'s Risk and GL Insurance', code: 'BLDR-INS', description: 'ability to provide product quicker can reduce Ins costs' },
  { key: 'lotPropertyCost', label: 'Lot and Property Cost', code: 'LOT-PROP', description: 'quicker product delivery means quicker sale and quick return' },
  { key: 'adminLoanMarketingFees', label: 'Admin, Loan, Marketing, Broker fees', code: 'ADMIN-FEE', description: 'quicker product delivery means less fees' },
  { key: 'supervision', label: 'Supervision', code: 'SUPERV', description: 'quicker product delivery equals much less PM/Supervision labor' },
  { key: 'genSkilledLabor', label: 'Gen & Skilled Labor', code: 'GEN-LAB', description: 'quicker product delivery equals much less Gen/Skilled labor' },
  { key: 'preConServices', label: 'Pre Con Services', code: 'PRECON', description: 'pre-con costs are mostly absorbed in Tektra\'s scope' },
  { key: 'tempFencing', label: 'Temp Fencing', code: 'TEMP-FENCE', description: 'less project duration means less monthly costs' },
  { key: 'bundledUtilities', label: 'Bundled Utilities', code: 'UTILITIES', description: 'less project duration means less monthly costs' },
  { key: 'jobsiteTrailer', label: 'Jobsite Trailer', code: 'TRAILER', description: 'less project duration means less monthly costs' },
  { key: 'jobToilet', label: 'Job Toilet', code: 'TOILET', description: 'less project duration means less monthly costs' },
  { key: 'storage', label: 'Storage', code: 'STORAGE', description: 'less project duration means less monthly costs' },
  { key: 'dumpsters', label: 'Dumpsters', code: 'DUMPSTER', description: 'less project duration means less monthly costs, less waste w/TEKTRA' },
  { key: 'infrastructureExcavation', label: 'Infrastructure, Excavation and Fill', code: 'INFRA-EXC', description: 'quicker framing means no re-mobilization' }
];


export default function SavingsCalculator() {
  const [savingsData, setSavingsData] = useState<SavingsData>(initialSavingsData);
  const [calculations, setCalculations] = useState<any>({ monthlyData: [] });
  const [isDivision1Expanded, setIsDivision1Expanded] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isDivision1TableExpanded, setIsDivision1TableExpanded] = useState(false);

  useEffect(() => {
    const calc = calculateSavings(savingsData);
    setCalculations(calc);
  }, [savingsData]);

  // Helper: get projects sorted by phase
  function getProjectsByPhase(projects: ProjectData[]) {
    return [...projects].sort((a, b) => (a.phase || 1) - (b.phase || 1));
  }

  // Helper: get project start months based on explicit startMonth or phase sequencing
  function getProjectStartMonths(projects: ProjectData[]) {
    const sorted = getProjectsByPhase(projects);
    let startMonths: number[] = [];
    let phaseStart: Record<number, number> = {};
    let phaseEnd: Record<number, number> = {};

    let currentMonth = 1;
    const uniquePhases = Array.from(new Set(sorted.map(p => p.phase || 1))).sort((a, b) => a - b);
    for (const phase of uniquePhases) {
      phaseStart[phase] = currentMonth;
      const projectsInPhase = sorted.filter(p => (p.phase || 1) === phase);
      const maxDuration = Math.max(...projectsInPhase.map(p => Number(p.projectDuration) || 0), 0);
      phaseEnd[phase] = currentMonth + maxDuration;
      currentMonth = phaseEnd[phase];
    }

    // Respect explicit project.startMonth if provided; otherwise use phase start
    for (let i = 0; i < sorted.length; i++) {
      const phase = sorted[i].phase || 1;
      startMonths[i] = Number(sorted[i].startMonth) || phaseStart[phase];
    }
    return startMonths;
  }

  // Helper: TEKTRA start months (use explicit startMonth when provided; otherwise phase sequence with reduced durations)
  function getTektraProjectStartMonths(projects: ProjectData[]) {
    const sorted = getProjectsByPhase(projects);
    let startMonths: number[] = [];
    let phaseStart: Record<number, number> = {};
    let phaseEnd: Record<number, number> = {};

    let currentMonth = 1;
    const uniquePhases = Array.from(new Set(sorted.map(p => p.phase || 1))).sort((a, b) => a - b);
    for (const phase of uniquePhases) {
      phaseStart[phase] = currentMonth;
      const projectsInPhase = sorted.filter(p => (p.phase || 1) === phase);
      const maxTektraDuration = Math.max(
        ...projectsInPhase.map(p => {
          const duration = Number(p.projectDuration) || 0;
          const monthsSaved = (Number(p.daysSaved) || 0) / 21.67;
          return Math.max(duration - monthsSaved, 1);
        }),
        0
      );
      phaseEnd[phase] = currentMonth + maxTektraDuration;
      currentMonth = phaseEnd[phase];
    }

    for (let i = 0; i < sorted.length; i++) {
      const phase = sorted[i].phase || 1;
      startMonths[i] = Number(sorted[i].startMonth) || phaseStart[phase];
    }
    return startMonths;
  }

  function getRevenueChartData(projects: ProjectData[]) {
    const sorted = getProjectsByPhase(projects);
    const startMonths = getProjectStartMonths(sorted);
    const tektraStartMonths = getTektraProjectStartMonths(sorted);

    // Calculate stick/tektra end months and phase completion months
    const stickEndMonths: number[] = [];
    const tektraEndMonths: number[] = [];
    const phases = Array.from(new Set(sorted.map(p => p.phase || 1))).sort((a, b) => a - b);

    let maxMonths = 0;
    let maxTektraMonths = 0;

    // Per-phase aggregates for sales recognition
    const phaseTotals: Record<number, { totalSqFt: number; count: number; stickEnd: number; tektraEnd: number }> = {};

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const duration = Number(p.projectDuration) || 0;
      const daysSaved = Number(p.daysSaved) || 0;
      const monthsSaved = daysSaved / 21.67;
      const tektraDuration = Math.max(duration - monthsSaved, 1);

      const sEnd = (startMonths[i] || 1) + duration - 1;
      const tEnd = (tektraStartMonths[i] || 1) + Math.ceil(tektraDuration) - 1;
      stickEndMonths[i] = sEnd;
      tektraEndMonths[i] = tEnd;

      maxMonths = Math.max(maxMonths, sEnd);
      maxTektraMonths = Math.max(maxTektraMonths, tEnd);

      const phase = p.phase || 1;
      const agg = phaseTotals[phase] || { totalSqFt: 0, count: 0, stickEnd: 0, tektraEnd: 0 };
      agg.totalSqFt += Number(p.projectSqFt) || 0;
      agg.count += 1;
      agg.stickEnd = Math.max(agg.stickEnd, sEnd);
      agg.tektraEnd = Math.max(agg.tektraEnd, tEnd);
      phaseTotals[phase] = agg;
    }

    if (!maxMonths && !maxTektraMonths) return [];

    const lastTektraMonth = maxTektraMonths;
    let chartData: {
      month: number;
      stickBuilt: number;
      tektra: number;
      opportunity: number;
      devSalesStick: number;   // NEW
      devSalesTektra: number;  // NEW
    }[] = [];

    for (let month = 1; month <= Math.max(maxMonths, maxTektraMonths); month++) {
      let stickBuilt = 0;
      let tektra = 0;

      // Stick Built (even recognition)
      for (let i = 0; i < sorted.length; i++) {
        const duration = Number(sorted[i].projectDuration) || 0;
        const value = Number(sorted[i].estimatedDevelopmentValue) || 0;
        const start = startMonths[i];
        if (month >= start && month < start + duration && duration > 0) {
          stickBuilt += value / duration;
        }
      }

      // TEKTRA (even recognition over reduced duration)
      for (let i = 0; i < sorted.length; i++) {
        const duration = Number(sorted[i].projectDuration) || 0;
        const daysSaved = Number(sorted[i].daysSaved) || 0;
        const monthsSaved = daysSaved / 21.67;
        const tektraDuration = Math.max(duration - monthsSaved, 1);
        const value = Number(sorted[i].estimatedDevelopmentValue) || 0;
        const start = tektraStartMonths[i];
        if (tektraDuration > 0 && month >= start && month < start + Math.ceil(tektraDuration)) {
          const perMonth = value / tektraDuration;
          if (month === start + Math.ceil(tektraDuration) - 1) {
            tektra += value - (perMonth * (Math.ceil(tektraDuration) - 1));
          } else {
            tektra += perMonth;
          }
        }
      }

      // NEW: Development sales revenue recognized on phase completion
      let devSalesStick = 0;
      let devSalesTektra = 0;

      phases.forEach(phase => {
        const agg = phaseTotals[phase];
        const homes = savingsData.homesSoldPerPhase[phase] || 0;
        if (!agg || homes <= 0) return;

        const avgSqFtPerHome = agg.count > 0 ? agg.totalSqFt / agg.count : 0;
        const phaseRevenue = homes * avgSqFtPerHome * (savingsData.salesPricePerSqFt || 0);

        if (month === agg.stickEnd) devSalesStick += phaseRevenue;
        if (month === agg.tektraEnd) devSalesTektra += phaseRevenue;
      });

      // Opportunity carry-over (unchanged)
      let opportunity = 0;
      if (month > lastTektraMonth && month <= maxMonths) {
        opportunity = stickBuilt;
      }

      chartData.push({
        month,
        stickBuilt,
        tektra,
        opportunity,
        devSalesStick,
        devSalesTektra,
      });
    }
    return chartData;
  }

  function calculateSavings(data: SavingsData) {
    const totalSqFt = data.projects.reduce((sum, project) => sum + (project.projectSqFt || 0), 0);

    // Primary Construction Costs
    const primaryConstructionTotal = totalSqFt > 0 && data.primaryCostElements
      ? data.primaryCostElements.reduce((sum: number, element: { rate: number }) => sum + (element.rate * totalSqFt), 0)
      : 0;

      // Division 1 Costs
      const division1DailyCosts = division1CostCategories.reduce((sum, category) => {
        const cost = Number(data[category.key as keyof SavingsData]) || 0;
        return sum + cost;
      }, 0);

      const division1DailyCostsWithFees = division1DailyCosts > 0
        ? division1DailyCosts + (division1DailyCosts * (data.gcDeveloperFeePercent / 100)) + (division1DailyCosts * (data.generalLiabilityInsurancePercent / 100))
        : 0;

      const division1TraditionalCost = division1DailyCostsWithFees * (data.workdaysSaved || 0);

    // Client GC Fee
    const clientGcFee = primaryConstructionTotal > 0
      ? (primaryConstructionTotal + division1TraditionalCost) * (data.gcFeePercent / 100)
      : 0;

    // Total Costs
    const traditionalTotalCost = primaryConstructionTotal + division1TraditionalCost + clientGcFee;
    const tektraTotalCost = totalSqFt > 0 ? (88 * totalSqFt) : 0;

    // Total Savings
    const totalSavings = traditionalTotalCost - tektraTotalCost;

    console.log('Total Square Footage:', totalSqFt);
    console.log('Primary Construction Total:', primaryConstructionTotal);
    console.log('Division 1 Traditional Cost:', division1TraditionalCost);
    console.log('Client GC Fee:', clientGcFee);
    console.log('Traditional Total Cost:', traditionalTotalCost);

    return {
      totalSavings: totalSavings > 0 ? totalSavings : 0, // Ensure no negative savings
      savingsPerSqFt: totalSqFt > 0 ? (traditionalTotalCost / totalSqFt) - (tektraTotalCost / totalSqFt) : 0,
      roiPercent: tektraTotalCost > 0 ? ((totalSavings * (data.projectsPerYear || 1)) / tektraTotalCost) * 100 : 0,
      traditionalTotalCost,
      tektraTotalCost,
    };
  }

  function getProfitChartData(projects: ProjectData[], gcFeePercent: number) {
    // Calculate the maximum duration in months for all projects (stick built)
    let maxMonths = Math.max(
      ...projects.map(p => Number(p.projectDuration) || 0)
    );
    if (!maxMonths) return [];

    let chartData: { month: number; stickBuiltProfit: number; tektraProfit: number; additionalProfit: number }[] = [];

    for (let month = 1; month <= maxMonths; month++) {
      let stickBuiltProfit = 0;
      let tektraProfit = 0;
      projects.forEach(project => {
        const durationMonths = Number(project.projectDuration) || 0;
        const daysSaved = Number(project.daysSaved) || 0;
        // Work days per month ~21.67
        const monthsSaved = daysSaved / 21.67;
        const tektraDurationMonths = Math.max(durationMonths - monthsSaved, 1);
        const totalRevenue = Number(project.estimatedDevelopmentValue) || 0;
        const feeRate = gcFeePercent / 100;

        // Stick Built: profit (fee) recognized linearly over original duration
        if (month <= durationMonths && durationMonths > 0) {
          stickBuiltProfit += (totalRevenue * feeRate) / durationMonths;
        }
        // TEKTRA: profit (fee) recognized linearly over shortened duration
        if (month <= tektraDurationMonths && tektraDurationMonths > 0) {
          tektraProfit += (totalRevenue * feeRate) / tektraDurationMonths;
        }
      });
      chartData.push({
        month,
        stickBuiltProfit,
        tektraProfit,
        additionalProfit: tektraProfit - stickBuiltProfit
      });
    }

    return chartData;
  }

  const handleInputChange = (field: keyof SavingsData, value: string | number) => {
    setSavingsData(prev => {
      const updatedData = {
        ...prev,
        [field]: typeof value === 'string' ? (isNaN(Number(value)) ? value : Number(value)) : value
      };

      // Automatically update projectsPerYear based on the count of projects
      if (field === 'projects') {
        updatedData.projectsPerYear = updatedData.projects.length;
      }

      return updatedData;
    });
  };

  const handleProjectChange = (projectId: string, field: keyof ProjectData, value: string | number) => {
    setSavingsData(prev => ({
      ...prev,
      projects: prev.projects.map((project, idx) =>
        project.id === projectId
          ? {
            ...project,
            [field]: typeof value === 'string' ? (isNaN(Number(value)) ? value : Number(value)) : value,
            estimatedDevelopmentValue:
              (field === 'developmentCostPerSqFt' || field === 'projectSqFt')
                ? (field === 'developmentCostPerSqFt'
                    ? (project.projectSqFt || 0) * Number(value)
                    : (Number(value) || 0) * (project.developmentCostPerSqFt || 0))
                : project.estimatedDevelopmentValue
          }
        : project
      )
    }));
  };

  const addProject = () => {
    setSavingsData(prev => {
      const newProject: ProjectData = {
        id: Date.now().toString(),
        projectName: '',
        projectAddress: '',
        projectSqFt: 3000, // Default: 3000 sqft
        estimateDate: '',
        daysSaved: '21.67',   // Default: 21.67 work days saved
        projectDuration: 12, // Default: 12 months
        developmentCostPerSqFt: 650, // Default: $650 per sqft
        estimatedDevelopmentValue: 3000 * 650, // Default calculated value
        phase: 1 // Default to phase 1, do not auto-increment
    };
      return {
        ...prev,
        projects: [...prev.projects, newProject]
      };
    });
  };

  const removeProject = (projectId: string) => {
    setSavingsData(prev => ({
      ...prev,
      projects: prev.projects.filter(project => project.id !== projectId)
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent.toFixed(1)}%`;
  };

  const revenueChartData = getRevenueChartData(savingsData.projects);
  const profitChartData = getProfitChartData(savingsData.projects, savingsData.gcFeePercent);
  const cumulativeRevenueChartData = getCumulativeRevenueChartData(savingsData.projects, savingsData.gcFeePercent);

  /**
   * To illustrate the opportunity cost and real value of quicker revenue/project recognition:
   * 1. Show cumulative revenue over time for both Stick Built and TEKTRA.
   * 2. The area between the two curves (or the difference at each month) represents the opportunity cost benefit.
   * 3. You can add a cumulative revenue chart and/or a chart of the difference (delta) per month.
   */

  // Helper to get cumulative revenue data and cumulative opportunity value
  function getCumulativeRevenueChartData(projects: ProjectData[], gcFeePercent: number) {
    const sorted = getProjectsByPhase(projects);
    const startMonths = getProjectStartMonths(sorted);
    const tektraStartMonths = getTektraProjectStartMonths(sorted);

    let maxMonths = 0;
    for (let i = 0; i < sorted.length; i++) {
      const duration = Number(sorted[i].projectDuration) || 0;
      const endMonth = (startMonths[i] || 1) + duration - 1;
      if (endMonth > maxMonths) maxMonths = endMonth;
    }
    let maxTektraMonths = 0;
    for (let i = 0; i < sorted.length; i++) {
      const duration = Number(sorted[i].projectDuration) || 0;
      const daysSaved = Number(sorted[i].daysSaved) || 0;
      const monthsSaved = daysSaved / 21.67;
      const tektraDuration = Math.max(duration - monthsSaved, 1);
      const endMonth = (tektraStartMonths[i] || 1) + Math.ceil(tektraDuration) - 1;
      if (endMonth > maxTektraMonths) maxTektraMonths = endMonth;
    }
    const lastTektraMonth = maxTektraMonths;
    if (!maxMonths && !maxTektraMonths) return [];

    let chartData: { 
      month: number; 
      stickBuilt: number; 
      tektra: number; 
      delta: number; 
      cumulativeOpportunity: number;
      stickBuiltProfit: number;
      tektraProfit: number;
    }[] = [];
    let cumulativeStick = 0, cumulativeTektra = 0, cumulativeOpportunity = 0;
    let cumulativeStickProfit = 0, cumulativeTektraProfit = 0;
    let headStartValue = 0;

    for (let month = 1; month <= Math.max(maxMonths, maxTektraMonths); month++) {
      let stickBuilt = 0;
      let tektra = 0;
      let stickBuiltProfit = 0;
      let tektraProfit = 0;
      for (let i = 0; i < sorted.length; i++) {
        const duration = Number(sorted[i].projectDuration) || 0;
        const value = Number(sorted[i].estimatedDevelopmentValue) || 0;
        const feeRate = gcFeePercent / 100;
        const start = startMonths[i];
        if (month >= start && month < start + duration && duration > 0) {
          stickBuilt += value / duration;
          stickBuiltProfit += (value * feeRate) / duration;
        }
      }
      for (let i = 0; i < sorted.length; i++) {
        const duration = Number(sorted[i].projectDuration) || 0;
        const daysSaved = Number(sorted[i].daysSaved) || 0;
        const monthsSaved = daysSaved / 21.67;
        const tektraDuration = Math.max(duration - monthsSaved, 1);
        const value = Number(sorted[i].estimatedDevelopmentValue) || 0;
        const feeRate = gcFeePercent / 100;
        const start = tektraStartMonths[i];
        if (tektraDuration > 0 && month >= start && month < start + Math.ceil(tektraDuration)) {
          const perMonth = value / tektraDuration;
          const perMonthProfit = (value * feeRate) / tektraDuration;
          if (month === start + Math.ceil(tektraDuration) - 1) {
            tektra += value - (perMonth * (Math.ceil(tektraDuration) - 1));
            tektraProfit += (value * feeRate) - (perMonthProfit * (Math.ceil(tektraDuration) - 1));
          } else {
            tektra += perMonth;
            tektraProfit += perMonthProfit;
          }
        }
      }
      cumulativeStick += stickBuilt;
      cumulativeTektra += tektra;
      cumulativeStickProfit += stickBuiltProfit;
      cumulativeTektraProfit += tektraProfit;
      if (month === lastTektraMonth) {
        headStartValue = cumulativeTektra - cumulativeStick;
      }
      const delta = cumulativeTektra - cumulativeStick;
      cumulativeOpportunity = Math.max(cumulativeOpportunity, delta);
      chartData.push({
        month,
        stickBuilt: cumulativeStick,
        tektra: cumulativeTektra,
        delta,
        cumulativeOpportunity,
        stickBuiltProfit: cumulativeStickProfit,
        tektraProfit: cumulativeTektraProfit,
      });
    }
    return chartData;
  }

  // Helper to summarize data per year
  function getYearlySummary(data: typeof cumulativeRevenueChartData) {
    const years: {
      year: number;
      stickBuilt: number;
      tektra: number;
      stickBuiltProfit: number;
      tektraProfit: number;
      opportunity: number;
    }[] = [];
    let currentYear = 1;
    let yearData = {
      stickBuilt: 0,
      tektra: 0,
      stickBuiltProfit: 0,
      tektraProfit: 0,
      opportunity: 0,
    };
    data.forEach((row, idx) => {
      yearData.stickBuilt += row.stickBuilt - (data[idx - 1]?.stickBuilt || 0);
      yearData.tektra += row.tektra - (data[idx - 1]?.tektra || 0);
      yearData.stickBuiltProfit += row.stickBuiltProfit - (data[idx - 1]?.stickBuiltProfit || 0);
      yearData.tektraProfit += row.tektraProfit - (data[idx - 1]?.tektraProfit || 0);
      yearData.opportunity += row.cumulativeOpportunity - (data[idx - 1]?.cumulativeOpportunity || 0);

      if ((row.month % 12 === 0) || idx === data.length - 1) {
        years.push({
          year: currentYear,
          ...yearData,
        });
        currentYear++;
        yearData = {
          stickBuilt: 0,
          tektra: 0,
          stickBuiltProfit: 0,
          tektraProfit: 0,
          opportunity: 0,
        };
      }
    });
    return years;
  }

  const yearlySummary = getYearlySummary(cumulativeRevenueChartData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            TEKTRA Savings Calculator
          </h1>
          <p className="text-sm text-gray-600 text-center">
            Precision Construction Cost Analysis & ROI Projections
          </p>
        </div>

        {/* Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg border border-blue-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300">
            <span className="text-blue-700 text-base font-semibold mb-4">Total Savings</span>
            <span className="text-4xl font-bold text-blue-800">
              {formatCurrency(calculations.totalSavings || 0)}
            </span>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 shadow-lg border border-green-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300">
            <span className="text-green-700 text-base font-semibold mb-4">Savings Per Sq Ft</span>
            <span className="text-4xl font-bold text-green-800">
              {formatCurrency(calculations.savingsPerSqFt || 0)}
            </span>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg border border-yellow-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300">
            <span className="text-yellow-700 text-base font-semibold mb-4">Annual ROI</span>
            <span className="text-4xl font-bold text-yellow-800">
              {formatPercent(calculations.roiPercent || 0)}
            </span>
          </div>
        </div>

        {/* Project Details Section */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Project Details</h2>
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Client Name</label>
              <input
                type="text"
                value={savingsData.client}
                onChange={(e) => handleInputChange('client', e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-0"
                placeholder="Enter client name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">GC and Developer Fee %</label>
              <input
                type="number"
                value={savingsData.gcFeePercent || ''}
                onChange={(e) => handleInputChange('gcFeePercent', e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-0"
                placeholder="Enter fee percentage"
                min="0"
                max="100"
              />
            </div>
            {/* NEW: Sales price per sqft */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Sales Price / Sq Ft</label>
              <input
                type="text"
                value={formatCurrency(savingsData.salesPricePerSqFt || 0)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  handleInputChange('salesPricePerSqFt', raw);
                }}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-right focus:border-blue-500 focus:ring-0"
                placeholder="$ / sq ft"
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-slate-200 rounded">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">#</th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">Phase</th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">Start Month</th> {/* NEW */}
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">Project Name</th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">Address</th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">Sq Ft</th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">Dev Cost/SqFt</th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">Est. Value</th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">Work Days Saved</th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">Duration (Months)</th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-600">TEKTRA Duration</th> {/* NEW */}
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {getProjectsByPhase(savingsData.projects).map((project, index) => (
                  <tr key={project.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 text-xs text-slate-500 text-center">{index + 1}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={project.phase || index + 1}
                        min={1}
                        onChange={e => handleProjectChange(project.id, 'phase', e.target.value)}
                        className="w-16 border border-slate-300 rounded px-2 py-1 text-xs text-right focus:border-blue-500 focus:ring-0"
                        placeholder="Phase"
                      />
                    </td>
                    {/* NEW: Start Month */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={project.startMonth || ''}
                        onChange={(e) => handleProjectChange(project.id, 'startMonth', e.target.value)}
                        className="w-20 border border-slate-300 rounded px-2 py-1 text-xs text-right focus:border-blue-500 focus:ring-0"
                        placeholder="1"
                        min="1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={project.projectName}
                        onChange={(e) => handleProjectChange(project.id, 'projectName', e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:border-blue-500 focus:ring-0"
                        placeholder="Project Name"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={project.projectAddress}
                        onChange={(e) => handleProjectChange(project.id, 'projectAddress', e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:border-blue-500 focus:ring-0"
                        placeholder="Address"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={project.projectSqFt || ''}
                        onChange={(e) => handleProjectChange(project.id, 'projectSqFt', e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-right focus:border-blue-500 focus:ring-0"
                        placeholder="Sq Ft"
                        min="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={formatCurrency(project.developmentCostPerSqFt || 0)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/[^0-9.]/g, '');
                          handleProjectChange(project.id, 'developmentCostPerSqFt', rawValue);
                        }}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-right focus:border-blue-500 focus:ring-0"
                        placeholder="Cost/SqFt"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="block w-full px-2 py-1 text-xs text-slate-700 bg-transparent rounded">
                        {formatCurrency(project.estimatedDevelopmentValue || 0)}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={project.daysSaved || ''}
                        onChange={(e) => handleProjectChange(project.id, 'daysSaved', e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-right focus:border-blue-500 focus:ring-0"
                        placeholder="Days Saved"
                        min="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={project.projectDuration || ''}
                        onChange={(e) => handleProjectChange(project.id, 'projectDuration', e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-right focus:border-blue-500 focus:ring-0"
                        placeholder="Months"
                        min="0"
                      />
                    </td>
                    {/* NEW: Computed TEKTRA duration */}
                    <td className="px-2 py-2 text-right text-xs text-slate-700">
                      {(() => {
                        const monthsSaved = (Number(project.daysSaved) || 0) / 21.67;
                        const tektraDuration = Math.max((Number(project.projectDuration) || 0) - monthsSaved, 1);
                        return `${tektraDuration.toFixed(2)}`;
                      })()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {savingsData.projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProject(project.id)}
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded"
                          title="Remove Project"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 font-semibold">
                  <td className="px-2 py-2 text-xs text-slate-700 text-center" colSpan={1}>
                    {savingsData.projects.length} {/* Total number of projects */}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-700 text-right" colSpan={2}>Total</td>
                  <td className="px-2 py-2 text-xs text-slate-700 text-right">
                    {savingsData.projects.reduce((sum, p) => sum + (Number(p.projectSqFt) || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-700 text-right">
                    {/* Weighted average Dev Cost/SqFt */}
                    {(() => {
                      const totalSqFt = savingsData.projects.reduce((sum, p) => sum + (Number(p.projectSqFt) || 0), 0);
                      const totalDevCost = savingsData.projects.reduce((sum, p) => sum + ((Number(p.developmentCostPerSqFt) || 0) * (Number(p.projectSqFt) || 0)), 0);
                      if (totalSqFt === 0) return '$0';
                      return formatCurrency(totalDevCost / totalSqFt);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-700 text-right">
                    {formatCurrency(savingsData.projects.reduce((sum, p) => sum + (Number(p.estimatedDevelopmentValue) || 0), 0))}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-700 text-right">
                    {savingsData.projects.reduce((sum, p) => sum + (Number(p.daysSaved) || 0), 0)}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-700 text-right">
                    {savingsData.projects.reduce((sum, p) => sum + (Number(p.projectDuration) || 0), 0)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={addProject}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
            >
              Add Project
            </button>
          </div>
        </div>

        {/* Revenue Recognition Chart */}
        <div className="bg-white shadow-md rounded-lg p-6 mt-8">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Monthly Revenue Opportunity Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueChartData}>
              <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottomRight', offset: -5 }} />
              <YAxis 
                label={{ value: 'Monthly Revenue', angle: -90, position: 'insideLeft' }} 
                tickFormatter={(value: number) => {
                  if (value >= 1_000_000) return `$${(value/1_000_000).toFixed(1)}M`;
                  if (value >= 1_000) return `$${(value/1_000).toFixed(1)}K`;
                  return `$${value}`;
                }}
                width={80}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="stickBuilt" fill="#f87171" name="Stick Built (Monthly)" />
              <Bar dataKey="tektra" fill="#34d399" name="TEKTRA (Monthly)" />
              <Bar dataKey="opportunity" fill="#fbbf24" name="Head Start Value (TEKTRA)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cumulative Revenue Opportunity Cost Chart + Yearly Summary Table */}
        <div className="bg-white shadow-md rounded-lg p-6 mt-8">
          <h2 className="text-lg font-medium text-slate-800 mb-4">
            Cumulative Revenue Recognition & Opportunity Cost
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulativeRevenueChartData}>
              <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottomRight', offset: -5 }} />
              <YAxis
                label={{ value: 'Cumulative Revenue', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value: number) => {
                  if (value >= 1_000_000) return `$${(value/1_000_000).toFixed(1)}M`;
                  if (value >= 1_000) return `$${(value/1_000).toFixed(1)}K`;
                  return `$${value}`;
                }}
                width={80}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="stickBuilt" stroke="#f87171" name="Stick Built (Cumulative)" strokeWidth={2} />
              <Line type="monotone" dataKey="tektra" stroke="#34d399" name="TEKTRA (Cumulative)" strokeWidth={2} />
              <Line type="monotone" dataKey="cumulativeOpportunity" stroke="#fbbf24" name="Cumulative Opportunity Value" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="stickBuiltProfit" stroke="#6366f1" name="Stick Built Profit" strokeDasharray="5 5" strokeWidth={2} />
              <Line type="monotone" dataKey="tektraProfit" stroke="#06b6d4" name="TEKTRA Profit" strokeDasharray="5 5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-xs text-slate-500 mt-2 mb-6">
            The yellow line shows the cumulative opportunity value realized by recognizing revenue sooner with TEKTRA.
          </div>
          {/* Yearly Summary Table */}
          <div>
            <h3 className="text-base font-medium text-slate-800 mb-2">Yearly Revenue & Profit Summary</h3>
            <table className="min-w-full border border-slate-200 rounded text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-2 py-2 font-semibold text-slate-600">Year</th>
                  <th className="px-2 py-2 font-semibold text-slate-600">Stick Built Revenue</th>
                  <th className="px-2 py-2 font-semibold text-slate-600">TEKTRA Revenue</th>
                  <th className="px-2 py-2 font-semibold text-slate-600">Stick Built Profit</th>
                  <th className="px-2 py-2 font-semibold text-slate-600">TEKTRA Profit</th>
                  <th className="px-2 py-2 font-semibold text-slate-600">Opportunity Value</th>
                </tr>
              </thead>
              <tbody>
                {yearlySummary.map((row) => (
                  <tr key={row.year} className="border-t border-slate-100">
                    <td className="px-2 py-2 text-center">{row.year}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(row.stickBuilt)}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(row.tektra)}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(row.stickBuiltProfit)}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(row.tektraProfit)}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(row.opportunity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost Analysis Table */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Cost Analysis</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Cost Element</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Cost</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Stick Built</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">TEKTRA</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">

              {/* Division 1 Costs */}
              {division1CostCategories.map((category) => {
                const stickBuiltDailyCost = Number(savingsData[category.key as keyof SavingsData]) || 0;
                const daysSaved = savingsData.projects.reduce((sum, project) => sum + (Number(project.daysSaved) || 0), 0);
                const stickBuiltCost = stickBuiltDailyCost * daysSaved;
                const tektraCost = 0; // TEKTRA eliminates Division 1 time-based costs
                const savings = stickBuiltCost - tektraCost;

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
                        <input
                          type="text"
                          value={formatCurrency(stickBuiltDailyCost)} // Format input value to USD
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/[^0-9.]/g, ''); // Remove formatting for calculations
                            handleInputChange(category.key as keyof SavingsData, rawValue);
                          }}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-0"
                        />
                        <span className="ml-2 text-xs text-slate-500">/day</span> {/* Add unit */}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-red-600">
                      {formatCurrency(stickBuiltCost)} {/* Format Stick Built Cost */}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-slate-400">
                      {formatCurrency(tektraCost)} {/* Format TEKTRA Cost */}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-green-600">
                      {formatCurrency(savings)} {/* Format Savings */}
                    </td>
                  </tr>
                );
              })}

              {/* Primary Construction Costs */}
              {primaryCostElements.map((element) => {
                const totalSqFt = savingsData.projects.reduce((sum, project) => sum + (project.projectSqFt || 0), 0); // Calculate total square footage
                const totalCost = element.rate * totalSqFt; // Calculate total cost based on rate and total square footage

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
                          type="text"
                          value={formatCurrency(element.rate)} // Format input value to USD
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/[^0-9.]/g, ''); // Remove formatting for calculations
                            setSavingsData(prev => ({
                              ...prev,
                              primaryCostElements: prev.primaryCostElements.map((el) =>
                                el.key === element.key
                                  ? { ...el, rate: Number(rawValue) } // Preserve all properties and update only the rate
                                  : el
                              )
                            }));
                          }}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-0"
                        />
                        <span className="ml-2 text-xs text-slate-500">{element.unit}</span> {/* Add unit dynamically */}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-red-600">
                      {formatCurrency(totalCost)} {/* Display calculated total cost */}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-slate-400">
                      Included
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-green-600">
                      {formatCurrency(totalCost)} {/* Display savings (same as total cost for now) */}
                    </td>
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
                    value={savingsData.gcFeePercent || ''}
                    onChange={(e) => handleInputChange('gcFeePercent', e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-0"
                    placeholder="Enter fee percentage"
                    min="0"
                    max="100"
                  />
                </td>
                <td className="py-3 px-2 text-right text-sm text-red-600">
                  {formatCurrency(calculations.traditionalTotalCost * (savingsData.gcFeePercent / 100) || 0)} {/* Stick Built GC Fee */}
                </td>
                <td className="py-3 px-2 text-right text-sm text-slate-400">
                  Included
                </td>
                <td className="py-3 px-2 text-right text-sm text-green-600">
                  {formatCurrency(calculations.traditionalTotalCost * (savingsData.gcFeePercent / 100) || 0)} {/* Savings */}
                </td>
              </tr>

              {/* Total Project Costs */}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-lg">
                <td className="py-6 px-2 text-slate-800">Total Project Cost</td>
                <td className="py-6 px-2 text-right text-slate-400">
                  N/A
                </td>
                <td className="py-6 px-2 text-right text-red-600">
                  {formatCurrency(calculations.traditionalTotalCost || 0)}
                </td>
                <td className="py-6 px-2 text-right text-green-600">
                  {formatCurrency(calculations.tektraTotalCost || 0)}
                </td>
                <td className="py-6 px-2 text-right text-green-700 text-xl">
                  {formatCurrency(calculations.totalSavings || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

