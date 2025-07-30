'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Panel = {
  id: string;
  name: string;
  completeness: number;
  data: Record<string, any>;
  status?: string;
  fileUrl?: string;
};

type SectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function CollapsibleSection({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6 border rounded">
      <button
        type="button"
        className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 hover:bg-gray-200 font-semibold text-left"
        onClick={() => setOpen(o => !o)}
      >
        {title}
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 py-4 bg-white">{children}</div>}
    </div>
  );
}

function EditableTable<T>({
  columns,
  data,
  onChange,
  onAdd,
  onRemove,
}: {
  columns: { key: keyof T; label: string; type?: string }[];
  data: T[];
  onChange: (rowIdx: number, key: keyof T, value: any) => void;
  onAdd: () => void;
  onRemove: (rowIdx: number) => void;
}) {
  return (
    <div>
      <table className="w-full mb-2 border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left border-b w-12">Line</th>
            {columns.map(col => (
              <th key={String(col.key)} className="p-2 text-left border-b">{col.label}</th>
            ))}
            <th className="p-2 border-b"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b">
              <td className="p-2 text-gray-500">{rowIdx + 1}</td>
              {columns.map(col => (
                <td key={String(col.key)} className="p-2">
                  <input
                    type={col.type || 'text'}
                    value={
                      typeof row[col.key] === 'string' || typeof row[col.key] === 'number'
                        ? String(row[col.key])
                        : row[col.key] !== undefined && row[col.key] !== null
                        ? String(row[col.key])
                        : ''
                    }
                    onChange={e => onChange(rowIdx, col.key, e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  />
                </td>
              ))}
              <td className="p-2">
                <button
                  type="button"
                  className="text-red-500 hover:bg-red-100 rounded-full p-1 flex items-center justify-center"
                  onClick={() => onRemove(rowIdx)}
                  aria-label="Remove Row"
                >
                  {/* Minus icon SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="text-blue-500 hover:bg-blue-100 rounded-full p-1 flex items-center justify-center"
        onClick={onAdd}
        aria-label="Add Row"
      >
        {/* Blue plus icon, no circle */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" stroke="#3b82f6"/>
        </svg>
      </button>
    </div>
  );
}

export default function PanelReviewPage() {
  const { projectId, panelId } = useParams();
  const router = useRouter();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [connectors, setConnectors] = useState(panel?.data.connectors || []);
  const [framingTL, setFramingTL] = useState(panel?.data.framingTL || []);
  const [part, setPart] = useState(panel?.data.part || []);
  const [sheathing, setSheathing] = useState(panel?.data.sheathing || []);

  useEffect(() => {
    fetch(`/api/components?projectId=${projectId}`)
      .then(res => res.json())
      .then(data => {
        const found = data.components.find((c: any) => c.id === panelId);
        if (found) {
          setPanel({
            id: found.id,
            name: found.componentId,
            completeness: found.completeness || 0,
            data: found,
            status: found.status || 'review',
            fileUrl: found.fileUrl || '',
          });
        }
      });
  }, [projectId, panelId]);

  useEffect(() => {
    if (panel) {
      setConnectors(panel.data.connectors || []);
      setFramingTL(panel.data.framingTL || []);
      setPart(panel.data.part || []);
      setSheathing(panel.data.sheathing || []);
    }
  }, [panel]);

  // Resizable panel logic
  const [leftWidth, setLeftWidth] = useState(700); // initial px width for left panel
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    // Clean up listeners on unmount
    return () => {
      window.removeEventListener('mousemove', onMouseMoveRef.current);
      window.removeEventListener('mouseup', onMouseUpRef.current);
    };
  }, []);

  // Store handlers in refs to allow cleanup
  const onMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {});
  const onMouseUpRef = useRef<() => void>(() => {});

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';

    const startX = e.clientX;
    const startWidth = leftWidth;

    onMouseMoveRef.current = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const dx = moveEvent.clientX - startX;
      setLeftWidth(prev => {
        const newWidth = Math.max(400, Math.min(700, startWidth + dx)); // min/max width
        return newWidth;
      });
    };

    onMouseUpRef.current = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMoveRef.current);
      window.removeEventListener('mouseup', onMouseUpRef.current);
    };

    window.addEventListener('mousemove', onMouseMoveRef.current);
    window.addEventListener('mouseup', onMouseUpRef.current);
  };

  useEffect(() => {
    if (panel) {
      setConnectors(Array.isArray(panel.data.connectors) && panel.data.connectors.length > 0
        ? panel.data.connectors
        : [{ label: '', count: '', description: '' }]
      );
      setFramingTL(Array.isArray(panel.data.framingTL) && panel.data.framingTL.length > 0
        ? panel.data.framingTL
        : [{ ftype: '', totalLength: '', count: '' }]
      );
      setPart(Array.isArray(panel.data.part) && panel.data.part.length > 0
        ? panel.data.part
        : [{ label: '', size: '', count: '', cutLength: '' }]
      );
      setSheathing(Array.isArray(panel.data.sheathing) && panel.data.sheathing.length > 0
        ? panel.data.sheathing
        : [{ panelArea: '', count: '', description: '' }]
      );
    }
  }, [panel]);

  if (!panel) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center bg-white p-8">
        <div className="text-gray-500 text-lg">Loading panel details...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-white p-8">
      <div
        ref={containerRef}
        className="w-full max-w-[1800px] flex flex-row gap-0 relative"
        style={{ userSelect: isResizing.current ? 'none' : 'auto' }}
      >
        {/* Left: Data Entry & Info */}
        <div
          className="bg-white shadow-lg border rounded-xl px-8 py-6 overflow-y-auto flex flex-col"
          style={{
            width: leftWidth,
            minWidth: 250,
            maxWidth: 900,
            height: 'calc(75vh + 100px)',
            transition: isResizing.current ? 'none' : 'width 0.2s'
          }}
        >
          {/* Removed "Back to Project Panels" link from here */}
          <h2 className="text-2xl font-bold mb-4">{panel.name}</h2>
          <div className="mb-2">
            <span className="font-semibold">Status:</span>{' '}
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold
                ${panel.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : panel.status === 'review'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-slate-100 text-slate-800'
                }`}
            >
              {panel.status}
            </span>
          </div>
          <div className="mb-2">
            <span className="font-semibold">Confidence:</span>{' '}
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold
                ${panel.completeness === 100
                  ? 'bg-green-100 text-green-800'
                  : panel.completeness >= 75
                  ? 'bg-blue-100 text-blue-800'
                  : panel.completeness >= 50
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
                }`}
            >
              {panel.completeness}%
            </span>
          </div>

          {/* Project and Component side by side */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <CollapsibleSection title="Project" defaultOpen>
              <div>
                <span className="font-semibold">Project ID:</span> {projectId}
                {/* Add more project fields as needed */}
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="Component" defaultOpen>
              <form className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Component ID</label>
                  <input
                    type="text"
                    defaultValue={panel.data.componentId || ''}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    defaultValue={panel.data.type || ''}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Component Sq Ft</label>
                  <input
                    type="number"
                    defaultValue={panel.data.componentSqFt || ''}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Width</label>
                  <input
                    type="number"
                    defaultValue={panel.data.maxWidth || ''}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Height</label>
                  <input
                    type="number"
                    defaultValue={panel.data.maxHeight || ''}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <input
                    type="text"
                    defaultValue={panel.data.level || ''}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input
                    type="number"
                    defaultValue={panel.data.weight || ''}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sequence</label>
                  <input
                    type="number"
                    defaultValue={panel.data.sequence || ''}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </form>
            </CollapsibleSection>
          </div>

          {/* Other Collapsible Sections */}
          <CollapsibleSection title="Connectors" defaultOpen={true}>
            <EditableTable
              columns={[
                { key: 'label', label: 'Label' },
                { key: 'count', label: 'Count', type: 'number' },
                { key: 'description', label: 'Description' },
              ]}
              data={connectors}
              onChange={(rowIdx, key, value) => {
                const updated = connectors.map((row: typeof connectors[number], idx: number) =>
                  idx === rowIdx ? { ...row, [key]: value } : row
                );
                setConnectors(updated);
              }}
              onAdd={() => setConnectors([...connectors, { label: '', count: '', description: '' }])}
              onRemove={rowIdx => setConnectors(connectors.filter((_: typeof connectors[number], idx: number) => idx !== rowIdx))}
            />
          </CollapsibleSection>

          <CollapsibleSection title="FramingTL" defaultOpen={true}>
            <EditableTable
              columns={[
                { key: 'ftype', label: 'FType' },
                { key: 'totalLength', label: 'Total Length', type: 'number' },
                { key: 'count', label: 'Count', type: 'number' },
              ]}
              data={framingTL}
              onChange={(rowIdx, key, value) => {
                const updated = framingTL.map((row: typeof framingTL[number], idx: number) =>
                  idx === rowIdx ? { ...row, [key]: value } : row
                );
                setFramingTL(updated);
              }}
              onAdd={() => setFramingTL([...framingTL, { ftype: '', totalLength: '', count: '' }])}
              onRemove={rowIdx => setFramingTL(framingTL.filter((_: typeof framingTL[number], idx: number) => idx !== rowIdx))}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Part" defaultOpen={true}>
            <EditableTable
              columns={[
                { key: 'label', label: 'Label' },
                { key: 'size', label: 'Size' },
                { key: 'count', label: 'Count', type: 'number' },
                { key: 'cutLength', label: 'Cut Length', type: 'number' },
              ]}
              data={part}
              onChange={(rowIdx, key, value) => {
                const updated = part.map((row: typeof part[number], idx: number) =>
                  idx === rowIdx ? { ...row, [key]: value } : row
                );
                setPart(updated);
              }}
              onAdd={() => setPart([...part, { label: '', size: '', count: '', cutLength: '' }])}
              onRemove={rowIdx => setPart(part.filter((_: typeof part[number], idx: number) => idx !== rowIdx))}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Sheathing" defaultOpen={true}>
            <EditableTable
              columns={[
                { key: 'panelArea', label: 'Panel Area', type: 'number' },
                { key: 'count', label: 'Count', type: 'number' },
                { key: 'description', label: 'Description' },
              ]}
              data={sheathing}
              onChange={(rowIdx, key, value) => {
                const updated = sheathing.map((row: typeof sheathing[number], idx: number) =>
                  idx === rowIdx ? { ...row, [key]: value } : row
                );
                setSheathing(updated);
              }}
              onAdd={() => setSheathing([...sheathing, { panelArea: '', count: '', description: '' }])}
              onRemove={rowIdx => setSheathing(sheathing.filter((_: typeof sheathing[number], idx: number) => idx !== rowIdx))}
            />
          </CollapsibleSection>
        </div>
        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-center cursor-col-resize"
          style={{
            width: 12,
            background: '#e5e7eb',
            borderLeft: '2px solid #d1d5db',
            borderRight: '2px solid #d1d5db',
            zIndex: 10,
            position: 'relative',
            userSelect: 'none',
          }}
        >
          <div className="w-2 h-12 bg-gray-400 rounded" />
        </div>
        {/* Right: Document Preview */}
        <div
          className="flex-1 bg-white shadow-lg border rounded-xl px-8 py-6 flex flex-col items-center"
          style={{ minWidth: 250 }}
        >
          <h2 className="text-lg font-semibold mb-4">Panel Document</h2>
          {panel.fileUrl ? (
            <iframe
              src={panel.fileUrl}
              title="Panel PDF"
              className="w-full"
              style={{ minHeight: '900px', height: '75vh', borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
          ) : (
            <div className="text-gray-400 italic">No file available</div>
          )}
        </div>
      </div>
      {/* Action Buttons Container */}
      <div className="w-full max-w-[1800px] flex justify-end gap-4 mt-8">
        <button
          type="button"
          className="bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded hover:bg-gray-300 transition"
          onClick={() => router.back()}
        >
          Back to Project Panels
        </button>
        <button
          type="button"
          className="bg-green-600 text-white font-semibold px-6 py-2 rounded hover:bg-green-700 transition"
          onClick={() => {/* handle approve logic here */}}
        >
          Approve
        </button>
        <button
          type="button"
          className="bg-red-600 text-white font-semibold px-6 py-2 rounded hover:bg-red-700 transition"
          onClick={() => {/* handle reject logic here */}}
        >
          Reject
        </button>
        <button
          type="button"
          className="bg-blue-600 text-white font-semibold px-6 py-2 rounded hover:bg-blue-700 transition"
          onClick={() => {/* handle save logic here */}}
        >
          Save
        </button>
      </div>
    </main>
  );
}