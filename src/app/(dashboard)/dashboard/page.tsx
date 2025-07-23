// /app/(dashboard)/dashboard/page.tsx

import DashboardOverview from '@/components/DashboardOverview';

export default function DashboardPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <section className="w-full">
        <DashboardOverview />
      </section>
    </main>
  );
}
