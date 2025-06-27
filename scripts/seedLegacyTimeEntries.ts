import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

async function seedTimeEntriesFromCSV() {
  const filePath = path.join(__dirname, 'TimeEntry.csv');
  const entries: any[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => entries.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  let created = 0;

  for (const row of entries) {
    const {
      componentId,
      warehouse,
      workstation,
      teamLead,
      process,
      duration,
      createAt,
      status,
      updatedAt
    } = row;

    const component = await prisma.component.findFirst({
      where: { componentId }
    });

    if (!component) {
      console.warn(`⚠️ Component not found: ${componentId}`);
      continue;
    }

    await prisma.timeEntry.create({
      data: {
        componentId: component.id,
        warehouse,
        workstation: workstation || null,
        teamLead: teamLead || null,
        process,
        duration: parseFloat(duration),
        createdAt: new Date(createAt),
        status,
        updatedAt: new Date(updatedAt)
      }
    });

    console.log(`✅ Created time entry for ${componentId}`);
    created++;
  }

  console.log(`🎉 Done. ${created} time entries created.`);
}

seedTimeEntriesFromCSV()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());