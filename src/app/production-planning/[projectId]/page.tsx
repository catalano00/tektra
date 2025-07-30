'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Panel = {
  id: string;
  name: string;
  completeness: number;
  data: Record<string, any>;
  status?: string;
  fileUrl?: string;
};

type ProjectDetails = {
  projectId: string;
  client: string;
  city: string;
  state: string;
  streetaddress: string;
  contractAmount: number;
  currentStatus: string;
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [project, setProject] = useState<ProjectDetails | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => setProject(data));

    fetch(`/api/components?projectId=${projectId}`)
      .then(res => res.json())
      .then(data => {
        setPanels(
          data.components.map((component: any) => ({
            id: component.id,
            name: component.componentId,
            completeness: component.completeness || 0,
            data: component,
            status: component.status || 'review',
            fileUrl: component.fileUrl || '',
          }))
        );
      });
  }, [projectId]);

  const drawingsToReview = panels.filter(p => p.status !== 'approved').length;
  const drawingsApproved = panels.filter(p => p.status === 'approved').length;

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-white p-8">
      {/* Project Title Bar with compact info */}
      <div className="w-full max-w-5xl flex flex-col mb-2">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">{project?.projectId || 'Project'}</h1>
        </div>
        {project && (
          <div className="text-xs text-gray-600 flex flex-col gap-1 mt-1 ml-1">
            <span><span className="font-semibold">Client:</span> {project.client}</span>
            <span><span className="font-semibold">Location:</span> {project.streetaddress}, {project.city}, {project.state}</span>
            <span><span className="font-semibold">Contract:</span> ${Number(project.contractAmount).toLocaleString()}</span>
            <span>
              <span className="font-semibold">Status:</span>{' '}
              <span className={`px-2 py-1 rounded-full text-[10px] font-semibold
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
            </span>
          </div>
        )}
      </div>

      {/* Hero Tiles */}
      <div className="w-full max-w-5xl flex flex-row gap-8 justify-center mb-8 mt-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-8 py-8 flex flex-col items-center w-56">
          <span className="text-6xl font-extrabold text-blue-600 mb-2">{drawingsToReview}</span>
          <span className="text-gray-500 text-lg font-semibold">To Review</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-8 py-8 flex flex-col items-center w-56">
          <span className="text-6xl font-extrabold text-green-600 mb-2">{drawingsApproved}</span>
          <span className="text-gray-500 text-lg font-semibold">Approved</span>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-8 py-8 flex flex-col items-center w-56">
          <span className="text-6xl font-extrabold text-red-600 mb-2">
            {panels.filter(p => p.status === 'rejected').length}
          </span>
          <span className="text-gray-500 text-lg font-semibold">Rejected</span>
        </div>
      </div>

      {/* Panels Table */}
      <div className="w-full max-w-5xl">
        <table className="w-full border-collapse mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Panel Name</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Length</th>
              <th className="p-3 text-left">Width</th>
              <th className="p-3 text-left">Sq Ft</th>
              <th className="p-3 text-left">Install Sequence</th>
              <th className="p-3 text-left">Confidence</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {panels.map(panel => (
              <tr key={panel.id} className="border-b">
                <td className="p-3">{panel.name}</td>
                <td className="p-3">{panel.data.type || '-'}</td>
                <td className="p-3">{panel.data.length || '-'}</td>
                <td className="p-3">{panel.data.width || '-'}</td>
                <td className="p-3">{panel.data.sqFt || '-'}</td>
                <td className="p-3">{panel.data.installSequence || '-'}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${panel.completeness === 100
                        ? 'bg-green-100 text-green-800'
                        : panel.completeness >= 75
                        ? 'bg-blue-100 text-blue-800'
                        : panel.completeness >= 50
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {panel.completeness}%
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${panel.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : panel.status === 'review'
                        ? 'bg-yellow-100 text-yellow-800'
                        : panel.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-800'
                      }`}
                  >
                    {panel.status}
                  </span>
                </td>
                <td className="p-3">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => router.push(`/production-planning/${projectId}/panel/${panel.id}`)}
                  >
                    Review
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