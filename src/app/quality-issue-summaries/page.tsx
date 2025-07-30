'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/utils/format'

interface QualityIssue {
  id: string
  componentId: string
  componentCode?: string
  componentType?: string
  projectId?: string
  teamLead?: string
  process: string
  issueCode: string
  engineeringAction?: string
  notes?: string
  training?: string
  updatedAt?: string
  createdAt?: string
}

export default function QualityIssueSummaryPage() {
  const [issues, setIssues] = useState<QualityIssue[]>([])
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [componentFilter, setComponentFilter] = useState('')
  const [processFilter, setProcessFilter] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/quality-issue`)
      .then(res => res.json())
      .then(data => setIssues(data?.qualityIssues || []))
      .catch(console.error)
  }, [])

  // Unique values for dropdowns
  const uniqueProjects = Array.from(new Set(issues.map(i => i.projectId).filter(Boolean)))
  const uniqueProcesses = Array.from(new Set(issues.map(i => i.process).filter(Boolean)))
  const uniqueComponents = Array.from(new Set(issues.map(i => i.componentCode || i.componentId).filter(Boolean)))

  // Filtering logic
  const filteredIssues = issues.filter(issue => {
    const matchesSearch =
      !search ||
      (issue.componentCode || issue.componentId || '').toLowerCase().includes(search.toLowerCase())
    const matchesProject = !projectFilter || issue.projectId === projectFilter
    const matchesComponent = !componentFilter || (issue.componentCode || issue.componentId) === componentFilter
    const matchesProcess = !processFilter || issue.process === processFilter
    return matchesSearch && matchesProject && matchesComponent && matchesProcess
  })

  // Add Quality Issue button handler
  const handleAddQualityIssue = () => {
    router.push('/quality-issue')
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">All Quality Issues</h1>

      {/* Search & Filter Bar */}
      <div className="mb-4 flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded">
        <input
          type="text"
          placeholder="Search by component ID"
          className="border rounded px-3 py-2"
          value={search}
          onChange={e => setSearch(e.target.value)}
          list="component-options"
        />
        <datalist id="component-options">
          {uniqueComponents.map(c => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <select
          className="border rounded px-3 py-2"
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
        >
          <option value="">All Projects</option>
          {uniqueProjects.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          className="border rounded px-3 py-2"
          value={processFilter}
          onChange={e => setProcessFilter(e.target.value)}
        >
          <option value="">All Processes</option>
          {uniqueProcesses.map(proc => (
            <option key={proc} value={proc}>{proc}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl shadow">
        {filteredIssues.length === 0 ? (
          <p className="p-4 text-gray-500">No quality issues found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold">Project ID</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Component ID</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Team Lead</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Process</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Issue Code</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Engineering Action</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Notes</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Training</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredIssues.map(issue => (
                <tr key={issue.id}>
                  <td className="px-4 py-2 text-sm font-mono">{issue.projectId || '-'}</td>
                  <td className="px-4 py-2 text-sm font-mono">{issue.componentCode || issue.componentId}</td>
                  <td className="px-4 py-2 text-sm">{issue.componentType || '-'}</td>
                  <td className="px-4 py-2 text-sm">{issue.teamLead || '-'}</td>
                  <td className="px-4 py-2 text-sm">{issue.process || '-'}</td>
                  <td className="px-4 py-2 text-sm">{issue.issueCode || '-'}</td>
                  <td className="px-4 py-2 text-sm">{issue.engineeringAction || '-'}</td>
                  <td className="px-4 py-2 text-sm">{issue.notes || '-'}</td>
                  <td className="px-4 py-2 text-sm">{issue.training || '-'}</td>
                  <td className="px-4 py-2 text-sm">
                    {issue.updatedAt
                      ? formatDate(new Date(issue.updatedAt))
                      : (issue.createdAt ? formatDate(new Date(issue.createdAt)) : '-')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleAddQualityIssue}
        >
          Add Quality Issue
        </button>
      </div>
    </main>
  )
}