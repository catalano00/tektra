"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PanelForSchedule {
  id: string;
  componentId: string;
  projectId: string;
  sequence?: string | null;
  componentType?: string | null;
  componentsqft?: number | null;
  currentStatus?: string | null;
  scheduledWeek?: string | null; // future: persisted value
}
interface WeekBucket {
  weekKey: string;
  start: Date;
  end: Date;
  capacitySqFt: number;
  assignedSqFt: number;
  panelIds: string[];
}
interface ProjectSummaryLite {
  projectId: string;
  clientName?: string | null;
}
// --- date helpers ---
function startOfISOWeek(d: Date) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7; // Mon =1
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date;
}
function addDays(date: Date, days: number) { const d = new Date(date); d.setUTCDate(d.getUTCDate() + days); return d; }
function formatWeekKey(date: Date) {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 3 - ((tmp.getUTCDay() + 6) % 7));
  const week1 = new Date(Date.UTC(tmp.getUTCFullYear(),0,4));
  const weekNo = 1 + Math.round(((tmp.getTime() - week1.getTime())/86400000 - 3 + ((week1.getUTCDay()+6)%7)) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}

export default function GlobalSchedulingPage() {
  const router = useRouter();
  const [panels, setPanels] = useState<PanelForSchedule[]>([]);
  const [projects, setProjects] = useState<ProjectSummaryLite[]>([]);
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [weeks, setWeeks] = useState<WeekBucket[]>([]);
  const [weeksVisible, setWeeksVisible] = useState(12);
  const [defaultCapacity, setDefaultCapacity] = useState(15000);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [capacityMap, setCapacityMap] = useState<Record<string, number>>({}); // effective editable per week (global scope)

  // replace initial weeks generation with persisted fetch
  useEffect(() => {
    let cancelled = false;
    async function loadPersisted() {
      try {
        setLoading(true);
        const [schedRes, projRes] = await Promise.all([
          fetch('/api/schedule'),
          fetch('/api/projects')
        ]);
        if (!schedRes.ok) throw new Error('Schedule load failed');
        if (!projRes.ok) throw new Error('Projects load failed');
        const schedJson = await schedRes.json();
        const projJson = await projRes.json();
        if (cancelled) return;
        const fetchedWeeks: WeekBucket[] = (schedJson.weeks||[]).map((w: any) => ({
          weekKey: w.weekKey,
          start: new Date(),
          end: new Date(),
          capacitySqFt: w.capacitySqFt,
          assignedSqFt: 0,
          panelIds: []
        }));
        setWeeks(fetchedWeeks);
        setCapacityMap(Object.fromEntries(fetchedWeeks.map(w => [w.weekKey, w.capacitySqFt])));
        const compPanels: PanelForSchedule[] = (schedJson.panels||[]).map((p: any) => ({
          id: p.id,
            componentId: p.componentId,
            projectId: p.projectId,
            sequence: p.sequence,
            componentType: p.componentType,
            componentsqft: p.componentsqft ?? null,
            currentStatus: p.currentStatus ?? null,
            scheduledWeek: p.scheduledWeek || null,
        }));
        compPanels.sort((a,b)=> a.projectId.localeCompare(b.projectId) || (a.sequence||'').localeCompare(b.sequence||'') || a.componentId.localeCompare(b.componentId));
        setPanels(compPanels);
        const projList: ProjectSummaryLite[] = (projJson.projects||projJson).map((p: any) => ({ projectId: p.projectId, clientName: p.clientName||null }));
        setProjects(projList);
        setDirty(false);
      } catch(e: any) { if (!cancelled) setError(e.message||'Error loading'); }
      finally { if(!cancelled) setLoading(false); }
    }
    loadPersisted();
    return () => { cancelled = true; };
  }, []);

  // mark dirty when panels schedule or capacity changes
  useEffect(() => { setDirty(true); }, [panels]);
  useEffect(() => { setDirty(true); }, [capacityMap]);

  function editCapacity(weekKey: string, val: number) {
    setWeeks(prev => prev.map(w => w.weekKey===weekKey ? { ...w, capacitySqFt: val } : w));
    setCapacityMap(prev => ({ ...prev, [weekKey]: val }));
  }

  async function saveAll() {
    try {
      setSaving(true);
      // assignments payload
      const assignments = panels.map(p => ({ componentId: p.id, weekKey: p.scheduledWeek }));
      await fetch('/api/schedule/assignments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ assignments }) });
      // capacities (global only for now)
      const capacities = Object.entries(capacityMap).map(([weekKey, capacitySqFt]) => ({ projectId: null, weekKey, capacitySqFt }));
      await fetch('/api/schedule/capacity', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ capacities }) });
      setDirty(false);
    } catch(e) {
      console.error(e);
    } finally { setSaving(false); }
  }

  // load panels + projects
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [compRes, projRes] = await Promise.all([
          fetch('/api/components'),
          fetch('/api/projects')
        ]);
        if (!compRes.ok) throw new Error('Failed loading components');
        if (!projRes.ok) throw new Error('Failed loading projects');
        const compJson = await compRes.json();
        const projJson = await projRes.json();
        const compList: PanelForSchedule[] = (compJson.components||[]).map((c: any) => ({
          id: c.id,
          componentId: c.componentId,
          projectId: c.projectId,
          sequence: c.sequence,
          componentType: c.componentType,
          componentsqft: c.componentsqft ?? null,
          currentStatus: c.currentStatus ?? c.status ?? null,
          scheduledWeek: null,
        }));
        const projList: ProjectSummaryLite[] = (projJson.projects||[]).map((p: any) => ({ projectId: p.projectId, clientName: p.clientName||null }));
        if (!cancelled) {
          compList.sort((a,b) => a.projectId.localeCompare(b.projectId) || (a.sequence||'').localeCompare(b.sequence||'') || a.componentId.localeCompare(b.componentId));
          setPanels(compList);
          setProjects(projList);
        }
      } catch(e: any) { if(!cancelled) setError(e.message||'Error loading'); }
      finally { if(!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function totalSqFt(p: PanelForSchedule) { return p.componentsqft || 0; }

  // recompute assigned each time panels change
  useEffect(() => {
    setWeeks(prev => prev.map(w => {
      const assignedPanels = panels.filter(p => p.scheduledWeek === w.weekKey);
      return { ...w, assignedSqFt: assignedPanels.reduce((a,b) => a + totalSqFt(b), 0), panelIds: assignedPanels.map(p => p.id) };
    }));
  }, [panels]);

  function autoschedule() {
    setAutoScheduling(true);
    const targetPanels = panels.filter(p => filterProject === 'ALL' || p.projectId === filterProject);
    const others = panels.filter(p => !targetPanels.includes(p));
    const weeksCopy = weeks.map(w => ({ ...w, assignedSqFt: 0, panelIds: [] as string[] }));
    let wIndex = 0;
    const updated: Record<string,string> = {};
    for (const p of targetPanels) {
      const size = totalSqFt(p);
      while (wIndex < weeksCopy.length && weeksCopy[wIndex].assignedSqFt + size > weeksCopy[wIndex].capacitySqFt) wIndex++;
      if (wIndex >= weeksCopy.length) break;
      weeksCopy[wIndex].assignedSqFt += size;
      weeksCopy[wIndex].panelIds.push(p.id);
      updated[p.id] = weeksCopy[wIndex].weekKey;
    }
    setWeeks(weeksCopy);
    setPanels([...others, ...targetPanels].map(p => updated[p.id] ? { ...p, scheduledWeek: updated[p.id] } : p));
    setAutoScheduling(false);
  }

  function shiftWeek(current: string | null, delta: number): string | null {
    if (!current) return current;
    const idx = weeks.findIndex(w => w.weekKey === current);
    if (idx === -1) return current;
    const newIdx = Math.min(Math.max(0, idx + delta), weeks.length -1);
    return weeks[newIdx].weekKey;
  }

  function movePanel(panelId: string, dir: number) {
    setPanels(prev => prev.map(p => {
      if (p.id !== panelId) return p;
      let wk = p.scheduledWeek;
      if (!wk) wk = weeks[0]?.weekKey || null; else wk = shiftWeek(wk, dir);
      return { ...p, scheduledWeek: wk };
    }));
  }

  const filteredPanels = panels.filter(p => filterProject === 'ALL' ? true : p.projectId === filterProject);

  if (loading) return <main className="min-h-screen flex items-center justify-center text-sm text-slate-600">Loading...</main>;
  if (error) return <main className="min-h-screen flex items-center justify-center text-sm text-red-600">{error}</main>;

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-white p-4 lg:p-8">
      <div className="w-full max-w-7xl flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold">Global Scheduling</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => router.push('/production-planning')} className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm">Back</button>
            <button onClick={autoschedule} disabled={autoScheduling} className="px-3 py-2 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-600 text-white hover:bg-blue-700 shadow disabled:opacity-50">{autoScheduling ? 'Scheduling...' : 'Auto-Schedule (Filtered)'}</button>
            <button onClick={saveAll} disabled={!dirty || saving} className="px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700 shadow disabled:opacity-50">{saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-xs font-medium flex flex-col gap-1">Project Filter
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="border rounded px-2 py-1 text-xs bg-white">
              <option value="ALL">All Projects</option>
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>{p.projectId}{p.clientName ? ` – ${p.clientName}`:''}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium flex flex-col gap-1">Default Weekly Capacity (SqFt)
            <input type="number" value={defaultCapacity} onChange={e => setDefaultCapacity(Number(e.target.value)||0)} className="border rounded px-2 py-1 text-xs" />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 shadow flex flex-col gap-2 md:col-span-3">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide">Week Utilization (Capacity / Assigned)</h2>
            <div className="flex overflow-x-auto gap-3 pb-1">
              {weeks.slice(0, weeksVisible).map(w => {
                const pct = w.capacitySqFt ? Math.min(100, Math.round((w.assignedSqFt / w.capacitySqFt) * 100)) : 0;
                return (
                  <div key={w.weekKey} className="min-w-[140px] bg-white border border-slate-200 rounded-lg p-2 flex flex-col gap-1 shadow-sm">
                    <div className="text-[11px] font-semibold text-slate-700">{w.weekKey}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <input type="number" value={capacityMap[w.weekKey] ?? w.capacitySqFt} onChange={e=>editCapacity(w.weekKey, Number(e.target.value)||0)} className="w-16 border rounded px-1 py-0.5 text-[10px]" aria-label="Capacity SqFt" />
                      <span className="text-slate-400">cap</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{w.assignedSqFt.toLocaleString()} / {(capacityMap[w.weekKey] ?? w.capacitySqFt).toLocaleString()}</div>
                    <div className="h-2 rounded bg-slate-100 overflow-hidden"><div className={`h-full ${pct>=95?"bg-rose-500":pct>=75?"bg-amber-500":"bg-emerald-500"}`} style={{ width: pct + '%' }}/></div>
                  </div>
                );
              })}
              {weeksVisible < weeks.length && <button onClick={()=>setWeeksVisible(v=>v+4)} className="min-w-[80px] border border-slate-300 text-slate-600 text-[11px] rounded-lg hover:bg-slate-50">+ More</button>}
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 shadow flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide">Legend</h2>
            <div className="flex flex-col gap-1 text-[11px] text-slate-600">
              <span><span className="inline-block w-2 h-2 rounded bg-emerald-500 mr-2"/> &lt; 75%</span>
              <span><span className="inline-block w-2 h-2 rounded bg-amber-500 mr-2"/> 75-94%</span>
              <span><span className="inline-block w-2 h-2 rounded bg-rose-500 mr-2"/> 95%+</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6" style={{ gridTemplateColumns: '340px 1fr' }}>
          {/* Panel List */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide">Panels ({filteredPanels.length})</h2>
            <div className="border rounded-xl bg-white shadow overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-2 text-left font-semibold">Project</th>
                    <th className="p-2 text-left font-semibold">ID</th>
                    <th className="p-2 text-left font-semibold">Seq</th>
                    <th className="p-2 text-left font-semibold">SqFt</th>
                    <th className="p-2 text-left font-semibold">Week</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPanels.map(p => (
                    <tr key={p.id} className="hover:bg-blue-50 cursor-pointer" onClick={()=>movePanel(p.id,1)} title="Click to move one week later (or schedule into first week)">
                      <td className="p-2 text-slate-500">{p.projectId}</td>
                      <td className="p-2 font-medium text-slate-800">{p.componentId}</td>
                      <td className="p-2">{p.sequence || '-'}</td>
                      <td className="p-2">{(p.componentsqft||0).toLocaleString()}</td>
                      <td className="p-2 text-[10px] text-slate-500">{p.scheduledWeek || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 px-1">(Click a row to move panel one week later. Autoschedule only affects filtered panels.)</p>
          </div>

          {/* Schedule Grid */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide">Schedule Grid</h2>
            <div className="overflow-auto border rounded-xl bg-white shadow p-3">
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${weeksVisible}, minmax(170px,1fr))` }}>
                {weeks.slice(0,weeksVisible).map(w => {
                  const pct = w.capacitySqFt ? Math.min(100, Math.round((w.assignedSqFt / w.capacitySqFt) * 100)) : 0;
                  return (
                    <div key={w.weekKey} className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <div className="px-2 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b flex flex-col gap-1">
                        <div className="text-[11px] font-semibold text-slate-700">{w.weekKey}</div>
                        <div className="text-[10px] text-slate-500">{w.assignedSqFt.toLocaleString()} / {(capacityMap[w.weekKey] ?? w.capacitySqFt).toLocaleString()}</div>
                        <div className="h-2 rounded bg-slate-200 overflow-hidden"><div className={`h-full ${pct>=95?"bg-rose-500":pct>=75?"bg-amber-500":"bg-emerald-500"}`} style={{ width: pct + '%' }} /></div>
                      </div>
                      <div className="flex flex-col gap-1 p-2 text-[11px] min-h-[180px]">
                        {panels.filter(p => p.scheduledWeek === w.weekKey && (filterProject==='ALL' || p.projectId===filterProject)).map(p => (
                          <div key={p.id} className="group relative border border-slate-200 bg-white rounded px-2 py-1 flex flex-col gap-0.5 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-700 truncate max-w-[95px]" title={p.componentId}>{p.componentId}</span>
                              <span className="text-[10px] text-slate-500">{(p.componentsqft||0).toLocaleString()}sf</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                              <span>{p.sequence||'-'}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => setPanels(prev => prev.map(x => x.id===p.id ? { ...x, scheduledWeek: p.scheduledWeek ? shiftWeek(p.scheduledWeek,-1) : p.scheduledWeek }:x))} className="px-1 rounded bg-slate-100 hover:bg-slate-200" aria-label="Move earlier one week">◀</button>
                                <button onClick={() => setPanels(prev => prev.map(x => x.id===p.id ? { ...x, scheduledWeek: p.scheduledWeek ? shiftWeek(p.scheduledWeek,1) : (weeks[0]?.weekKey||null) }:x))} className="px-1 rounded bg-slate-100 hover:bg-slate-200" aria-label="Move later one week">▶</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-[11px] text-slate-500 flex flex-col gap-1">
          <span>Notes:</span>
          <ul className="list-disc ml-4 space-y-1">
            <li>Autoschedule fills weeks sequentially for filtered panels only.</li>
            <li>Capacity & schedule currently local only; persistence upcoming via ComponentSchedule + ProjectWeekCapacity tables.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
