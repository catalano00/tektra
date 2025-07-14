'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatTime } from '@/utils/format';

export default function ComponentDetailsPage() {
  const { componentId } = useParams()
  const [component, setComponent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!componentId) return

    fetch(`/api/components/${componentId}`)
      .then((res) => res.json())
      .then((data) => {
        setComponent(data)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [componentId])

  if (isLoading) return <p className="p-6">Loading component details...</p>
  if (!component) return <p className="p-6 text-red-500">Component not found.</p>

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Component Details</h1>

      <div className="bg-white rounded shadow p-4 mb-6">
        <p><strong>Type:</strong> {component.componentType}</p>
        <p><strong>Status:</strong> {component.currentStatus}</p>
        <p><strong>Project:</strong> {component.projectName}</p>
        <p><strong>Next Process:</strong> {component.nextProcess ?? '--'}</p>
        <p><strong>Square Feet:</strong> {component.componentsqft ?? '--'}</p>

        <div className="mt-2">
          <strong>Percent Complete:</strong>
          <div className="w-full bg-gray-200 h-4 rounded mt-1">
            <div
              className="bg-green-500 h-4 rounded"
              style={{ width: `${component.percentComplete || 0}%` }}
            />
          </div>
        </div>

        {component.designUrl && (
          <a
            href={component.designUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-blue-600 underline"
          >
            View Design PDF
          </a>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-2">Part List</h2>
      <div className="bg-white rounded shadow p-4 mb-6">
        {component.partList?.length ? (
          <ul className="list-disc list-inside space-y-1">
            {component.partList.map((part: any) => (
              <li key={part.id}>{part.partCode} — {part.description} ({part.quantity})</li>
            ))}
          </ul>
        ) : (
          <p>No parts listed.</p>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-2">Sheathing</h2>
      <div className="bg-white rounded shadow p-4 mb-6">
        {component.sheathing?.length ? (
          <ul className="list-disc list-inside space-y-1">
            {component.sheathing.map((sheet: any) => (
              <li key={sheet.id}>{sheet.material} — {sheet.thickness} in</li>
            ))}
          </ul>
        ) : (
          <p>No sheathing info available.</p>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-2">Time Entries</h2>
      <div className="overflow-x-auto bg-white rounded shadow">
        {component.timeEntries?.length ? (
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Process</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Team Lead</th>
                <th className="p-2 text-left">Cycle Time</th>
                <th className="p-2 text-left">Created At</th>
                <th className="p-2 text-left">Updated At</th>
              </tr>
            </thead>
            <tbody>
              {component.timeEntries.map((entry: any) => (
                <tr key={entry.id} className="border-t">
                  <td className="p-2">{entry.process}</td>
                  <td className="p-2">{entry.status}</td>
                  <td className="p-2">{entry.teamLead}</td>
                  <td className="p-2">{formatTime(entry.duration ?? '--')}</td>
                  <td className="p-2">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="p-2">{new Date(entry.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4">No time entries yet.</p>
        )}
      </div>
    </main>
  )
}
