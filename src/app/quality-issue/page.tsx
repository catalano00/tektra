// app/quality-issue/page.tsx

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate } from "@/utils/format";

const DEFAULT_CODES = [
  { code: "A", label: "Lift Configuration" },
  { code: "B", label: "Ratchet or Lifting Strap Availability" },
  { code: "C", label: "" },
  { code: "D", label: "Trailer Availability" },
  { code: "E", label: "NA" },
];

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
};

export default function QualityIssuePage() {
  const params = useSearchParams();
  const router = useRouter();
  const projectName = params.get("projectName") || "";
  const componentUUID = params.get("componentId") || "";
  const process = params.get("process") || "Cut";

  const [issueCode, setIssueCode] = useState("");
  const [engineeringAction, setEngineeringAction] = useState("");
  const [notes, setNotes] = useState("");
  const [training, setTraining] = useState("");

  const [componentData, setComponentData] = useState<any>(null);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);

  const codes = ISSUE_CODES[process as keyof typeof ISSUE_CODES] || DEFAULT_CODES;

  useEffect(() => {
    const fetchComponentData = async () => {
      if (!componentUUID) return;
      try {
        const res = await fetch(`/api/components/${componentUUID}`);
        const data = await res.json();
        setComponentData(data);
        setTimeEntries(data.timeEntries || []);
      } catch (err) {
        console.error("Failed to load component:", err);
      }
    };

    fetchComponentData();
  }, [componentUUID]);

  const totalCycleSeconds = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

const handleSubmit = async () => {
  try {
    const res = await fetch("/api/quality-issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        componentId: componentUUID,
        componentCode: componentData?.componentCode || componentUUID, // ✅ add this
        process,
        issueCode,
        engineeringAction,
        notes,
        training,
        teamLead: timeEntries.at(-1)?.teamLead || '', // ✅ add this if needed
      }),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    alert("✅ Quality issue submitted.");
    router.push(`/project/${projectName}`);
  } catch (err) {
    console.error("Error submitting quality issue:", err);
    alert("Failed to submit quality issue.");
  }
};

  return (
    <div className="max-w-3xl mx-auto mt-8 p-6 bg-white shadow rounded-xl space-y-6">
      <h1 className="text-2xl font-bold">Report Quality Issue</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Project Name</label>
          <input value={projectName} readOnly className="input w-full" />
        </div>
        <div>
          <label className="block font-medium">Component #</label>
          <input value={componentData?.componentCode || componentUUID} readOnly className="input w-full" />
        </div>
        <div>
          <label className="block font-medium">Process</label>
          <input value={process} readOnly className="input w-full" />
        </div>
        <div>
          <label className="block font-medium">Last Updated</label>
          <input
            value={componentData?.updatedAt ? formatDate(new Date(componentData.updatedAt)) : ''}
            readOnly
            className="input w-full"
          />
        </div>
        <div>
          <label className="block font-medium">Team Lead</label>
          <input
            value={timeEntries.at(-1)?.teamLead || ''}
            readOnly
            className="input w-full"
          />
        </div>
        <div>
          <label className="block font-medium">Issue Code</label>
          <select
            value={issueCode}
            onChange={(e) => setIssueCode(e.target.value)}
            className="input w-full"
          >
            <option value="">Select Issue Code</option>
            {codes.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} - {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-lg mt-6 mb-2">Process Timeline</h2>
        <ul className="list-disc list-inside">
          {timeEntries.map(entry => (
            <li key={`${entry.process}-${entry.updatedAt}`}>
              {entry.process} - Created: {formatDate(new Date(entry.createdAt))} | Updated: {formatDate(new Date(entry.updatedAt))}
            </li>
          ))}
        </ul>
        <p className="mt-2 font-medium">Total Cycle Time: {formatTime(totalCycleSeconds)}</p>
      </div>

      <div>
        <label className="block font-medium">Engineering, Rework, or Corrective Action</label>
        <textarea
          value={engineeringAction}
          onChange={(e) => setEngineeringAction(e.target.value)}
          className="input w-full h-24"
        />
      </div>

      <div>
        <label className="block font-medium">Notes or Comments</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input w-full h-24"
        />
      </div>

      <div>
        <label className="block font-medium">Training or Other Action</label>
        <textarea
          value={training}
          onChange={(e) => setTraining(e.target.value)}
          className="input w-full h-24"
        />
      </div>

      <button onClick={handleSubmit} className="btn btn-primary w-full">Submit Quality Issue</button>
    </div>
  );
}