'use client';

import { useEffect, useState } from 'react';
import { formatTime } from '@/utils/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line, ComposedChart,
} from 'recharts';
import { getISOWeek, getISOWeekYear } from 'date-fns';

type RecentProject = {
  projectId: string;
  componentId?: string;
  currentStatus: string;
  updatedAt?: string;
};

type Metrics = {
  totalProjects: number;
  totalComponents: number;
  totalCycleTime: number;
  avgCycleTime: number;
  completedPanels: number;
};

type Activity = {
  timestamp: any;
  id: string;
  componentId: string;
  process: string;
  status: string;
  teamLead: string;
  updatedAt: string;
};

export default function DashboardOverview() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activityFeed, setActivityFeed] = useState<Activity[]>([]);
  const [cycleTimeByType, setCycleTimeByType] = useState<{ type: string; avgCycleTime: number }[]>([]);
  const [sqftPerWeek, setSqftPerWeek] = useState<{ week: string; sqft: number; count: number }[]>([]);

  useEffect(() => {
    fetch('/api/projects/recent?limit=3')
      .then(res => res.json())
      .then(data => {
        setRecentProjects(Array.isArray(data) ? data : []);
      })
      .catch(() => setRecentProjects([]));

    fetch("/api/metrics/dashboard")
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
        return res.json();
      })
      .then(setMetrics)
      .catch(() => setMetrics(null));

    fetch("/api/activity?limit=5")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch recent activity");
        const data = await res.json();
        setActivityFeed(Array.isArray(data.activities) ? data.activities : []);
      })
      .catch(() => setActivityFeed([]));

    // Fetch cycle time by panel type
    fetch('/api/metrics/cycle-time-by-type')
      .then(res => res.json())
      .then(data => setCycleTimeByType(Array.isArray(data) ? data : []))
      .catch(() => setCycleTimeByType([]));

    // Fetch sqft production per week
    fetch('/api/metrics/sqft-per-week')
      .then(res => res.json())
      .then(data => setSqftPerWeek(Array.isArray(data) ? data : []))
      .catch(() => setSqftPerWeek([]));
  }, []);

  function fillWeeks(data: { week: string; sqft: number; count: number }[]) {
    if (data.length === 0) return [];
    const weeks = data.map(d => d.week).sort();
    const start = new Date(weeks[0]);
    const end = new Date(weeks[weeks.length - 1]);
    const allWeeks: { week: string; sqft: number; count: number }[] = [];
    let current = new Date(start);
    const weekSet = new Set(weeks);
    while (current <= end) {
      const weekStr = current.toISOString().slice(0, 10);
      const found = data.find(d => d.week === weekStr);
      allWeeks.push(found ?? { week: weekStr, sqft: 0, count: 0 });
      current.setDate(current.getDate() + 7);
    }
    return allWeeks;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-2xl p-6 flex flex-col items-start min-w-[180px]">
          <h3 className="text-sm text-gray-500 mb-1">Total Projects</h3>
          <p className="text-3xl font-bold">{metrics?.totalProjects ?? '-'}</p>
        </div>
        <div className="bg-white shadow rounded-2xl p-6 flex flex-col items-start min-w-[180px]">
          <h3 className="text-sm text-gray-500 mb-1">Total Panels</h3>
          <p className="text-3xl font-bold">{metrics?.completedPanels ?? '-'}</p>
        </div>
        <div className="bg-white shadow rounded-2xl p-6 flex flex-col items-start min-w-[180px]">
          <h3 className="text-sm text-gray-500 mb-1">Avg Cycle Time</h3>
          <p className="text-3xl font-bold">
            {metrics?.avgCycleTime != null ? formatTime(metrics.avgCycleTime) : '-'}
          </p>
        </div>
      </div>

      {/* Sqft Production per Week - Full Width */}
      <div className="bg-white shadow rounded-2xl p-6 w-full">
        <h2 className="text-lg font-semibold mb-4">Sqft & Panel Count per Week</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={fillWeeks(sqftPerWeek)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              angle={-30}
              textAnchor="end"
              interval={Math.ceil(fillWeeks(sqftPerWeek).length / 26)} // show about 8 labels
              height={50}
              tickFormatter={week => {
                const d = new Date(week);
                const weekNum = getISOWeek(d);
                const year = getISOWeekYear(d);
                return `${year}-W${weekNum.toString().padStart(2, '0')}`;
              }}
            />
            <YAxis yAxisId="left" label={{ value: 'Sqft', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Panels', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="right" dataKey="count" fill="#2563eb" name="Panels" />
            <Line yAxisId="left" type="monotone" dataKey="sqft" stroke="#10b981" name="Sqft" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Main Content Tiles with custom column spans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cycle Time by Panel Type - spans 2 columns */}
        <div className="bg-white shadow rounded-2xl p-6 min-w-[250px] md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Cycle Time by Panel Type</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={cycleTimeByType.map(item => ({
                ...item,
                avgCycleTime: Math.round(item.avgCycleTime / 60), // convert seconds to minutes
              }))}
              layout="vertical"
              margin={{ left: 30, right: 20, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                label={{ value: 'Minutes', angle: 0, position: 'insideBottom', offset: -5 }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                dataKey="type"
                type="category"
                tick={{ fontSize: 12 }}
                width={100}
                label={{ value: 'Panel Type', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={v => `${v} min`} />
              <Legend />
              <Bar dataKey="avgCycleTime" fill="#2563eb" name="Avg Cycle Time (min)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Projects */}
        <div className="bg-white shadow rounded-2xl p-6 min-w-[250px]">
          <h2 className="text-lg font-semibold mb-4">Recent Projects</h2>
          <ul className="divide-y divide-gray-200">
            {recentProjects.map((project, index) => (
              <li key={project.projectId || `project-${index}`} className="py-3">
                <div className="font-semibold text-base">{project.projectId ?? 'Untitled Project'}</div>
                <div className="text-sm text-gray-500">
                  Status: <span className="capitalize">{project.currentStatus}</span> &middot; Last updated:{' '}
                  {project.updatedAt
                    ? new Date(project.updatedAt).toLocaleDateString()
                    : 'N/A'}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent Activity - spans all 3 columns */}
        <div className="bg-white shadow rounded-2xl p-6 min-w-[250px] md:col-span-3">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <ul className="divide-y divide-gray-200">
            {activityFeed.map((entry, index) => (
              <li key={entry.id || `activity-${index}`} className="py-3">
                <div className="font-semibold text-base">
                  {entry.componentId} - {entry.process} <span className="text-xs text-gray-400">({entry.status})</span>
                </div>
                <div className="text-sm text-gray-500">
                  {entry.teamLead} &middot; {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Invalid Date'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
