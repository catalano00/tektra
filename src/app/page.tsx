import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-center">TEKTRA Manufacturing System</h1>

      <div className="grid gap-6 w-full max-w-md">
        <Link
          href="/projects/new"
          className="block bg-blue-600 text-white text-center py-4 px-6 rounded-xl shadow hover:bg-blue-700 transition"
        >
          ➕ Create New Project
        </Link>
        <Link
          href="/components"
          className="block bg-green-600 text-white text-center py-4 px-6 rounded-xl shadow hover:bg-green-700 transition"
        >
          🔍 Browse Components
        </Link>
        <Link
          href="/operator-time"
          className="block bg-yellow-500 text-white text-center py-4 px-6 rounded-xl shadow hover:bg-yellow-600 transition"
        >
          🕒 Operator Time Entry
        </Link>
      </div>
    </main>
  )
}