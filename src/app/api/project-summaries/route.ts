import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// ✅ Zod Schemas for validation
const TimeEntrySchema = z.object({
  process: z.string(),
  status: z.string(),
  duration: z.number().optional(),
});

const ComponentSchema = z.object({
  currentStatus: z.string(),
  timeEntries: z.array(TimeEntrySchema),
});

const ProjectSchema = z.object({
  projectId: z.string(),
  currentStatus: z.string(),
  components: z.array(ComponentSchema),
});

const ProjectListSchema = z.array(ProjectSchema);

// ✅ Main GET handler
export async function GET() {
  try {
    const projectsRaw = await prisma.project.findMany({
      select: {
        projectId: true,
        currentStatus: true,
        components: {
          select: {
            currentStatus: true,
            timeEntries: {
              select: {
                process: true,
                status: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    // ✅ Validate structure
    const validation = ProjectListSchema.safeParse(projectsRaw);
    if (!validation.success) {
      console.error('❌ Zod validation failed for project summaries:', validation.error.format());
      return NextResponse.json(
        {
          error: 'Malformed data from database',
          issues: validation.error.format(),
        },
        { status: 500 }
      );
    }

    const projects = validation.data;

    // ✅ Compute summaries safely
    const summaries = projects.map((project) => {
      const { projectId, components, currentStatus } = project;
      const totalPanels = components.length;

      const completedCount = components.filter(
        (c) => c.currentStatus === 'Delivered'
      ).length;

      const inProgressCount = components.filter((c) => {
        return (
          !c.timeEntries.some(
            (te) => te.process === 'Ship' && te.status === 'complete'
          ) &&
          c.timeEntries.some((te) => te.status === 'pending')
        );
      }).length;

      const totalCycleTime = components.reduce((sum, c) => {
        const componentCycleTime = c.timeEntries.reduce(
          (innerSum, te) => innerSum + (te.duration || 0),
          0
        );
        return sum + componentCycleTime;
      }, 0);

      const percentComplete =
        totalPanels > 0
          ? Math.round((completedCount / totalPanels) * 100)
          : 0;

      return {
        projectId,
        totalPanels,
        completedCount,
        inProgressCount,
        totalCycleTime,
        percentComplete,
        status: currentStatus,
      };
    });

    // ✅ Optionally enable caching (uncomment if using static regeneration)
    // return NextResponse.json(summaries, {
    //   status: 200,
    //   headers: {
    //     'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    //   },
    // });

    return NextResponse.json(summaries);
  } catch (error) {
    console.error('❌ Unexpected error in /api/v1/project-summaries:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}