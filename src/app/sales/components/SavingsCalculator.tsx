'use client';

import { useState, useEffect } from 'react';
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
  id: string;
  projectName: string;
  projectAddress: string;
  projectSqFt: number;
  estimatedDevelopmentValue?: number; // Auto-calculated based on sqft
  estimateDate: string;
}

interface SavingsData {
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
}

const initialSavingsData: SavingsData = {
  // Client Details
  projectsPerYear: 3,
  gcFeePercent: 15.0,
  
  // Project Info
  client: '',
  projects: [
    {
      id: '1',
      projectName: '',
      projectAddress: '',
      projectSqFt: 3000,
      estimateDate: ''
    }
  ],
  
  // Project Cost Elements (from cost codes with calculated values)
  framingMaterials: 0,
  framingLabor: 0,
  doorWindowInstall: 0,
  architecturalDesign: 300.00,
  engineeringDesign: 100.00,
  buildersRiskInsurance: 55.20,
  lotPropertyCost: 0, // hard to calculate ROI as noted
  adminLoanMarketingFees: 138.00,
  supervision: 750.00,
  genSkilledLabor: 350.00,
  preConServices: 255.00,
  tempFencing: 46.15,
  bundledUtilities: 23.08,
  jobsiteTrailer: 18.46,
  jobToilet: 10.00,
  storage: 20.00,
  dumpsters: 2500.00,
  infrastructureExcavation: 1200.00,
  
  // Fees and Insurance (percentages)
  gcDeveloperFeePercent: 15.0,
  generalLiabilityInsurancePercent: 2.0,
  
  // TEKTRA Reductions
  overallReductionPercent: 50, // 50% overall cost reduction
  timeReductionPercent: 50, // 50% time reduction
  
  // Timeline
  traditionalTimelineWeeks: 24,
  workdaysSaved: 60 // Default 12 weeks (60 workdays) for meaningful chart display
};

