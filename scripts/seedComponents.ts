import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

export async function seedComponentsFromCSV() {
  const filePath = path.join(__dirname, 'seedComponents.csv');
  const components: any[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => components.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  let created = 0;

  for (const row of components) {
    const {
      componentId,
      componentType,
      componentsqft,
      currentStatus,
      nextProcess,
      processStatus,
      percentComplete,
      projectId
    } = row;

    await prisma.component.create({
      data: {
        componentId,
        componentType,
        componentsqft: parseFloat(componentsqft),
        currentStatus,
        nextProcess,
        processStatus,
        percentComplete: parseInt(percentComplete),
        projectId
      }
    });
    console.log(`✅ Created component ${componentId}`);
    created++;
  }

  console.log(`🎉 Done. ${created} components created.`);
}
