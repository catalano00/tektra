'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatTime } from '@/utils/format';

export default function ComponentBrowserPage() {
  const [components, setComponents] = useState<any[]>([])
  const [typeFilter, setTypeFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const router = useRouter()

  useEffect(() => {
    setIsLoading(true)
    fetch('/api/v1/components')
      .then((res) => res.json())
      .then((data) => {
        setComponents(data.components || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjectOptions(data.map((p: any) => p.projectId)))
      .catch(() => setProjectOptions([]));
  }, []);

  const filtered = components.filter((c) => {
    const matchesProject = !projectFilter || c.projectId === projectFilter
    const matchesType = !typeFilter || c.componentType === typeFilter
    const matchesStatus = !statusFilter || c.currentStatus === statusFilter
    const matchesSearch = !search || c.componentId.toLowerCase().includes(search.toLowerCase()) || c.projectName.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesStatus && matchesSearch && matchesProject
  })

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Component Browser</h1>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search by component ID"
          className="border p-2 rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border p-2 rounded"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">All Projects</option>
          {projectOptions.map((pid) => (
            <option key={pid} value={pid}>{pid}</option>
          ))}
        </select>        
        <select
          className="border p-2 rounded"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option>Beam</option>
          <option>Interior Wall</option>
          <option>Exterior Wall</option>
          <option>Roof Panel</option>
          <option>Floor Panel</option>
        </select>
        <select
          className="border p-2 rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {['Planned', 'Released for Manufacturing', 'Delivered', 'Quality Issue'].map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl shadow">
        {isLoading ? (
          <p className="p-4">Loading components...</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-gray-500">No components found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold">Component ID</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Project</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Design</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Cycle Time</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.map((comp) => {
                // Calculate cycle time as sum of durations in timeEntries
                const cycleTime =
                  comp.timeEntries?.reduce((sum: number, entry: any) => sum + (entry.duration || 0), 0) || 0;
                // Use formatTime for consistency
                const formattedCycleTime = formatTime(cycleTime);

                return (
                  <tr key={comp.id}>
                    <td className="px-4 py-2 text-sm font-mono">{comp.componentId}</td>
                    <td className="px-4 py-2 text-sm">{comp.componentType}</td>
                    <td className="px-4 py-2 text-sm">{comp.currentStatus}</td>
                    <td className="px-4 py-2 text-sm">{comp.projectId}</td>
                    <td className="px-4 py-2 text-sm">
                      {comp.designUrl ? (
                        <a
                          href={comp.designUrl}
                          className="text-blue-600 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View PDF
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">{formattedCycleTime}</td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => router.push(`/components/${comp.id}`)}
                        className="text-sm text-blue-600 underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}