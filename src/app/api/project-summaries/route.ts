import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      select: {
        projectId: true,
        currentStatus: true,
        components: {
          select: {
            timeEntries: true,
            currentStatus: true
          },
        },
      },
    });

    const summaries = projects.map(project => {
      const { projectId, components, currentStatus } = project;
      const totalPanels = components.length;

    const completedCount = components.filter(c =>
      c.currentStatus === 'Delivered'
    ).length;

      const inProgressCount = components.filter(c =>
        !c.timeEntries.some(te => te.process === 'Ship' && te.status === 'complete') &&
        c.timeEntries.some(te => te.status === 'pending')
      ).length;

      const totalCycleTime = components.reduce((sum, c) => {
        const componentCycleTime = c.timeEntries.reduce(
          (innerSum, te) => innerSum + (te.duration || 0),
          0
        );
        return sum + componentCycleTime;
      }, 0);

      const percentComplete = totalPanels > 0
        ? Math.round((completedCount / totalPanels) * 100)
        : 0;

      return {
        projectId,
        totalPanels,
        completedCount,
        inProgressCount,
        totalCycleTime,
        percentComplete,
        status: currentStatus, // ✅ use project.currentStatus here
      };
    });

    return NextResponse.json(summaries);
  } catch (error) {
    console.error('Error generating project summaries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
