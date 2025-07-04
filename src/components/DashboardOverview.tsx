'use client';

import { useEffect, useState } from 'react';
import { formatTime } from '@/utils/format';

type RecentProject = {
  projectId: string;
  name?: string; // ← Prisma doesn't show `name` in your model, so remove or adjust if needed
  currentStatus: string;
  updatedAt?: string;
};

type Metrics = {
  totalProjects: number;
  totalComponents: number;
  totalCycleTime: number;
  avgCycleTime: number;
};

type Activity = {
  id: string;
  componentCode: string;
  process: string;
  status: string;
  teamLead: string;
  updatedAt: string;
};

export default function DashboardOverview() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activityFeed, setActivityFeed] = useState<Activity[]>([]);

  useEffect(() => {
  // Recent Projects
  fetch('/api/projects/recent?limit=3')
    .then(res => res.json())
    .then(data => {
      console.log('recentProjects API response:', data);
      setRecentProjects(Array.isArray(data) ? data : []);
    })
    .catch(err => {
      console.error("Recent projects fetch failed", err);
      setRecentProjects([]);
    });

  // Dashboard Metrics
  fetch("/api/metrics/dashboard")
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
      return res.json();
    })
    .then(setMetrics)
    .catch(err => {
      console.error("Dashboard metrics fetch failed", err);
      setMetrics(null);
    });

  // Activity Feed
  fetch("/api/activity?limit=5")
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch recent activity');
      return res.json();
    })
    .then(data => setActivityFeed(Array.isArray(data) ? data : []))
    .catch(err => {
      console.error("Activity fetch failed", err);
      setActivityFeed([]);
    });
  }, []);

  return (
    <div className="grid gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="text-sm text-gray-500">Total Projects</h3>
          <p className="text-2xl font-bold">{metrics?.totalProjects ?? '-'}</p>
        </div>
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="text-sm text-gray-500">Total Panels</h3>
          <p className="text-2xl font-bold">{metrics?.totalComponents ?? '-'}</p>
        </div>
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="text-sm text-gray-500">Avg Cycle Time</h3>
          <p className="text-2xl font-bold">
            {metrics?.avgCycleTime != null ? formatTime(metrics.avgCycleTime) : '-'}
          </p>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-white shadow rounded-2xl p-4">
        <h2 className="text-lg font-semibold mb-2">Recent Projects</h2>
        <ul className="divide-y divide-gray-200">
          {recentProjects.map(project => (
            <li key={project.projectId} className="py-2">
              <div className="font-medium">{project.projectId ?? 'Untitled Project'}</div>
              <div className="text-sm text-gray-500">
                Status: {project.currentStatus} · Last updated:{' '}
                {project.updatedAt
                  ? new Date(project.updatedAt).toLocaleDateString()
                  : 'N/A'}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Activity Feed */}
      <div className="bg-white shadow rounded-2xl p-4">
        <h2 className="text-lg font-semibold mb-2">Recent Activity</h2>
        <ul className="divide-y divide-gray-200">
          {activityFeed.map(entry => (
            <li key={entry.id} className="py-2">
              <div className="font-medium">
                {entry.componentCode} - {entry.process} ({entry.status})
              </div>
              <div className="text-sm text-gray-500">
                {entry.teamLead} · {new Date(entry.updatedAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
