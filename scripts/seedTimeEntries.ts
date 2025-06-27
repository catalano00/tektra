import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

async function seedTimeEntriesFromCSV() {
  const filePath = path.join(__dirname, 'TimeEntry_CLEANED.csv');
  const timeEntries: any[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => timeEntries.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  let created = 0;
  let skipped = 0;

  for (const row of timeEntries) {
    const {
      componentId: humanId,
      warehouse,
      workstation,
      teamLead,
      process,
      duration,
      status
    } = row;

    const component = await prisma.component.findFirst({
      where: { componentId: humanId }
    });

    if (!component) {
      console.warn(`⚠️ Component not found: ${humanId}`);
      skipped++;
      continue;
    }

    await prisma.timeEntry.create({
      data: {
        componentId: component.id,
        componentCode: component.componentId,
        warehouse,
        workstation,
        teamLead,
        process,
        duration: parseInt(duration),
        status
      }
    });

    console.log(`✅ Created time entry for ${humanId}`);
    created++;
  }

  console.log(`🎉 Done. ${created} time entries created. Skipped: ${skipped}`);
}

seedTimeEntriesFromCSV()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
