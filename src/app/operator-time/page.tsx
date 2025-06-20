'use client'

import { useEffect, useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useSearchParams, useRouter } from 'next/navigation'

const OPERATION_ORDER = ['Cut', 'Assemble', 'Fly', 'Ship'] as const
const TEAM_LEADS = ['Joel', 'Adrian', 'Andres']
const WORKSTATIONS = ['TABLE01', 'TABLE02', 'TABLE03']

export default function OperatorTimePage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [projects, setProjects] = useState<any[]>([])
  const [components, setComponents] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [workstation, setWorkstation] = useState('')
  const [teamLead, setTeamLead] = useState('')
  const [process, setProcess] = useState('')
  const [availableProcesses, setAvailableProcesses] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedAction, setSelectedAction] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const componentIdParam = searchParams.get('componentId')
  const projectIdParam = searchParams.get('projectId')

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(setProjects)
  }, [])

  useEffect(() => {
    if (projectIdParam) {
      setSelectedProject(projectIdParam)
    }
  }, [projectIdParam])

  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/components?projectId=${selectedProject}`)
        .then(res => res.json())
        .then(data => {
          const filtered = data.filter((c: any) => {
            const last = c.timeEntries?.filter((e: any) => e.status === 'complete').at(-1)?.process
            return last !== 'Ship'
          })
          setComponents(filtered)

          if (componentIdParam) {
            const match = filtered.find((c: any) => c.id === componentIdParam)
            if (match) {
              setSelectedComponent(match)
            }
          }
        })
    }
  }, [selectedProject])

  useEffect(() => {
    let interval: any = null
    if (isRunning) {
      interval = setInterval(() => setTime(prev => prev + 1), 1000)
    }
    return () => interval && clearInterval(interval)
  }, [isRunning])

  useEffect(() => {
  if (!selectedComponent) return

  fetch(`/api/time-entry?componentId=${selectedComponent.id}`)
    .then(res => res.json())
    .then((entries: any[]) => {
      const completed = entries.filter(e => e.status === 'complete').map(e => e.process)
      const paused = entries.find(e => e.status === 'paused')

      const lastCompleted = entries
        .filter(e => e.status === 'complete')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

      if (paused) {
        setProcess(paused.process)
        setTime(Math.round(paused.duration * 60))
        setIsRunning(false)
        setWorkstation(paused.workstation)
        setTeamLead(paused.teamLead)
      } else {
        const nextProcess = OPERATION_ORDER.find(p => !completed.includes(p))
        setProcess(nextProcess || '')
        setTime(0)
        setIsRunning(false)
        setWorkstation(lastCompleted?.workstation || '')
        setTeamLead(lastCompleted?.teamLead || '')
      }

      setAvailableProcesses(OPERATION_ORDER.filter(p => !completed.includes(p)))
    })
}, [selectedComponent])

  const formatTime = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0')
    const s = String(seconds % 60).padStart(2, '0')
    return `00:${m}:${s}`
  }

  const handleStopClick = () => {
    setIsRunning(false)
    setShowModal(true)
  }

  const handleActionConfirm = async () => {
    setShowModal(false)
    setShowConfirm(false)
    setIsRunning(false)

    if (!selectedComponent || !process) return

    const durationMinutes = time / 60
    const payload = {
      componentId: selectedComponent.id,
      warehouse: 'Grand Junction',
      workstation,
      teamLead,
      process,
      duration: durationMinutes,
    }

    if (selectedAction === 'Complete') {
      await fetch('/api/time-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, status: 'complete' }),
      })

      const nextProcess = OPERATION_ORDER[OPERATION_ORDER.indexOf(process) + 1]
      if (nextProcess) {
        await fetch('/api/time-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            componentId: selectedComponent.id,
            warehouse: 'Grand Junction',
            workstation,
            teamLead,
            process: nextProcess,
            status: 'pending',
            duration: 0,
          }),
        })
      }

      const entries = await fetch(`/api/time-entry?componentId=${selectedComponent.id}`).then(res => res.json())
      const totalDuration = entries.filter((e: any) => e.status === 'complete').reduce((acc: number, e: any) => acc + e.duration, 0)

      const status = nextProcess ? `In Production (${nextProcess})` : 'Complete'

      await fetch(`/api/components/${selectedComponent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStatus: status,
          lastCompletedProcess: process,
          nextProcess: nextProcess || null,
          processStatus: status,
          percentComplete: nextProcess ? Math.floor(((OPERATION_ORDER.indexOf(process) + 1) / OPERATION_ORDER.length) * 100) : 100,
          totalCycleTime: totalDuration,
          workstation,
          teamLead,
          completedAt: !nextProcess ? new Date().toISOString() : null,
        }),
      })

      setTime(0)
      setProcess('')
      setSelectedComponent(null)
      router.push(`/projects/${selectedProject}`)
    } else if (selectedAction === 'Pause') {
      await fetch('/api/time-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, status: 'paused' }),
      })

      await fetch(`/api/components/${selectedComponent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStatus: `In Production (${process})`,
          lastCompletedProcess: process,
          nextProcess: process,
          processStatus: `Paused at ${process}`,
          workstation,
          teamLead,
        }),
      })
    } else if (selectedAction === 'Quality') {
      alert('Quality Issue - placeholder')
    }
  }

  const progressPercent = process ? Math.floor(((OPERATION_ORDER.indexOf(process) + 1) / OPERATION_ORDER.length) * 100) : 0

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Operator Panel</h1>

      <div className="text-center text-4xl font-mono">{formatTime(time)}</div>
      <div className="w-full bg-gray-200 h-4 rounded">
        <div className="bg-green-500 h-4 rounded" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="flex gap-4">
        <select className="border p-2 rounded w-1/2" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          <option value="">Select Project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select className="border p-2 rounded w-1/2" value={selectedComponent?.id || ''} onChange={(e) => {
          const comp = components.find(c => c.id === e.target.value)
          setSelectedComponent(comp || null)
        }}>
          <option value="">Select Component</option>
          {components.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
        </select>
      </div>

      {selectedComponent && (
        <div className="p-4 border rounded bg-white shadow space-y-4">
          <h2 className="text-lg font-bold">Component ID: {selectedComponent.id}</h2>
          <p><strong>Component Type:</strong> {selectedComponent.componentType}</p>
          <p><strong>Status:</strong> {selectedComponent.currentStatus}</p>
          <p><strong>Process:</strong> {process}</p>

          <select className="border p-2 rounded w-full" value={workstation} onChange={(e) => setWorkstation(e.target.value)}>
            <option value="">Select Workstation</option>
            {WORKSTATIONS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>

          <select className="border p-2 rounded w-full" value={teamLead} onChange={(e) => setTeamLead(e.target.value)}>
            <option value="">Select Team Lead</option>
            {TEAM_LEADS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button onClick={() => isRunning ? handleStopClick() : setIsRunning(true)} className={`w-full px-6 py-2 text-white rounded ${isRunning ? 'bg-red-600' : 'bg-green-600'} hover:opacity-90`}>
            {isRunning ? 'Stop' : time > 0 ? 'Resume' : 'Start'}
          </button>
        </div>
      )}

      <Transition show={showModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowModal(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all space-y-4">
                <Dialog.Title className="text-lg font-medium text-gray-900">Select Action</Dialog.Title>
                {!showConfirm ? (
                  <div className="space-y-2">
                    {['Complete', 'Pause', 'Quality'].map(action => (
                      <button key={action} className="w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => {
                        setSelectedAction(action)
                        setShowConfirm(true)
                      }}>
                        {action} Operation
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p>Are you sure you want to <strong>{selectedAction}</strong> this operation?</p>
                    <div className="flex justify-between">
                      <button className="px-4 py-2 rounded bg-gray-300" onClick={() => setShowModal(false)}>Cancel</button>
                      <button className="px-4 py-2 rounded bg-green-600 text-white" onClick={handleActionConfirm}>Confirm</button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </main>
  )
}
