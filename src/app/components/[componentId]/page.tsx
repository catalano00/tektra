'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatTime } from '@/utils/format';

export default function ComponentDetailsPage() {
  const { componentId } = useParams()
  const [component, setComponent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadComponent = async () => {
      try {
        const res = await fetch(`/api/components/${componentId}`);
        if (!res.ok) throw new Error(`Failed to fetch component ${componentId}`);
        const data = await res.json();
        setComponent(data.component || data);
      } catch (err) {
        console.error('Error loading component:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadComponent();
  }, [componentId]);

  if (isLoading) return <p className="p-6">Loading component details...</p>
  if (!component) return <p className="p-6 text-red-500">Component not found.</p>

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Component Details</h1>

      <div className="bg-white rounded shadow p-4 mb-6">
        <p><strong>Type:</strong> {component.componentType}</p>
        <p><strong>Status:</strong> {component.currentStatus}</p>
        <p><strong>Project:</strong> {component.projectName || component.projectId}</p>
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

      {/* Part List Table */}
      <h2 className="text-xl font-semibold mb-2">Part List</h2>
      <div className="overflow-x-auto bg-white rounded shadow p-4 mb-6">
        {component.part?.length ? (
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Label</th>
                <th className="p-2 text-left">Size</th>
                <th className="p-2 text-left">Count</th>
                <th className="p-2 text-left">Cut Length</th>
              </tr>
            </thead>
            <tbody>
              {component.part.map((part: any) => (
                <tr key={part.id} className="border-t">
                  <td className="p-2">{part.label}</td>
                  <td className="p-2">{part.size}</td>
                  <td className="p-2">{part.count}</td>
                  <td className="p-2">{part.cutlength}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No parts listed.</p>
        )}
      </div>

      {/* Connectors Table */}
      <h2 className="text-xl font-semibold mb-2">Connectors</h2>
      <div className="overflow-x-auto bg-white rounded shadow p-4 mb-6">
        {component.connectors?.length ? (
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Manufacturer</th>
                <th className="p-2 text-left">Quantity</th>
                <th className="p-2 text-left">Location</th>
              </tr>
            </thead>
            <tbody>
              {component.connectors.map((conn: any, idx: number) => (
                <tr key={conn.id || idx} className="border-t">
                  <td className="p-2">{conn.type}</td>
                  <td className="p-2">{conn.manufacturer}</td>
                  <td className="p-2">{conn.quantity}</td>
                  <td className="p-2">{conn.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No connectors listed.</p>
        )}
      </div>

      {/* Framing TL Table */}
      <h2 className="text-xl font-semibold mb-2">Framing TL</h2>
      <div className="overflow-x-auto bg-white rounded shadow p-4 mb-6">
        {component.framingTL?.length ? (
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Hours</th>
              </tr>
            </thead>
            <tbody>
              {component.framingTL.map((ftl: any, idx: number) => (
                <tr key={ftl.id || idx} className="border-t">
                  <td className="p-2">{ftl.name}</td>
                  <td className="p-2">{ftl.role}</td>
                  <td className="p-2">{ftl.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No framing TL info available.</p>
        )}
      </div>

      {/* Sheathing (still as list, as structure is not tabular) */}
      <h2 className="text-xl font-semibold mb-2">Sheathing</h2>
      <div className="bg-white rounded shadow p-4 mb-6">
        {component.sheathing?.length ? (
          <ul className="list-disc space-y-1">
            {component.sheathing.map((sheet: any) => (
              <li key={sheet.id}>{sheet.material} — {sheet.thickness} in</li>
            ))}
          </ul>
        ) : (
          <p>No sheathing info available.</p>
        )}
      </div>

      {/* Time Entries Table */}
      <h2 className="text-xl font-semibold mb-2">Time Entries</h2>
      <div className="overflow-x-auto bg-white rounded shadow p-4 mb-6">
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
              {component.timeEntries.map((entry: any, idx: number) => (
                <tr key={entry.id || idx} className="border-t">
                  <td className="p-2">{entry.process}</td>
                  <td className="p-2">{entry.status}</td>
                  <td className="p-2">{entry.teamLead}</td>
                  <td className="p-2">{formatTime(entry.duration ?? '--')}</td>
                  <td className="p-2">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '--'}</td>
                  <td className="p-2">{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : '--'}</td>
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