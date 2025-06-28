'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter} from 'next/navigation'
import { formatAddress, formatTime, formatDate } from '@/utils/format';

interface TimeEntry {
  status: string
  process: string
  createdAt: string
  updatedAt: string
  teamLead?: string
}

interface Component {
  id: string
  componentId: string
  componentType: string
  currentStatus: string
  percentComplete: number
  totalCycleTime: number | null
  timeEntries: TimeEntry[]
  lastCompletedProcess: string
  nextProcess: string
}

const PROCESS_ORDER = ['Cut', 'Assemble', 'Fly', 'Ship']

export default function ProjectPage() {
  const [filterStatus, setFilterStatus] = useState<'Pending' | 'All' | 'Complete'>('Pending');
  const params = useParams()
  const router = useRouter()
  const projectId = Array.isArray(params?.projectId)
    ? params.projectId[0]
    : params?.projectId || '';
  const [components, setComponents] = useState<Component[]>([])
  
  const [projectMeta, setProjectMeta] = useState<{
    streetaddress?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    buildableSqFt?: number;
    estimatedPanelSqFt?: number;
    expectedDrawingStart?: string;
    expectedProductionStart?: string;
    expectedProductionCompletion?: string;
    currentStatus?: string;
  } | null>(null);
  
  const filteredComponents = components.filter(c => {
    const isShipped = c.currentStatus?.toLowerCase() === 'delivered';
    
    if (filterStatus === 'Complete') return isShipped;
    if (filterStatus === 'Pending') return !isShipped;
    return true; // 'All'
});

  useEffect(() => {
  if (!projectId || typeof projectId !== 'string') return;

  fetch(`/api/components?projectId=${projectId}`)
    .then(res => res.json())
    .then(data => {
      setComponents(data.components || []);
      setProjectMeta(data.project || null);
    })
    .catch(console.error);
  }, [projectId]);

  const getProcessDetails = (entries: TimeEntry[]) => {
    const completed = new Set(
      entries.filter(e => e.status === 'complete').map(e => e.process)
    )
    const inProgress = entries.find(e => e.status === 'in progress')?.process
    const paused = entries.find(e => e.status === 'paused')?.process

    const lastProcess = [...PROCESS_ORDER].reverse().find(p => completed.has(p)) || ''

    // ✅ NEW LOGIC: If Ship is completed, there is no next process
    const nextProcess = completed.has('Ship')
      ? ''
      : PROCESS_ORDER.find(p => !completed.has(p))

    const currentProcess = inProgress || paused || ''
    const processStatus = currentProcess
      ? paused ? 'Paused' : 'In Progress'
      : completed.has('Ship')
        ? 'Completed'
        : 'Pending'

    return { lastProcess, nextProcess, processStatus }
  }

  const getLastTeamLead = (entries: TimeEntry[]) => {
    return entries.slice().reverse().find(e => e.teamLead)?.teamLead || ''
  }

  const completedCount = components.filter(c =>
    c.timeEntries?.some(e => e.process === 'Ship' && e.status === 'complete')
  ).length

  const totalPanels = components.length
  const totalCycleTime = components.reduce((acc, c) => acc + (c.totalCycleTime || 0), 0)
  const percentComplete = totalPanels > 0 ? Math.round((completedCount / totalPanels) * 100) : 0

  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes('deliver')) return 'bg-green-200 text-green-800'
    if (status.toLowerCase().includes('ship')) return 'bg-blue-200 text-blue-800'
    return 'bg-yellow-200 text-yellow-800'
  }

  return (
   <main className="max-w-6xl mx-auto p-6 space-y-6">
    {/* Header section with project info and filter */}
    <div className="flex flex-wrap justify-between items-start gap-6">
      <div className="flex-1 min-w-[250px] space-y-2">
        <div>
          <h1 className="text-2xl font-bold">{projectId}</h1>
          {projectMeta && (
            <p className="text-sm text-gray-700 whitespace-pre-line">
              
              {formatAddress(projectMeta)}
            </p>
          )}
        </div>

        {projectMeta && (
          <div className="bg-white shadow border rounded p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <p><strong>Buildable SqFt:</strong> {projectMeta.buildableSqFt?.toLocaleString()}</p>
            <p><strong>Estimated Panel SqFt:</strong> {projectMeta.estimatedPanelSqFt?.toLocaleString()}</p>
            <p><strong>Status:</strong> {projectMeta.currentStatus}</p>
            <p><strong>Expected Drawing Start:</strong> {projectMeta.expectedDrawingStart}</p>
            <p><strong>Expected Production Start:</strong> {projectMeta.expectedProductionStart}</p>
            <p><strong>Expected Production Completion:</strong> {projectMeta.expectedProductionCompletion}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">
          Filter Components
        </label>
        <select
          id="statusFilter"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as 'Pending' | 'All' | 'Complete')}
          className="border rounded px-3 py-2"
        >
          <option value="Pending">Released for Manufacturing</option>
          <option value="All">All</option>
          <option value="Complete">Complete</option>
        </select>
      </div>
    </div>

    {/* Panel summary box */}
    <div className="bg-white shadow border rounded p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
      <div>
        <p className="text-gray-500">Total Panels</p>
        <p className="font-semibold">{totalPanels}</p>
      </div>
      <div>
        <p className="text-gray-500">Completed Panels</p>
        <p className="font-semibold">{completedCount}</p>
      </div>
      <div>
        <p className="text-gray-500">Percent Complete</p>
        <p className="font-semibold">{percentComplete}%</p>
      </div>
      <div>
        <p className="text-gray-500">Total Cycle Time</p>
        <p className="font-semibold">{formatTime(totalCycleTime)}</p>
      </div>
    </div>
      <table className="min-w-full bg-white border border-gray-300 text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2 text-left">Component ID</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Progress</th>
            <th className="px-4 py-2 text-left">Cycle Time</th>
            <th className="px-4 py-2 text-left">Last Process</th>
            <th className="px-4 py-2 text-left">Next Process</th>
            <th className="px-4 py-2 text-left">Process Status</th>
            <th className="px-4 py-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredComponents.map(comp => {
            const { lastProcess, nextProcess, processStatus } = getProcessDetails(comp.timeEntries)
            const cycleTime = comp.totalCycleTime || 0
            const teamLead = getLastTeamLead(comp.timeEntries)
            return (
              <tr key={comp.componentId} className="border-t">
                <td className="px-4 py-2">{comp.componentId}</td>
                <td className="px-4 py-2">{comp.componentType}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${comp.currentStatus === 'Delivered' ? 'bg-green-100 text-green-800' :
                        comp.currentStatus === 'Released for Manufacturing' ? 'bg-yellow-100 text-yellow-800' :
                        comp.currentStatus === 'Cutting Complete' ? 'bg-blue-100 text-blue-800' :
                        comp.currentStatus === 'Framing Complete' ? 'bg-gray-100 text-gray-800' :
                        comp.currentStatus === 'Ready to Ship' ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-800'
                      }`}
                  >
                    {comp.currentStatus.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-2">{comp.percentComplete || 0}%</td>
                <td className="px-4 py-2">{formatTime(cycleTime)}</td>
                <td className="px-4 py-2">{lastProcess || '-'}</td>
                <td className="px-4 py-2">{nextProcess || '-'}</td>
                <td className="px-4 py-2">{processStatus}</td>
                <td className="px-4 py-2">
                  <button
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  onClick={() => {
                    const componentId = comp.componentId; // this is what OperatorTimePage expects
                    const process = nextProcess || 'Ship';

                    const query = new URLSearchParams({
                      projectId: String(projectId),
                      componentId,
                      process,
                      teamLead
                    }).toString();

                    router.push(`/operator-time?${query}`);
                  }}
                >
                  Go
                </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </main>
  )
}
