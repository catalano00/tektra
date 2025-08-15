'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiFileText } from 'react-icons/fi'; // Import icons for better UX
import { computeOverallScore, badgeColor as sharedBadgeColor } from '@/lib/scoring';

type StagingData = {
  id: string;
  rawData: any; // Raw JSON payload
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function DataReviewPage() {
  const [stagingData, setStagingData] = useState<StagingData[]>([]);
  const [filteredData, setFilteredData] = useState<StagingData[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screenWidth, setScreenWidth] = useState(0);
  const router = useRouter(); // Use Next.js router for navigation
  // NEW: component index for duplicate detection
  const [productionComponents, setProductionComponents] = useState<{ projectId: string; componentId: string }[]>([]);
  const [duplicateCounts, setDuplicateCounts] = useState<{ total: number; productionConflicts: number }>(() => ({ total: 0, productionConflicts: 0 }));

  // Track screen width for responsive design
  useEffect(() => {
    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };
    
    updateScreenWidth();
    window.addEventListener('resize', updateScreenWidth);
    return () => window.removeEventListener('resize', updateScreenWidth);
  }, []);

  useEffect(() => {
    async function fetchStagingData() {
      try {
        const response = await fetch('/api/staging-data'); // Create an API route to fetch staging data
        if (!response.ok) {
          throw new Error('Failed to fetch staging data');
        }
        const data = await response.json();
        setStagingData(data);
        setFilteredData(data); // Initialize filtered data
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
    // Fetch production components once
    fetch('/api/v1/components')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => {
        const comps = (json.components || []).map((c: any) => ({ projectId: c.projectId, componentId: c.componentId }));
        setProductionComponents(comps);
      })
      .catch(() => setProductionComponents([]));
  }, []);

  // Recompute duplicate stats when data or production list changes
  useEffect(() => {
    if (!stagingData.length) { setDuplicateCounts({ total: 0, productionConflicts: 0 }); return; }
    const freq: Record<string, number> = {};
    stagingData.forEach(sd => {
      const k = `${sd.rawData?.projectnametag || ''}|${sd.rawData?.panellabel || ''}`;
      if (!k.includes('|')) return; // skip invalid
      freq[k] = (freq[k] || 0) + 1;
    });
    const prodSet = new Set(productionComponents.map(c => `${c.projectId}|${c.componentId}`));
    let dupTotal = 0; let prodDup = 0;
    Object.entries(freq).forEach(([k, count]) => {
      if (count > 1) dupTotal += count; // count all occurrences involved in duplicates
      if (prodSet.has(k)) {
        prodDup += count; // each conflicting staging record
      }
    });
    setDuplicateCounts({ total: dupTotal, productionConflicts: prodDup });
  }, [stagingData, productionComponents]);

  // Filter functions
  const handleFilterByType = (type: string) => {
    if (activeFilter === type) {
      // If clicking the same filter, clear it
      setActiveFilter(null);
      setFilteredData(stagingData);
    } else {
      // Apply new filter
      setActiveFilter(type);
      const filtered = stagingData.filter(data => {
        const dataType = data.rawData?.sheettitle || 'Unknown';
        return dataType === type;
      });
      setFilteredData(filtered);
    }
  };

  const handleFilterByStatus = (status: string) => {
    if (activeFilter === status) {
      // If clicking the same filter, clear it
      setActiveFilter(null);
      setFilteredData(stagingData);
    } else {
      // Apply new filter
      setActiveFilter(status);
      const filtered = stagingData.filter(data => data.status === status);
      setFilteredData(filtered);
    }
  };

  const handleFilterToday = () => {
    const filterKey = 'today';
    if (activeFilter === filterKey) {
      // If clicking the same filter, clear it
      setActiveFilter(null);
      setFilteredData(stagingData);
    } else {
      // Apply new filter
      setActiveFilter(filterKey);
      const today = new Date().toDateString();
      const filtered = stagingData.filter(data => {
        return new Date(data.createdAt).toDateString() === today;
      });
      setFilteredData(filtered);
    }
  };

  const clearAllFilters = () => {
    setActiveFilter(null);
    setFilteredData(stagingData);
  };

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

  if (loading) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading data review...</p>
      </main>
    );
  }
  
  if (error) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-white">
        <div className="text-red-500 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  // Calculate totals for hero tiles
  const totalFiles = stagingData.length;
  const typeCounts = stagingData.reduce((acc: Record<string, number>, data) => {
    const type = data.rawData?.sheettitle || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-white p-4 lg:p-8">
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">Data Review</h1>
        {screenWidth >= 2560 && (
          <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            🖥️ Ultrawide layout optimized
          </div>
        )}
        {activeFilter && (
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-sm text-slate-600">Filtered by:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              {activeFilter}
            </span>
            <button
              onClick={clearAllFilters}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* Hero Tiles - Dynamic Layout */}
      <div 
        className={`grid gap-4 lg:gap-6 mb-8 w-full`}
        style={{
          maxWidth: screenWidth >= 2560 ? '95vw' : screenWidth >= 1920 ? '90vw' : '1400px',
          gridTemplateColumns: 
            screenWidth >= 2560 ? 'repeat(auto-fit, minmax(200px, 1fr))' : // Ultrawide: flexible
            screenWidth >= 1920 ? 'repeat(auto-fit, minmax(220px, 1fr))' : // Wide: flexible
            screenWidth >= 1024 ? 'repeat(auto-fit, minmax(240px, 1fr))' : // Desktop: flexible
            'repeat(auto-fit, minmax(280px, 1fr))' // Mobile/tablet: larger tiles
        }}
      >
        {/* Total Files Tile */}
        <div 
          className={`bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg border border-slate-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${
            activeFilter === null ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
          }`}
          onClick={clearAllFilters}
        >
          <span className="text-slate-600 text-base font-semibold mb-4 tracking-wide">Total Files</span>
          <span className="text-5xl lg:text-6xl font-bold text-slate-800 font-mono">{totalFiles}</span>
        </div>

        {/* Duplicates Tile */}
        <div 
          className={`bg-gradient-to-br from-rose-50 to-rose-100 shadow-lg border border-rose-200 rounded-xl px-6 py-8 flex flex-col items-center ${duplicateCounts.total ? 'animate-pulse ring-2 ring-rose-400 ring-opacity-40' : ''}`}
        >
          <span className="text-rose-700 text-base font-semibold mb-2 tracking-wide text-center">Staging Duplicates</span>
          <span className="text-4xl lg:text-5xl font-bold text-rose-800 font-mono">{duplicateCounts.total}</span>
          <span className="mt-2 text-xs text-rose-600 font-medium">Prod Conflicts: {duplicateCounts.productionConflicts}</span>
        </div>

        {/* Count by Type Tiles - Consistent Professional Color Scheme */}
        {Object.entries(typeCounts).map(([type, count], index) => {
          // Professional monochromatic blue-gray palette
          const colorVariants = [
            'from-blue-50 to-blue-100 border-blue-200 text-blue-700 text-blue-800 text-blue-600',
            'from-slate-50 to-slate-100 border-slate-200 text-slate-700 text-slate-800 text-slate-600',
            'from-gray-50 to-gray-100 border-gray-200 text-gray-700 text-gray-800 text-gray-600',
            'from-zinc-50 to-zinc-100 border-zinc-200 text-zinc-700 text-zinc-800 text-zinc-600',
          ];
          const colorSet = colorVariants[index % colorVariants.length].split(' ');
          
          return (
            <div 
              key={type} 
              className={`bg-gradient-to-br ${colorSet[0]} ${colorSet[1]} shadow-lg border ${colorSet[2]} rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${
                activeFilter === type ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
              onClick={() => handleFilterByType(type)}
            >
              <span className={`${colorSet[3]} text-base font-semibold mb-4 text-center tracking-wide`}>
                {type}
              </span>
              <span className={`text-5xl lg:text-6xl font-bold ${colorSet[4]} font-mono`}>
                {count}
              </span>
            </div>
          );
        })}

        {/* Additional Stats Tiles for Ultrawide - Consistent Styling */}
        {screenWidth >= 2560 && (
          <>
            <div 
              className={`bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-lg border border-indigo-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${
                activeFilter === 'pending' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
              onClick={() => handleFilterByStatus('pending')}
            >
              <span className="text-indigo-700 text-base font-semibold mb-4 tracking-wide">Pending Review</span>
              <span className="text-5xl lg:text-6xl font-bold text-indigo-800 font-mono">
                {stagingData.filter(d => d.status === 'pending').length}
              </span>
            </div>
            <div 
              className={`bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg border border-emerald-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${
                activeFilter === 'today' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
              onClick={handleFilterToday}
            >
              <span className="text-emerald-700 text-base font-semibold mb-4 tracking-wide">Today</span>
              <span className="text-5xl lg:text-6xl font-bold text-emerald-800 font-mono">
                {stagingData.filter(d => {
                  const today = new Date().toDateString();
                  return new Date(d.createdAt).toDateString() === today;
                }).length}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Additional Summary Bar for Ultrawide Screens */}
      {screenWidth >= 2560 && stagingData.length > 0 && (
        <div 
          className="w-full bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 rounded-xl p-6 mb-8 shadow-sm border"
          style={{ maxWidth: '95vw' }}
        >
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-700">
                {Math.round((stagingData.filter(d => d.status === 'approved').length / totalFiles) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">
                {stagingData.filter(d => {
                  const today = new Date();
                  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  return new Date(d.createdAt) >= weekAgo;
                }).length}
              </div>
              <div className="text-sm text-gray-600">This Week</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">
                {Object.keys(typeCounts).length}
              </div>
              <div className="text-sm text-gray-600">Unique Types</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">
                {new Set(stagingData.map(d => d.rawData?.projectnametag).filter(Boolean)).size}
              </div>
              <div className="text-sm text-gray-600">Projects</div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table - Responsive */}
      <div 
        className="overflow-x-auto w-full rounded-xl shadow-lg border"
        style={{
          maxWidth: screenWidth >= 2560 ? '95vw' : screenWidth >= 1920 ? '90vw' : '1400px'
        }}
      >
        <table className="min-w-full bg-white text-sm font-medium">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Filename</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Type</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Panel ID</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Project Name</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Status</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Confidence</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Created At</th>
              {screenWidth >= 1920 && (
                <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Updated At</th>
              )}
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.map((data, index) => {
              const { file_name, sheettitle, panellabel, projectnametag } = data.rawData || {};
              const isEven = index % 2 === 0;
              const breakdown = computeOverallScore(data.rawData, 'strict');
              const overallScore = breakdown.overall;
              const badgeColor = sharedBadgeColor(overallScore);
              const key = `${projectnametag || ''}|${panellabel || ''}`;
              const stagingFreq = stagingData.filter(sd => (sd.rawData?.projectnametag === projectnametag && sd.rawData?.panellabel === panellabel)).length;
              const prodExists = productionComponents.some(pc => pc.projectId === projectnametag && pc.componentId === panellabel);
              return (
                <tr 
                  key={data.id} 
                  className={`${isEven ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors duration-200`}
                >
                  <td className="px-4 lg:px-6 py-4 font-medium text-slate-900">
                    <div className="flex items-center">
                      <FiFileText className="mr-2 text-slate-500" />
                      <span className="truncate max-w-xs font-medium" title={file_name || 'Unknown'}>
                        {file_name || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-slate-700">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {sheettitle || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-slate-600 font-mono text-sm font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{panellabel || 'Unknown'}</span>
                      {stagingFreq > 1 && (
                        <span title={`Appears ${stagingFreq} times in staging data`} className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-semibold">STAGING×{stagingFreq}</span>
                      )}
                      {prodExists && (
                        <span title="Already exists in production components for this project" className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-semibold">PROD DUP</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-slate-700 font-medium">
                    <span className="truncate max-w-xs" title={projectnametag || 'Unknown'}>
                      {projectnametag || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      data.status === 'pending' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : data.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {data.status}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${badgeColor}`}
                      title={`Confidence: ${Math.round(overallScore)}% | Sections present: ${breakdown.presentSections.length} | Missing: ${breakdown.missingSections.length}`}
                    >
                      {Math.round(overallScore)}%
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-slate-500 text-sm font-medium">
                    {new Date(data.createdAt).toLocaleDateString()}
                    {screenWidth >= 1440 && (
                      <div className="text-slate-400 text-xs font-normal">
                        {new Date(data.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    )}
                  </td>
                  {screenWidth >= 1920 && (
                    <td className="px-4 lg:px-6 py-4 text-slate-500 text-sm font-medium">
                      {new Date(data.updatedAt).toLocaleDateString()}
                      <div className="text-slate-400 text-xs font-normal">
                        {new Date(data.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                  )}
                  <td className="px-4 lg:px-6 py-4">
                    <div className={`flex ${screenWidth >= 1440 ? 'space-x-3' : 'space-x-2'}`}>
                      <button
                        type="button"
                        className="text-slate-600 hover:text-slate-800 hover:bg-slate-50 p-2 rounded-lg transition-all duration-200 flex items-center space-x-1 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md"
                        onClick={() => handleReviewRawData(data.rawData)}
                        title="View Raw Data"
                      >
                        <FiEye className="h-4 w-4" />
                        {screenWidth >= 1440 && <span className="text-sm font-medium">Raw</span>}
                      </button>
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-all duration-200 flex items-center space-x-1 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md"
                        onClick={() => handleNavigateToDetails(data.id)}
                        title="View Details"
                      >
                        <FiFileText className="h-4 w-4" />
                        {screenWidth >= 1440 && <span className="text-sm font-medium">Details</span>}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredData.length === 0 && !loading && (
          <div className="text-center py-12">
            <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {activeFilter ? 'No matching data' : 'No data files'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeFilter 
                ? `No items found for the current filter: ${activeFilter}` 
                : 'No staging data has been uploaded yet.'
              }
            </p>
            {activeFilter && (
              <button
                onClick={clearAllFilters}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear filter to show all items
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions Bar for Ultrawide */}
      {screenWidth >= 2560 && (
        <div 
          className="w-full flex justify-between items-center bg-white rounded-lg shadow-sm border p-4 mb-6"
          style={{ maxWidth: '95vw' }}
        >
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 px-3 py-1 rounded transition-colors">
              Export All
            </button>
            <button className="text-green-600 hover:text-green-800 text-sm font-medium hover:bg-green-50 px-3 py-1 rounded transition-colors">
              Bulk Approve
            </button>
            <button className="text-purple-600 hover:text-purple-800 text-sm font-medium hover:bg-purple-50 px-3 py-1 rounded transition-colors">
              Filter View
            </button>
          </div>
          <div className="text-sm text-gray-500">
            Showing {filteredData.length} of {stagingData.length} items • Last updated {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
    </main>
  );
}