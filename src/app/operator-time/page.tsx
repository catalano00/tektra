'use client';

import { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { formatTime } from '@/utils/format';
import type { Component, TimeEntry, Part, Sheathing } from '@prisma/client';

interface Project {
  projectId: string;
}

interface ComponentExtended extends Component {
  timeEntries?: TimeEntry[];
  partList?: Part[];
  sheathing?: Sheathing[];
  percentComplete: number;
}

const OPERATION_ORDER = ['Cut', 'Assemble', 'Fly', 'Ship'] as const;
const TEAM_LEADS = ['Joel', 'Adrian', 'Andres'];
const WORKSTATIONS = ['TABLE01', 'TABLE02', 'TABLE03'];

type ProcessType = typeof OPERATION_ORDER[number];

function isValidProcess(value: string): value is ProcessType {
  return OPERATION_ORDER.includes(value as ProcessType);
}

export default function OperatorTimePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [components, setComponents] = useState<ComponentExtended[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectFilter, setProjectFilter] = useState<'active' | 'all'>('active');
  const [selectedComponent, setSelectedComponent] = useState<ComponentExtended | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [workstation, setWorkstation] = useState('');
  const [teamLead, setTeamLead] = useState('');
  const [process, setProcess] = useState<ProcessType | ''>('');
  const [availableProcesses, setAvailableProcesses] = useState<ProcessType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const panelIdParam = searchParams?.get('componentId') ?? '';
  const projectIdParam = searchParams?.get('projectId') ?? '';
  const processParamRaw = searchParams?.get('process') ?? '';
  const teamLeadParam = searchParams?.get('teamLead') ?? '';
  const processParam: ProcessType | '' = isValidProcess(processParamRaw) ? processParamRaw : '';

  useEffect(() => {
    fetch(`/api/projects?filter=${projectFilter}`)
      .then(res => res.json())
      .then(setProjects)
      .catch(console.error);
  }, [projectFilter]);

  useEffect(() => {
    if (projectIdParam) setSelectedProject(projectIdParam);
  }, [projectIdParam]);

  useEffect(() => {
    if (!selectedProject) return;

    fetch(`/api/components?projectId=${selectedProject}`)
      .then(res => res.json())
      .then((data) => {
        const filtered = (data.components || []).filter((c: ComponentExtended) => {
          const isDelivered = c.currentStatus.toLowerCase().includes('delivered');
          const isShipped = c.currentStatus.toLowerCase().includes('shipped');
          const last = c.timeEntries?.filter(e => e.status === 'complete').at(-1)?.process;
          return !isDelivered && !isShipped && last !== 'Ship';
        });

        setComponents(filtered);

        if (panelIdParam) {
          const match = filtered.find((c: { componentId: string }) => c.componentId === panelIdParam);
          if (match) setSelectedComponent(match);
        }
      })
      .catch(console.error);
  }, [selectedProject]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => setTime(prev => prev + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  useEffect(() => {
    if (!selectedComponent) return;

    fetch(`/api/time-entry?componentId=${selectedComponent.id}`)
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch time entries: ${res.status} - ${text}`);
        }
        return res.json();
      })
      .then((entries: TimeEntry[]) => {
        const completed = entries.filter(e => e.status === 'complete').map(e => e.process);
        const paused = entries.find(e => e.status === 'paused');
        const lastCompleted = entries
          .filter(e => e.status === 'complete')
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

        if (paused) {
          setProcess(paused.process as ProcessType);
          setTime(Math.round(paused.duration));
          setWorkstation(paused.workstation);
          setTeamLead(paused.teamLead);
        } else {
          const nextProcess = OPERATION_ORDER.find(p => !completed.includes(p));
          setProcess(processParam || nextProcess || '');
          setTime(0);
          setWorkstation(lastCompleted?.workstation || '');
          setTeamLead(teamLeadParam || lastCompleted?.teamLead || '');
        }

        setIsRunning(false);
        setAvailableProcesses(OPERATION_ORDER.filter(p => !completed.includes(p)));
      })
      .catch(console.error);
  }, [selectedComponent]);

  const handleStop = () => {
    setIsRunning(false);
    setShowModal(true);
  };

  const handleModalAction = async (action: string) => {
    if (!selectedComponent || !process) return;

    const status = action === 'complete' ? 'complete' : action;
    const durationInSeconds = Math.round(Number(time));

    if (!Number.isFinite(durationInSeconds)) {
      alert('Invalid duration. Cannot save.');
      return;
    }

    const payload = {
      componentId: selectedComponent.id,
      componentCode: selectedComponent.componentId,
      process,
      status,
      duration: durationInSeconds,
      workstation,
      teamLead,
      warehouse: 'Grand Junction',
    };

    console.log('Sending time entry data:', payload);

    const putRes = await fetch('/api/time-entry', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!putRes.ok) {
      const contentType = putRes.headers.get('content-type');
      let errorMessage = `Status ${putRes.status}`;

      try {
        if (contentType?.includes('application/json')) {
          const errorData = await putRes.json();
          errorMessage += `: ${errorData?.error || JSON.stringify(errorData)}`;
        } else {
          const text = await putRes.text();
          if (text) {
            errorMessage += `: ${text}`;
          }
        }
      } catch (err) {
        errorMessage += ' — and failed to parse error body.';
      }

      console.error('❌ Failed to save current time entry:', errorMessage);
      alert('Failed to save the current entry. Please try again.');
      return;
    }

    const isLastProcess = process === OPERATION_ORDER[OPERATION_ORDER.length - 1];

if (action === 'complete') {
  if (!isLastProcess) {
    const postRes = await fetch('/api/time-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        componentId: selectedComponent.id,
        componentCode: selectedComponent.componentId,
        currentProcess: process,
        teamLead,
        workstation,
        warehouse: 'Grand Junction',
      }),
    });

    if (postRes.status === 204) {
      toast.success(`✅ Process "${process}" completed for ${selectedComponent.componentId}`);
    } else if (!postRes.ok) {
      console.error('Failed to create next time entry:', await postRes.text());
    }
  } else {
    toast.success(`✅ Component ${selectedComponent.componentId} is fully completed!`);
  }
}
    router.push(`/project/${selectedProject}`);
  };

  const totalSeconds = selectedComponent?.timeEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;
  const currentIndex = OPERATION_ORDER.indexOf(processParam as ProcessType);
  const progress = currentIndex >= 0
    ? Math.floor(((currentIndex) / OPERATION_ORDER.length) * 100)
    : 0;
  
    return(
      <main className="p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Operator Panel</h1>

        <div className="text-center text-4xl font-mono">{formatTime(time)}</div>

        <div className="w-full bg-gray-200 h-4 rounded">
          <div
            className="bg-green-500 h-4 rounded transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {!selectedComponent && (
        <div className="space-y-4">
          <p className="text-center text-gray-500">Select a component to begin:</p>

          <div className="flex gap-4">
            <select
              className="border p-2 rounded w-1/2"
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setSelectedComponent(null);
              }}
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectId}
                </option>
              ))}
            </select>

            <select
              className="border p-2 rounded w-1/2"
              value={selectedComponent?.componentId ?? ''}
              onChange={(e) => {
                const comp: ComponentExtended | undefined = components.find(
                  (c) => c.componentId === e.target.value
                );
                setSelectedComponent(comp || null);
              }}
              disabled={!selectedProject}
            >
              <option value="">Select Component</option>
              {components.map((c: ComponentExtended) => (
            <option key={c.componentId} value={c.componentId}>
              {c.componentId}
            </option>
          ))}
            </select>
          </div>
        </div>
      )}

        {selectedComponent && (
          <div className="p-4 border rounded bg-white shadow space-y-4">
            <button onClick={() => router.push('/operator-time')} className="text-sm text-blue-600 underline">Change Selection</button>
            <h1 className="text-2xl font-bold">{selectedComponent.projectId}</h1>
            <h1 className="text-lg font-bold">{selectedComponent.componentId}</h1>
            <h2 className="text-lg font-bold">Percent Complete: {selectedComponent.percentComplete}%</h2>
            <p><strong>Component Type:</strong> {selectedComponent.componentType}</p>
            <p><strong>Component Status:</strong> {selectedComponent.currentStatus}</p>
            <p><strong>Current Process:</strong> {process}</p>
            <p><strong>Square Feet:</strong> {selectedComponent.componentsqft || '—'}</p>
            <p><strong>Part List:</strong> {selectedComponent.partList?.join(', ') || '—'}</p>
            <p><strong>Total Production Time:</strong> {formatTime(totalSeconds)}</p>
            
            <select className="border p-2 rounded w-full" value={workstation} onChange={(e) => setWorkstation(e.target.value)}>
            <option value="">Select Workstation</option>
              {WORKSTATIONS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>

            <select className="border p-2 rounded w-full" value={teamLead} onChange={(e) => setTeamLead(e.target.value)}>
              <option value="">Select Team Lead</option>
              {TEAM_LEADS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <button
            onClick={isRunning ? handleStop : () => setIsRunning(true)}
            className={`w-full px-6 py-2 text-white rounded ${isRunning ? 'bg-red-600' : 'bg-green-600'} hover:opacity-90`}
            >
            {isRunning ? 'Stop' : time > 0 ? 'Resume' : 'Start'}
            </button>
          </div>
        )}

      <Transition appear show={showModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Choose Action
                  </Dialog.Title>
                  <div className="mt-4 space-y-2">
                    <button onClick={() => handleModalAction('complete')} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Complete Operation</button>
                    <button onClick={() => handleModalAction('paused')} className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600">Pause</button>
                    <button onClick={() => handleModalAction('quality')} className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600">Quality Issue</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </main>
  );
}