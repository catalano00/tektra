'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
// Utility function to format date as 'YYYY-MM-DD'
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

interface TimeEntry {
  status: string
  process: string
  createdAt: string
  updatedAt: string
  teamLead?: string
  duration?: number
}

interface Component {
  id: string
  componentId: string
  componentType: string
  currentStatus: string
  percentComplete: number
  timeEntries: TimeEntry[]
  lastCompletedProcess: string
  nextProcess: string
  issueCode?: string
  engineeringAction?: string
  notes?: string
  training?: string
  updatedAt?: string
}

export default function QualityIssueSummaryPage() {
  const params = useParams()
  const projectId = Array.isArray(params?.projectId)
    ? params.projectId[0]
    : params?.projectId || ''
  const [components, setComponents] = useState<Component[]>([])

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/components?projectId=${projectId}`)
      .then(res => res.json())
      .then(data => {
        // Only show components with currentStatus === 'Quality Issue'
        setComponents((data.components || []).filter((c: Component) => c.currentStatus === 'Quality Issue'))
      })
      .catch(console.error)
  }, [projectId])

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Quality Issue Summary</h1>
      <table className="min-w-full bg-white border border-gray-300 text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
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
          {components.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-8 text-gray-400">
                No quality issues found for this project.
              </td>
            </tr>
          )}
          {components.map(comp => {
            // Try to get the latest team lead from timeEntries
            const teamLead =
              comp.timeEntries?.slice().reverse().find(e => e.teamLead)?.teamLead || ''
            return (
              <tr key={comp.componentId} className="border-t">
                <td className="px-4 py-2">{comp.componentId}</td>
                <td className="px-4 py-2">{comp.componentType}</td>
                <td className="px-4 py-2">{teamLead}</td>
                <td className="px-4 py-2">{comp.issueCode || '-'}</td>
                <td className="px-4 py-2">{comp.engineeringAction || '-'}</td>
                <td className="px-4 py-2">{comp.notes || '-'}</td>
                <td className="px-4 py-2">{comp.training || '-'}</td>
                <td className="px-4 py-2">{comp.updatedAt ? formatDate(new Date(comp.updatedAt)) : '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </main>
  )
}