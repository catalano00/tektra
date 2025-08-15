'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Timer,
  Activity,
  Menu,
  X,
  Settings,
  HelpCircle,
  User, // single user icon (kept for login/logout button)
  LogOut,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  Users as UsersIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';

// Define links with optional role gating. Omit allowedRoles => visible to all authenticated users.
interface NavLink { href: string; label: string; icon: React.ReactNode; allowedRoles?: string[] }
const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> }, // all roles
  { href: '/operator-time', label: 'Operator Panel', icon: <Timer size={18} />, allowedRoles: ['ADMIN','OPERATOR','MANAGER'] },
  { href: '/project-summaries', label: 'Projects', icon: <Package size={18} /> }, // all roles
  { href: '/components', label: 'Components', icon: <Boxes size={18} /> }, // all roles
  { href: '/sales', label: 'Sales', icon: <TrendingUp size={18} />, allowedRoles: ['ADMIN','MANAGER'] },
  { href: '/activity', label: 'Activity Feed', icon: <Activity size={18} />, allowedRoles: ['ADMIN'] },
  { href: '/quality-issue-summaries', label: 'Quality', icon: <AlertTriangle size={18} />, allowedRoles: ['ADMIN','OPERATOR','MANAGER','QA'] },
  { href: '/production-planning', label: 'Production Planning', icon: <ClipboardList size={18} />, allowedRoles: ['ADMIN','PLANNER','MANAGER'] },
  { href: '/production-planning/data-review', label: 'Data Review', icon: <ClipboardList size={18} />, allowedRoles: ['ADMIN','ENGINEER','MANAGER'] },
];

const bottomLinks = [
  { href: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  { href: '/help', label: 'Help & Support', icon: <HelpCircle size={18} /> },
];

type SidebarProps = {
  collapsed: boolean;
  setCollapsedAction: (collapsed: boolean) => void;
};

export default function Sidebar({ collapsed, setCollapsedAction }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userEmail = session?.user?.email || '';
  const userRole = (session?.user as any)?.role as string | undefined;
  const userName = (session?.user as any)?.name as string | undefined;
  const initials = (userName || userEmail || '?').split(/[@\s]/).filter(Boolean).slice(0,2).map(s=>s[0]?.toUpperCase()).join('');

  // Filter links based on role
  const filteredLinks = navLinks.filter(l => !l.allowedRoles || (userRole && l.allowedRoles.includes(userRole)));
  if (userRole === 'ADMIN') {
    filteredLinks.push({ href: '/admin/users', label: 'Users', icon: <UsersIcon size={18} /> });
    filteredLinks.push({ href: '/admin/feature-permissions', label: 'Role Access', icon: <UsersIcon size={18} /> });
  }
  const showAuthedNav = !!session;
  const bottomLinksToRender = session ? bottomLinks : bottomLinks.filter(l => l.href === '/help');

  return (
    <div
      className={`fixed top-0 left-0 bg-gray-900 text-white h-screen p-4 flex flex-col justify-between transition-all duration-300 ease-in-out z-40 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Section */}
      <div>
        {/* Logo */}
        <div className="flex items-center justify-center mb-6 transition-all duration-300">
          <Link href="/">
            <Image
              src={collapsed ? '/tektra-collapsed.png' : '/tektra-logo-dark.png'}
              alt="TEKTRA Logo"
              width={collapsed ? 32 : 120}
              height={32}
            />
          </Link>
        </div>

        {/* Navigation */}
        {showAuthedNav && (
          <nav className="space-y-2">
            {filteredLinks.map(({ href, label, icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm hover:bg-gray-800 transition ${
                    isActive ? 'bg-gray-800 text-white' : 'text-gray-400'
                  }`}
                  title={collapsed ? label : ''}
                >
                  <span>{icon}</span>
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Bottom Section */}
      <div className="space-y-2">
        {bottomLinksToRender.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm hover:bg-gray-800 text-gray-400"
            title={collapsed ? label : ''}
          >
            <span>{icon}</span>
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}

        {/* Session User Summary */}
        {session && (
          <div className={`mt-2 px-3 py-2 rounded-md bg-gray-800/60 text-xs flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}
               title={collapsed ? (userEmail || 'User') : ''}>
            <div className="flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold h-8 w-8 text-sm">
              {initials || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium text-gray-100 text-[11px]">{userName || userEmail}</div>
                <div className="flex items-center space-x-1 mt-0.5">
                  {userRole && <span className="px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 text-[10px] uppercase tracking-wide font-semibold">{userRole}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile/Login */}
        {session ? (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm hover:bg-gray-800 text-gray-400 w-full text-left"
            title={collapsed ? 'Log out' : ''}
          >
            <span><LogOut size={18} /></span>
            {!collapsed && <span>Log out</span>}
          </button>
        ) : (
          <Link
            href="/login"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm hover:bg-gray-800 text-gray-400"
            title={collapsed ? 'Login' : ''}
          >
            <span><User size={18} /></span>
            {!collapsed && <span>Login</span>}
          </Link>
        )}

        {/* Collapse Toggle */}
        <div className="mt-6 pt-4 border-t border-gray-700 flex justify-center">
          <button
            onClick={() => setCollapsedAction(!collapsed)}
            className="text-gray-400 hover:text-white transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
