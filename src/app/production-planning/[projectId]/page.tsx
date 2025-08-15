'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { computeOverallScore, badgeColor as sharedBadgeColor } from '@/lib/scoring';

type Panel = {
  id: string;
  componentId: string;
  status?: string;
  fileUrl?: string;
  projectId?: string;
  clientId?: string;
  componentType?: string;
  percentComplete?: number;
  sequence?: string;
  maxWidth?: string;
  maxHeight?: string;
  weight?: number;
  [key: string]: any;
};

interface ProjectDetails {
  projectId: string;
  client?: string;
  clientAddressFormatted?: string;
  city?: string;
  state?: string;
  streetaddress?: string;
  contractAmount?: number;
  currentStatus?: string;
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filteredPanels, setFilteredPanels] = useState<Panel[]>([]);
  const [screenWidth, setScreenWidth] = useState(0);
  const [editPanel, setEditPanel] = useState<Panel | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [allProjects, setAllProjects] = useState<ProjectDetails[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [projRes, compsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/components?projectId=${projectId}`)
        ]);
        if (!projRes.ok) throw new Error('Project fetch failed');
        if (!compsRes.ok) throw new Error('Components fetch failed');
        const projJson = await projRes.json();
        const compsJson = await compsRes.json();
        if (cancelled) return;
        setProject(projJson);
        const comps: Panel[] = (compsJson.components || []).map((c: any) => ({
          id: c.id,
          componentId: c.componentId,
          status: c.status || 'pending',
          fileUrl: c.fileUrl,
          ...c,
        }));
        setPanels(comps);
        setFilteredPanels(comps);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed loading project');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // preload project ids & clients for dropdowns
    Promise.all([
      fetch('/api/projects').then(r => r.ok ? r.json() : []),
      fetch('/api/clients').then(r => r.ok ? r.json() : [])
    ]).then(([projects, clients]) => {
      setAllProjects(projects || []);
      setAllClients(clients || []);
    }).catch(()=>{});
  }, []);

  const totalPanels = panels.length;
  const pendingPanels = panels.filter(p => (p.status || 'pending') === 'pending').length;
  const approvedPanels = panels.filter(p => p.status === 'approved').length;
  const rejectedPanels = panels.filter(p => p.status === 'rejected').length;

  const dupFrequency: Record<string, number> = {};
  panels.forEach(p => {
    if (!p.componentId) return;
    dupFrequency[p.componentId] = (dupFrequency[p.componentId] || 0) + 1;
  });
  const duplicateCount = Object.values(dupFrequency).reduce((acc, count) => (count > 1 ? acc + count : acc), 0);

  function clearFilter() {
    setActiveFilter(null);
    setFilteredPanels(panels);
  }
  function applyStatusFilter(status: string) {
    if (activeFilter === status) {
      clearFilter();
      return;
    }
    setActiveFilter(status);
    setFilteredPanels(panels.filter(p => (p.status || 'pending') === status));
  }
  function applyDuplicateFilter() {
    const key = 'duplicates';
    if (activeFilter === key) {
      clearFilter();
      return;
    }
    setActiveFilter(key);
    setFilteredPanels(panels.filter(p => dupFrequency[p.componentId] > 1));
  }

  function openEdit(p: Panel) {
    setEditPanel(p);
    setShowEditModal(true);
  }
  function closeEdit() { setShowEditModal(false); setEditPanel(null); }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editPanel) return;
    // optimistic local update only (API not defined in prompt) – extend later.
    setPanels(prev => prev.map(p => p.id === editPanel.id ? editPanel : p));
    setFilteredPanels(prev => prev.map(p => p.id === editPanel.id ? editPanel : p));
    closeEdit();
  }

  if (loading) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading project...</p>
      </main>
    );
  }
  if (error) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-white">
        <div className="text-red-500 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Project</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-white p-4 lg:p-8">
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">Project: {project?.projectId || projectId}</h1>
        <div className="flex gap-3 mb-3">
          <button onClick={() => router.push(`/production-planning/${projectId}/schedule`)} className="px-4 py-2 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 shadow-sm transition">
            Open Scheduling
          </button>
          <button onClick={() => router.push('/production-planning')} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm transition">Back to Overview</button>
        </div>
        {project && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
            {project.client && (
              <span>
                <span className="font-semibold">Client:</span> {project.client}
              </span>
            )}
            {project.clientAddressFormatted && (
              <span>
                <span className="font-semibold">Client Address:</span> {project.clientAddressFormatted}
              </span>
            )}
            {project.streetaddress && (
              <span>
                <span className="font-semibold">Address:</span> {project.streetaddress}
                {project.city ? `, ${project.city}` : ''}
                {project.state ? `, ${project.state}` : ''}
              </span>
            )}
            {project.contractAmount !== undefined && (
              <span>
                <span className="font-semibold">Contract:</span> ${Number(project.contractAmount).toLocaleString()}
              </span>
            )}
            {project.currentStatus && (
              <span>
                <span className="font-semibold">Status:</span>{' '}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    project.currentStatus === 'Delivered' || project.currentStatus === 'Complete'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : project.currentStatus === 'In Production'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {project.currentStatus}
                </span>
              </span>
            )}
          </div>
        )}
        {activeFilter && (
          <div className="flex items-center space-x-2 mt-3">
            <span className="text-sm text-slate-600">Filtered by:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              {activeFilter}
            </span>
            <button onClick={clearFilter} className="text-xs text-slate-500 hover:text-slate-700 underline">
              Clear
            </button>
          </div>
        )}
      </div>

      <div
        className="grid gap-4 lg:gap-6 mb-8 w-full"
        style={{
          maxWidth: screenWidth >= 2560 ? '95vw' : screenWidth >= 1920 ? '90vw' : '1400px',
          gridTemplateColumns: screenWidth >= 1024 ? 'repeat(auto-fit, minmax(220px, 1fr))' : 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        <div
          onClick={clearFilter}
          className={`bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg border border-slate-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${
            activeFilter === null ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
          }`}
        >
          <span className="text-slate-600 text-base font-semibold mb-4 tracking-wide">Total Panels</span>
          <span className="text-5xl lg:text-6xl font-bold text-slate-800 font-mono">{totalPanels}</span>
        </div>
        <div
          onClick={() => applyStatusFilter('pending')}
          className={`bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg border border-amber-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${
            activeFilter === 'pending' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
          }`}
        >
          <span className="text-amber-700 text-base font-semibold mb-4 tracking-wide">Pending</span>
          <span className="text-5xl lg:text-6xl font-bold text-amber-800 font-mono">{pendingPanels}</span>
        </div>
        <div
          onClick={() => applyStatusFilter('approved')}
          className={`bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg border border-emerald-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${
            activeFilter === 'approved' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
          }`}
        >
          <span className="text-emerald-700 text-base font-semibold mb-4 tracking-wide">Approved</span>
          <span className="text-5xl lg:text-6xl font-bold text-emerald-800 font-mono">{approvedPanels}</span>
        </div>
        <div
          onClick={() => applyStatusFilter('rejected')}
          className={`bg-gradient-to-br from-rose-50 to-rose-100 shadow-lg border border-rose-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${
            activeFilter === 'rejected' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
          }`}
        >
          <span className="text-rose-700 text-base font-semibold mb-4 tracking-wide">Rejected</span>
          <span className="text-5xl lg:text-6xl font-bold text-rose-800 font-mono">{rejectedPanels}</span>
        </div>
        <div
          onClick={applyDuplicateFilter}
          className={`bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg border border-purple-200 rounded-xl px-6 py-8 flex flex-col items-center ${
            duplicateCount ? 'animate-pulse' : ''
          } hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${
            activeFilter === 'duplicates' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
          }`}
        >
          <span className="text-purple-700 text-base font-semibold mb-2 tracking-wide text-center">Duplicates</span>
          <span className="text-4xl lg:text-5xl font-bold text-purple-800 font-mono">{duplicateCount}</span>
          <span className="mt-2 text-xs text-purple-600 font-medium">Within Project</span>
        </div>
      </div>

      <div
        className="overflow-x-auto w-full rounded-xl shadow-lg border"
        style={{
          maxWidth: screenWidth >= 2560 ? '95vw' : screenWidth >= 1920 ? '90vw' : '1400px',
        }}
      >
        <table className="min-w-full bg-white text-sm font-medium">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Panel ID</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Type</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Confidence</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Status</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Duplicate</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredPanels.map((p, idx) => {
              const isEven = idx % 2 === 0;
              const breakdown = computeOverallScore(p, 'strict');
              const overall = breakdown.overall;
              const badgeColor = sharedBadgeColor(overall);
              const dup = dupFrequency[p.componentId] > 1;
              return (
                <tr key={p.id} className={`${isEven ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors duration-200`}>
                  <td className="px-4 lg:px-6 py-4 font-medium text-slate-900">{p.componentId}</td>
                  <td className="px-4 lg:px-6 py-4 text-slate-700">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{p.componentType || p.type || 'Unknown'}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${badgeColor}`} title={`Confidence: ${Math.round(overall)}% | Present: ${breakdown.presentSections.length} | Missing: ${breakdown.missingSections.length}`}>{Math.round(overall)}%</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${p.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : p.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">{dup && <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-semibold">DUP×{dupFrequency[p.componentId]}</span>}</td>
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex space-x-2">
                      <button onClick={() => router.push(`/production-planning/${projectId}/panel/${p.id}`)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md text-xs font-medium">Review</button>
                      <button onClick={() => openEdit(p)} className="text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-3 py-1 rounded-lg transition-all duration-200 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md text-xs font-medium">Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredPanels.length === 0 && (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {activeFilter ? 'No matching panels' : 'No panels found'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeFilter ? `No panels match filter: ${activeFilter}` : 'This project has no components yet.'}
            </p>
            {activeFilter && (
              <button onClick={clearFilter} className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline">
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      {showEditModal && editPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Edit Panel</h2>
              <button onClick={closeEdit} className="text-slate-500 hover:text-slate-700 text-sm">✕</button>
            </div>
            <form onSubmit={saveEdit} className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col text-sm font-medium gap-1">
                  Project ID
                  <select value={editPanel.projectId} onChange={e => setEditPanel(p => p ? { ...p, projectId: e.target.value } : p)} className="border rounded px-2 py-2 text-sm">
                    {allProjects.map(pr => <option key={pr.projectId} value={pr.projectId}>{pr.projectId}</option>)}
                  </select>
                </label>
                <label className="flex flex-col text-sm font-medium gap-1">
                  Client
                  <select value={editPanel.clientId || ''} onChange={e => setEditPanel(p => p ? { ...p, clientId: e.target.value } : p)} className="border rounded px-2 py-2 text-sm">
                    <option value="">Select</option>
                    {allClients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </label>
                <label className="flex flex-col text-sm font-medium gap-1">
                  Panel ID
                  <input value={editPanel.componentId} onChange={e => setEditPanel(p => p ? { ...p, componentId: e.target.value } : p)} className="border rounded px-2 py-2 text-sm" />
                </label>
                <label className="flex flex-col text-sm font-medium gap-1">
                  Component Type
                  <input value={editPanel.componentType || ''} onChange={e => setEditPanel(p => p ? { ...p, componentType: e.target.value } : p)} className="border rounded px-2 py-2 text-sm" />
                </label>
                <label className="flex flex-col text-sm font-medium gap-1">
                  Status
                  <select value={editPanel.status || ''} onChange={e => setEditPanel(p => p ? { ...p, status: e.target.value } : p)} className="border rounded px-2 py-2 text-sm">
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </label>
                <label className="flex flex-col text-sm font-medium gap-1">
                  Percent Complete
                  <input type="number" value={editPanel.percentComplete || 0} onChange={e => setEditPanel(p => p ? { ...p, percentComplete: Number(e.target.value) } : p)} className="border rounded px-2 py-2 text-sm" />
                </label>
                <label className="flex flex-col text-sm font-medium gap-1">
                  Sequence
                  <input value={editPanel.sequence || ''} onChange={e => setEditPanel(p => p ? { ...p, sequence: e.target.value } : p)} className="border rounded px-2 py-2 text-sm" />
                </label>
                <label className="flex flex-col text-sm font-medium gap-1">
                  Max Width
                  <input value={editPanel.maxWidth || ''} onChange={e => setEditPanel(p => p ? { ...p, maxWidth: e.target.value } : p)} className="border rounded px-2 py-2 text-sm" />
                </label>
                <label className="flex flex-col text-sm font-medium gap-1">
                  Max Height
                  <input value={editPanel.maxHeight || ''} onChange={e => setEditPanel(p => p ? { ...p, maxHeight: e.target.value } : p)} className="border rounded px-2 py-2 text-sm" />
                </label>
                <label className="flex flex-col text-sm font-medium gap-1">
                  Weight
                  <input type="number" value={editPanel.weight || ''} onChange={e => setEditPanel(p => p ? { ...p, weight: Number(e.target.value) } : p)} className="border rounded px-2 py-2 text-sm" />
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={closeEdit} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow">Save</button>
              </div>
              <p className="text-xs text-slate-400">(Saving only updates local state; integrate API PUT later.)</p>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}