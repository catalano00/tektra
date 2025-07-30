'use client';

import { useEffect, useState } from 'react';

type Project = {
  id: string;
  name: string;
  drawingsToReview: number;
  status: string;
};

export default function ProductionPlanningPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Replace with your DocParser API call
    fetch('/api/docparser/projects')
      .then(res => res.json())
      .then(data => setProjects(data));
  }, []);

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-white p-8">
      <h1 className="text-3xl font-bold mb-8">Production Planning</h1>
      <div className="w-full max-w-4xl">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Project</th>
              <th className="p-3 text-left">Drawings to Review</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr key={project.id} className="border-b">
                <td className="p-3">{project.name}</td>
                <td className="p-3">{project.drawingsToReview}</td>
                <td className="p-3">{project.status}</td>
                <td className="p-3">
                  <a
                    href={`/production-planning/${project.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Review/Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}