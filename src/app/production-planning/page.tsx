'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Project = {
  projectId: string;
  currentStatus: string;
  client: string;
  city: string;
  state: string;
  streetaddress: string;
  contractAmount: number;
  totalContract: number;
  buildableSqFt: number;
  estimatedPanelSqFt: number;
  expectedDrawingStart: string | null;
  expectedProductionStart: string | null;
  expectedProductionCompletion: string | null;
  notes: string | null;
};

export default function ProductionPlanningPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    async function fetchData() {
      const projectsRes = await fetch('/api/projects');
      const projectsData = await projectsRes.json();
      setProjects(projectsData);
    }
    fetchData();
  }, []);

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Hero Card for Project Count */}
      <div className="flex justify-left">
        <div className="bg-white shadow-lg border rounded-xl px-8 py-6 flex flex-col items-center w-64">
          <span className="text-gray-500 text-lg font-medium mb-2">Total Projects</span>
          <span className="text-5xl font-extrabold text-blue-600">{projects.length}</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-4">Production Planning Overview</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Project ID</th>
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-left">Location</th>
              <th className="px-4 py-2 text-left">Contract Amount</th>
              <th className="px-4 py-2 text-left">Panel SqFt</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr key={project.projectId} className="border-t bg-white">
                <td className="px-4 py-2 font-medium">{project.projectId}</td>
                <td className="px-4 py-2">{project.client}</td>
                <td className="px-4 py-2">
                  {project.streetaddress}, {project.city}, {project.state}
                </td>
                <td className="px-4 py-2">${Number(project.contractAmount).toLocaleString()}</td>
                <td className="px-4 py-2">{project.estimatedPanelSqFt}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${project.currentStatus === 'Delivered' || project.currentStatus === 'Complete'
                        ? 'bg-green-100 text-green-800'
                        : project.currentStatus === 'In Production'
                        ? 'bg-yellow-100 text-yellow-800'
                        : project.currentStatus === 'Planning'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-slate-100 text-slate-800'
                      }`}
                  >
                    {project.currentStatus}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => router.push(`/production-planning/${project.projectId}`)}
                    className="text-blue-600 underline"
                  >
                    Review/Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}