'use client'

import { useEffect, useState } from 'react'

type Component = {
  id: string
  componentType: string
  currentStatus: string
  designUrl: string
}

type Project = {
  id: string
  name: string
}

export default function ComponentBrowserPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [components, setComponents] = useState<Component[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data: Project[]) => setProjects(data))
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/components?projectId=${selectedProject}`)
        .then((res) => res.json())
        .then((data: Component[]) => setComponents(data))
    }
  }, [selectedProject])

  const filteredComponents = components.filter((c) => {
    return (
      (!typeFilter || c.componentType === typeFilter) &&
      (!statusFilter || c.currentStatus === statusFilter)
    )
  })

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Component Browser</h1>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select
          className="border p-2 rounded"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">Select Project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option>Interior Wall</option>
          <option>Exterior Wall</option>
          <option>Roof</option>
          <option>Floor</option>
        </select>

        <select
          className="border p-2 rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option>Planned</option>
          <option>Released for Manufacturing</option>
          <option>Used</option>
          <option>Scrapped</option>
        </select>
      </div>

      <div className="grid gap-4">
        {filteredComponents.map((comp) => (
          <div key={comp.id} className="border p-4 rounded bg-white shadow">
            <div className="font-semibold">{comp.componentType}</div>
            <div className="text-sm text-gray-500">Status: {comp.currentStatus}</div>
            <div className="text-sm">
              Design:{' '}
              <a
                href={comp.designUrl}
                className="text-blue-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View PDF
              </a>
            </div>
          </div>
        ))}

        {filteredComponents.length === 0 && (
          <p className="text-center text-gray-400">No components found.</p>
        )}
      </div>
    </main>
  )
}
