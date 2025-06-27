import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface Component {
  projectId: string;
  [key: string]: any;
}

async function main() {
  const filePath = path.join(__dirname, 'components.json');
  const fileData = fs.readFileSync(filePath, 'utf-8');
  const components: Component[] = JSON.parse(fileData);

  const allProjects = await prisma.project.findMany({ select: { projectId: true } });
  const validIds = new Set(allProjects.map(p => p.projectId));

  const invalidComponents = components.filter((comp: Component) => !validIds.has(comp.projectId));

  if (invalidComponents.length === 0) {
    console.log('✅ All components reference valid project IDs.');
  } else {
    console.error('❌ Invalid project IDs found in components:');
    invalidComponents.forEach((comp: Component) => {
      console.error(`- componentId: ${comp.id}, invalid projectId: ${comp.projectId}`);
    });
    process.exit(1);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
// This script checks that all components reference valid project IDs in the database.