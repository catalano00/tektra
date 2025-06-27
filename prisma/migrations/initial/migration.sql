-- CreateEnum
CREATE TYPE "Process" AS ENUM ('Cut', 'Assemble', 'Fly', 'Ship');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'complete', 'paused');

-- CreateTable
CREATE TABLE "projects" (
    "currentStatus" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "streetaddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipcode" INTEGER NOT NULL,
    "contractAmount" DECIMAL(15,2) NOT NULL,
    "contingency" DECIMAL(15,2) NOT NULL,
    "totalContract" DECIMAL(15,2) NOT NULL,
    "buildableSqFt" INTEGER,
    "estimatedPanelSqFt" INTEGER,
    "expectedDrawingStart" TIMESTAMP(3),
    "expectedProductionStart" TIMESTAMP(3),
    "expectedProductionCompletion" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "warehouse" TEXT NOT NULL,
    "workstation" TEXT NOT NULL,
    "teamLead" TEXT NOT NULL,
    "process" "Process" NOT NULL,
    "status" "Status" NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "lastCompletedProcess" TEXT,
    "nextProcess" TEXT,
    "processStatus" TEXT,
    "percentComplete" INTEGER,
    "completedAt" TIMESTAMP(3),
    "designUrl" TEXT,
    "workstation" TEXT,
    "teamLead" TEXT,
    "dateshipped" TIMESTAMP(3),
    "datedelivered" TIMESTAMP(3),
    "componentsqft" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "cutLength" TEXT NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sheathing" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "panelArea" TEXT NOT NULL,
    "panelCount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Sheathing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_componentId_process_key" ON "TimeEntry"("componentId", "process");

-- CreateIndex
CREATE UNIQUE INDEX "Sheathing_componentId_key" ON "Sheathing"("componentId");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sheathing" ADD CONSTRAINT "Sheathing_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

