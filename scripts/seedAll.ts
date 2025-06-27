import { seedProjects } from './seedProjects';
import { seedComponents } from './seedComponents';
import { seedLegacyTimeEntries } from './seedLegacyTimeEntries';

async function runAll() {
  console.log('🔁 Starting full seed process...\n');

  await seedProjects();
  await seedComponents();
  await seedLegacyTimeEntries();

  console.log('\n✅ All seeding complete!');
}

runAll().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
