'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatTime } from '@/utils/format';

interface ProjectSummary {
  projectId: string
  totalPanels: number
  completedCount: number
  inProgressCount: number
  totalCycleTime: number
  percentComplete: number
  status: string
}

export default function ProjectSummaryPage() {
  const router = useRouter()
  const [summaries, setSummaries] = useState<ProjectSummary[]>([])

  useEffect(() => {
    fetch('/api/project-summaries')
      .then(res => res.json())
      .then(setSummaries)
      .catch(console.error)
  }, [])

  if (summaries.length === 0) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">All Projects Summary</h1>
        <p className="text-gray-600">Loading or no project summaries available.</p>
      </main>
    )
  }

  const statusOrder = ['In Production', 'Complete', 'Planned']; // define your desired order

const sortedSummaries = [...summaries].sort((a, b) => {
  const aIndex = statusOrder.indexOf(a.status);
  const bIndex = statusOrder.indexOf(b.status);

  // If either status is not found, treat it as lowest priority
  const safeA = aIndex === -1 ? statusOrder.length : aIndex;
  const safeB = bIndex === -1 ? statusOrder.length : bIndex;

  return safeA - safeB;
});


  const totalPanels = summaries.reduce((sum, p) => sum + p.totalPanels, 0)
  const totalCompleted = summaries.reduce((sum, p) => sum + p.completedCount, 0)
  const totalInProgress = summaries.reduce((sum, p) => sum + p.inProgressCount, 0)
  const totalCycleTime = summaries.reduce((sum, p) => sum + p.totalCycleTime, 0)
  const overallPercent = totalPanels > 0 ? Math.round((totalCompleted / totalPanels) * 100) : 0

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">All Projects Summary</h1>

        <div className="bg-white shadow border rounded p-4 space-y-2">
          <p><strong>Total Projects:</strong> {summaries.length}</p>
          <p><strong>Total Components:</strong> {totalPanels}</p>
          <p><strong>Completed Components:</strong> {totalCompleted}</p>
          <p><strong>In Production:</strong> {totalInProgress}</p>
          <p><strong>Total Cycle Time:</strong> {formatTime(totalCycleTime)}</p>
          <p><strong>Overall Percent Complete:</strong> {overallPercent}%</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Project ID</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Progress</th>
                <th className="px-4 py-2 text-left"># Components</th>
                <th className="px-4 py-2 text-left"># Completed</th>
                <th className="px-4 py-2 text-left">Total Cycle Time</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
        <tbody>
          {sortedSummaries.map(summary => (
            <tr
              key={summary.projectId}
              className="border-t bg-white"
            >
              <td className="px-4 py-2 font-medium">{summary.projectId}</td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${summary.status === 'Complete' ? 'bg-green-100 text-green-800' :
                      summary.status === 'In Production' ? 'bg-yellow-100 text-yellow-800' :
                      summary.status === 'Planning' ? 'bg-gray-100 text-gray-800' :
                      'bg-slate-100 text-slate-800'
                    }`}
                >
                  {summary.status}
                </span>
              </td>
              <td className="px-4 py-2">
  {summary.totalPanels > 0
    ? Math.round((summary.completedCount / summary.totalPanels) * 100)
    : 0
  }%
</td>
              <td className="px-4 py-2">{summary.totalPanels}</td>
              <td className="px-4 py-2">{summary.completedCount}</td>
              <td className="px-4 py-2">{formatTime(summary.totalCycleTime)}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => router.push(`/project/${summary.projectId}`)}
                  className="text-blue-600 underline"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </main>
  )
}
