'use client';

import { useEffect, useState } from 'react';

type Activity = {
  id: string;
  projectId: string;
  componentId: string;
  componentType: string;
  process: string;
  status: string;
  teamLead: string;
  timestamp: string;
  cycleTimeSeconds: number;
  percentComplete: number;
};

function formatDuration(seconds: number) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default function ActivityPage() {
  const [activityFeed, setActivityFeed] = useState<Activity[]>([]);

  useEffect(() => {
    fetch('/api/activity')
      .then(res => res.json())
      .then(data => setActivityFeed(Array.isArray(data) ? data : []))
      .catch(() => setActivityFeed([]));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Activity Feed</h1>

      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Component</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Process</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Team Lead</th>
              <th className="px-4 py-3">Cycle Time</th>
              <th className="px-4 py-3">% Complete</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {activityFeed.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-2">{entry.projectId}</td>
                <td className="px-4 py-2">{entry.componentId}</td>
                <td className="px-4 py-2">{entry.componentType}</td>
                <td className="px-4 py-2">{entry.process}</td>
                <td className="px-4 py-2 capitalize">{entry.status}</td>
                <td className="px-4 py-2">{entry.teamLead}</td>
                <td className="px-4 py-2">{formatDuration(entry.cycleTimeSeconds)}</td>
                <td className="px-4 py-2">
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-green-500"
                      style={{ width: `${entry.percentComplete}%` }}
                    />
                  </div>
                  <span className="text-xs ml-1">{entry.percentComplete}%</span>
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}