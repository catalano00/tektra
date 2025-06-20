'use client'

import { useRouter } from 'next/navigation'
import { Plus, LayoutDashboard, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function LandingPage() {
  const router = useRouter()
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [activityFeed, setActivityFeed] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({})
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    fetch('/api/projects?limit=3')
      .then(res => res.json())
      .then(setRecentProjects)

    fetch('/api/metrics/dashboard')
      .then(res => res.json())
      .then(setMetrics)

    fetch('/api/activity?limit=5')
      .then(res => res.json())
      .then(setActivityFeed)
  }, [])

  return (
    <main className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 to-white text-gray-900'} flex flex-col items-center justify-center px-4 text-center`}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-6 max-w-3xl"
      >
        <div className="flex justify-between items-center w-full">
          {darkMode ? (
            <Image src="/tektra-logo-dark.png" alt="TEKTRA Logo" width={180} height={60} />
          ) : (
            <Image src="/tektra-logo.png" alt="TEKTRA Logo" width={180} height={60} />
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="text-sm px-3 py-1 rounded border border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        <p className="text-lg">
          A powerful system for managing off-site construction — from project creation to operator time tracking.
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm text-left w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
          <div><strong>Total Projects:</strong> {metrics.totalProjects ?? '-'}</div>
          <div><strong>Active Components:</strong> {metrics.activeComponents ?? '-'}</div>
          <div><strong>Completed Panels:</strong> {metrics.completedPanels ?? '-'}</div>
          <div><strong>Avg. Cycle Time:</strong> {metrics.avgCycleTime ? `${metrics.avgCycleTime} min` : '-'}</div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          <button
            onClick={() => router.push('/projects/new')}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg"
          >
            <Plus className="w-6 h-6" />
            <span className="font-semibold text-lg">New Project</span>
          </button>

          <button
            onClick={() => router.push('/projects/summary')}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-green-600 text-white hover:bg-green-700 transition shadow-lg"
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="font-semibold text-lg">Project Summary</span>
          </button>

          <button
            onClick={() => router.push('/operator-time')}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-yellow-500 text-white hover:bg-yellow-600 transition shadow-lg"
          >
            <Clock className="w-6 h-6" />
            <span className="font-semibold text-lg">Operator Entry</span>
          </button>
        </motion.div>

        <div className="mt-10 text-left w-full">
          <h2 className="text-xl font-bold mb-2">Recent Projects</h2>
          <ul className="space-y-2">
            {recentProjects.length > 0 ? recentProjects.map(p => (
              <li
                key={p.id}
                className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => router.push(`/projects/${p.id}`)}
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</div>
              </li>
            )) : <li className="text-sm text-gray-500">No recent projects.</li>}
          </ul>
        </div>

        <div className="mt-10 text-left w-full">
          <h2 className="text-xl font-bold mb-2">Recent Operator Activity</h2>
          <ul className="space-y-2">
            {activityFeed.length > 0 ? activityFeed.map((entry, index) => (
              <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                {entry.teamLead} {entry.status} <strong>{entry.process}</strong> on <strong>{entry.componentId}</strong> ({new Date(entry.timestamp).toLocaleTimeString()})
              </li>
            )) : <li className="text-sm text-gray-500">No recent activity.</li>}
          </ul>
        </div>

        <p className="text-xs text-gray-400 mt-10">Version 1.0 · Built for TEKTRA Manufacturing · © {new Date().getFullYear()}</p>
      </motion.div>
    </main>
  )
}
// This is the main landing page for the TEKTRA app, showcasing recent projects, metrics, and quick actions.