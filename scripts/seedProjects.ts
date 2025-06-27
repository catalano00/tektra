import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const projects = [
    { projectId: `TEK-002-GAMMILL`, currentStatus: "Complete", client: `Peak3 LTD`, streetaddress: `567 Saddleback Rd`, city: `Carbondale`, state: `CO`, zipcode: 81623, contractAmount: 1097392.61, contingency: 109739.26, totalContract: 1207131.87 },
    { projectId: `TEK-004-BURGHER325HLND`, currentStatus: "Complete", client: `Peak3 LTD`, streetaddress: `325 Holland Hills Rd`, city: `Basalt`, state: `CO`, zipcode: 81621, contractAmount: 1808969.44, contingency: 180896.94, totalContract: 1989866.38 },
    { projectId: `TEK-006-STEWART265`, currentStatus: "Planned", client: `Peak3 LTD`, streetaddress: `265 North Fork Spur`, city: `Meredith`, state: `CO`, zipcode: 81642, contractAmount: 561111.0, contingency: 56111.1, totalContract: 617222.1, buildableSqFt: 2000, estimatedPanelSqFt: 6000, expectedDrawingStart: new Date("2025-07-01"), expectedProductionStart: new Date("2025-10-01"), expectedProductionCompletion: new Date("2025-11-15"), notes: `only framing, roof trusses` },
    { projectId: `TEK-015-ASPENGLENSD-2`, currentStatus: "Complete", client: `Peak3 LTD`, streetaddress: `928 Bald Eagle Way`, city: `Carbondale`, state: `CO`, zipcode: 81623, contractAmount: 1150440.75, contingency: 115044.08, totalContract: 1265484.83 },
    { projectId: `TEK-016-ASPENGLENSD-3`, currentStatus: "Planned", client: `Peak3 LTD`, streetaddress: `956 Bald Eagle Way`, city: `Carbondale`, state: `CO`, zipcode: 81623, contractAmount: 907200.0, contingency: 90720.0, totalContract: 997920.0, buildableSqFt: 3150, estimatedPanelSqFt: 9450, expectedDrawingStart: new Date("2025-08-15"), expectedProductionStart: new Date("2025-12-15"), expectedProductionCompletion: new Date("2026-02-01"), notes: `includes more than just framing` },
    { projectId: `TEK-017-ASPENGLENSD-4`, currentStatus: "Planned", client: `Peak3 LTD`, streetaddress: `988 Bald Eagle Way`, city: `Carbondale`, state: `CO`, zipcode: 81623, contractAmount: 1150440.75, contingency: 115044.08, totalContract: 1265484.83, buildableSqFt: 3800, estimatedPanelSqFt: 13300, expectedDrawingStart: new Date("2025-07-15"), expectedProductionStart: new Date("2025-09-15"), expectedProductionCompletion: new Date("2025-11-01"), notes: `includes more than just framing` },
    { projectId: `TEK-018-ASPENGLENSD-5`, currentStatus: "Complete", client: `Peak3 LTD`, streetaddress: `1014 Bald Eagle Way`, city: `Carbondale`, state: `CO`, zipcode: 81623, contractAmount: 1150776.53, contingency: 115077.65, totalContract: 1265854.18 },
    { projectId: `TEK-019-ASPENGLENSD-6`, currentStatus: "Complete", client: `Peak3 LTD`, streetaddress: `1042 Bald Eagle Way`, city: `Carbondale`, state: `CO`, zipcode: 81623, contractAmount: 1134610.05, contingency: 113461.01, totalContract: 1248071.06 },
    { projectId: `TEK-028-CHAROUHIS`, currentStatus: "In Production", client: `Peak3 LTD`, streetaddress: `551 W Buttermilk Rd`, city: `Aspen`, state: `CO`, zipcode: 81611, contractAmount: 3137198.61, contingency: 313719.86, totalContract: 3450918.47 },
    { projectId: `TEK-030-STONEFLY132`, currentStatus: "Planned", client: `Peak3 LTD`, streetaddress: ``, city: ``, state: `CO`, zipcode: 81621, contractAmount: 1200000.0, contingency: 120000.0, totalContract: 1320000.0, buildableSqFt: 7400, estimatedPanelSqFt: 25900, expectedDrawingStart: new Date("2025-08-01"), expectedProductionStart: new Date("2025-09-01"), expectedProductionCompletion: new Date("2025-11-01"), notes: `includes more than just framing` },
    { projectId: `TEK-031-VANDYKE`, currentStatus: "Planned", client: `Peak3 LTD`, streetaddress: ``, city: ``, state: `CO`, zipcode: 81621, contractAmount: 1012500.0, contingency: 101250.0, totalContract: 1113750.0, buildableSqFt: 4500, estimatedPanelSqFt: 20250, expectedDrawingStart: new Date("2026-02-01"), expectedProductionStart: new Date("2026-03-15"), expectedProductionCompletion: new Date("2026-05-01"), notes: `only framing, includes roof panels` },
    { projectId: `TEK-032-WOODROW`, currentStatus: "Planned", client: `Peak3 LTD`, streetaddress: ``, city: ``, state: `CO`, zipcode: 81621, contractAmount: 300000.0, contingency: 30000.0, totalContract: 330000.0, buildableSqFt: 2000, estimatedPanelSqFt: 9000, expectedDrawingStart: new Date("2026-03-01"), expectedProductionStart: new Date("2026-04-01"), expectedProductionCompletion: new Date("2026-05-15"), notes: `only framing, roof trusses` },
    { projectId: `TEK-033-CAMELVALLEY`, currentStatus: "Planned", client: `Fortenberry & Rick's`, streetaddress: `52 Pilot Knob Ln.`, city: `Telluride`, state: `CO`, zipcode: 81435, contractAmount: 262212.42, contingency: 26221.24, totalContract: 288433.66, buildableSqFt: 800, estimatedPanelSqFt: 2400, expectedDrawingStart: new Date("2025-06-07"), expectedProductionStart: new Date("2025-08-01"), expectedProductionCompletion: new Date("2025-09-06"), notes: `only framing, roof trusses` },
    { projectId: `TEK-034-WHISPERINGWINDSCT`, currentStatus: "Planned", client: `Fortenberry & Rick's`, streetaddress: `4529 County Rd 5`, city: `Ridgeway`, state: `CO`, zipcode: 81432, contractAmount: 10048379.9, contingency: 1004837.99, totalContract: 11053217.89, buildableSqFt: 36534, estimatedPanelSqFt: 109602, expectedProductionStart: new Date("2025-12-01"), expectedProductionCompletion: new Date("2026-04-01"), notes: `includes foundations, siding, windows, dry-in` },
    { projectId: `TEK-035-WHISPERINGWINDSMAIN`, currentStatus: "Planned", client: `Fortenberry & Rick's`, streetaddress: ``, city: `Telluride`, state: `CO`, zipcode: 81435, contractAmount: 7150000.0, contingency: 715000.0, totalContract: 7865000.0, buildableSqFt: 20000, estimatedPanelSqFt: 60000, expectedDrawingStart: new Date("2025-05-01"), expectedProductionStart: new Date("2025-07-15"), expectedProductionCompletion: new Date("2025-12-01"), notes: `complex roof panels, no floors` },
    { projectId: `TEK-036-INGRAM`, currentStatus: "Planned", client: `Peak3 LTD`, streetaddress: `Lot 51 Elk Creek Ranch`, city: `Rio Blanco`, state: `CO`, zipcode: 81648, contractAmount: 1050000.0, contingency: 105000.0, totalContract: 1155000.0, buildableSqFt: 7000, estimatedPanelSqFt: 24500, expectedDrawingStart: new Date("2025-09-01"), expectedProductionStart: new Date("2025-10-15"), expectedProductionCompletion: new Date("2025-12-15"), notes: `only framing, roof trusses` },
    { projectId: `TEK-037-BREEDLOVE`, currentStatus: "Planned", client: `Fortenberry & Rick's`, streetaddress: `Lot 9 Sunnyside Ranch`, city: `Telluride`, state: `CO`, zipcode: 81432, contractAmount: 1811250.0, contingency: 181125.0, totalContract: 1992375.0, buildableSqFt: 8050, estimatedPanelSqFt: 36225, expectedDrawingStart: new Date("2025-09-01"), expectedProductionStart: new Date("2025-10-15"), expectedProductionCompletion: new Date("2025-12-15"), notes: `only framing, includes roof panels` }
  ]

  for (const data of projects) {
    await prisma.project.create({ data })
  }
}

main()
  .then(() => console.log("✅ Seed complete."))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
