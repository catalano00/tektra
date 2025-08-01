'use client';

import { useState } from 'react';
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
  User,
  LogOut,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/operator-time', label: 'Operator Panel', icon: <Timer size={18} /> },
  { href: '/project-summaries', label: 'Projects', icon: <Package size={18} /> },
  { href: '/components', label: 'Components', icon: <Boxes size={18} /> },
  { href: '/activity', label: 'Activity Feed', icon: <Activity size={18} /> },
  { href: '/quality-issue-summaries', label: 'Quality', icon: <AlertTriangle size={18} /> },
  { href: '/production-planning', label: 'Production Planning', icon: <ClipboardList size={18} /> },
];

const bottomLinks = [
  { href: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  { href: '/help', label: 'Help & Support', icon: <HelpCircle size={18} /> },
];

type SidebarProps = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

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
        <nav className="space-y-2">
          {links.map(({ href, label, icon }) => {
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
      </div>

      {/* Bottom Section */}
      <div className="space-y-2">
        {bottomLinks.map(({ href, label, icon }) => (
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

        {/* Profile/Login */}
        {session ? (
          <button
            onClick={() => signOut()}
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
            onClick={() => setCollapsed(!collapsed)}
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
