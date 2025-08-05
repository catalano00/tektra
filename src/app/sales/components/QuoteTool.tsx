'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calculator, 
  Save, 
  FileText, 
  DollarSign, 
  Percent,
  Building,
  MapPin,
  User,
  Calendar,
  TrendingUp,
  Download
} from 'lucide-react';

interface QuoteData {
  // Project Information
  projectName: string;
  clientName: string;
  projectAddress: string;
  
  // Measurements
  squareFootage: number;
  numberOfPanels: number;
  componentSquareFootage: number;
  productionTimeWeeks: number;
  install: number;
  
  // Pricing
  costPerBuildableSqFt: number;
  costPerPanel: number;
  costPerComponentSqFt: number;
  
  // Costs
  productionCapacity: number;
  
  // Calculated fields (will be computed)
  productionCost: number;
  overheadAllocation: number;
  totalCost: number;
  profitMargin: number; // percentage
  profitMarginAmount: number;
  quotePrice: number;
  pricePerSqFt: number;
}

const initialQuoteData: QuoteData = {
  projectName: '',
  clientName: '',
  projectAddress: '',
  squareFootage: 0,
  numberOfPanels: 0,
  componentSquareFootage: 0,
  productionTimeWeeks: 0,
  install: 2,
  costPerBuildableSqFt: 78.26,
  costPerPanel: 2920.59,
  costPerComponentSqFt: 27.22,
  productionCapacity: 3500,
  productionCost: 0,
  overheadAllocation: 0,
  totalCost: 0,
  profitMargin: 35,
  profitMarginAmount: 0,
  quotePrice: 0,
  pricePerSqFt: 0
};

