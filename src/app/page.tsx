'use client'

import { useRouter } from 'next/navigation'
import { LayoutDashboard, Clock, Building2, TimerReset, CheckCircle, Users2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Switch } from '@/components/ui/switch'
import { formatTime } from '@/utils/format'

interface Project {
  projectId: string
  currentStatus: string
  updatedAt: string
  city: string
  state: string
  buildableSqFt?: number
  contractAmount: string
}

interface ActivityEntry {
  teamLead: string
  status: string
  process: string
  componentId: string
  timestamp: string
}

interface Metrics {
  totalProjects?: number
  activeComponents?: number
  completedPanels?: number
  avgCycleTime?: number
}

export default function LandingPage() {
  const router = useRouter()
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([])
  const [metrics, setMetrics] = useState<Metrics>({})
  const [darkMode, setDarkMode] = useState(false)
  
  //const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    fetch('/api/projects/recent?limit=3')
      .then(res => res.json())
      .then(setRecentProjects)

    fetch('/api/metrics/dashboard')
      .then(res => res.json())
      .then(setMetrics)

    fetch('/api/activity?limit=5')
  .then(async res => {
    if (!res.ok) throw new Error('Failed to fetch activity feed');
    const data = await res.json();
    setActivityFeed(Array.isArray(data.activities) ? data.activities : []);
  })
    .catch(err => {
      console.error('Activity feed error:', err);
      setActivityFeed([]);
    });
  }, []); // <-- Close useEffect here
  
    return (
      <main className={`min-h-screen relative flex flex-col items-center justify-center px-4 text-center transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-10 max-w-6xl w-full relative z-10"
        >
        {/* Logo and dark mode toggle */}
        <div className="flex justify-between items-center w-full mt-4">
          <Image
            src={darkMode ? "/tektra-logo-dark.png" : "/tektra-logo.png"}
            alt="TEKTRA Logo"
            width={180}
            height={50}
            className="transition duration-300 hover:scale-105"
            priority
          />
          <div className="flex items-center gap-2">
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center">Welcome to TEKTRA</h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-xl font-medium max-w-2xl mx-auto"
        >
          Precision-built systems for precision-built homes. TEKTRA’s manufacturing intelligence platform powers modern off-site construction — one panel at a time.
        </motion.p>

        {/* Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-left w-full rounded-xl p-6 shadow-md backdrop-blur-md bg-white/80 dark:bg-gray-800/70">
          <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-[#1B9CFF]" /><strong>Projects:</strong> {metrics.totalProjects ?? '-'}</div>
          <div className="flex items-center gap-2"><Users2 className="w-4 h-4 text-[#1B9CFF]" /><strong>Active:</strong> {metrics.activeComponents ?? '-'}</div>
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><strong>Panels:</strong> {metrics.completedPanels ?? '-'}</div>
          <div className="flex items-center gap-2"><TimerReset className="w-4 h-4 text-yellow-600" /><strong>Avg Cycle:</strong> {metrics.avgCycleTime != null ? formatTime(metrics.avgCycleTime) : '-'}</div>
        </div>

        {/* Main navigation buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          <button
            onClick={() => router.push('/project-summaries')}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-slate-700 text-white hover:bg-slate-500 transition shadow-lg"
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="font-semibold text-lg">Project Summary</span>
          </button>

          <button
            onClick={() => router.push('/operator-time')}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-slate-700 text-white hover:bg-slate-500 transition shadow-lg"
          >
            <Clock className="w-6 h-6" />
            <span className="font-semibold text-lg">Operator Panel</span>
          </button>
        </motion.div>

        {/* Recent Projects */}
        <ul className="space-y-2 text-left">
          {recentProjects.length > 0 ? recentProjects.map(p => (
            <li
              key={p.projectId}
              className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => router.push(`/project/${p.projectId}?filter=all`)}
            >
              <div className="font-semibold">{p.projectId}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Status: {p.currentStatus} · Last updated: {new Date(p.updatedAt).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {p.city}, {p.state} · {p.buildableSqFt ?? '-'} sq ft · ${Number(p.contractAmount).toLocaleString()}
              </div>
            </li>
          )) : (
            <li className="text-sm text-gray-500 dark:text-gray-400">No recent projects.</li>
          )}
        </ul>

        {/* Activity Feed */}
        <div className="mt-10 text-left w-full">
          <h2 className="text-xl font-bold mb-2">Recent Operator Activity</h2>
          <ul className="space-y-2">
            {activityFeed.length > 0 ? activityFeed.map(entry => (
              <li key={`${entry.componentId}-${entry.timestamp}`} className="text-sm text-gray-700 dark:text-gray-300">
                {entry.teamLead} {entry.status} <strong>{entry.process}</strong> on <strong>{entry.componentId}</strong> (
                {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Invalid Date'})
              </li>
            )) : <li className="text-sm text-gray-500 dark:text-gray-400">No recent activity.</li>}
          </ul>
        </div>

        <p className="text-xs text-gray-400 mt-10">Version 1.0 · Built for TEKTRA Manufacturing · © {new Date().getFullYear()}</p>
      </motion.div>
    </main>
  )
}