import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  let project = await prisma.project.findFirst({
  where: { name: 'Main House' },
})

if (!project) {
  project = await prisma.project.create({
    data: {
      name: 'Main House',
      client: "TEKTRA Example",
    },
  })
}

  // List of components with "Wall Panel" in their name (from Sheet List)
  const components = [
    { id: 'W.G-1', type: 'Interior Wall', status: 'Planned' },
    { id: 'W.G-2', type: 'Interior Wall', status: 'Planned' },
    { id: 'W.G-3', type: 'Interior Wall', status: 'Planned' },
    { id: 'W.G-4', type: 'Interior Wall', status: 'Planned' },
    { id: 'W.G-5', type: 'Interior Wall', status: 'Planned' },
    { id: 'W.G-6', type: 'Interior Wall', status: 'Planned' },
    { id: 'W.G-7', type: 'Interior Wall', status: 'Planned' },
    { id: 'W.G-8', type: 'Interior Wall', status: 'Planned' },
    { id: 'W.G-9', type: 'Interior Wall', status: 'Planned' },
    { id: 'W.S-1', type: 'Exterior Wall', status: 'Released for Manufacturing' },
    { id: 'W.S-2', type: 'Exterior Wall', status: 'Released for Manufacturing' },
    { id: 'W.S-3', type: 'Exterior Wall', status: 'Released for Manufacturing' },
    { id: 'W.S-4', type: 'Exterior Wall', status: 'Released for Manufacturing' },
  ]

  for (const c of components) {
    const component = await prisma.component.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        componentType: c.type,
        currentStatus: c.status,
        designUrl: `https://example.com/drawings/${c.id}.pdf`,
        projectId: project.id,
      },
    })

    // Add dummy parts (simulate Assembly Part List)
    await prisma.part.createMany({
      data: [
        {
          componentId: component.id,
          label: '2x6 SPF Stud',
          size: '92-5/8"',
          count: 25,
          cutLength: '92-5/8"',
        },
        {
          componentId: component.id,
          label: 'Top Plate',
          size: '2x6x120"',
          count: 2,
          cutLength: '120"',
        },
      ],
      skipDuplicates: true,
    })

    // Add dummy sheathing record
    await prisma.sheathing.upsert({
      where: { componentId: component.id },
      update: {},
      create: {
        componentId: component.id,
        panelArea: '80 sqft',
        panelCount: 2.5,
      },
    })
  }

  console.log('✅ Full seed: components, parts, and sheathing added')
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())