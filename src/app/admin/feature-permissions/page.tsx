'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Permission { id: string; feature: string; role: string; allowed: boolean }
interface Matrix { [feature: string]: { [role: string]: boolean } }

const ROLES = ['ADMIN','PLANNER','ENGINEER','QA','VIEWER','OPERATOR','MANAGER'];
const FEATURE_LABELS: Record<string,string> = {
  dashboard: 'Dashboard',
  operatorPanel: 'Operator Panel',
  projects: 'Projects',
  components: 'Components',
  sales: 'Sales',
  activity: 'Activity Feed',
  quality: 'Quality',
  productionPlanning: 'Production Planning',
  dataReview: 'Data Review',
  usersAdmin: 'User Admin'
};

export default function FeaturePermissionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [matrix,setMatrix] = useState<Matrix>({});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [saving,setSaving] = useState<string|null>(null);
  const [features,setFeatures] = useState<string[]>([]);

  useEffect(()=>{ if(session && !isAdmin) router.replace('/'); },[session,isAdmin,router]);

  useEffect(()=>{ if(!isAdmin) return; (async()=>{
    try {
      const res = await fetch('/api/admin/feature-permissions');
      if(!res.ok) throw new Error('Load failed');
      const data = await res.json();
      const m: Matrix = {};
      data.features.forEach((f:string)=> { m[f] = {}; ROLES.forEach(r=> m[f][r] = true); });
      data.permissions.forEach((p:Permission)=> { m[p.feature] ||= {}; m[p.feature][p.role] = p.allowed; });
      setMatrix(m); setFeatures(data.features);
    } catch(e:any){ setError(e.message); } finally { setLoading(false); }
  })(); },[isAdmin]);

  async function toggle(feature:string, role:string){
    const current = matrix[feature][role];
    setMatrix(m=> ({...m, [feature]: { ...m[feature], [role]: !current }}));
    setSaving(feature+role);
    try {
      await fetch('/api/admin/feature-permissions',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ feature, role, allowed: !current })});
    } catch { /* revert? simplified */ }
    setSaving(null);
  }

  if (!isAdmin) return null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Role Feature Access</h1>
      <p className="text-sm text-gray-500 mb-4">Toggle feature visibility / access per role. (Default = allowed)</p>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">Feature</th>
                {ROLES.map(r=> <th key={r} className="px-2 py-2 text-center">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {features.map(f => (
                <tr key={f} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{FEATURE_LABELS[f] || f}</td>
                  {ROLES.map(r=> {
                    const k = f+r;
                    const enabled = matrix[f]?.[r];
                    return (
                      <td key={k} className="px-2 py-1 text-center">
                        <button
                          onClick={()=>toggle(f,r)}
                          className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-semibold border transition ${enabled? 'bg-green-500/20 border-green-500 text-green-600':'bg-red-500/20 border-red-500 text-red-600'}`}
                          disabled={!!saving}
                          title={enabled? 'Allowed':'Blocked'}
                        >{enabled? '✔':'✕'}</button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
