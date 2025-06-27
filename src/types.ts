// src/types.ts

export interface Project {
  projectId: string;
}

export interface TimeEntry {
  process: string;
  status: string;
  duration: number;
  updatedAt: string;
  workstation: string;
  teamLead: string;
}

export interface Component {
  id: string;
  projectId: string;
  componentId: string;
  componentType: string;
  currentStatus: string;
  componentsqft: number;
  percentComplete: number;
  timeEntries?: TimeEntry[];
  partList?: any[]; // Replace 'any' with your real Part type if needed
  sheathing?: any[]; // Replace 'any' with your real Sheathing type if needed
}