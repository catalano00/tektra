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
  clientAddressFormatted?: string;
};

interface ProjectSummary {
  projectId: string;
  totalPanels: number;
  completedCount: number;
  inProgressCount: number;
  totalCycleTime: number;
  percentComplete: number;
  status: string;
}

interface ClientOption { id: string; firstName: string; lastName: string; }

export default function ProductionPlanningPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ProjectSummary>>({});
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [screenWidth, setScreenWidth] = useState(0);
  const [clients, setClients] = useState<ClientOption[]>([]);
  // modal edit
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [projectsRes, summaryRes, clientsRes] = await Promise.all([
        fetch('/api/projects?filter=all'),
        fetch('/api/project-summaries'),
        fetch('/api/clients')
      ]);
      const projectsData = await projectsRes.json();
      const summaryData: ProjectSummary[] = await summaryRes.json();
      const clientsData: ClientOption[] = clientsRes.ok ? await clientsRes.json() : [];
      const summaryMap: Record<string, ProjectSummary> = {};
      summaryData.forEach(s => { summaryMap[s.projectId] = s; });
      setProjects(projectsData);
      setFilteredProjects(projectsData);
      setSummaries(summaryMap);
      setClients(clientsData);
    }
    fetchData();
  }, []);

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const totalProjects = projects.length;
  const planned = projects.filter(p => p.currentStatus === 'Planned').length;
  const inProd = projects.filter(p => p.currentStatus === 'In Production').length;
  const complete = projects.filter(p => ['Complete','Delivered'].includes(p.currentStatus)).length;

  function applyStatus(status: string | null) {
    setStatusFilter(status);
    if (!status) setFilteredProjects(projects); else setFilteredProjects(projects.filter(p => p.currentStatus === status));
  }

  function openEdit(p: Project) { setEditProject(p); setShowEditModal(true); }
  function closeEdit() { setShowEditModal(false); setEditProject(null); }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    if (!editProject) return;
    try {
      const body: any = {
        streetaddress: editProject.streetaddress,
        city: editProject.city,
        state: editProject.state,
        contractAmount: editProject.contractAmount,
        estimatedPanelSqFt: editProject.estimatedPanelSqFt,
        notes: editProject.notes,
        currentStatus: editProject.currentStatus,
      };
      const selectedClient = clients.find(c => `${c.firstName} ${c.lastName}` === editProject.client);
      if (selectedClient) body.clientId = selectedClient.id;
      // remove undefined
      Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
      const res = await fetch(`/api/projects/${encodeURIComponent(editProject.projectId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        console.error('Save failed');
      } else {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.projectId === updated.projectId ? { ...p, ...p, ...{
          streetaddress: updated.streetaddress,
          city: updated.city,
          state: updated.state,
          contractAmount: Number(updated.contractAmount)||0,
          estimatedPanelSqFt: updated.estimatedPanelSqFt||0,
          notes: updated.notes||null,
          currentStatus: updated.currentStatus
        }} : p));
        setFilteredProjects(prev => prev.map(p => p.projectId === updated.projectId ? { ...p, ...{
          streetaddress: updated.streetaddress,
          city: updated.city,
          state: updated.state,
          contractAmount: Number(updated.contractAmount)||0,
          estimatedPanelSqFt: updated.estimatedPanelSqFt||0,
          notes: updated.notes||null,
          currentStatus: updated.currentStatus
        }} : p));
      }
    } catch (err) {
      console.error(err);
    } finally {
      closeEdit();
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-white p-4 lg:p-8">
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">Production Planning Overview</h1>
        {statusFilter && (
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-sm text-slate-600">Filtered:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{statusFilter}</span>
            <button onClick={() => applyStatus(null)} className="text-xs text-slate-500 hover:text-slate-700 underline">Clear</button>
          </div>
        )}
      </div>

      {/* Hero Tiles grid similar to data-review styling */}
      <div className="grid gap-4 lg:gap-6 mb-8 w-full" style={{ maxWidth: screenWidth >= 2560 ? '95vw':'1400px', gridTemplateColumns: screenWidth >= 1024 ? 'repeat(auto-fit,minmax(220px,1fr))':'repeat(auto-fit,minmax(260px,1fr))' }}>
        <div onClick={() => applyStatus(null)} className={`bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg border border-slate-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${statusFilter===null ? 'ring-2 ring-blue-500 ring-opacity-50':''}`}> <span className="text-slate-600 text-base font-semibold mb-4 tracking-wide">Total Projects</span><span className="text-5xl lg:text-6xl font-bold text-slate-800 font-mono">{totalProjects}</span></div>
        <div onClick={() => applyStatus('Planned')} className={`bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg border rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${statusFilter==='Planned' ? 'ring-2 ring-blue-500 ring-opacity-50':''}`}> <span className="text-slate-600 text-base font-semibold mb-4 tracking-wide">Planned</span><span className="text-5xl lg:text-6xl font-bold text-slate-800 font-mono">{planned}</span></div>
        <div onClick={() => applyStatus('In Production')} className={`bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg border border-amber-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${statusFilter==='In Production' ? 'ring-2 ring-blue-500 ring-opacity-50':''}`}> <span className="text-amber-700 text-base font-semibold mb-4 tracking-wide">In Production</span><span className="text-5xl lg:text-6xl font-bold text-amber-800 font-mono">{inProd}</span></div>
        <div onClick={() => applyStatus('Complete')} className={`bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg border border-emerald-200 rounded-xl px-6 py-8 flex flex-col items-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${statusFilter==='Complete' ? 'ring-2 ring-blue-500 ring-opacity-50':''}`}> <span className="text-emerald-700 text-base font-semibold mb-4 tracking-wide">Complete</span><span className="text-5xl lg:text-6xl font-bold text-emerald-800 font-mono">{complete}</span></div>
      </div>

      {/* Projects Table */}
      <div className="overflow-x-auto w-full rounded-xl shadow-lg border" style={{ maxWidth: screenWidth >= 2560 ? '95vw':'1400px' }}>
        <table className="min-w-full bg-white text-sm font-medium">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Project ID</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Client</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Location</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Contract Amount</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Panel SqFt</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Panels</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">% Complete</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Status</th>
              <th className="px-4 lg:px-6 py-4 text-left font-semibold text-slate-700 tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredProjects.map((p, idx) => {
              const s = summaries[p.projectId];
              const isEven = idx % 2 === 0;
              return (
                <tr key={p.projectId} className={`${isEven ? 'bg-white':'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors duration-200`}>
                  <td className="px-4 lg:px-6 py-4 font-medium text-slate-900 cursor-pointer" onClick={() => router.push(`/production-planning/${p.projectId}`)}>{p.projectId}</td>
                  <td className="px-4 lg:px-6 py-4 text-slate-700">{p.client && (
                    <div className="flex flex-col">
                      <span>{p.client}</span>
                      {p.clientAddressFormatted && <span className="text-xs text-slate-500 truncate max-w-[220px]" title={p.clientAddressFormatted}>{p.clientAddressFormatted}</span>}
                    </div>
                  )}</td>
                  <td className="px-4 lg:px-6 py-4 text-slate-600">{`${p.streetaddress}, ${p.city}, ${p.state}`}</td>
                  <td className="px-4 lg:px-6 py-4 text-slate-700">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.contractAmount||0)}</td>
                  <td className="px-4 lg:px-6 py-4 text-slate-700">{(p.estimatedPanelSqFt||0).toLocaleString()}</td>
                  <td className="px-4 lg:px-6 py-4 text-slate-700">{s?.totalPanels ?? 0}</td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ (s?.percentComplete||0) >= 95 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (s?.percentComplete||0) >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{s?.percentComplete ?? 0}%</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${['Delivered','Complete'].includes(p.currentStatus) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : p.currentStatus==='In Production' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{p.currentStatus}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex space-x-2">
                      <button onClick={() => router.push(`/production-planning/${p.projectId}`)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md text-xs font-medium">Open</button>
                      <button onClick={() => openEdit(p)} className="text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-3 py-1 rounded-lg transition-all duration-200 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md text-xs font-medium">Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-500">Try clearing filters.</p>
          </div>
        )}
      </div>

      {showEditModal && editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Edit Project</h2>
              <button onClick={closeEdit} className="text-slate-500 hover:text-slate-700 text-sm">✕</button>
            </div>
            <form onSubmit={saveProject} className="px-6 py-6 space-y-6 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 font-medium">Project ID
                  <input disabled value={editProject.projectId} className="border rounded px-2 py-2 bg-slate-50" />
                </label>
                <label className="flex flex-col gap-1 font-medium">Client
                  <select value={editProject.client} onChange={e => setEditProject(p => p ? { ...p, client: e.target.value, /* map back to clientId later */ }: p)} className="border rounded px-2 py-2">
                    <option value={editProject.client}>{editProject.client}</option>
                    {clients.filter(c => `${c.firstName} ${c.lastName}` !== editProject.client).map(c => <option key={c.id} value={`${c.firstName} ${c.lastName}`}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-medium">Street Address
                  <input value={editProject.streetaddress} onChange={e => setEditProject(p => p ? { ...p, streetaddress: e.target.value }: p)} className="border rounded px-2 py-2" />
                </label>
                <label className="flex flex-col gap-1 font-medium">City
                  <input value={editProject.city} onChange={e => setEditProject(p => p ? { ...p, city: e.target.value }: p)} className="border rounded px-2 py-2" />
                </label>
                <label className="flex flex-col gap-1 font-medium">State
                  <input value={editProject.state} onChange={e => setEditProject(p => p ? { ...p, state: e.target.value }: p)} className="border rounded px-2 py-2" />
                </label>
                <label className="flex flex-col gap-1 font-medium">Contract Amount
                  <input type="number" value={editProject.contractAmount || 0} onChange={e => setEditProject(p => p ? { ...p, contractAmount: Number(e.target.value) }: p)} className="border rounded px-2 py-2" />
                </label>
                <label className="flex flex-col gap-1 font-medium">Estimated Panel SqFt
                  <input type="number" value={editProject.estimatedPanelSqFt || 0} onChange={e => setEditProject(p => p ? { ...p, estimatedPanelSqFt: Number(e.target.value) }: p)} className="border rounded px-2 py-2" />
                </label>
                <label className="flex flex-col gap-1 font-medium">Notes
                  <textarea value={editProject.notes || ''} onChange={e => setEditProject(p => p ? { ...p, notes: e.target.value }: p)} className="border rounded px-2 py-2 min-h-[80px] resize-y" />
                </label>
                <label className="flex flex-col gap-1 font-medium">Status
                  <select value={editProject.currentStatus} onChange={e => setEditProject(p => p ? { ...p, currentStatus: e.target.value }: p)} className="border rounded px-2 py-2">
                    <option value="Planned">Planned</option>
                    <option value="In Production">In Production</option>
                    <option value="Complete">Complete</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={closeEdit} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow">Save</button>
              </div>
              <p className="text-xs text-slate-400">(Changes persist via API.)</p>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}