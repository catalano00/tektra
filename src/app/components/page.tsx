'use client'

import { useEffect, useState } from 'react'

type Component = {
  componentId: string
  componentType: string
  currentStatus: string
  designUrl: string
}

type Project = {
  projectId: string
  name: string
}

export default function ComponentBrowserPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [components, setComponents] = useState<Component[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetch('/api/projects/[projectId]')
      .then((res) => res.json())
      .then((data: Project[]) => setProjects(data))
  }, [])

  useEffect(() => {
    if (!selectedProject) {
      setComponents([])
      return
    }

    setIsLoading(true)
    fetch(`/api/v1/components?projectId=${selectedProject}`)
      .then((res) => res.json())
      .then((data: { components: Component[] }) => {
        setComponents(data.components)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
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
            <option key={p.projectId} value={p.projectId}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          disabled={!selectedProject}
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
          disabled={!selectedProject}
        >
          <option value="">All Statuses</option>
          {['Planned', 'Released for Manufacturing', 'Used', 'Scrapped'].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4">
        {!selectedProject ? (
          <p className="text-center text-gray-400">Select a project to view components.</p>
        ) : isLoading ? (
          <p className="text-center">Loading components...</p>
        ) : filteredComponents.length === 0 ? (
          <p className="text-center text-gray-400">No components found.</p>
        ) : (
          filteredComponents.map((comp) => (
            <div key={comp.componentId} className="border p-4 rounded bg-white shadow">
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
          ))
        )}
      </div>
    </main>
  )
}