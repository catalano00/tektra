'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

type StagingData = {
  id: string;
  rawData: any; // Raw JSON payload
  status: string;
  createdAt: string;
  updatedAt: string;
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

const ItemType = 'ROW';

function DraggableRow<T>({
  row,
  rowIdx,
  columns,
  moveRow,
  onChange,
  onRemove,
}: {
  row: T;
  rowIdx: number;
  columns: { key: keyof T; label: string; type?: string }[];
  moveRow: (sourceIdx: number, destinationIdx: number) => void;
  onChange: (rowIdx: number, key: keyof T, value: any) => void;
  onRemove: (rowIdx: number) => void;
}) {
  const [, dragRef] = useDrag({
    type: ItemType,
    item: { rowIdx },
  });

  const [, dropRef] = useDrop({
    accept: ItemType,
    hover: (item: { rowIdx: number }) => {
      if (item.rowIdx !== rowIdx) {
        moveRow(item.rowIdx, rowIdx);
        item.rowIdx = rowIdx;
      }
    },
  });

  return (
    <tr
      ref={(node) => {
        dragRef(dropRef(node));
      }}
      className="border-b"
    >
      <td className="p-2 text-gray-500">{rowIdx + 1}</td>
      {columns.map((col) => (
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
            onChange={(e) => onChange(rowIdx, col.key, e.target.value)}
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

function EditableTable<T>({
  columns,
  data,
  onChange,
  onAdd,
  onRemove,
  onReorder,
}: {
  columns: { key: keyof T; label: string; type?: string }[];
  data: T[];
  onChange: (rowIdx: number, key: keyof T, value: any) => void;
  onAdd: () => void;
  onRemove: (rowIdx: number) => void;
  onReorder: (sourceIdx: number, destinationIdx: number) => void;
}) {
  const moveRow = (sourceIdx: number, destinationIdx: number) => {
    const updated = [...data];
    const [removed] = updated.splice(sourceIdx, 1);
    updated.splice(destinationIdx, 0, removed);
    onReorder(sourceIdx, destinationIdx);
  };

  return (
    <div>
      <table className="w-full mb-2 border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left border-b w-12">Line</th>
            {columns.map((col) => (
              <th key={String(col.key)} className="p-2 text-left border-b">
                {col.label}
              </th>
            ))}
            <th className="p-2 border-b"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <DraggableRow
              key={rowIdx}
              row={row}
              rowIdx={rowIdx}
              columns={columns}
              moveRow={moveRow}
              onChange={onChange}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="text-blue-500 hover:bg-blue-100 rounded-full p-1 flex items-center justify-center"
        onClick={onAdd}
        aria-label="Add Row"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
        </svg>
      </button>
    </div>
  );
}

function BlobFileViewer({ url }: { url: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setError('No file URL provided');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Invalid file URL format');
      return;
    }

    async function fetchBlob() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error('BlobFileViewer fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred while loading file');
      } finally {
        setLoading(false);
      }
    }

    fetchBlob();

    // Cleanup the object URL when the component is unmounted or URL changes
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url]); // Added url as dependency

  if (loading) {
    return <div className="text-gray-500 flex items-center justify-center h-full">Loading file...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 border border-red-200 rounded-lg bg-red-50">
        <div className="font-semibold mb-2">Error loading file:</div>
        <div className="text-sm">{error}</div>
        {url && (
          <div className="text-xs mt-2 text-gray-600">
            URL: {url}
          </div>
        )}
      </div>
    );
  }

  if (!blobUrl) {
    return <div className="text-gray-500 flex items-center justify-center h-full">Preparing file...</div>;
  }

  return (
    <iframe
      src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
      title="File Viewer"
      className="w-full h-full rounded-lg"
      style={{
        border: '1px solid #e5e7eb',
        minHeight: '400px', // Ensure minimum height
      }}
    />
  );
}

export default function FileDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [fileData, setFileData] = useState<StagingData | null>(null);
  const [editableData, setEditableData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [leftWidth, setLeftWidth] = useState(700); // Initial width for left panel
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const [screenWidth, setScreenWidth] = useState(0);
  const [viewMode, setViewMode] = useState<'document' | 'raw'>('document'); // Toggle between document and raw view
  const [showSectionMenu, setShowSectionMenu] = useState(false); // For section dropdown
  const sectionMenuRef = useRef<HTMLDivElement>(null); // For click outside
  const [originalMediaLink, setOriginalMediaLink] = useState<string>(''); // Store original media link
  const [showReprocessConfirm, setShowReprocessConfirm] = useState(false);
  const [reprocessPreview, setReprocessPreview] = useState<any>(null);
  const [preReprocessSnapshot, setPreReprocessSnapshot] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const pushToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Click outside to close section menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(event.target as Node)) {
        setShowSectionMenu(false);
      }
    }
    
    if (showSectionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSectionMenu]);

  // Track screen width for dynamic sizing
  useEffect(() => {
    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
      // Auto-adjust left panel width based on screen size
      if (window.innerWidth >= 2560) { // Ultrawide monitors
        setLeftWidth(Math.min(1000, window.innerWidth * 0.4));
      } else if (window.innerWidth >= 1920) { // Standard wide monitors
        setLeftWidth(Math.min(800, window.innerWidth * 0.45));
      } else {
        setLeftWidth(Math.min(700, window.innerWidth * 0.5));
      }
    };
    
    updateScreenWidth();
    window.addEventListener('resize', updateScreenWidth);
    return () => window.removeEventListener('resize', updateScreenWidth);
  }, []);

  const TAG_SECTION_MAP: Record<string, string> = {
    rpsheathing: 'RPSheathing',
    rppartlist: 'RPPartList',
    fpconnectors: 'FPConnectors',
    fppartlist: 'FPPartList',
    fpsheathing: 'FPSheathing',
    wpconnectors: 'WPConnectors',
    wpframingtl: 'WPFramingTL',
    wppartlist: 'WPPartList',
    wpsheathing: 'WPSheathing',
  };
  // Map of raw (lowercase) array keys -> canonical section keys (used for initial normalization & reprocess)
  const RAW_SECTION_KEY_MAP = TAG_SECTION_MAP; // identical mapping presently

  useEffect(() => {
    async function fetchFileData() {
      try {
        const response = await fetch(`/api/staging-data/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch file data');
        }
        const data = await response.json();
        setFileData(data);
        setEditableData(data.rawData);
        // Normalize any lowercase panel arrays to canonical capitalized section keys so UI can render them
        setEditableData((prev: any) => {
          if (!prev || typeof prev !== 'object') return prev;
          const next = { ...prev };
          Object.entries(RAW_SECTION_KEY_MAP).forEach(([rawKey, canonical]) => {
            if ((next as any)[rawKey] && Array.isArray((next as any)[rawKey])) {
              if (!(next as any)[canonical]) {
                (next as any)[canonical] = (next as any)[rawKey];
              }
            }
          });
          return next;
        });
        // Store the original media link to prevent corruption
        if (data.rawData && data.rawData.media_link) {
          setOriginalMediaLink(data.rawData.media_link);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchFileData();
  }, [id]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';

    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const dx = moveEvent.clientX - startX;
      const minWidth = Math.max(400, screenWidth * 0.25);
      const maxWidth = Math.min(1200, screenWidth * 0.6);
      setLeftWidth(Math.max(minWidth, Math.min(maxWidth, startWidth + dx))); // Dynamic min/max width
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const documentProperties = [
    'file_name',
    'remote_id',
    'media_link',
    'page_count',
    'document_id',
    'uploaded_at',
    'processed_at',
    'media_link_data',
    'uploaded_at_utc',
    'processed_at_utc',
    'uploaded_at_user',
    'processed_at_user',
    'media_link_original',
    'id',
  ];

  const componentDetails = ['projectnametag','panellabel', 'sheettitle' ];

  // New panel/tag based sections mapping to their display titles & column schemas.
  // We reuse generic key_0.. key_n fields already used by existing parser output.
  const panelSectionConfigs: Record<string, { title: string; columns: { key: string; label: string; type?: string }[] }> = {
    RPSheathing: {
      title: 'Roof Panel – Sheathing',
      columns: [
        { key: 'key_0', label: 'Description' },
        { key: 'key_1', label: 'Thickness' },
        { key: 'key_2', label: 'Area' },
      ],
    },
    RPPartList: {
      title: 'Roof Panel – Part List',
      columns: [
        { key: 'key_0', label: 'Type' },
        { key: 'key_1', label: 'Label' },
        { key: 'key_2', label: 'Cut Length' },
        { key: 'key_3', label: 'Count' },
      ],
    },
    FPConnectors: {
      title: 'Floor Panel – Connectors',
      columns: [
        { key: 'key_0', label: 'Label' },
        { key: 'key_1', label: 'Description' },
        { key: 'key_2', label: 'Count' },
      ],
    },
    FPPartList: {
      title: 'Floor Panel – Part List',
      columns: [
        { key: 'key_0', label: 'Type' },
        { key: 'key_1', label: 'Label' },
        { key: 'key_2', label: 'Cut Length' },
        { key: 'key_3', label: 'Count' },
      ],
    },
    FPSheathing: {
      title: 'Floor Panel – Sheathing',
      columns: [
        { key: 'key_0', label: 'Description' },
        { key: 'key_1', label: 'Area' },
        { key: 'key_2', label: '4x8 Panel Count' },
      ],
    },
    WPConnectors: {
      title: 'Wall Panel – Connectors',
      columns: [
        { key: 'key_0', label: 'Label' },
        { key: 'key_1', label: 'Count' },
      ],
    },
    WPFramingTL: {
      title: 'Wall Panel – Framing Total Length',
      columns: [
        { key: 'key_0', label: 'Type' },
        { key: 'key_1', label: 'Total Length' },
        { key: 'key_2', label: 'Count' },
      ],
    },
    WPPartList: {
      title: 'Wall Panel – Part List',
      columns: [
        { key: 'key_0', label: 'Size' },
        { key: 'key_1', label: 'Label' },
        { key: 'key_2', label: 'Count' },
        { key: 'key_3', label: 'Cut Length' },
      ],
    },
    WPSheathing: {
      title: 'Wall Panel – Sheathing',
      columns: [
        { key: 'key_0', label: 'Panel' },
        { key: 'key_1', label: 'Area' },
        { key: 'key_2', label: '4x8 Panel Count' },
      ],
    },
    // Keep timestamps as a special structured list
    timestamps: {
      title: 'Time Stamps',
      columns: [
        { key: 'key_0', label: 'Date' },
        { key: 'key_1', label: 'Description' },
      ],
    },
  };

  // Order of display for all sections (core sections first)
  const sectionOrder = [
    'documentProperties',
    'componentDetails',
    'RPSheathing',
    'RPPartList',
    'FPConnectors',
    'FPPartList',
    'FPSheathing',
    'WPConnectors',
    'WPFramingTL',
    'WPPartList',
    'WPSheathing',
    'timestamps',
  ];

  // Allow adding any panel section that is not present
  const availableSections = Object.keys(panelSectionConfigs).filter(k => k !== 'timestamps');

  // Section management functions
  const addSection = (sectionName: string) => {
    if (!panelSectionConfigs[sectionName]) return;
    setEditableData((prev: any) => ({ ...prev, [sectionName]: [] }));
    setShowSectionMenu(false);
  };

  const removeSection = (sectionName: string) => {
    setEditableData((prev: any) => {
      const updated = { ...prev };
      delete updated[sectionName];
      return updated;
    });
  };

  // Heuristic mapping from incoming tag/panel identifiers to section keys
  const SECTION_FIELD_HINTS: Record<string, string[]> = {
    RPSheathing: ['description', 'thickness', 'area'],
    RPPartList: ['type', 'label', 'cutlength', 'count'],
    FPConnectors: ['label', 'description', 'count'],
    FPPartList: ['type', 'label', 'cutlength', 'count'],
    FPSheathing: ['description', 'area', 'panelcount', '4x8panelcount'],
    WPConnectors: ['label', 'count'],
    WPFramingTL: ['type', 'totallength', 'count'],
    WPPartList: ['size', 'label', 'count', 'cutlength'],
    WPSheathing: ['panel', 'area', 'panelcount', '4x8panelcount'],
  };

  function normalizeKey(k: string): string {
    return k.replace(/[_\s-]/g, '').toLowerCase();
  }

  function rebuildRow(section: string, record: any) {
    const hints = SECTION_FIELD_HINTS[section] || [];
    const normRecord: Record<string, any> = {};
    Object.entries(record || {}).forEach(([k, v]) => {
      normRecord[normalizeKey(k)] = v;
    });
    const row: any = {};
    // First try hints
    hints.forEach((hint, idx) => {
      if (row[`key_${idx}`] !== undefined) return;
      const nk = normalizeKey(hint);
      if (normRecord[nk] !== undefined) {
        row[`key_${idx}`] = normRecord[nk];
      }
    });
    // Fill remaining slots with leftover fields (excluding tag-like keys and already used)
    const used = new Set(Object.values(row));
    let cursor = 0;
    Object.entries(normRecord).forEach(([k, v]) => {
      if (['tag','paneltag','section','type','_id','id'].includes(k)) return;
      if (used.has(v)) return;
      while (row[`key_${cursor}`] !== undefined) cursor++;
      row[`key_${cursor}`] = v;
      used.add(v);
    });
    return row;
  }

  function collectCandidateRecords(root: any): any[] {
    const acc: any[] = [];
    const visit = (val: any) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(v => visit(v));
      } else if (typeof val === 'object') {
        const keys = Object.keys(val);
        const hasTag = keys.some(k => ['tag','paneltag','section'].includes(k.toLowerCase()));
        if (hasTag) acc.push(val);
        // Recurse shallowly to catch nested arrays of tagged objects
        keys.forEach(k => {
          const child = (val as any)[k];
          if (typeof child === 'object') visit(child);
        });
      }
    };
    visit(root);
    return acc;
  }

  function buildReprocessResult(data: any) {
    const records = collectCandidateRecords(data);
    const buckets: Record<string, any[]> = {};
    records.forEach(rec => {
      const rawTag = rec.tag || rec.panelTag || rec.section || rec.type || '';
      if (!rawTag) return;
      const normTag = normalizeKey(String(rawTag));
      const section = TAG_SECTION_MAP[normTag];
      if (!section) return; // skip unknown tags
      const row = rebuildRow(section, rec);
      if (!buckets[section]) buckets[section] = [];
      buckets[section].push(row);
    });
    // Also harvest already structured arrays sitting on raw data (e.g., rppartlist) that lack per-row tag fields
    Object.entries(RAW_SECTION_KEY_MAP).forEach(([rawKey, canonical]) => {
      const arr = (data as any)[rawKey] || (data as any)[canonical];
      if (Array.isArray(arr) && arr.length) {
        if (!buckets[canonical]) buckets[canonical] = [];
        // Push rows (assume they are already in key_0 format); avoid duplicating identical rows
        const existingSet = new Set(buckets[canonical].map(r => JSON.stringify(r)));
        arr.forEach((r: any) => {
          const sig = JSON.stringify(r);
            if (!existingSet.has(sig)) {
              buckets[canonical].push(r);
              existingSet.add(sig);
            }
        });
      }
    });
    return { buckets, totalSource: records.length };
  }

  function openReprocessPreview() {
    setIsReprocessing(true);
    try {
      const { buckets, totalSource } = buildReprocessResult(editableData);
      const summary = Object.entries(buckets).map(([section, rows]) => ({ section, count: rows.length }));
      setReprocessPreview({ summary, buckets, totalSource, generatedAt: new Date().toISOString() });
      setShowReprocessConfirm(true);
    } finally {
      setIsReprocessing(false);
    }
  }

  function applyReprocess(mode: 'overwrite' | 'merge') {
    if (!reprocessPreview) return;
    setShowReprocessConfirm(false);
    setPreReprocessSnapshot(editableData); // backup for undo
    setEditableData((prev: any) => {
      const next = { ...prev };
      Object.entries(reprocessPreview.buckets).forEach(([section, rows]) => {
        if (mode === 'overwrite' || !Array.isArray(next[section])) {
          next[section] = rows;
        } else {
          // merge unique
            const existing = new Set(next[section].map((r: any) => JSON.stringify(r)));
            (rows as any[]).forEach((r: any) => {
              const s = JSON.stringify(r);
              if (!existing.has(s)) next[section].push(r);
            });
        }
      });
      return next;
    });
  }

  function undoReprocess() {
    if (preReprocessSnapshot) {
      setEditableData(preReprocessSnapshot);
      setPreReprocessSnapshot(null);
    }
  }

  async function saveDraft() {
    if (!fileData) return;
    setIsSaving(true);
    try {
      const resp = await fetch(`/api/staging-data/${fileData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawData: editableData, status: fileData.status }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      const updated = await resp.json();
      setFileData(updated);
      pushToast('Draft saved', 'success');
    } catch (e: any) {
      pushToast(`Save failed: ${e.message || e}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="min-h-screen w-full flex flex-col items-center bg-white p-4 lg:p-8">
        <div className="flex flex-col items-center mb-4">
          <h1 className="text-2xl font-bold mb-2">File Details</h1>
          {screenWidth >= 2560 && (
            <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              🖥️ Ultrawide layout optimized
            </div>
          )}
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={() => setViewMode('document')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'document' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Document View
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'raw' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Raw Data View
            </button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="w-full flex flex-row gap-0 relative"
          style={{ 
            userSelect: isResizing.current ? 'none' : 'auto',
            maxWidth: screenWidth >= 2560 ? '95vw' : screenWidth >= 1920 ? '90vw' : '1800px'
          }}
        >
          {/* Left Panel */}
          <div
            className="bg-white shadow-lg border rounded-xl px-4 lg:px-8 py-6 overflow-y-auto flex flex-col text-sm" // Responsive padding
            style={{
              width: leftWidth,
              minWidth: Math.max(400, screenWidth * 0.25), // Dynamic minimum width
              maxWidth: Math.min(1200, screenWidth * 0.6), // Dynamic maximum width
              height: 'calc(80vh + 100px)', // Increased height for better viewing
              transition: isResizing.current ? 'none' : 'width 0.2s',
            }}
          >
            {/* Document View - Structured sections (always in left panel) */}
            <>
              {/* Section Management Controls */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Section Management</h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={openReprocessPreview}
                      disabled={isReprocessing}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
                      title="Reconstruct panel sections from raw tagged objects"
                    >
                      {isReprocessing ? 'Scanning…' : 'Reprocess JSON'}
                    </button>
                    {preReprocessSnapshot && (
                      <button
                        type="button"
                        onClick={undoReprocess}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-300 text-gray-800 hover:bg-gray-400"
                      >
                        Undo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={saveDraft}
                      disabled={isSaving}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving…' : 'Save Draft'}
                    </button>
                    <div className="relative" ref={sectionMenuRef}>
                      <button
                        onClick={() => setShowSectionMenu(!showSectionMenu)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add Section</span>
                      </button>
                      
                      {showSectionMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                          <div className="py-1">
                            {availableSections
                              .filter(section => !editableData[section])
                              .map(section => (
                                <button
                                  key={section}
                                  onClick={() => addSection(section)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  {panelSectionConfigs[section]?.title || section}
                                </button>
                              ))
                            }
                            {availableSections.filter(section => !editableData[section]).length === 0 && (
                              <div className="px-4 py-2 text-sm text-gray-500 italic">
                                All sections added
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Current sections with remove buttons */}
                <div className="flex flex-wrap gap-2">
                  {availableSections.map(sectionName => (
                    editableData[sectionName] && (
                      <div key={sectionName} className="flex items-center space-x-1">
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          {panelSectionConfigs[sectionName]?.title || sectionName}
                        </span>
                        <button
                          onClick={() => removeSection(sectionName)}
                          className="text-xs px-1 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          title="Remove section"
                        >
                          ×
                        </button>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {sectionOrder.map((sectionKey) => {
                  // Only show sections if they are core sections or have data (including empty arrays for dynamic sections)
                  if (!['documentProperties', 'componentDetails'].includes(sectionKey) && 
                      (!editableData[sectionKey] || (!Array.isArray(editableData[sectionKey])))) {
                    return null;
                  }
                  
                  if (sectionKey === 'documentProperties') {
                return (
                  <CollapsibleSection title="Document Properties" defaultOpen={false} key={sectionKey}>
                    <div className={`grid gap-4 ${screenWidth >= 1920 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {documentProperties.map((key) => (
                        <div key={key} className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">{key}</label>
                          <input
                            type="text"
                            value={editableData[key] || ''}
                            readOnly
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100"
                          />
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                );
              } else if (sectionKey === 'componentDetails') {
                return (
                  <CollapsibleSection title="Component Details" defaultOpen key={sectionKey}>
                    <div className={`grid gap-4 ${screenWidth >= 1920 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {componentDetails.map((key) => {
                        // Map field names to display labels
                        const fieldLabels: Record<string, string> = {
                          projectnametag: 'Project ID',
                          panellabel: 'Component ID',
                          sheettitle: 'Type',
                        };

                        return (
                          <div key={key} className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {fieldLabels[key] || key} {/* Use mapped label or fallback to key */}
                            </label>
                            <input
                              type="text"
                              value={editableData[key] || ''}
                              onChange={(e) =>
                                setEditableData((prev: any) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                );
              } else if (panelSectionConfigs[sectionKey] && Array.isArray(editableData[sectionKey])) {
                const cfg = panelSectionConfigs[sectionKey];
                return (
                  <CollapsibleSection title={cfg.title} defaultOpen key={sectionKey}>
                    <EditableTable
                      columns={cfg.columns as any}
                      data={editableData[sectionKey] || []}
                      onChange={(rowIdx, col, val) => {
                        const updated = editableData[sectionKey].map((row: any, idx: number) =>
                          idx === rowIdx ? { ...row, [col]: val } : row
                        );
                        setEditableData({ ...editableData, [sectionKey]: updated });
                      }}
                      onAdd={() =>
                        setEditableData({
                          ...editableData,
                          [sectionKey]: [...(editableData[sectionKey] || []), {}],
                        })
                      }
                      onRemove={(rowIdx) =>
                        setEditableData({
                          ...editableData,
                          [sectionKey]: editableData[sectionKey].filter(
                            (_: any, idx: number) => idx !== rowIdx
                          ),
                        })
                      }
                      onReorder={(sourceIdx, destinationIdx) => {
                        const updated = [...editableData[sectionKey]];
                        const [removed] = updated.splice(sourceIdx, 1);
                        updated.splice(destinationIdx, 0, removed);
                        setEditableData({ ...editableData, [sectionKey]: updated });
                      }}
                    />
                  </CollapsibleSection>
                );
              }
              return null; // Don't render sections that don't exist or aren't handled
            })}
            </>
          </div>
          {/* Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="flex items-center justify-center cursor-col-resize hover:bg-gray-300 transition-colors"
            style={{
              width: 16, // Slightly wider for easier grabbing
              background: '#e5e7eb',
              borderLeft: '2px solid #d1d5db',
              borderRight: '2px solid #d1d5db',
              zIndex: 10,
              position: 'relative',
              userSelect: 'none',
            }}
          >
            <div className="w-3 h-12 bg-gray-400 rounded-sm" />
          </div>
          {/* Right Panel - File Viewer or Raw Data */}
          <div
            className="flex-1 bg-white shadow-lg border rounded-xl flex flex-col items-center"
            style={{ 
              minWidth: Math.max(300, screenWidth * 0.3), // Dynamic minimum width
              height: 'calc(80vh + 100px)', // Match left panel height
            }}
          >
            <div className="w-full h-full p-4">
              {viewMode === 'document' ? (
                <BlobFileViewer url={originalMediaLink || editableData.media_link} />
              ) : (
                // Raw Data View - JSON editor
                <div className="h-full flex flex-col space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">Raw JSON Data</h3>
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ Caution: Editing the "media_link" field may cause the PDF viewer to fail when switching back to Document View.
                    </p>
                  </div>
                  <textarea
                    value={JSON.stringify(editableData, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setEditableData(parsed);
                      } catch (error) {
                        // Invalid JSON, don't update
                        console.warn('Invalid JSON input');
                      }
                    }}
                    className="flex-1 w-full border border-gray-300 rounded px-3 py-2 text-xs font-mono resize-none"
                    placeholder="Edit JSON data here..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div 
          className="w-full flex justify-end gap-4 mt-8"
          style={{ 
            maxWidth: screenWidth >= 2560 ? '95vw' : screenWidth >= 1920 ? '90vw' : '1800px'
          }}
        >
          <button
            type="button"
            className="bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded hover:bg-gray-300 transition"
            onClick={() => router.push('/production-planning/data-review')} // Navigate to the data review page
          >
            Back
          </button>
          <button
            type="button"
            className="bg-green-600 text-white font-semibold px-6 py-2 rounded hover:bg-green-700 transition"
            onClick={async () => {
              try {
                const response = await fetch('/api/approve', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    data: editableData, 
                    stagingId: id // Pass the staging ID to update status
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to approve data');
                }

                const result = await response.json();
                pushToast(result.message || 'Approved', 'success');
                router.push('/production-planning/data-review'); // Navigate back to the data review page
              } catch (error) {
                console.error('Error approving data:', error);
                pushToast(`Failed to approve data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
              }
            }}
          >
            Approve
          </button>
          <button
            type="button"
            className="bg-red-600 text-white font-semibold px-6 py-2 rounded hover:bg-red-700 transition"
            onClick={() => {
              /* handle reject logic */
            }}
          >
            Reject
          </button>
          <button
            type="button"
            className="bg-blue-600 text-white font-semibold px-6 py-2 rounded hover:bg-blue-700 transition"
            disabled={isSaving}
            onClick={saveDraft}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </main>
      {showReprocessConfirm && reprocessPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Reprocess JSON Preview</h2>
            {reprocessPreview.summary.length === 0 ? (
              <p className="text-sm text-gray-600">No tagged records detected. Nothing to apply.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto border rounded p-3 bg-gray-50">
                <ul className="text-sm space-y-1">
                  {reprocessPreview.summary.map((s: any) => (
                    <li key={s.section} className="flex justify-between">
                      <span className="font-medium">{panelSectionConfigs[s.section]?.title || s.section}</span>
                      <span className="text-gray-600">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-gray-500">Detected {reprocessPreview.totalSource} candidate objects with tags. Choose how to apply.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReprocessConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              {reprocessPreview.summary.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => applyReprocess('merge')}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-500"
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => applyReprocess('overwrite')}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-500"
                  >
                    Overwrite
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded shadow-lg text-sm font-medium transition-opacity ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </DndProvider>
  );
}