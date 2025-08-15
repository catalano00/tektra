-- CreateEnum
CREATE TYPE "Process" AS ENUM ('Cut', 'Assemble', 'Fly', 'Ship');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'complete', 'paused');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PLANNER', 'ENGINEER', 'QA', 'VIEWER');

-- CreateTable
CREATE TABLE "projects" (
    "currentStatus" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "componentCode" TEXT,
    "process" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "teamLead" TEXT,
    "workstation" TEXT,
    "warehouse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "percentComplete" INTEGER NOT NULL,
    "processStatus" TEXT,
    "lastCompletedProcess" TEXT,
    "nextProcess" TEXT,
    "designUrl" TEXT,
    "componentsqft" DOUBLE PRECISION,
    "teamLead" TEXT,
    "workstation" TEXT,
    "completedAt" TIMESTAMP(3),
    "datedelivered" TIMESTAMP(3),
    "dateshipped" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "maxWidth" TEXT,
    "maxHeight" TEXT,
    "Level" TEXT,
    "weight" DOUBLE PRECISION,
    "sequence" TEXT,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "cutLength" TEXT NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sheathing" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "panelArea" TEXT NOT NULL,
    "count" DOUBLE PRECISION NOT NULL,
    "description" TEXT,

    CONSTRAINT "Sheathing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connectors" (
    "id" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "Connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FramingTL" (
    "id" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "ftype" TEXT NOT NULL,
    "totalLength" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "FramingTL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityIssue" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "issueCode" TEXT NOT NULL,
    "engineeringAction" TEXT,
    "notes" TEXT,
    "training" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StagingData" (
    "id" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "StagingData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentSchedule" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectWeekCapacity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "weekKey" TEXT NOT NULL,
    "capacitySqFt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWeekCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "image" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_componentId_process_key" ON "TimeEntry"("componentId", "process");

-- CreateIndex
CREATE UNIQUE INDEX "Component_projectId_componentId_key" ON "Component"("projectId", "componentId");

-- CreateIndex
CREATE UNIQUE INDEX "Sheathing_componentId_key" ON "Sheathing"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "Connectors_componentId_key" ON "Connectors"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "FramingTL_componentId_key" ON "FramingTL"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentSchedule_componentId_key" ON "ComponentSchedule"("componentId");

-- CreateIndex
CREATE INDEX "ComponentSchedule_weekKey_idx" ON "ComponentSchedule"("weekKey");

-- CreateIndex
CREATE INDEX "ComponentSchedule_projectId_weekKey_idx" ON "ComponentSchedule"("projectId", "weekKey");

-- CreateIndex
CREATE INDEX "ProjectWeekCapacity_weekKey_idx" ON "ProjectWeekCapacity"("weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWeekCapacity_projectId_weekKey_key" ON "ProjectWeekCapacity"("projectId", "weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sheathing" ADD CONSTRAINT "Sheathing_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connectors" ADD CONSTRAINT "Connectors_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FramingTL" ADD CONSTRAINT "FramingTL_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentSchedule" ADD CONSTRAINT "ComponentSchedule_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentSchedule" ADD CONSTRAINT "ComponentSchedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWeekCapacity" ADD CONSTRAINT "ProjectWeekCapacity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

