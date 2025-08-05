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
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null); // Track the row being edited
  const [originalRowData, setOriginalRowData] = useState<Project | null>(null); // Store original row data

  useEffect(() => {
    async function fetchData() {
      const projectsRes = await fetch('/api/projects');
      const projectsData = await projectsRes.json();
      setProjects(projectsData);
      setFilteredProjects(projectsData); // Initialize filtered projects
    }
    fetchData();
  }, []);

  const handleFilterByStatus = (status: string | null) => {
    setStatusFilter(status);
    if (status) {
      setFilteredProjects(projects.filter((project) => project.currentStatus === status));
    } else {
      setFilteredProjects(projects); // Reset filter
    }
  };

  const handleSaveRow = async (projectId: string, updatedData: Partial<Project>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      const updatedProject = await response.json();
      setProjects((prev) =>
        prev.map((project) =>
          project.projectId === projectId ? { ...project, ...updatedProject } : project
        )
      );
      setFilteredProjects((prev) =>
        prev.map((project) =>
          project.projectId === projectId ? { ...project, ...updatedProject } : project
        )
      );
      setEditingRow(null); // Exit editing mode
      setOriginalRowData(null); // Clear original row data
      alert('Data saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data.');
    }
  };

  const handleCancelEdit = () => {
    if (originalRowData) {
      setFilteredProjects((prev) =>
        prev.map((row) =>
          row.projectId === originalRowData.projectId ? originalRowData : row
        )
      );
    }
    setEditingRow(null); // Exit editing mode
    setOriginalRowData(null); // Clear original row data
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Hero Tiles */}
      <div className="flex space-x-4 mb-8">
        {/* Total Projects Tile */}
        <div
          className="bg-white shadow-lg border rounded-xl px-8 py-6 flex flex-col items-center w-64 cursor-pointer"
          onClick={() => handleFilterByStatus(null)}
        >
          <span className="text-gray-500 text-lg font-medium mb-2">Total Projects</span>
          <span className="text-5xl font-extrabold text-blue-600">{projects.length}</span>
        </div>

        {/* Planning Tile */}
        <div
          className="bg-white shadow-lg border rounded-xl px-8 py-6 flex flex-col items-center w-64 cursor-pointer"
          onClick={() => handleFilterByStatus('Planned')}
        >
          <span className="text-gray-500 text-lg font-medium mb-2">Planned</span>
          <span className="text-5xl font-extrabold text-gray-600">
            {projects.filter((project) => project.currentStatus === 'Planned').length}
          </span>
        </div>

        {/* In Production Tile */}
        <div
          className="bg-white shadow-lg border rounded-xl px-8 py-6 flex flex-col items-center w-64 cursor-pointer"
          onClick={() => handleFilterByStatus('In Production')}
        >
          <span className="text-gray-500 text-lg font-medium mb-2">In Production</span>
          <span className="text-5xl font-extrabold text-yellow-600">
            {projects.filter((project) => project.currentStatus === 'In Production').length}
          </span>
        </div>

        {/* Complete Tile */}
        <div
          className="bg-white shadow-lg border rounded-xl px-8 py-6 flex flex-col items-center w-64 cursor-pointer"
          onClick={() => handleFilterByStatus('Complete')}
        >
          <span className="text-gray-500 text-lg font-medium mb-2">Complete</span>
          <span className="text-5xl font-extrabold text-green-600">
            {projects.filter((project) => project.currentStatus === 'Complete').length}
          </span>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-4">Production Planning Overview</h1>

      {/* Editable Table */}
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
            {filteredProjects.map((project) => (
              <tr key={project.projectId} className="border-t bg-white">
                <td className="px-4 py-2 font-medium">{project.projectId}</td>
                <td className="px-4 py-2">
                  {editingRow === project.projectId ? (
                    <input
                      type="text"
                      value={project.client}
                      onChange={(e) =>
                        setFilteredProjects((prev) =>
                          prev.map((row) =>
                            row.projectId === project.projectId
                              ? { ...row, client: e.target.value }
                              : row
                          )
                        )
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    project.client
                  )}
                </td>
                <td className="px-4 py-2">
                  {editingRow === project.projectId ? (
                    <input
                      type="text"
                      value={`${project.streetaddress}, ${project.city}, ${project.state}`}
                      onChange={(e) => {
                        const [streetaddress, city, state] = e.target.value.split(', ');
                        setFilteredProjects((prev) =>
                          prev.map((row) =>
                            row.projectId === project.projectId
                              ? { ...row, streetaddress, city, state }
                              : row
                          )
                        );
                      }}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    `${project.streetaddress}, ${project.city}, ${project.state}`
                  )}
                </td>
                <td className="px-4 py-2">
                  {editingRow === project.projectId ? (
                    <input
                      type="number"
                      value={project.contractAmount || 0} // Default to 0 if null or undefined
                      onChange={(e) =>
                        setFilteredProjects((prev) =>
                          prev.map((row) =>
                            row.projectId === project.projectId
                              ? { ...row, contractAmount: Number(e.target.value) }
                              : row
                          )
                        )
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      project.contractAmount || 0
                    ) // Format as USD
                  )}
                </td>
                <td className="px-4 py-2">
                  {editingRow === project.projectId ? (
                    <input
                      type="number"
                      value={project.estimatedPanelSqFt || 0} // Default to 0 if null or undefined
                      onChange={(e) =>
                        setFilteredProjects((prev) =>
                          prev.map((row) =>
                            row.projectId === project.projectId
                              ? { ...row, estimatedPanelSqFt: Number(e.target.value) }
                              : row
                          )
                        )
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    `${(project.estimatedPanelSqFt || 0).toLocaleString()}` // Default to 0 if null or undefined
                  )}
                </td>
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
                <td className="px-4 py-2 flex space-x-2">
                  {editingRow === project.projectId ? (
                    <>
                      <button
                        onClick={() => handleSaveRow(project.projectId, project)}
                        className="text-blue-600 underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-red-600 underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingRow(project.projectId);
                        setOriginalRowData({ ...project }); // Store original row data
                      }}
                      className="text-blue-600 underline"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}