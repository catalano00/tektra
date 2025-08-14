'use client';

import { useEffect, useState, Fragment, Suspense, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { formatTime } from '@/utils/format';
import type { TimeEntry, Part, Sheathing } from '@prisma/client';

interface Project {
  projectId: string;
}

interface ComponentExtended {
  id: string;
  projectId: string;
  componentId: string;
  componentType: string;
  currentStatus: string;
  percentComplete: number;
  componentsqft?: number;
  designUrl?: string | null;
  timeEntries?: TimeEntry[];
  part?: Part[];
  sheathing?: Sheathing | null;
  connectors?: { id: string; label: string; count: number; description?: string | null } | null;
  framingTL?: { id: string; ftype: string; totalLength: string; count: number } | null;
}

const OPERATION_ORDER = ['Cut', 'Assemble', 'Fly', 'Ship'] as const;
const TEAM_LEADS = ['Joel', 'Adrian', 'Andres'];
const WORKSTATIONS = ['TABLE01', 'TABLE02', 'TABLE03'];

type ProcessType = typeof OPERATION_ORDER[number];

function isValidProcess(value: string): value is ProcessType {
  return OPERATION_ORDER.includes(value as ProcessType);
}

function OperatorTimePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [components, setComponents] = useState<ComponentExtended[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectFilter, setProjectFilter] = useState<'active' | 'all'>('active');
  const [selectedComponent, setSelectedComponent] = useState<ComponentExtended | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [workstation, setWorkstation] = useState('');
  const [teamLead, setTeamLead] = useState('');
  const [process, setProcess] = useState<ProcessType | ''>('');
  const [availableProcesses, setAvailableProcesses] = useState<ProcessType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [designBlobUrl, setDesignBlobUrl] = useState<string | null>(null);
  const [designLoadError, setDesignLoadError] = useState<string | null>(null);
  const [designLoading, setDesignLoading] = useState(false);
  const [zoom, setZoom] = useState(125); // PDF viewer zoom percent
  const [collapseDrawing, setCollapseDrawing] = useState(false);

  // Split panel sizing (dynamic like data-review page)
  const [leftWidth, setLeftWidth] = useState(700); // initial px width for left panel
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const [screenWidth, setScreenWidth] = useState(0);

  const panelIdParam = searchParams?.get('componentId') ?? '';
  const projectIdParam = searchParams?.get('projectId') ?? '';
  const processParamRaw = searchParams?.get('process') ?? '';
  const teamLeadParam = searchParams?.get('teamLead') ?? '';
  const processParam: ProcessType | '' = isValidProcess(processParamRaw) ? processParamRaw : '';

  // Track screen width & adjust initial left panel width adaptively
  useEffect(() => {
    const updateSW = () => {
      const w = window.innerWidth;
      setScreenWidth(w);
      setLeftWidth(prev => {
        // If user already resized (flag via data attribute), keep
        if (containerRef.current?.dataset.userResized === 'true') return prev;
        if (w >= 2560) return 900;
        if (w >= 1920) return 780;
        if (w >= 1536) return 720;
        return Math.min(680, Math.max(500, Math.floor(w * 0.55)));
      });
    };
    updateSW();
    window.addEventListener('resize', updateSW);
    return () => window.removeEventListener('resize', updateSW);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMouseMove = (me: MouseEvent) => {
      if (!isResizing.current) return;
      const dx = me.clientX - startX;
      const minWidth = Math.max(420, screenWidth * 0.25);
      const maxWidth = Math.min(1200, screenWidth * 0.7);
      const next = Math.max(minWidth, Math.min(maxWidth, startWidth + dx));
      setLeftWidth(next);
      if (containerRef.current) containerRef.current.dataset.userResized = 'true';
    };
    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleStop = () => {
    setIsRunning(false);
    setShowModal(true);
  };

  const handleModalAction = async (action: string) => {
    if (!selectedComponent || !process) return;

    if (action === 'quality') {
      try {
        const durationInSeconds = Math.round(Number(time) || 0);
        const payload: Record<string, any> = {
          componentId: selectedComponent.id,
          process,
          status: 'paused',
          duration: durationInSeconds,
          teamLead,
          workstation,
          warehouse: 'Grand Junction',
        };
        if (selectedComponent.componentId) payload.componentCode = selectedComponent.componentId;
        const putRes = await fetch('/api/time-entry', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!putRes.ok) { console.error('❌ Failed to save time entry before quality issue:', await putRes.text()); toast.error('Failed to save current process.'); return; }
        const postRes = await fetch('/api/time-entry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ componentId: selectedComponent.id, componentCode: selectedComponent.componentId, currentProcess: process, teamLead, workstation, warehouse: 'Grand Junction' }) });
        if (!postRes.ok) { console.error('❌ Failed to create next time entry for quality issue:', await postRes.text()); toast.error('Failed to prep next process.'); return; }
        const updateRes = await fetch(`/api/components/${selectedComponent.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentStatus: 'Quality Issue' }) });
        if (!updateRes.ok) { console.error('❌ Failed to update component status:', await updateRes.text()); toast.error('Failed to set quality status.'); return; }
        router.push(`/quality-issue?projectName=${encodeURIComponent(selectedComponent.projectId)}&componentId=${selectedComponent.id}&process=${encodeURIComponent(process)}`);
      } catch (e) { console.error('❌ Unexpected error during quality issue handling:', e); toast.error('Unexpected error.'); }
      return;
    }

    const status = action === 'complete' ? 'complete' : action;
    const durationInSeconds = Math.round(Number(time));
    if (!Number.isFinite(durationInSeconds)) { toast.error('Invalid duration.'); return; }
    const payload = { componentId: selectedComponent.id, componentCode: selectedComponent.componentId, process, status, duration: durationInSeconds, workstation, teamLead, warehouse: 'Grand Junction' };
    const putRes = await fetch('/api/time-entry', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!putRes.ok) { console.error('❌ Failed to save current time entry:', await putRes.text()); toast.error('Save failed'); return; }
    const isLastProcess = process === OPERATION_ORDER[OPERATION_ORDER.length - 1];
    if (action === 'complete') {
      if (!isLastProcess) {
        const postRes = await fetch('/api/time-entry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ componentId: selectedComponent.id, componentCode: selectedComponent.componentId, currentProcess: process, teamLead, workstation, warehouse: 'Grand Junction' }) });
        if (postRes.status === 204) { toast.success(`Process "${process}" completed`); } else if (!postRes.ok) { console.error('Failed to create next time entry:', await postRes.text()); }
      } else { toast.success(`Component ${selectedComponent.componentId} fully completed!`); }
    }
    router.push(`/project/${selectedProject}`);
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch(`/api/projects?filter=${projectFilter}`);
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setProjects([]);
      }
    };
    loadProjects();
  }, [projectFilter]);

  useEffect(() => {
    if (projectIdParam) setSelectedProject(projectIdParam);
  }, [projectIdParam]);

  useEffect(() => {
    if (!selectedProject) return;

    const loadComponents = async () => {
      try {
        const res = await fetch(`/api/components?projectId=${selectedProject}`);
        const data: { components: ComponentExtended[] } = await res.json();
        const filtered = data.components.filter(c => {
          const isDelivered = c.currentStatus.toLowerCase().includes('delivered');
          const isShipped = c.currentStatus.toLowerCase().includes('shipped');
          const last = c.timeEntries?.filter(e => e.status === 'complete').at(-1)?.process;
          return !isDelivered && !isShipped && last !== 'Ship';
        });

        setComponents(filtered);

        if (panelIdParam) {
          const match = filtered.find(c => c.componentId === panelIdParam);
          if (match) setSelectedComponent(match);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadComponents();
  }, [selectedProject]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => setTime(prev => prev + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  useEffect(() => {
    if (!selectedComponent) return;

    const loadTimeEntries = async () => {
      try {
        const res = await fetch(`/api/time-entry?componentId=${selectedComponent.id}`);
        if (!res.ok) throw new Error(`Failed to fetch time entries: ${res.status}`);
        const entries: TimeEntry[] = await res.json();

        const completed = entries.filter(e => e.status === 'complete').map(e => e.process);
        const paused = entries.find(e => e.status === 'paused');
        const lastCompleted = entries
          .filter(e => e.status === 'complete')
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

        if (paused) {
          setProcess(paused.process as ProcessType);
          setTime(Math.round(paused.duration || 0));
          setWorkstation(paused.workstation ?? '');
          setTeamLead(paused.teamLead ?? '');
        } else {
          const nextProcess = OPERATION_ORDER.find(p => !completed.includes(p));
          setProcess(processParam || nextProcess || '');
          setTime(0);
          setWorkstation(lastCompleted?.workstation || '');
          setTeamLead(teamLeadParam || lastCompleted?.teamLead || '');
        }

        setIsRunning(false);
        setAvailableProcesses(OPERATION_ORDER.filter(p => !completed.includes(p)));
      } catch (err) {
        console.error(err);
      }
    };
    loadTimeEntries();
  }, [selectedComponent]);

  useEffect(() => {
    const url = selectedComponent?.designUrl;
    setDesignBlobUrl(null);
    setDesignLoadError(null);
    if (!url) return;
    let revoked: string | null = null;
    (async () => {
      try {
        setDesignLoading(true);
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error(`Failed to load design doc (${res.status})`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        revoked = objectUrl;
        setDesignBlobUrl(objectUrl);
      } catch (e: any) {
        setDesignLoadError(e.message || 'Design load failed');
      } finally {
        setDesignLoading(false);
      }
    })();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [selectedComponent?.designUrl]);

  const totalSeconds = selectedComponent?.timeEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;
  const currentIndex = OPERATION_ORDER.indexOf(processParam as ProcessType);
  const progress = currentIndex >= 0
    ? Math.floor(((currentIndex) / OPERATION_ORDER.length) * 100)
    : 0;

  return (
    <main className="p-4 sm:p-6 md:p-8 w-full max-w-10xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold mb-2">Operator Panel</h1>

      <div className="text-center text-4xl font-mono">{formatTime(time)}</div>

      <div className="w-full bg-gray-200 h-4 rounded">
        <div
          className="bg-green-500 h-4 rounded transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!selectedComponent && (
        <div className="space-y-4">
          <p className="text-center text-gray-500">Select a component to begin:</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              className="border p-2 rounded w-full sm:w-1/2"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectId}
                </option>
              ))}
            </select>
            <select
              className="border p-2 rounded w-full sm:w-1/2"
              onChange={(e) => {
                const comp: ComponentExtended | undefined = components.find(
                  (c) => c.componentId === e.target.value
                );
                setSelectedComponent(comp || null);
              }}
              disabled={!selectedProject}
            >
              <option value="">Select Component</option>
              {components.map((c: ComponentExtended) => (
                <option key={c.componentId} value={c.componentId}>
                  {c.componentId}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {selectedComponent && (
        <div className="w-full" ref={containerRef} style={{ userSelect: isResizing.current ? 'none' : 'auto' }}>
          <div className="flex items-start gap-0 w-full">
            {/* LEFT PANEL */}
            <div className="space-y-6 border rounded bg-white shadow p-4 w-[var(--left-width)]" style={{ width: leftWidth, minWidth: Math.max(420, screenWidth * 0.25), maxWidth: Math.min(1200, screenWidth * 0.7), transition: isResizing.current ? 'none' : 'width .18s ease' }}>
              <div className="space-y-6 w-full">
                <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                  <div>
                    <button
                      onClick={() => router.push('/project-summaries')}
                      className="text-sm text-blue-600 underline"
                    >
                      Change Selection
                    </button>
                    <h1 className="text-2xl font-bold">{selectedComponent.projectId}</h1>
                    <h2 className="text-lg font-bold">{selectedComponent.componentId}</h2>
                    <p className="text-sm text-gray-600">{selectedComponent.componentType}</p>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="block font-semibold">Status</span>
                        <span>{selectedComponent.currentStatus}</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="block font-semibold">Process</span>
                        <span>{process || '—'}</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="block font-semibold">Sq Ft</span>
                        <span>{selectedComponent.componentsqft || '—'}</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="block font-semibold">Complete</span>
                        <span>{selectedComponent.percentComplete}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Part List */}
                  <section className="space-y-2">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600">Part List</h3>
                    {selectedComponent.part?.length ? (
                      <div className="overflow-auto max-h-64 border rounded">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Size/Type</th>
                              <th className="p-2 text-left">Label</th>
                              <th className="p-2 text-right">Count</th>
                              <th className="p-2 text-left">Cut Length</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedComponent.part.map(p => (
                              <tr key={p.id} className="border-t">
                                <td className="p-2">{p.size}</td>
                                <td className="p-2">{p.label}</td>
                                <td className="p-2 text-right">{p.count}</td>
                                <td className="p-2">{p.cutLength}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No parts</p>
                    )}
                  </section>

                  {/* Sheathing */}
                  <section className="space-y-2">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600">Sheathing</h3>
                    {selectedComponent.sheathing ? (
                      <table className="w-full text-xs border rounded">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left">Code</th>
                            <th className="p-2 text-left">Panel Area</th>
                            <th className="p-2 text-right">Count</th>
                            <th className="p-2 text-left">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-2">{selectedComponent.sheathing.componentCode}</td>
                            <td className="p-2">{selectedComponent.sheathing.panelArea}</td>
                            <td className="p-2 text-right">{selectedComponent.sheathing.count}</td>
                            <td className="p-2">{selectedComponent.sheathing.description || '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-gray-500">No sheathing</p>
                    )}
                  </section>

                  {/* Connectors */}
                  <section className="space-y-2">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600">Connectors</h3>
                    {selectedComponent.connectors ? (
                      <table className="w-full text-xs border rounded">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left">Label</th>
                            <th className="p-2 text-left">Description</th>
                            <th className="p-2 text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-2">{selectedComponent.connectors.label}</td>
                            <td className="p-2">{selectedComponent.connectors.description || '—'}</td>
                            <td className="p-2 text-right">{selectedComponent.connectors.count}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-gray-500">No connectors</p>
                    )}
                  </section>

                  {/* Framing TL */}
                  <section className="space-y-2">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600">Framing Total Length</h3>
                    {selectedComponent.framingTL ? (
                      <table className="w-full text-xs border rounded">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left">Type</th>
                            <th className="p-2 text-left">Total Length</th>
                            <th className="p-2 text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-2">{selectedComponent.framingTL.ftype}</td>
                            <td className="p-2">{selectedComponent.framingTL.totalLength}</td>
                            <td className="p-2 text-right">{selectedComponent.framingTL.count}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-gray-500">No framing TL</p>
                    )}
                  </section>
                </div>

                {/* Controls */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600">Controls</h3>
                  <select className="border p-2 rounded w-full" value={workstation} onChange={(e) => setWorkstation(e.target.value)}>
                    <option value="">Select Workstation</option>
                    {WORKSTATIONS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <select className="border p-2 rounded w-full" value={teamLead} onChange={(e) => setTeamLead(e.target.value)}>
                    <option value="">Select Team Lead</option>
                    {TEAM_LEADS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    onClick={isRunning ? handleStop : () => setIsRunning(true)}
                    className={`w-full px-6 py-2 text-white rounded ${isRunning ? 'bg-red-600' : 'bg-green-600'} hover:opacity-90`}
                  >
                    {isRunning ? 'Stop' : time > 0 ? 'Resume' : 'Start'}
                  </button>
                </div>
              </div>
            </div>

            {/* DRAG HANDLE */}
            <div onMouseDown={handleMouseDown} className="flex items-center justify-center cursor-col-resize select-none hover:bg-gray-300 transition-colors" style={{ width: 14, background: '#e5e7eb', borderLeft: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', height: '100%' }}>
              <div className="w-2 h-10 bg-gray-400 rounded-sm" />
            </div>

            {/* RIGHT PANEL (Drawing) */}
            <div className={`relative flex-1 ${collapseDrawing ? 'opacity-60' : ''}`} style={{ minWidth: Math.max(320, screenWidth * 0.25) }}>
              <div className="sticky top-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-600">Panel Drawing</h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="text-[10px] px-2 py-1 border rounded bg-white hover:bg-gray-50"
                      onClick={() => setZoom(z => Math.max(25, z - 25))}
                      disabled={!designBlobUrl}
                    >−</button>
                    <span className="text-[10px] w-10 text-center">{zoom}%</span>
                    <button
                      type="button"
                      className="text-[10px] px-2 py-1 border rounded bg-white hover:bg-gray-50"
                      onClick={() => setZoom(z => Math.min(400, z + 25))}
                      disabled={!designBlobUrl}
                    >+</button>
                    <button
                      type="button"
                      className="text-[10px] px-2 py-1 border rounded bg-white hover:bg-gray-50"
                      onClick={() => designBlobUrl && window.open(designBlobUrl, '_blank')}
                      disabled={!designBlobUrl}
                    >New Tab</button>
                    <button
                      type="button"
                      className="text-[10px] px-2 py-1 border rounded bg-white hover:bg-gray-50"
                      onClick={() => setCollapseDrawing(c => !c)}
                    >{collapseDrawing ? 'Show' : 'Hide'}</button>
                  </div>
                </div>
                <div className={`border rounded-lg bg-white shadow-sm p-2 transition-all ${collapseDrawing ? 'h-10 overflow-hidden' : 'h-[calc(100vh-8rem)] flex flex-col'}`}> 
                  {designLoading && <div className="text-xs text-gray-500 p-4">Loading drawing…</div>}
                  {designLoadError && <div className="text-xs text-red-600 p-4">{designLoadError}</div>}
                  {!designLoading && !designLoadError && designBlobUrl && !collapseDrawing && (
                    <iframe
                      key={zoom} // force reload to apply zoom param
                      src={`${designBlobUrl}#toolbar=0&navpanes=0&zoom=${zoom}`}
                      title="Panel Drawing"
                      className="w-full flex-1 rounded border"
                    />
                  )}
                  {!designLoading && !designLoadError && !designBlobUrl && (
                    <div className="text-xs text-gray-500 p-4">No drawing available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Transition appear show={showModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Choose Action
                  </Dialog.Title>
                  <div className="mt-4 space-y-2">
                    <button onClick={() => handleModalAction('complete')} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Complete Operation</button>
                    <button onClick={() => handleModalAction('paused')} className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600">Pause</button>
                    <button onClick={() => handleModalAction('quality')} className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600">Quality Issue</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </main>
  );
}

export default function OperatorTimePage() {
  return (
    <Suspense>
      <OperatorTimePageInner />
    </Suspense>
  );
}
