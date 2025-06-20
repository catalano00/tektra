'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Component {
  id: string
  componentType: string
  currentStatus: string
  completedAt?: string
  designUrl?: string
  lastCompletedProcess?: string
  nextProcess?: string
  processStatus?: string
  percentComplete?: number
  totalCycleTime?: number
  workstation?: string
  teamLead?: string
  project?: { name: string }
}

export default function ProjectSummaryPage() {
  const params = useParams()
  const projectId = params?.id as string
  const router = useRouter()

  const [components, setComponents] = useState<Component[]>([])
  const [projectName, setProjectName] = useState<string>('')
  const [projectCycleTime, setProjectCycleTime] = useState<number>(0)

  useEffect(() => {
    if (projectId) {
      fetch(`/api/components?projectId=${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          setComponents(data)

          if (data.length > 0 && data[0].project?.name) {
            setProjectName(data[0].project.name)
          }

          let totalTime = 0
          data.forEach((comp: Component) => {
            totalTime += comp.totalCycleTime || 0
          })
          setProjectCycleTime(Math.round(totalTime * 60))
        })
    }
  }, [projectId])

  const formatTime = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0')
    const s = String(Math.floor(seconds % 60)).padStart(2, '0')
    return `00:${m}:${s}`
  }

  const getStatusColor = (status: string) => {
    if (status === 'Complete') return 'bg-green-100'
    if (status.includes('In Production')) return 'bg-yellow-100'
    return 'bg-white'
  }

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Project Summary</h1>
      {projectName && <h2 className="text-xl text-gray-700">{projectName}</h2>}
      <p className="text-sm text-gray-600">Total Project Cycle Time: {formatTime(projectCycleTime)}</p>
      <p className="text-sm text-gray-600">Total Components: {components.length}</p>

      <table className="w-full text-sm border mt-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Component ID</th>
            <th className="p-2 border">Type</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Process Status</th>
            <th className="p-2 border">Last Process</th>
            <th className="p-2 border">Next Process</th>
            <th className="p-2 border">Cycle Time</th>
            <th className="p-2 border">% Complete</th>
            <th className="p-2 border">Completed At</th>
            <th className="p-2 border">Workstation</th>
            <th className="p-2 border">Team Lead</th>
            <th className="p-2 border">Drawing</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>
        <tbody>
          {components.map((c) => (
            <tr key={c.id} className={`text-center ${getStatusColor(c.currentStatus)}`}>
              <td className="p-2 border">{c.id}</td>
              <td className="p-2 border">{c.componentType}</td>
              <td className="p-2 border">{c.currentStatus}</td>
              <td className="p-2 border">{c.processStatus || '-'}</td>
              <td className="p-2 border">{c.lastCompletedProcess || '-'}</td>
              <td className="p-2 border">{c.nextProcess || '-'}</td>
              <td className="p-2 border">{formatTime((c.totalCycleTime || 0) * 60)}</td>
              <td className="p-2 border">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-green-500 h-4 rounded-full"
                    style={{ width: `${c.percentComplete ?? 0}%` }}
                  ></div>
                </div>
                <p className="text-xs mt-1">{(c.percentComplete ?? 0).toFixed(1)}%</p>
              </td>
              <td className="p-2 border">{c.completedAt ? new Date(c.completedAt).toLocaleString() : '-'}</td>
              <td className="p-2 border">{c.workstation || '-'}</td>
              <td className="p-2 border">{c.teamLead || '-'}</td>
              <td className="p-2 border">
                {c.designUrl ? (
                  <a className="text-blue-600 underline" href={c.designUrl} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                ) : (
                  '-'
                )}
              </td>
              <td className="p-2 border">
                <button
                  className="text-sm text-white bg-blue-500 px-2 py-1 rounded hover:bg-blue-600"
                  onClick={() =>
                    router.push(`/operator-time?componentId=${c.id}&projectId=${projectId}`)
                  }
                >
                  Go
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
