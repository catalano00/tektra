'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UserRow {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  lastLoginAt?: string | null;
  createdAt: string;
}

const ROLE_OPTIONS = ['ADMIN','PLANNER','ENGINEER','QA','VIEWER','OPERATOR','MANAGER'];

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users,setUsers] = useState<UserRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string | null>(null);
  const [savingId,setSavingId] = useState<string | null>(null);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(()=>{
    if (session && !isAdmin) {
      router.replace('/');
    }
  },[session,isAdmin,router]);

  useEffect(()=>{
    if (!isAdmin) return;
    (async()=>{
      try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) throw new Error('Failed to load users');
        const data = await res.json();
        setUsers(data.users);
      } catch(e:any) {
        setError(e.message || 'Error loading users');
      } finally {
        setLoading(false);
      }
    })();
  },[isAdmin]);

  async function updateRole(id:string,newRole:string){
    setSavingId(id);
    try {
      const res = await fetch('/api/admin/users/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:newRole})});
      if(!res.ok) throw new Error('Update failed');
      setUsers(u=>u.map(x=>x.id===id?{...x,role:newRole}:x));
    } catch(e:any){
      alert(e.message || 'Failed to update role');
    } finally {
      setSavingId(null);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      {loading && <div className="text-gray-500">Loading users...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Last Login</th>
                <th className="text-left px-3 py-2">Created</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u=> (
                <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <td className="px-3 py-2 whitespace-nowrap">{u.name || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{u.email}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <select
                      disabled={savingId===u.id}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs"
                      value={u.role}
                      onChange={e=> updateRole(u.id,e.target.value)}
                    >
                      {ROLE_OPTIONS.map(r=> <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString(): '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {savingId===u.id && <span className="text-blue-500 animate-pulse">Saving...</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-4">Role changes take effect on next sign-in / token refresh.</p>
    </div>
  );
}
