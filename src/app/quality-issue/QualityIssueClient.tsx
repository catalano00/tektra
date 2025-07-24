'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatDate } from '@/utils/format'

const DEFAULT_CODES = [
  { code: "A", label: "Lift Configuration" },
  { code: "B", label: "Ratchet or Lifting Strap Availability" },
  { code: "C", label: "" },
  { code: "D", label: "Trailer Availability" },
  { code: "E", label: "NA" },
]

const ISSUE_CODES = {
  Cut: [
    { code: "A", label: "Tektra GJ Quality" },
    { code: "B", label: "Engineering Change" },
    { code: "C", label: "Client Change" },
    { code: "D", label: "Incorrect Material" },
    { code: "E", label: "NA" },
  ],
  Assemble: [
    { code: "A", label: "Tektra GJ Quality" },
    { code: "B", label: "Engineering Change / Material Spec." },
    { code: "C", label: "Client Change" },
    { code: "D", label: "Hangers / Incorrect Material" },
    { code: "E", label: "NA" },
  ],
  "Load & Prep": DEFAULT_CODES,
  Fly: DEFAULT_CODES,
  Ship: DEFAULT_CODES,
}

export default function QualityIssueClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const projectName = searchParams.get("projectName") || ""
  const componentUUID = searchParams.get("componentId") || ""
  const process = searchParams.get("process") || "Cut"

  const [issueCode, setIssueCode] = useState("")
  const [engineeringAction, setEngineeringAction] = useState("")
  const [notes, setNotes] = useState("")
  const [training, setTraining] = useState("")
  const [componentData, setComponentData] = useState<any>(null)
  const [timeEntries, setTimeEntries] = useState<any[]>([])

  const codes = ISSUE_CODES[process as keyof typeof ISSUE_CODES] || DEFAULT_CODES

  useEffect(() => {
    if (!componentUUID) return
    fetch(`/api/components/${componentUUID}`)
      .then(res => res.json())
      .then(data => {
        setComponentData(data)
        setTimeEntries(data.timeEntries || [])
      })
      .catch(console.error)
  }, [componentUUID])

  const totalCycleSeconds = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/quality-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId: componentUUID,
          componentCode: componentData?.componentCode || componentUUID,
          process,
          issueCode,
          engineeringAction,
          notes,
          training,
          teamLead: timeEntries.at(-1)?.teamLead || '',
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      alert("✅ Quality issue submitted.")
      router.push(`/project/${projectName}`)
    } catch (err) {
      alert("Failed to submit quality issue.")
    }
  }

  const handleReturnToProject = async () => {
    try {
      await fetch(`/api/components/${componentUUID}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStatus: process,
          processStatus: "Paused",
        }),
      })
      router.push(`/project/${projectName}`)
    } catch (err) {
      router.push(`/project/${projectName}`)
    }
  }

  const isFormValid = issueCode.trim() !== "" && engineeringAction.trim() !== ""

  return (
    <div className="max-w-3xl w-full mx-auto mt-8 p-4 sm:p-8 bg-white shadow-lg rounded-2xl space-y-8">
      <h1 className="text-3xl font-bold mb-2 text-center">Report Quality Issue</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
        <div>
          <div className="block text-gray-600 text-sm font-medium mb-1">Project Name</div>
          <div className="w-full bg-gray-100 rounded px-3 py-2 font-semibold">{projectName}</div>
        </div>
        <div>
          <div className="block text-gray-600 text-sm font-medium mb-1">Component #</div>
          <div className="w-full bg-gray-100 rounded px-3 py-2 font-semibold">{componentData?.componentCode || componentUUID}</div>
        </div>
        <div>
          <div className="block text-gray-600 text-sm font-medium mb-1">Process</div>
          <div className="w-full bg-gray-100 rounded px-3 py-2">{process}</div>
        </div>
        <div>
          <div className="block text-gray-600 text-sm font-medium mb-1">Last Updated</div>
          <div className="w-full bg-gray-100 rounded px-3 py-2">
            {componentData?.updatedAt ? formatDate(new Date(componentData.updatedAt)) : ''}
          </div>
        </div>
        <div>
          <div className="block text-gray-600 text-sm font-medium mb-1">Team Lead</div>
          <div className="w-full bg-gray-100 rounded px-3 py-2">{timeEntries.at(-1)?.teamLead || ''}</div>
        </div>
      </div>

      {/* User Input Section */}
      <div className="space-y-6">
        <h2 className="font-semibold text-lg text-gray-700">Quality Issue Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1 text-gray-800">
              Issue Code <span className="text-red-500">*</span>
            </label>
            <select
              value={issueCode}
              onChange={(e) => setIssueCode(e.target.value)}
              className="input w-full border-blue-500 focus:ring focus:ring-blue-200 bg-gray-50"
              required
            >
              <option value="">Select Issue Code</option>
              {codes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} - {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1 text-gray-800">
              Engineering, Rework, or Corrective Action <span className="text-red-500">*</span>
            </label>
            <textarea
              value={engineeringAction}
              onChange={(e) => setEngineeringAction(e.target.value)}
              className="input w-full h-24 border-blue-500 focus:ring focus:ring-blue-200 bg-gray-50"
              placeholder="Describe any engineering or corrective actions taken..."
              required
            />
          </div>
        </div>
        <div>
          <label className="block font-medium mb-1 text-gray-800">
            Notes or Comments
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input w-full h-24 border-blue-500 focus:ring focus:ring-blue-200 bg-gray-50"
            placeholder="Add any additional notes or comments here..."
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-gray-800">
            Training or Other Action
          </label>
          <textarea
            value={training}
            onChange={(e) => setTraining(e.target.value)}
            className="input w-full h-24 border-blue-500 focus:ring focus:ring-blue-200 bg-gray-50"
            placeholder="Describe any training or other actions taken..."
          />
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h2 className="font-semibold text-lg mb-2 text-gray-700">Process Timeline</h2>
        <ul className="list-disc list-inside text-gray-700 text-sm">
          {timeEntries.map(entry => (
            <li key={`${entry.process}-${entry.updatedAt}`}>
              <span className="font-semibold">{entry.process}</span> – Created: {formatDate(new Date(entry.createdAt))} | Updated: {formatDate(new Date(entry.updatedAt))}
            </li>
          ))}
        </ul>
        <p className="mt-2 font-medium text-gray-800">
          Total Cycle Time: <span className="font-mono">{formatTime(totalCycleSeconds)}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleReturnToProject}
          className="w-full py-3 text-lg rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
        >
          Return to Project
        </button>
        <button
          onClick={handleSubmit}
          className={`w-full py-3 text-lg mt-2 rounded ${
            isFormValid
              ? "btn btn-primary bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!isFormValid}
        >
          Submit Quality Issue
        </button>
      </div>
    </div>
  )
}