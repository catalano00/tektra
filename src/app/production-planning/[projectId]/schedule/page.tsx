'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PanelForSchedule { id: string; componentId: string; sequence?: string|null; componentType?: string|null; componentsqft?: number|null; currentStatus?: string|null; scheduledWeek?: string|null; }
interface WeekBucket { weekKey: string; capacitySqFt: number; assignedSqFt: number; panelIds: string[]; source: 'project'|'global'|'default'; }

export default function ProjectSchedulingPage() {
  const params = useParams() as { projectId: string };
  const projectId = params.projectId;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [panels, setPanels] = useState<PanelForSchedule[]>([]);
  const [weeks, setWeeks] = useState<WeekBucket[]>([]);
  const [weeksVisible, setWeeksVisible] = useState(12);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [capacityMap, setCapacityMap] = useState<Record<string, number>>({}); // editable project-specific overrides
  const [defaultCapacity, setDefaultCapacity] = useState<number>(15000);

  // Initial load from persisted schedule (project scoped)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/schedule?projectId=${encodeURIComponent(projectId)}`);
        if (!res.ok) throw new Error('Failed loading schedule');
        const json = await res.json();
        if (cancelled) return;
        const fetchedWeeks: WeekBucket[] = (json.weeks||[]).map((w: any) => ({ weekKey: w.weekKey, capacitySqFt: w.capacitySqFt, assignedSqFt: 0, panelIds: [], source: w.source }));
        setWeeks(fetchedWeeks);
        setCapacityMap(Object.fromEntries(fetchedWeeks.map(w => [w.weekKey, w.capacitySqFt])));
        setDefaultCapacity(json.defaultCapacity || 15000);
        const compPanels: PanelForSchedule[] = (json.panels||[]).map((p: any) => ({ id: p.id, componentId: p.componentId, projectId: p.projectId, sequence: p.sequence, componentType: p.componentType, componentsqft: p.componentsqft ?? null, currentStatus: p.currentStatus ?? null, scheduledWeek: p.scheduledWeek || null }));
        compPanels.sort((a,b)=> (a.sequence||'').localeCompare(b.sequence||'') || a.componentId.localeCompare(b.componentId));
        setPanels(compPanels);
        setDirty(false);
      } catch(e: any) { if(!cancelled) setError(e.message||'Error'); }
      finally { if(!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  // Track dirty state
  useEffect(() => { setDirty(true); }, [panels]);
  useEffect(() => { setDirty(true); }, [capacityMap]);

  function totalSqFt(p: PanelForSchedule) { return p.componentsqft || 0; }

  // Recompute assigned per week whenever panels update
  useEffect(() => {
    setWeeks(prev => prev.map(w => {
      const assigned = panels.filter(p => p.scheduledWeek === w.weekKey);
      return { ...w, assignedSqFt: assigned.reduce((a,b)=> a + totalSqFt(b), 0), panelIds: assigned.map(p=>p.id) };
    }));
  }, [panels]);

  function shiftWeek(current: string | null, delta: number): string | null {
    if (!current) return current;
    const idx = weeks.findIndex(w => w.weekKey === current);
    if (idx === -1) return current;
    const newIdx = Math.min(Math.max(0, idx + delta), weeks.length - 1);
    return weeks[newIdx].weekKey;
  }

  function movePanel(panelId: string, dir: number) {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, scheduledWeek: p.scheduledWeek ? shiftWeek(p.scheduledWeek, dir) : (weeks[0]?.weekKey || null) } : p));
  }

  function autoschedule() {
    setAutoScheduling(true);
    const weeksCopy = weeks.map(w => ({ ...w, assignedSqFt: 0, panelIds: [] as string[] }));
    let wIndex = 0; const updated: Record<string,string> = {};
    for (const p of panels) {
      const size = totalSqFt(p);
      while (wIndex < weeksCopy.length && weeksCopy[wIndex].assignedSqFt + size > (capacityMap[weeksCopy[wIndex].weekKey] ?? weeksCopy[wIndex].capacitySqFt)) wIndex++;
      if (wIndex >= weeksCopy.length) break;
      weeksCopy[wIndex].assignedSqFt += size;
      weeksCopy[wIndex].panelIds.push(p.id);
      updated[p.id] = weeksCopy[wIndex].weekKey;
    }
    setWeeks(weeksCopy);
    setPanels(prev => prev.map(p => updated[p.id] ? { ...p, scheduledWeek: updated[p.id] } : p));
    setAutoScheduling(false);
  }

  function editCapacity(weekKey: string, val: number) {
    setWeeks(prev => prev.map(w => w.weekKey===weekKey ? { ...w, capacitySqFt: val } : w));
    setCapacityMap(prev => ({ ...prev, [weekKey]: val }));
  }

  async function saveAll() {
    try {
      setSaving(true);
      const assignments = panels.map(p => ({ componentId: p.id, weekKey: p.scheduledWeek }));
      await fetch('/api/schedule/assignments', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ assignments }) });
      const capacities = Object.entries(capacityMap).map(([weekKey, capacitySqFt]) => ({ projectId, weekKey, capacitySqFt }));
      await fetch('/api/schedule/capacity', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ capacities }) });
      setDirty(false);
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center text-sm text-slate-600">Loading...</main>;
  if (error) return <main className="min-h-screen flex items-center justify-center text-sm text-red-600">{error}</main>;

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-white p-4 lg:p-8">
      <div className="w-full max-w-7xl flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold">Scheduling: {projectId}</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => router.push(`/production-planning/${projectId}`)} className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm">Back</button>
            <button onClick={autoschedule} disabled={autoScheduling} className="px-3 py-2 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-600 text-white hover:bg-blue-700 shadow disabled:opacity-50">{autoScheduling ? 'Scheduling...' : 'Auto-Schedule'}</button>
            <button onClick={saveAll} disabled={!dirty || saving} className="px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700 shadow disabled:opacity-50">{saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 shadow flex flex-col gap-2 md:col-span-3">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide">Week Utilization (Capacity / Assigned)</h2>
            <div className="flex overflow-x-auto gap-3 pb-1">
              {weeks.slice(0,weeksVisible).map(w => {
                const cap = capacityMap[w.weekKey] ?? w.capacitySqFt;
                const pct = cap ? Math.min(100, Math.round((w.assignedSqFt / cap) * 100)) : 0;
                return (
                  <div key={w.weekKey} className="min-w-[140px] bg-white border border-slate-200 rounded-lg p-2 flex flex-col gap-1 shadow-sm">
                    <div className="text-[11px] font-semibold text-slate-700">{w.weekKey}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <input type="number" value={capacityMap[w.weekKey] ?? w.capacitySqFt} onChange={e=>editCapacity(w.weekKey, Number(e.target.value)||0)} className="w-16 border rounded px-1 py-0.5 text-[10px]" aria-label="Capacity SqFt" />
                      <span className="text-slate-400">cap</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{w.assignedSqFt.toLocaleString()} / {cap.toLocaleString()}</div>
                    <div className="h-2 rounded bg-slate-100 overflow-hidden"><div className={`h-full ${pct>=95?'bg-rose-500':pct>=75?'bg-amber-500':'bg-emerald-500'}`} style={{ width: pct + '%' }}/></div>
                    <div className="text-[9px] text-slate-400">{w.source}</div>
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
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide">Panels ({panels.length})</h2>
            <div className="border rounded-xl bg-white shadow overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-2 text-left font-semibold">ID</th>
                    <th className="p-2 text-left font-semibold">Seq</th>
                    <th className="p-2 text-left font-semibold">SqFt</th>
                    <th className="p-2 text-left font-semibold">Week</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {panels.map(p => (
                    <tr key={p.id} className="hover:bg-blue-50 cursor-pointer" onClick={()=>movePanel(p.id,1)} title="Click to move one week later (or schedule into first week)">
                      <td className="p-2 font-medium text-slate-800">{p.componentId}</td>
                      <td className="p-2">{p.sequence || '-'}</td>
                      <td className="p-2">{(p.componentsqft||0).toLocaleString()}</td>
                      <td className="p-2 text-[10px] text-slate-500">{p.scheduledWeek || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 px-1">(Click a row to move panel one week later. Autoschedule fills sequential weeks.)</p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide">Schedule Grid</h2>
            <div className="overflow-auto border rounded-xl bg-white shadow p-3">
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${weeksVisible}, minmax(170px,1fr))` }}>
                {weeks.slice(0,weeksVisible).map(w => {
                  const cap = capacityMap[w.weekKey] ?? w.capacitySqFt;
                  const pct = cap ? Math.min(100, Math.round((w.assignedSqFt / cap) * 100)) : 0;
                  return (
                    <div key={w.weekKey} className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <div className="px-2 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b flex flex-col gap-1">
                        <div className="text-[11px] font-semibold text-slate-700">{w.weekKey}</div>
                        <div className="text-[10px] text-slate-500">{w.assignedSqFt.toLocaleString()} / {cap.toLocaleString()}</div>
                        <div className="h-2 rounded bg-slate-200 overflow-hidden"><div className={`h-full ${pct>=95?'bg-rose-500':pct>=75?'bg-amber-500':'bg-emerald-500'}`} style={{ width: pct + '%' }} /></div>
                      </div>
                      <div className="flex flex-col gap-1 p-2 text-[11px] min-h-[180px]">
                        {panels.filter(p => p.scheduledWeek === w.weekKey).map(p => (
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
            <li>Project-specific capacities override global; editing here saves only overrides for this project.</li>
            <li>Future: diff-based save, drag & drop, over-capacity warnings.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
