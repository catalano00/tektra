import { seedProjects } from './seedProjects'
//import { seedComponents } from './seedComponents'
import { seedLegacyTimeEntries } from './seedLegacyTimeEntries'

async function main() {
  await seedProjects()
  //await seedComponents()
  await seedLegacyTimeEntries()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})