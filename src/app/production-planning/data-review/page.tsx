'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiFileText } from 'react-icons/fi'; // Import icons for better UX

type StagingData = {
  id: string;
  rawData: any; // Raw JSON payload
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function DataReviewPage() {
  const [stagingData, setStagingData] = useState<StagingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); // Use Next.js router for navigation

  useEffect(() => {
    async function fetchStagingData() {
      try {
        const response = await fetch('/api/staging-data'); // Create an API route to fetch staging data
        if (!response.ok) {
          throw new Error('Failed to fetch staging data');
        }
        const data = await response.json();
        setStagingData(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchStagingData();
  }, []);

  const handleReviewRawData = (rawData: any) => {
    const newTab = window.open();
    if (newTab) {
      newTab.document.write('<html><head><title>Raw Data</title></head><body>');
      newTab.document.write('<pre style="font-family: monospace; padding: 16px; background-color: #f3f4f6; border: 1px solid #e5e7eb;">');
      newTab.document.write(JSON.stringify(rawData, null, 2));
      newTab.document.write('</pre>');
      newTab.document.write('</body></html>');
      newTab.document.close();
    }
  };

  const handleNavigateToDetails = (id: string) => {
    router.push(`/production-planning/data-review/${id}`); // Navigate to the file details page
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  // Calculate totals for hero tiles
  const totalFiles = stagingData.length;
  const typeCounts = stagingData.reduce((acc: Record<string, number>, data) => {
    const type = data.rawData?.sheettitle || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-white p-8">
      <h1 className="text-2xl font-bold mb-4">Data Review</h1>

      {/* Hero Tiles */}
      <div className="flex space-x-4 mb-8">
        {/* Total Files Tile */}
        <div className="bg-white shadow-lg border rounded-xl px-8 py-6 flex flex-col items-center w-64">
          <span className="text-gray-500 text-lg font-medium mb-2">Total Files</span>
          <span className="text-5xl font-extrabold text-blue-600">{totalFiles}</span>
        </div>

        {/* Count by Type Tiles */}
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type} className="bg-white shadow-lg border rounded-xl px-8 py-6 flex flex-col items-center w-64">
            <span className="text-gray-500 text-lg font-medium mb-2">{type}</span>
            <span className="text-5xl font-extrabold text-green-600">{count}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto w-full max-w-7xl">
        <table className="min-w-full bg-white border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Filename</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Panel ID</th>
              <th className="px-4 py-2 text-left">Project Name</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Created At</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stagingData.map(data => {
              const { file_name, sheettitle, panellabel, projectnametag } = data.rawData || {};
              return (
                <tr key={data.id} className="border-t bg-white">
                  <td className="px-4 py-2 font-medium">{file_name || 'Unknown'}</td>
                  <td className="px-4 py-2">{sheettitle || 'Unknown'}</td>
                  <td className="px-4 py-2">{panellabel || 'Unknown'}</td>
                  <td className="px-4 py-2">{projectnametag || 'Unknown'}</td>
                  <td className="px-4 py-2">{data.status}</td>
                  <td className="px-4 py-2">{new Date(data.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 flex space-x-2">
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      onClick={() => handleReviewRawData(data.rawData)}
                    >
                      <FiEye />
                      <span>Raw Data</span>
                    </button>
                    <button
                      type="button"
                      className="text-green-600 hover:text-green-800 flex items-center space-x-1"
                      onClick={() => handleNavigateToDetails(data.id)}
                    >
                      <FiFileText />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}