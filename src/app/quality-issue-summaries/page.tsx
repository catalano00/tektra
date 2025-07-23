'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    fetch(`/api/quality-issue`)
      .then(res => res.json())
      .then(data => setIssues(data?.qualityIssues || []))
      .catch(console.error)
  }, [])

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">All Quality Issues</h1>
      <table className="min-w-full bg-white border border-gray-300 text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2">Project ID</th>
            <th className="px-4 py-2">Component ID</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Team Lead</th>
            <th className="px-4 py-2">Issue Code</th>
            <th className="px-4 py-2">Engineering Action</th>
            <th className="px-4 py-2">Notes</th>
            <th className="px-4 py-2">Training</th>
            <th className="px-4 py-2">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {issues.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center py-8 text-gray-400">
                No quality issues found.
              </td>
            </tr>
          )}
          {issues.map(issue => (
            <tr key={issue.id} className="border-t">
              <td className="px-4 py-2">{issue.projectId || '-'}</td>
              <td className="px-4 py-2">{issue.componentCode || issue.componentId}</td>
              <td className="px-4 py-2">{issue.componentType || '-'}</td>
              <td className="px-4 py-2">{issue.teamLead || '-'}</td>
              <td className="px-4 py-2">{issue.issueCode || '-'}</td>
              <td className="px-4 py-2">{issue.engineeringAction || '-'}</td>
              <td className="px-4 py-2">{issue.notes || '-'}</td>
              <td className="px-4 py-2">{issue.training || '-'}</td>
              <td className="px-4 py-2">
                {issue.updatedAt
                  ? formatDate(new Date(issue.updatedAt))
                  : (issue.createdAt ? formatDate(new Date(issue.createdAt)) : '-')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}