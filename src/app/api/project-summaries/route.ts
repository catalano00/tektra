// app/api/project-summaries/route.ts

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const PROCESS_ORDER = ['Cut', 'Assemble', 'Fly', 'Ship'];

    const projects = await prisma.project.findMany({
      include: {
        components: {
          include: {
            timeEntries: true,
          },
        },
      },
    });

    const summary = projects.map(project => {
      const panels = project.components || [];
      const totalPanels = panels.length;

      let completedCount = 0;
      let inProgressCount = 0;
      let totalCycleTime = 0;
      let aggregatePercent = 0;

      panels.forEach(panel => {
        const entries = panel.timeEntries ?? [];
        const completed = new Set(entries.filter(e => e.status === 'complete').map(e => e.process));

        const isComplete = completed.has('Ship');
        if (isComplete) completedCount++;
        else if (entries.some(e => e.status === 'in progress' || e.status === 'paused')) inProgressCount++;

        const panelTime = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0);
        totalCycleTime += panelTime;

        aggregatePercent += Math.round((completed.size / PROCESS_ORDER.length) * 100);
      });

      const percentComplete = totalPanels > 0 ? Math.round(aggregatePercent / totalPanels) : 0;

      return {
        projectId: project.projectId,
        totalPanels,
        completedCount,
        inProgressCount,
        totalCycleTime,
        percentComplete,
        status: project.currentStatus ?? 'Unknown',
      };
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('❌ Failed to load project summaries:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}