'use client'

import { useEffect, useState } from 'react'

export default function OperatorTimePage() {
  const [projects, setProjects] = useState([])
  const [components, setComponents] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [warehouse, setWarehouse] = useState('')
  const [workstation, setWorkstation] = useState('')
  const [teamLead, setTeamLead] = useState('')
  const [process, setProcess] = useState('')

  useEffect(() => {
    fetch('/api/projects').then((res) => res.json()).then(setProjects)
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/components?projectId=${selectedProject}`)
        .then((res) => res.json())
        .then(setComponents)
    } else {
      setComponents([])
    }
  }, [selectedProject])

  useEffect(() => {
    let interval: any = null
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const formatTime = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0')
    const s = String(seconds % 60).padStart(2, '0')
    return `00:${m}:${s}`
  }

  const handleStop = async () => {
    setIsRunning(false)

    await fetch('/api/time-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        componentId: selectedComponent.id,
        duration: time,
        warehouse,
        workstation,
        teamLead,
        process,
      }),
    })

    setTime(0)
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Operator Time Entry</h1>

      <div className="flex gap-4">
        <select
          className="border p-2 rounded w-1/2"
          value={selectedProject}
          onChange={(e) => {
            setSelectedProject(e.target.value)
            setSelectedComponent(null)
          }}
        >
          <option value="">Select Project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          className="border p-2 rounded w-1/2"
          value={selectedComponent?.id || ''}
          onChange={(e) => {
            const comp = components.find((c) => c.id === e.target.value)
            setSelectedComponent(comp || null)
            setTime(0)
            setIsRunning(false)
          }}
        >
          <option value="">Select Component</option>
          {components.map((c) => (
            <option key={c.id} value={c.id}>{c.id}</option>
          ))}
        </select>
      </div>

      {selectedComponent && (
        <div className="p-4 border rounded bg-white shadow space-y-4">
          <h2 className="font-semibold mb-2">Component Details</h2>
          <p><strong>Type:</strong> {selectedComponent.componentType}</p>
          <p><strong>Status:</strong> {selectedComponent.currentStatus}</p>
          <p><strong>Design:</strong> <a className="text-blue-600 underline" href={selectedComponent.designUrl} target="_blank">View Drawing</a></p>

          {/* Part List */}
          {selectedComponent.partList?.length > 0 && (
            <div>
              <h3 className="font-semibold mt-4 mb-2">Assembly Part List</h3>
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-1 border">Label</th>
                    <th className="p-1 border">Size</th>
                    <th className="p-1 border">Count</th>
                    <th className="p-1 border">Cut Length</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedComponent.partList.map((part: any) => (
                    <tr key={part.id}>
                      <td className="p-1 border">{part.label}</td>
                      <td className="p-1 border">{part.size}</td>
                      <td className="p-1 border">{part.count}</td>
                      <td className="p-1 border">{part.cutLength}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sheathing Schedule */}
          {selectedComponent.sheathing && (
            <div>
              <h3 className="font-semibold mt-4 mb-2">Sheathing Schedule</h3>
              <p><strong>Area:</strong> {selectedComponent.sheathing.panelArea}</p>
              <p><strong>4x8 Panel Count:</strong> {selectedComponent.sheathing.panelCount}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              className="border p-2 rounded"
              placeholder="Warehouse/Location"
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
            />
            <input
              type="text"
              className="border p-2 rounded"
              placeholder="Workstation"
              value={workstation}
              onChange={(e) => setWorkstation(e.target.value)}
            />
            <input
              type="text"
              className="border p-2 rounded"
              placeholder="Team Lead"
              value={teamLead}
              onChange={(e) => setTeamLead(e.target.value)}
            />
            <select
              className="border p-2 rounded"
              value={process}
              onChange={(e) => setProcess(e.target.value)}
            >
              <option value="">Select Process</option>
              <option value="Cut">Cut</option>
              <option value="Assemble">Assemble</option>
              <option value="Fly">Fly</option>
              <option value="Ship">Ship</option>
            </select>
          </div>

          <p className="text-lg font-bold text-center">{formatTime(time)}</p>

          <button
            onClick={() => isRunning ? handleStop() : setIsRunning(true)}
            className={`w-full px-6 py-2 text-white rounded ${isRunning ? 'bg-red-600' : 'bg-green-600'} hover:opacity-90`}
          >
            {isRunning ? 'Stop' : 'Start'}
          </button>
        </div>
      )}
    </main>
  )
}