export default function QuoteTool() {
  const [quoteData, setQuoteData] = useState<QuoteData>(initialQuoteData);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate derived values whenever inputs change
  useEffect(() => {
    const calculations = calculateQuote(quoteData);
    setQuoteData(prev => ({
      ...prev,
      ...calculations
    }));
  }, [
    quoteData.squareFootage,
    quoteData.numberOfPanels,
    quoteData.componentSquareFootage,
    quoteData.productionTimeWeeks,
    quoteData.costPerBuildableSqFt,
    quoteData.costPerPanel,
    quoteData.costPerComponentSqFt,
    quoteData.profitMargin,
    quoteData.productionCapacity
  ]);

  function calculateQuote(data: QuoteData) {
    // Production Cost calculation
    const productionCost = (data.squareFootage * data.costPerBuildableSqFt) + 
                          (data.numberOfPanels * data.costPerPanel) + 
                          (data.componentSquareFootage * data.costPerComponentSqFt);

    // Overhead Allocation (example: 25.6% of production cost)
    const overheadAllocation = productionCost * 0.256;

    // Total Cost
    const totalCost = productionCost + overheadAllocation;

    // Profit Margin Amount
    const profitMarginAmount = totalCost * (data.profitMargin / 100);

    // Quote Price
    const quotePrice = totalCost + profitMarginAmount;

    // Price per Sq Ft
    const pricePerSqFt = data.squareFootage > 0 ? quotePrice / data.squareFootage : 0;

    return {
      productionCost,
      overheadAllocation,
      totalCost,
      profitMarginAmount,
      quotePrice,
      pricePerSqFt
    };
  }

  const handleInputChange = (field: keyof QuoteData, value: string | number) => {
    setQuoteData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? (isNaN(Number(value)) ? value : Number(value)) : value
    }));
  };

  const handleSaveQuote = async () => {
    setIsSaving(true);
    // TODO: Implement API call to save quote
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    setIsSaving(false);
    alert('Quote saved successfully!');
  };

  const handleExportQuote = () => {
    // TODO: Implement PDF export functionality
    alert('Export functionality coming soon!');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TEKTRA Framing Package Quote Tool
          </h1>
          <p className="text-gray-600">
            Create professional quotes with automated calculations
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleExportQuote}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Export PDF
          </Button>
          <Button 
            onClick={handleSaveQuote}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Quote'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Project Information & Measurements */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={quoteData.projectName}
                    onChange={(e) => handleInputChange('projectName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={quoteData.clientName}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter client name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Address
                </label>
                <input
                  type="text"
                  value={quoteData.projectAddress}
                  onChange={(e) => handleInputChange('projectAddress', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter project address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600" />
                Project Measurements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Square Footage
                  </label>
                  <input
                    type="number"
                    value={quoteData.squareFootage || ''}
                    onChange={(e) => handleInputChange('squareFootage', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Panels
                  </label>
                  <input
                    type="number"
                    value={quoteData.numberOfPanels || ''}
                    onChange={(e) => handleInputChange('numberOfPanels', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Component Square Footage
                  </label>
                  <input
                    type="number"
                    value={quoteData.componentSquareFootage || ''}
                    onChange={(e) => handleInputChange('componentSquareFootage', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Production Time (weeks)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={quoteData.productionTimeWeeks || ''}
                    onChange={(e) => handleInputChange('productionTimeWeeks', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Install
                  </label>
                  <input
                    type="number"
                    value={quoteData.install || ''}
                    onChange={(e) => handleInputChange('install', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Production Capacity
                  </label>
                  <input
                    type="number"
                    value={quoteData.productionCapacity || ''}
                    onChange={(e) => handleInputChange('productionCapacity', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="3500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                Cost Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost per Buildable Sq Ft ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteData.costPerBuildableSqFt || ''}
                    onChange={(e) => handleInputChange('costPerBuildableSqFt', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="78.26"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost per Panel ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteData.costPerPanel || ''}
                    onChange={(e) => handleInputChange('costPerPanel', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="2920.59"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost per Component Sq Ft ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteData.costPerComponentSqFt || ''}
                    onChange={(e) => handleInputChange('costPerComponentSqFt', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="27.22"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quote Summary */}
        <div className="space-y-6">
          
          {/* Quote Summary */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Quote Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Production Cost */}
              <div className="flex justify-between items-center py-2 border-b border-blue-100">
                <span className="text-sm font-medium text-gray-700">Production Cost</span>
                <span className="text-lg font-semibold text-blue-700">
                  {formatCurrency(quoteData.productionCost)}
                </span>
              </div>

              {/* Overhead Allocation */}
              <div className="flex justify-between items-center py-2 border-b border-blue-100">
                <span className="text-sm font-medium text-gray-700">Overhead Allocation</span>
                <span className="text-lg font-semibold text-blue-700">
                  {formatCurrency(quoteData.overheadAllocation)}
                </span>
              </div>

              {/* Total Cost */}
              <div className="flex justify-between items-center py-2 border-b border-blue-100">
                <span className="text-sm font-medium text-gray-700">Total Cost</span>
                <span className="text-lg font-semibold text-blue-700">
                  {formatCurrency(quoteData.totalCost)}
                </span>
              </div>

              {/* Profit Margin */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Profit Margin (%)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={quoteData.profitMargin || ''}
                      onChange={(e) => handleInputChange('profitMargin', e.target.value)}
                      className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Percent size={14} className="text-gray-500" />
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm font-medium text-gray-700">Profit Margin</span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatCurrency(quoteData.profitMarginAmount)}
                  </span>
                </div>
              </div>

              {/* Final Quote Price */}
              <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-bold text-gray-900">Quote Price</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(quoteData.quotePrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Price per sq ft</span>
                  <span className="font-semibold">
                    {formatCurrency(quoteData.pricePerSqFt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Panels per sq ft</span>
                <span className="font-semibold">
                  {quoteData.squareFootage > 0 ? formatNumber(quoteData.numberOfPanels / quoteData.squareFootage, 3) : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Component ratio</span>
                <span className="font-semibold">
                  {quoteData.squareFootage > 0 ? formatNumber(quoteData.componentSquareFootage / quoteData.squareFootage, 2) : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Production capacity usage</span>
                <span className="font-semibold">
                  {quoteData.productionCapacity > 0 ? formatNumber((quoteData.productionTimeWeeks / 52) * 100, 1) : '0'}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
