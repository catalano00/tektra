'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Panel = {
  id: string;
  name: string;
  completeness: number; // 0-100
  fileUrl: string;
  data: Record<string, any>;
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);

  useEffect(() => {
    // Replace with your DocParser API call
    fetch(`/api/docparser/projects/${projectId}/panels`)
      .then(res => res.json())
      .then(data => setPanels(data));
  }, [projectId]);

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-white p-8">
      <h1 className="text-2xl font-bold mb-6">Project Panels</h1>
      <div className="w-full max-w-5xl">
        <table className="w-full border-collapse mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Panel Name</th>
              <th className="p-3 text-left">Completeness</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {panels.map(panel => (
              <tr key={panel.id} className="border-b">
                <td className="p-3">{panel.name}</td>
                <td className="p-3">
                  <div className="w-32 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-500 h-4 rounded-full"
                      style={{ width: `${panel.completeness}%` }}
                    />
                  </div>
                  <span className="ml-2 text-xs text-gray-600">{panel.completeness}%</span>
                </td>
                <td className="p-3">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => setSelectedPanel(panel)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {selectedPanel && (
          <div className="flex gap-8 mt-8">
            {/* Data Entry Form */}
            <div className="w-1/2 bg-gray-50 p-6 rounded shadow">
              <h2 className="text-lg font-semibold mb-4">Panel Data Entry</h2>
              <form>
                {Object.entries(selectedPanel.data).map(([key, value]) => (
                  <div key={key} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{key}</label>
                    <input
                      type="text"
                      defaultValue={value}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                ))}
                <button type="submit" className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 transition">
                  Save Changes
                </button>
              </form>
            </div>
            {/* File Display */}
            <div className="w-1/2 bg-white p-6 rounded shadow flex flex-col items-center">
              <h2 className="text-lg font-semibold mb-4">Panel File</h2>
              <iframe
                src={selectedPanel.fileUrl}
                title="Panel PDF"
                className="w-full h-96 border rounded"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}