'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  BarChart3,
  Calendar,
  Target,
  FileText,
  PlusCircle,
  Filter,
  Calculator,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface SalesMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

const salesMetrics: SalesMetric[] = [
  {
    id: '1',
    title: 'Total Revenue',
    value: '$128,450',
    change: '+12.5%',
    trend: 'up',
    icon: <DollarSign className="h-6 w-6" />
  },
  {
    id: '2',
    title: 'Active Deals',
    value: '24',
    change: '+3',
    trend: 'up',
    icon: <ShoppingCart className="h-6 w-6" />
  },
  {
    id: '3',
    title: 'New Leads',
    value: '156',
    change: '+8.2%',
    trend: 'up',
    icon: <Users className="h-6 w-6" />
  },
  {
    id: '4',
    title: 'Conversion Rate',
    value: '18.5%',
    change: '+2.1%',
    trend: 'up',
    icon: <Target className="h-6 w-6" />
  }
];

export default function SalesMainPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sales Dashboard
          </h1>
          <p className="text-gray-600">
            Track sales performance, manage leads, and monitor revenue growth
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter size={16} />
            Filter
          </Button>
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <PlusCircle size={16} />
            New Lead
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {['This Week', 'This Month', 'This Quarter', 'This Year'].map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(period)}
            className={selectedPeriod === period ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {period}
          </Button>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {salesMetrics.map((metric) => (
          <Card key={metric.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <div className="text-blue-600">
                {metric.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metric.value}
              </div>
              <div className={`text-sm flex items-center gap-1 ${
                metric.trend === 'up' ? 'text-green-600' : 
                metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                <TrendingUp 
                  size={12} 
                  className={metric.trend === 'down' ? 'rotate-180' : ''} 
                />
                {metric.change} from last period
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Sales Pipeline
            </CardTitle>
            <CardDescription>
              Active deals and their progress through the sales funnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Pipeline stages */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Prospecting</p>
                  <p className="text-sm text-gray-600">8 deals • $45,200</p>
                </div>
                <div className="text-right">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div className="w-3/4 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Qualification</p>
                  <p className="text-sm text-gray-600">12 deals • $78,300</p>
                </div>
                <div className="text-right">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div className="w-2/3 h-2 bg-green-600 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Proposal</p>
                  <p className="text-sm text-gray-600">6 deals • $95,400</p>
                </div>
                <div className="text-right">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div className="w-1/2 h-2 bg-yellow-600 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Negotiation</p>
                  <p className="text-sm text-gray-600">4 deals • $67,800</p>
                </div>
                <div className="text-right">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div className="w-4/5 h-2 bg-orange-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest sales activities and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Deal closed</p>
                  <p className="text-xs text-gray-600">Acme Corp - $15,000</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">New lead added</p>
                  <p className="text-xs text-gray-600">TechStart Inc</p>
                  <p className="text-xs text-gray-500">5 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Follow-up scheduled</p>
                  <p className="text-xs text-gray-600">Global Solutions</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Proposal sent</p>
                  <p className="text-xs text-gray-600">Enterprise Ltd - $28,500</p>
                  <p className="text-xs text-gray-500">2 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/sales/quote">
            <Button 
              variant="outline" 
              className="h-24 w-full flex flex-col items-center justify-center gap-2 hover:bg-blue-50"
            >
              <Calculator className="h-6 w-6 text-blue-600" />
              <span className="text-sm">Quote Tool</span>
            </Button>
          </Link>
          
          <Link href="/sales/savings">
            <Button 
              variant="outline" 
              className="h-24 w-full flex flex-col items-center justify-center gap-2 hover:bg-green-50"
            >
              <Percent className="h-6 w-6 text-green-600" />
              <span className="text-sm">Savings Calculator</span>
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-purple-50"
          >
            <PlusCircle className="h-6 w-6 text-purple-600" />
            <span className="text-sm">Add New Lead</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-50"
          >
            <BarChart3 className="h-6 w-6 text-orange-600" />
            <span className="text-sm">View Reports</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