const primaryCostElements = [
  { key: 'framingMaterials', label: 'Framing Materials incl Waste', code: 'FRAM-MAT', description: 'Materials and waste for framing construction', unit: '/sqft', rate: 35 },
  { key: 'framingLabor', label: 'Framing Labor including CO\'s', code: 'FRAM-LAB', description: 'Labor costs including change orders for framing', unit: '/sqft', rate: 30 },
  { key: 'doorWindowInstall', label: 'Door and Window Install', code: 'DW-INST', description: 'Installation costs for doors and windows', unit: '/sqft', rate: 8 }
];

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

  function calculateSavings(data: SavingsData) {
    // Calculate totals across all projects
    const totalSqFt = data.projects.reduce((sum, project) => sum + (project.projectSqFt || 0), 0);
    const totalDevelopmentValue = data.projects.reduce((sum, project) => {
      const projectValue = project.estimatedDevelopmentValue || (project.projectSqFt * 650); // $650/sqft baseline
      return sum + projectValue;
    }, 0);

    // Calculate primary construction elements total costs (based on total sqft)
    const primaryConstructionTotal = primaryCostElements.reduce((sum, element) => {
      return sum + (element.rate * totalSqFt);
    }, 0);

    // Calculate total daily costs for Division 1 elements only (excluding GC fees)
    const division1DailyCosts = 
      data.architecturalDesign + data.engineeringDesign + data.buildersRiskInsurance + 
      data.lotPropertyCost + data.adminLoanMarketingFees + data.supervision + 
      data.genSkilledLabor + data.preConServices + data.tempFencing + 
      data.bundledUtilities + data.jobsiteTrailer + data.jobToilet + 
      data.storage + data.dumpsters + data.infrastructureExcavation;

    // Apply percentage-based costs to Division 1 daily costs (excluding client GC fee)
    const gcDeveloperFee = division1DailyCosts * (data.gcDeveloperFeePercent / 100);
    const generalLiabilityInsurance = division1DailyCosts * (data.generalLiabilityInsurancePercent / 100);
    
    const division1DailyCostsWithFees = division1DailyCosts + gcDeveloperFee + generalLiabilityInsurance;

    // Division 1 costs are only for traditional method - based on workdays saved
    // TEKTRA eliminates these time-based costs entirely
    const division1TraditionalCost = division1DailyCostsWithFees * (data.workdaysSaved || 0);
    const division1TektraCost = 0; // TEKTRA eliminates Division 1 time-based costs

    // Calculate client GC fee on the total construction value (not just Division 1)
    const baseConstructionCost = primaryConstructionTotal + division1TraditionalCost;
    const clientGcFee = baseConstructionCost * (data.gcFeePercent / 100);

    // TEKTRA System Cost - Fixed at $88/sqft
    const tektraSystemCost = 88 * totalSqFt;

    // Traditional stick-built costs vs TEKTRA system cost
    // Client GC fee applies to stick-built method only
    const traditionalTotalCost = primaryConstructionTotal + division1TraditionalCost + clientGcFee;
    const tektraTotalCost = tektraSystemCost + division1TektraCost;

    // Calculate savings
    const totalSavings = traditionalTotalCost - tektraTotalCost;
    
    // Timeline calculations for display purposes
    const traditionalTimelineWeeks = (data.workdaysSaved || 0) / 5; // Convert workdays to weeks
    const tektraTimelineWeeks = 0; // TEKTRA eliminates the time component
    const timeSavings = traditionalTimelineWeeks - tektraTimelineWeeks;

    // Percentages
    const totalSavingsPercent = traditionalTotalCost > 0 ? (totalSavings / traditionalTotalCost) * 100 : 0;
    const timeSavingsPercent = data.timeReductionPercent;

    // Cost per sq ft calculations
    const traditionalCostPerSqFt = totalSqFt > 0 ? traditionalTotalCost / totalSqFt : 0;
    const tektraCostPerSqFt = totalSqFt > 0 ? tektraTotalCost / totalSqFt : 0;
    const savingsPerSqFt = traditionalCostPerSqFt - tektraCostPerSqFt;

    // ROI calculations - now using dynamic projects per year
    const annualSavings = totalSavings * (data.projectsPerYear || 1);
    const roiPercent = tektraTotalCost > 0 ? (annualSavings / tektraTotalCost) * 100 : 0;

    // Revenue recognition calculations for the graph
    // Use defaults if values are missing to ensure chart always displays
    const traditionalProjectDuration = Math.max((data.workdaysSaved || 60) / 5, 1); // weeks, default to 12 weeks
    const tektraProjectDuration = 2; // Assume TEKTRA projects take 2 weeks
    const projectsPerYear = data.projectsPerYear || 3;
    
    const traditionalRevenuePerWeek = totalDevelopmentValue / traditionalProjectDuration;
    const tektraRevenuePerWeek = totalDevelopmentValue / tektraProjectDuration;
    
    // Calculate cumulative revenue over 12 months for visualization
    const monthlyData = [];
    let traditionalCumulativeRevenue = 0;
    let tektraCumulativeRevenue = 0;
    
    for (let month = 1; month <= 12; month++) {
      const weeksInMonth = month * 4.33; // Average weeks per month
      
      // Traditional: slower project completion
      const traditionalProjectsCompleted = Math.floor(weeksInMonth / traditionalProjectDuration) * (projectsPerYear / 12);
      traditionalCumulativeRevenue = traditionalProjectsCompleted * totalDevelopmentValue;
      
      // TEKTRA: faster project completion
      const tektraProjectsCompleted = Math.floor(weeksInMonth / tektraProjectDuration) * (projectsPerYear / 12);
      tektraCumulativeRevenue = tektraProjectsCompleted * totalDevelopmentValue;
      
      monthlyData.push({
        month,
        traditional: Math.max(0, traditionalCumulativeRevenue), // Ensure no negative values
        tektra: Math.max(0, tektraCumulativeRevenue), // Ensure no negative values
        difference: Math.max(0, tektraCumulativeRevenue - traditionalCumulativeRevenue)
      });
    }

    return {
      traditionalTotalCost,
      tektraTotalCost,
      tektraTimelineWeeks,
      tektraSystemCost,
      primaryConstructionTotal,
      division1TraditionalCost,
      division1TektraCost,
      division1DailyCostsWithFees,
      baseConstructionCost,
      clientGcFee,
      totalSavings,
      timeSavings,
      totalSavingsPercent,
      timeSavingsPercent,
      traditionalCostPerSqFt,
      tektraCostPerSqFt,
      savingsPerSqFt,
      annualSavings,
      roiPercent,
      monthlyData,
      traditionalRevenuePerWeek,
      tektraRevenuePerWeek,
      totalSqFt,
      totalDevelopmentValue,
      // Legacy properties for backward compatibility
      traditionalLaborCost: traditionalTotalCost * 0.6, // Estimate
      traditionalMaterialCost: traditionalTotalCost * 0.4, // Estimate
      tektraLaborCost: tektraTotalCost * 0.6, // Estimate
      tektraMaterialCost: tektraTotalCost * 0.4, // Estimate
      laborSavings: (traditionalTotalCost * 0.6) - (tektraTotalCost * 0.6),
      materialSavings: (traditionalTotalCost * 0.4) - (tektraTotalCost * 0.4),
      laborSavingsPercent: data.timeReductionPercent,
      materialSavingsPercent: data.timeReductionPercent
    };
  }

  const handleInputChange = (field: keyof SavingsData, value: string | number) => {
    setSavingsData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? (isNaN(Number(value)) ? value : Number(value)) : value
    }));
  };

  const handleProjectChange = (projectId: string, field: keyof ProjectData, value: string | number) => {
    setSavingsData(prev => ({
      ...prev,
      projects: prev.projects.map(project => 
        project.id === projectId 
          ? { 
              ...project, 
              [field]: typeof value === 'string' ? (isNaN(Number(value)) ? value : Number(value)) : value,
              // Auto-calculate development value if sqft changes
              ...(field === 'projectSqFt' && { 
                estimatedDevelopmentValue: (typeof value === 'number' ? value : Number(value)) * 650 
              })
            }
          : project
      )
    }));
  };

  const addProject = () => {
    const newProject: ProjectData = {
      id: Date.now().toString(),
      projectName: '',
      projectAddress: '',
      projectSqFt: 3000,
      estimateDate: ''
    };
    setSavingsData(prev => ({
      ...prev,
      projects: [...prev.projects, newProject]
    }));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Header - Aligned with Sales Dashboard */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              TEKTRA Savings Calculator
            </h1>
            <p className="text-gray-600">
              Precision Construction Cost Analysis & ROI Projections
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <BarChart3 size={16} />
              Export Report
            </Button>
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Calculator size={16} />
              New Analysis
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          
          {/* Streamlined Input Section - Takes 2 columns */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* Client Details Section */}
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-light text-slate-800 flex items-center gap-3">
                  <Users className="h-6 w-6 text-blue-600" />
                  Client Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={savingsData.client}
                      onChange={(e) => handleInputChange('client', e.target.value)}
                      className="w-full border-0 border-b-2 border-slate-200 bg-transparent px-0 py-3 text-xl font-light focus:border-blue-600 focus:ring-0 transition-colors"
                      placeholder="Enter client name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Projects Per Year
                    </label>
                    <input
                      type="number"
                      value={savingsData.projectsPerYear || ''}
                      onChange={(e) => handleInputChange('projectsPerYear', e.target.value)}
                      className="w-full border-0 border-b-2 border-slate-200 bg-transparent px-0 py-3 text-xl font-light focus:border-blue-600 focus:ring-0 transition-colors"
                      placeholder="Enter annual project volume"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      GC Fee Percentage
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={savingsData.gcFeePercent || ''}
                      onChange={(e) => handleInputChange('gcFeePercent', e.target.value)}
                      className="w-full border-0 border-b-2 border-slate-200 bg-transparent px-0 py-3 text-xl font-light focus:border-blue-600 focus:ring-0 transition-colors"
                      placeholder="Enter GC fee percentage"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-100">
                  <div className="text-sm text-slate-500 italic">
                    These client-specific parameters will be used to calculate annual ROI and revenue recognition projections.
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Multi-Project Overview */}
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-light text-slate-800 flex items-center gap-3">
                  <Building className="h-6 w-6 text-blue-600" />
                  Project Portfolio
                </CardTitle>
                
                {/* Portfolio Summary */}
                <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {savingsData.projects.length}
                      </div>
                      <div className="text-sm text-slate-600">Total Projects</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {calculations.totalSqFt?.toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-slate-600">Total Sq Ft</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {formatCurrency(calculations.totalDevelopmentValue || 0)}
                      </div>
                      <div className="text-sm text-slate-600">Total Value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {savingsData.workdaysSaved || 0}
                      </div>
                      <div className="text-sm text-slate-600">Days Saved Each</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Projects Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-800">Project Details</h3>
                    <Button 
                      onClick={addProject}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus size={16} />
                      Add Project
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Project Name</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Address</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Sq Ft</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Value</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Date</th>
                          <th className="text-center py-3 px-2 text-sm font-medium text-slate-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {savingsData.projects.map((project, index) => {
                          const projectValue = project.estimatedDevelopmentValue || (project.projectSqFt * 650);
                          return (
                            <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-2">
                                <input
                                  type="text"
                                  value={project.projectName}
                                  onChange={(e) => handleProjectChange(project.id, 'projectName', e.target.value)}
                                  className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-0"
                                  placeholder={`Project ${index + 1}`}
                                />
                              </td>
                              <td className="py-3 px-2">
                                <input
                                  type="text"
                                  value={project.projectAddress}
                                  onChange={(e) => handleProjectChange(project.id, 'projectAddress', e.target.value)}
                                  className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-0"
                                  placeholder="Enter address"
                                />
                              </td>
                              <td className="py-3 px-2">
                                <input
                                  type="number"
                                  value={project.projectSqFt || ''}
                                  onChange={(e) => handleProjectChange(project.id, 'projectSqFt', e.target.value)}
                                  className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-0"
                                  placeholder="3000"
                                  min="0"
                                />
                              </td>
                              <td className="py-3 px-2">
                                <div className="text-right">
                                  <div className="text-sm font-medium text-slate-800">
                                    {formatCurrency(projectValue)}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    ${(projectValue / (project.projectSqFt || 1)).toFixed(0)}/sqft
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <input
                                  type="text"
                                  value={project.estimateDate}
                                  onChange={(e) => handleProjectChange(project.id, 'estimateDate', e.target.value)}
                                  className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-0"
                                  placeholder="MM/DD/YYYY"
                                />
                              </td>
                              <td className="py-3 px-2 text-center">
                                {savingsData.projects.length > 1 && (
                                  <Button
                                    onClick={() => removeProject(project.id)}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Minus size={14} />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Global Parameters */}
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                          Estimated Time Savings (workdays per project)
                        </label>
                        <input
                          type="number"
                          value={savingsData.workdaysSaved || ''}
                          onChange={(e) => handleInputChange('workdaysSaved', e.target.value)}
                          className="w-full border-0 border-b-2 border-slate-200 bg-transparent px-0 py-3 text-xl font-light focus:border-blue-600 focus:ring-0 transition-colors"
                          placeholder="Enter workdays saved per project"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="text-sm text-slate-500 italic">
                          Project values are calculated at $650/sqft baseline. Time savings apply to each project in the portfolio.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Elegant Cost Breakdown Table */}
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-light text-slate-800 flex items-center gap-3">
                  <Calculator className="h-6 w-6 text-blue-600" />
                  Cost Analysis
                </CardTitle>
                {savingsData.client && (
                  <div className="mt-4 p-4 bg-slate-50/50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Client:</span>
                        <div className="font-medium text-slate-800">{savingsData.client}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Portfolio:</span>
                        <div className="font-medium text-slate-800">{savingsData.projects.length} Projects</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Total Value:</span>
                        <div className="font-medium text-slate-800">{formatCurrency(calculations.totalDevelopmentValue || 0)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-4 px-2 text-sm font-medium text-slate-600">Cost Element</th>
                        <th className="text-right py-4 px-2 text-sm font-medium text-slate-600">Stick Built</th>
                        <th className="text-right py-4 px-2 text-sm font-medium text-slate-600">TEKTRA</th>
                        <th className="text-right py-4 px-2 text-sm font-medium text-slate-600">Savings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      
                      {/* Division 1 Summary Row - Moved to top */}
                      <tr className="bg-blue-50/30">
                        <td className="py-4 px-2">
                          <button
                            onClick={() => setIsDivision1TableExpanded(!isDivision1TableExpanded)}
                            className="flex items-center gap-2 w-full text-left hover:text-blue-600 transition-colors"
                          >
                            {isDivision1TableExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <div>
                              <div className="font-medium text-slate-800">Division 1 Costs</div>
                              <div className="text-xs text-slate-500">Time-based costs eliminated by TEKTRA ({division1CostCategories.length} items)</div>
                            </div>
                          </button>
                        </td>
                        <td className="py-4 px-2 text-right font-medium text-red-600">
                          {formatCurrency(calculations.division1TraditionalCost || 0)}
                        </td>
                        <td className="py-4 px-2 text-right font-medium text-green-600">
                          Eliminated
                        </td>
                        <td className="py-4 px-2 text-right font-bold text-green-600">
                          {formatCurrency(calculations.division1TraditionalCost || 0)}
                        </td>
                      </tr>

                      {/* Division 1 Detailed Rows (Expandable) */}
                      {isDivision1TableExpanded && division1CostCategories.map((category) => {
                        const dailyCost = Number(savingsData[category.key as keyof SavingsData]) || 0;
                        const traditionalTotal = dailyCost * (savingsData.workdaysSaved || 0);
                        
                        return (
                          <tr key={category.key} className="bg-blue-25 hover:bg-blue-50/20 transition-colors">
                            <td className="py-3 px-2 pl-8">
                              <div>
                                <div className="text-sm font-medium text-slate-700">{category.label}</div>
                                <div className="text-xs text-slate-500">{category.description}</div>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right text-sm text-red-600">
                              {formatCurrency(traditionalTotal)}
                            </td>
                            <td className="py-3 px-2 text-right text-sm text-green-600 italic">
                              Eliminated
                            </td>
                            <td className="py-3 px-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={dailyCost || ''}
                                onChange={(e) => handleInputChange(category.key as keyof SavingsData, e.target.value)}
                                className="w-20 text-right border-0 border-b border-slate-200 bg-transparent px-1 py-1 text-sm text-slate-700 focus:border-blue-600 focus:ring-0 transition-colors"
                                placeholder="0.00"
                              />
                              <div className="text-xs text-slate-500 mt-1">/day</div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Primary Construction Elements */}
                      {primaryCostElements.map((element) => {
                        const totalCost = element.rate * (calculations.totalSqFt || 0);
                        return (
                          <tr key={element.key} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 px-2">
                              <div>
                                <div className="font-medium text-slate-800">{element.label}</div>
                                <div className="text-xs text-slate-500">${element.rate}/sqft</div>
                              </div>
                            </td>
                            <td className="py-4 px-2 text-right font-medium text-red-600">
                              {formatCurrency(totalCost)}
                            </td>
                            <td className="py-4 px-2 text-right font-medium text-slate-400">
                              Included
                            </td>
                            <td className="py-4 px-2 text-right font-bold text-green-600">
                              {formatCurrency(totalCost)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* GC Fee Row */}
                      <tr className="bg-amber-50/30 hover:bg-amber-50/50 transition-colors">
                        <td className="py-4 px-2">
                          <div>
                            <div className="font-medium text-slate-800">GC Fee</div>
                            <div className="text-xs text-slate-500">{savingsData.gcFeePercent || 0}% of construction cost</div>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right font-medium text-red-600">
                          {formatCurrency(calculations.clientGcFee || 0)}
                        </td>
                        <td className="py-4 px-2 text-right font-medium text-slate-400">
                          N/A
                        </td>
                        <td className="py-4 px-2 text-right font-bold text-green-600">
                          {formatCurrency(calculations.clientGcFee || 0)}
                        </td>
                      </tr>

                      {/* TEKTRA System Cost Row */}
                      <tr className="bg-green-50/50 hover:bg-green-50 transition-colors">
                        <td className="py-4 px-2">
                          <div>
                            <div className="font-medium text-slate-800">TEKTRA System</div>
                            <div className="text-xs text-slate-500">$88/sqft complete system</div>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right font-medium text-slate-400">
                          N/A
                        </td>
                        <td className="py-4 px-2 text-right font-medium text-green-600">
                          {formatCurrency(calculations.tektraSystemCost || 0)}
                        </td>
                        <td className="py-4 px-2 text-right font-medium text-slate-500">
                          System Cost
                        </td>
                      </tr>

                      {/* Total Row */}
                      <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-lg">
                        <td className="py-6 px-2 text-slate-800">Total Project Cost</td>
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
              </CardContent>
            </Card>
          </div>

          {/* Premium Results Display - Takes 1 column */}
          <div className="space-y-8">
            
            {/* Main Savings Display */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-green-600/10"></div>
              <CardContent className="relative p-8 text-center">
                <div className="mb-6">
                  <div className="text-sm font-medium text-slate-300 mb-2">Total Savings</div>
                  <div className="text-4xl font-light mb-2">
                    {formatCurrency(calculations.totalSavings || 0)}
                  </div>
                  <div className="text-lg text-green-400 font-medium">
                    {formatPercent(calculations.totalSavingsPercent || 0)} saved
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                    <span className="text-slate-300">Stick Built:</span>
                    <span className="font-medium text-red-300">
                      {formatCurrency(calculations.traditionalTotalCost || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                    <span className="text-slate-300">TEKTRA:</span>
                    <span className="font-medium text-green-300">
                      {formatCurrency(calculations.tektraTotalCost || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardContent className="p-8">
                <h3 className="text-xl font-light text-slate-800 mb-6">Cost Analysis</h3>
                
                <div className="space-y-6">
                  {/* Construction Costs */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-slate-600">Construction</span>
                      <span className="text-sm text-slate-500">$73/sqft → $88/sqft</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full" style={{width: '83%'}}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                      <span>Stick Built: ${(calculations.primaryConstructionTotal || 0).toLocaleString()}</span>
                      <span>TEKTRA: ${(calculations.tektraSystemCost || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Time Savings */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-slate-600">Time Savings</span>
                      <span className="text-sm text-slate-500">{savingsData.workdaysSaved || 0} days</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full" style={{width: '50%'}}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                      <span>Division 1 Savings</span>
                      <span>${((calculations.division1TraditionalCost || 0) - (calculations.division1TektraCost || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-light text-slate-800">
                        {formatCurrency(calculations.savingsPerSqFt || 0)}
                      </div>
                      <div className="text-xs text-slate-500">per sq ft saved</div>
                    </div>
                    <div>
                      <div className="text-lg font-light text-slate-800">
                        {(calculations.timeSavings || 0).toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-500">weeks saved</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ROI Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardContent className="p-8 text-center">
                <div className="text-sm font-medium text-amber-700 mb-2">Annual ROI Potential</div>
                <div className="text-3xl font-light text-amber-800 mb-2">
                  {formatPercent(calculations.roiPercent || 0)}
                </div>
                <div className="text-sm text-amber-600">
                  Based on {savingsData.projectsPerYear || 3} projects annually
                </div>
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <div className="text-lg font-medium text-amber-800">
                    {formatCurrency(calculations.annualSavings || 0)}
                  </div>
                  <div className="text-xs text-amber-600">projected annual savings</div>
                </div>
              </CardContent>
            </Card>

            {/* Premium Revenue Recognition Graph */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-light text-slate-800 mb-2">Revenue Recognition Acceleration</h3>
                  <p className="text-sm text-slate-600">Cumulative revenue impact over 12 months</p>
                </div>
                
                {/* Manual Chart Inputs */}
                <div className="mb-6 p-4 bg-white/50 rounded-lg border border-indigo-200">
                  <div className="text-sm font-medium text-slate-700 mb-3">Chart Parameters</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-600 mb-2">
                        Traditional Timeline (weeks)
                      </label>
                      <input
                        type="number"
                        value={savingsData.workdaysSaved ? (savingsData.workdaysSaved / 5) : 12}
                        onChange={(e) => handleInputChange('workdaysSaved', Number(e.target.value) * 5)}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-indigo-500 focus:ring-0"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-2">
                        TEKTRA Timeline (weeks)
                      </label>
                      <input
                        type="number"
                        value={2}
                        readOnly
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-slate-100 text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-2">
                        Project Value ($)
                      </label>
                      <input
                        type="number"
                        value={calculations.totalDevelopmentValue || 1950000}
                        readOnly
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-slate-100 text-slate-600"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                    {/* Graph Container */}
                    <div className="relative h-64 bg-white/50 rounded-lg p-4 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-indigo-100/20 to-transparent"></div>
                      
                      {/* Y-axis labels */}
                      <div className="absolute left-2 top-4 bottom-4 flex flex-col justify-between text-xs text-slate-500">
                        <span>${calculations.monthlyData && calculations.monthlyData.length > 0 ? (Math.max(...calculations.monthlyData.map((d: any) => d.tektra)) / 1000000).toFixed(1) : '1.0'}M</span>
                        <span>${calculations.monthlyData && calculations.monthlyData.length > 0 ? (Math.max(...calculations.monthlyData.map((d: any) => d.tektra)) / 2000000).toFixed(1) : '0.5'}M</span>
                        <span>$0</span>
                      </div>
                      
                      {/* Graph area */}
                      <div className="ml-12 mr-4 h-full relative">
                        <svg viewBox="0 0 400 200" className="w-full h-full">
                          <defs>
                            <linearGradient id="tektraGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1"/>
                            </linearGradient>
                            <linearGradient id="traditionalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3"/>
                              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1"/>
                            </linearGradient>
                          </defs>
                          
                          {/* Grid lines */}
                          <g stroke="#e2e8f0" strokeWidth="0.5" opacity="0.5">
                            {[0, 50, 100, 150, 200].map(y => (
                              <line key={y} x1="0" y1={y} x2="400" y2={y} />
                            ))}
                            {[0, 50, 100, 150, 200, 250, 300, 350, 400].map(x => (
                              <line key={x} x1={x} y1="0" x2={x} y2="200" />
                            ))}
                          </g>
                          
                          {/* TEKTRA line and area */}
                          {calculations.monthlyData && calculations.monthlyData.length > 0 && (() => {
                            const maxValue = Math.max(...calculations.monthlyData.map((d: any) => d.tektra));
                            if (maxValue === 0) return null; // Prevent division by zero
                            
                            const tektraPoints = calculations.monthlyData.map((d: any, i: number) => ({
                              x: (i / 11) * 400,
                              y: 200 - (d.tektra / maxValue) * 200
                            }));
                            const traditionalPoints = calculations.monthlyData.map((d: any, i: number) => ({
                              x: (i / 11) * 400,
                              y: 200 - (d.traditional / maxValue) * 200
                            }));
                            
                            return (
                              <g>
                                {/* TEKTRA area */}
                                <path
                                  d={`M 0,200 ${tektraPoints.map((p: {x: number, y: number}) => `L ${p.x},${p.y}`).join(' ')} L 400,200 Z`}
                                  fill="url(#tektraGradient)"
                                />
                                {/* Traditional area */}
                                <path
                                  d={`M 0,200 ${traditionalPoints.map((p: {x: number, y: number}) => `L ${p.x},${p.y}`).join(' ')} L 400,200 Z`}
                                  fill="url(#traditionalGradient)"
                                />
                                {/* TEKTRA line */}
                                <path
                                  d={`M ${tektraPoints.map((p: {x: number, y: number}) => `${p.x},${p.y}`).join(' L ')}`}
                                  stroke="#10b981"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeLinecap="round"
                                />
                                {/* Traditional line */}
                                <path
                                  d={`M ${traditionalPoints.map((p: {x: number, y: number}) => `${p.x},${p.y}`).join(' L ')}`}
                                  stroke="#ef4444"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeDasharray="8,4"
                                />
                              </g>
                            );
                            })()}
                        </svg>
                        
                        {/* Loading state when no data */}
                        {(!calculations.monthlyData || calculations.monthlyData.length === 0) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-slate-500 text-sm">Loading chart...</div>
                          </div>
                        )}
                      </div>                      {/* X-axis labels */}
                      <div className="absolute bottom-1 left-12 right-4 flex justify-between text-xs text-slate-500">
                        <span>Q1</span>
                        <span>Q2</span>
                        <span>Q3</span>
                        <span>Q4</span>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex justify-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-green-500"></div>
                        <span className="text-slate-700">TEKTRA Accelerated</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-red-500 border-dashed border-t-2 border-red-500"></div>
                        <span className="text-slate-700">Traditional Timeline</span>
                      </div>
                    </div>
                    
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-indigo-200">
                      <div className="text-center">
                        <div className="text-lg font-light text-slate-800">
                          {savingsData.workdaysSaved ? ((savingsData.workdaysSaved / 5) * (savingsData.projectsPerYear || 1)).toFixed(0) : '0'}
                        </div>
                        <div className="text-xs text-slate-500">weeks saved annually</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-light text-slate-800">
                          {calculations.monthlyData && calculations.monthlyData.length > 0 
                            ? formatCurrency(calculations.monthlyData[11]?.difference || 0)
                            : '$0'
                          }
                        </div>
                        <div className="text-xs text-slate-500">revenue acceleration</div>
                      </div>
                    </div>
                  </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
