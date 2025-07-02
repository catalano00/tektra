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
} from 'lucide-react';
import Image from 'next/image';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/operator-time', label: 'Operator Panel', icon: <Timer size={18} /> },
  { href: '/project-summaries', label: 'Projects', icon: <Package size={18} /> },
  { href: '/components', label: 'Components', icon: <Boxes size={18} /> },
  { href: '/activity', label: 'Activity Feed', icon: <Activity size={18} /> },
];

const bottomLinks = [
  { href: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  { href: '/help', label: 'Help & Support', icon: <HelpCircle size={18} /> },
  { href: '/profile', label: 'Profile / Login', icon: <User size={18} /> },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className={`bg-gray-900 text-white h-screen p-4 flex flex-col justify-between transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Section */}
      <div>
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <Link href="/">
            <Image
              src={collapsed ? '/tektra-collapsed.png' : '/tektra-logo-dark.png'}
              alt="TEKTRA Logo"
              width={collapsed ? 32 : 120}
              height={32}
            />
          </Link>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center text-gray-400 hover:text-white mt-10"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>

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
      </div>
    </div>
  );
}
