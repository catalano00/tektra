'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { computeOverallScore, badgeColor as sharedBadgeColor, PANEL_SECTION_CONFIGS, computeSectionScore } from '@/lib/scoring';
import { nextAvailableId } from '@/lib/idSuffix';

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

function CollapsibleSection({ title, children, defaultOpen = false, score }: SectionProps & { score?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  // Determine badge color based on score thresholds
  let badgeColor = '';
  if (typeof score === 'number') {
    if (score >= 95) badgeColor = 'bg-emerald-600';
    else if (score >= 80) badgeColor = 'bg-emerald-500';
    else if (score >= 60) badgeColor = 'bg-amber-500';
    else if (score > 0) badgeColor = 'bg-red-500';
    else badgeColor = 'bg-gray-400';
  }
  return (
    <div className="mb-6 border rounded">
      <button
        type="button"
        className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 hover:bg-gray-200 font-semibold text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2">
          {title}
          {typeof score === 'number' && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${badgeColor}`}
              title="Confidence score (data completeness)"
            >
              {isNaN(score) ? '–' : `${Math.round(score)}%`}
            </span>
          )}
        </span>
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

// Helper to safely format values for comparison tables
function formatValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'string') return val.length > 180 ? val.slice(0, 177) + '…' : val;
  try {
    const json = JSON.stringify(val);
    return json.length > 180 ? json.slice(0, 177) + '…' : json;
  } catch {
    return '[Unserializable]';
  }
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
  const [showDupModal, setShowDupModal] = useState(false);
  const [dupCompareLoading, setDupCompareLoading] = useState(false);
  const [dupCompareError, setDupCompareError] = useState<string | null>(null);
  const [dupCompareData, setDupCompareData] = useState<any>(null);
  const [dupActionBusy, setDupActionBusy] = useState<string | null>(null);
  const [autoSuggestion, setAutoSuggestion] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [activeOtherIndex, setActiveOtherIndex] = useState<number | null>(null);
  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const pushToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Duplicate detection state
  const [dupInfo, setDupInfo] = useState<{ stagingCount: number; productionExists: boolean } | null>(null);

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
    // Newly added schedule tagged sections
    wpschedulea: 'WPScheduleA',
    wpscheduleb: 'WPScheduleB',
    fpschedulea: 'FPScheduleA',
    fpscheduleb: 'FPScheduleB',
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

        // After loading, compute duplicate info
        if (data?.rawData?.projectnametag && data?.rawData?.panellabel) {
          const projectId = data.rawData.projectnametag;
          const panelId = data.rawData.panellabel;
          Promise.all([
            fetch('/api/staging-data').then(r => r.ok ? r.json() : []),
            fetch('/api/v1/components').then(r => r.ok ? r.json() : { components: [] })
          ]).then(([stagingAll, prod]) => {
            const stagingCount = (stagingAll || []).filter((s: any) => s.rawData?.projectnametag === projectId && s.rawData?.panellabel === panelId).length;
            const productionExists = (prod.components || []).some((c: any) => c.projectId === projectId && c.componentId === panelId);
            setDupInfo({ stagingCount, productionExists });
          }).catch(() => setDupInfo(null));
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

  const panelSectionConfigs: Record<string, { title: string; columns: { key: string; label: string; type?: string }[]; requiredKeys: string[] }> = {
    RPSheathing: {
      title: 'Roof Panel – Sheathing',
      columns: [
        { key: 'key_0', label: 'Description' },
        { key: 'key_1', label: 'Thickness' },
        { key: 'key_2', label: 'Area' },
      ],
      requiredKeys: ['key_0','key_1','key_2'],
    },
    RPPartList: {
      title: 'Roof Panel – Part List',
      columns: [
        { key: 'key_0', label: 'Type' },
        { key: 'key_1', label: 'Label' },
        { key: 'key_2', label: 'Cut Length' },
        { key: 'key_3', label: 'Count' },
      ],
      requiredKeys: ['key_0','key_1','key_2','key_3'],
    },
    FPConnectors: {
      title: 'Floor Panel – Connectors',
      columns: [
        { key: 'key_0', label: 'Label' },
        { key: 'key_1', label: 'Description' },
        { key: 'key_2', label: 'Count' },
      ],
      requiredKeys: ['key_0','key_1','key_2'],
    },
    FPPartList: {
      title: 'Floor Panel – Part List',
      columns: [
        { key: 'key_0', label: 'Type' },
        { key: 'key_1', label: 'Label' },
        { key: 'key_2', label: 'Cut Length' },
        { key: 'key_3', label: 'Count' },
      ],
      requiredKeys: ['key_0','key_1','key_2','key_3'],
    },
    FPSheathing: {
      title: 'Floor Panel – Sheathing',
      columns: [
        { key: 'key_0', label: 'Description' },
        { key: 'key_1', label: 'Area' },
        { key: 'key_2', label: '4x8 Panel Count' },
      ],
      requiredKeys: ['key_0','key_1','key_2'],
    },
    WPConnectors: {
      title: 'Wall Panel – Connectors',
      columns: [
        { key: 'key_0', label: 'Label' },
        { key: 'key_1', label: 'Count' },
      ],
      requiredKeys: ['key_0','key_1'],
    },
    WPFramingTL: {
      title: 'Wall Panel – Framing Total Length',
      columns: [
        { key: 'key_0', label: 'Type' },
        { key: 'key_1', label: 'Total Length' },
        { key: 'key_2', label: 'Count' },
      ],
      requiredKeys: ['key_0','key_1','key_2'],
    },
    WPPartList: {
      title: 'Wall Panel – Part List',
      columns: [
        { key: 'key_0', label: 'Size' },
        { key: 'key_1', label: 'Label' },
        { key: 'key_2', label: 'Count' },
        { key: 'key_3', label: 'Cut Length' },
      ],
      requiredKeys: ['key_0','key_1','key_2','key_3'],
    },
    WPSheathing: {
      title: 'Wall Panel – Sheathing',
      columns: [
        { key: 'key_0', label: 'Panel' },
        { key: 'key_1', label: 'Area' },
        { key: 'key_2', label: '4x8 Panel Count' },
      ],
      requiredKeys: ['key_0','key_1','key_2'],
    },
    // Schedule sections (5 keys each)
    WPScheduleA: {
      title: 'Wall Panel – Schedule A',
      columns: [
        { key: 'key_0', label: 'Component ID' },
        { key: 'key_1', label: 'Max Length' },
        { key: 'key_2', label: 'Max Height' },
        { key: 'key_3', label: 'SqFt' },
        { key: 'key_4', label: 'Level' },
      ],
      requiredKeys: ['key_0','key_1','key_2','key_3','key_4'],
    },
    WPScheduleB: {
      title: 'Wall Panel – Schedule B',
      columns: [
        { key: 'key_0', label: 'Component ID' },
        { key: 'key_1', label: 'Total Weight' },
      ],
      requiredKeys: ['key_0','key_1'],
    },
    FPScheduleA: {
      title: 'Floor Panel – Schedule A',
      columns: [
        { key: 'key_0', label: 'Field 1' },
        { key: 'key_1', label: 'Field 2' },
        { key: 'key_2', label: 'Field 3' },
        { key: 'key_3', label: 'Field 4' },
        { key: 'key_4', label: 'Field 5' },
      ],
      requiredKeys: ['key_0','key_1','key_2','key_3','key_4'],
    },
    FPScheduleB: {
      title: 'Floor Panel – Schedule B',
      columns: [
        { key: 'key_0', label: 'Field 1' },
        { key: 'key_1', label: 'Field 2' },
        { key: 'key_2', label: 'Field 3' },
        { key: 'key_3', label: 'Field 4' },
        { key: 'key_4', label: 'Field 5' },
      ],
      requiredKeys: ['key_0','key_1','key_2','key_3','key_4'],
    },
    timestamps: {
      title: 'Time Stamps',
      columns: [
        { key: 'key_0', label: 'Date' },
        { key: 'key_1', label: 'Description' },
      ],
      requiredKeys: ['key_0','key_1'],
    },
  };
  // Sync requiredKeys with shared config (ensure any new sections update scoring module)
  Object.keys(PANEL_SECTION_CONFIGS).forEach(k => {
    if (panelSectionConfigs[k]) {
      panelSectionConfigs[k].requiredKeys = PANEL_SECTION_CONFIGS[k].requiredKeys;
    }
  });

  // Panel type -> allowed section keys mapping
  const PANEL_TYPE_SECTIONS: Record<string, string[]> = {
    roof: ['RPSheathing','RPPartList'],
    floor: ['FPConnectors','FPPartList','FPSheathing'],
    wall: ['WPScheduleA','WPScheduleB'], // limit to schedules for wall in this view
  };
  function detectPanelType(data: any): 'roof' | 'floor' | 'wall' | null {
    const label: string = (data?.panellabel || '').toString().toLowerCase();
    const sheet: string = (data?.sheettitle || '').toString().toLowerCase();
    const source = label + ' ' + sheet;
    if (/\brp\b|roof/.test(source)) return 'roof';
    if (/\bfp\b|floor/.test(source)) return 'floor';
    if (/\bwp\b|wall/.test(source)) return 'wall';
    return null;
  }
  const panelType = detectPanelType(editableData);
  const allowedDynamicSections = panelType ? PANEL_TYPE_SECTIONS[panelType] : Object.keys(panelSectionConfigs).filter(k => k !== 'timestamps');

  // Order of display for all sections (core sections first) now filtered by panel type
  const sectionOrder = [
    'documentProperties',
    'componentDetails',
    ...(panelType==='wall' ? ['WPScheduleA','WPScheduleB'] : allowedDynamicSections),
    'timestamps',
  ];

  // Allow adding any panel section that is not present AND allowed for this panel type
  const availableSections = allowedDynamicSections;

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
    WPScheduleA: ['field1','field2','field3','field4','field5'],
    WPScheduleB: ['field1','field2','field3','field4','field5'],
    FPScheduleA: ['field1','field2','field3','field4','field5'],
    FPScheduleB: ['field1','field2','field3','field4','field5'],
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

  async function openDuplicateModal() {
    if (!id) return;
    setShowDupModal(true);
    setDupCompareLoading(true);
    setDupCompareError(null);
    try {
      const resp = await fetch(`/api/duplicates/compare/${id}`);
      if (!resp.ok) throw new Error(`Compare load failed (${resp.status})`);
      const json = await resp.json();
      setDupCompareData(json);
      // Build taken ids set
      const taken: string[] = [];
      if (json?.production?.componentId) taken.push(json.production.componentId);
      (json?.otherStaging || []).forEach((s: any) => {
        const otherId = s?.rawData?.panellabel;
        if (otherId) taken.push(otherId);
      });
      const base = json?.staging?.panellabel || editableData.panellabel;
      if (base) {
        const suggestion = nextAvailableId(base, taken);
        if (suggestion !== base) setAutoSuggestion(suggestion);
      }
    } catch (e: any) {
      setDupCompareError(e.message || 'Failed to load comparison');
    } finally {
      setDupCompareLoading(false);
    }
  }

  async function performApprove(opts: { overrideComponentId?: string; overwriteProduction?: boolean }) {
    setDupActionBusy('approve');
    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { ...editableData, panellabel: editableData.panellabel },
          stagingId: id,
          overrideComponentId: opts.overrideComponentId,
          overwriteProduction: opts.overwriteProduction || false,
          user: 'system'
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 409 && err.error === 'DUPLICATE_COMPONENT') {
          // Keep modal open, refresh comparison in case of race
          await openDuplicateModal();
          throw new Error('Duplicate still exists – choose another action');
        }
        throw new Error(err.error || 'Approve failed');
      }
      pushToast('Approved', 'success');
      setShowDupModal(false);
      router.push('/production-planning/data-review');
    } catch (e: any) {
      pushToast(e.message || String(e), 'error');
    } finally {
      setDupActionBusy(null);
    }
  }

  async function handleReject() {
    if (!id) return;
    if (!confirm('Reject this staging record?')) return;
    setDupActionBusy('reject');
    try {
      const resp = await fetch(`/api/staging-data/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawData: editableData, status: 'rejected', user: 'system' }) });
      if (!resp.ok) throw new Error('Reject failed');
      pushToast('Rejected', 'success');
      setShowDupModal(false);
      router.push('/production-planning/data-review');
    } catch (e: any) {
      pushToast(e.message || 'Reject failed', 'error');
    } finally {
      setDupActionBusy(null);
    }
  }

  // Compute confidence scores for each dynamic panel section (using shared computeSectionScore)
  const sectionScores = (() => {
    const scores: Record<string, number> = {};
    allowedDynamicSections.forEach(sectionKey => {
      const rows = editableData[sectionKey];
      if (!Array.isArray(rows) || rows.length === 0) {
        scores[sectionKey] = 0;
        return;
      }
      scores[sectionKey] = computeSectionScore(rows, PANEL_SECTION_CONFIGS[sectionKey]);
    });
    return scores;
  })();

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="min-h-screen w-full flex flex-col items-center bg-white p-4 lg:p-8">
        {dupInfo && (dupInfo.stagingCount > 1 || dupInfo.productionExists) && (
          <div className="w-full max-w-[1800px] mb-4 p-4 border rounded-lg bg-rose-50 border-rose-200 text-rose-800 flex flex-col gap-2">
            <div className="font-semibold flex items-center gap-2">
              <span className="inline-block px-2 py-0.5 rounded bg-rose-600 text-white text-xs">DUPLICATE WARNING</span>
              Potential duplicate detected for Panel ID <span className="font-mono">{editableData?.panellabel}</span> in project <span className="font-mono">{editableData?.projectnametag}</span>.
            </div>
            <div className="text-sm flex flex-wrap gap-4">
              <span>Staging occurrences: <strong>{dupInfo.stagingCount}</strong></span>
              <span>Production exists: <strong>{dupInfo.productionExists ? 'Yes' : 'No'}</strong></span>
            </div>
            <div className="text-xs text-rose-700">Resolve duplicates before approval to avoid rejection (per-project uniqueness enforced).</div>
          </div>
        )}
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
                  <CollapsibleSection title="Document Properties" defaultOpen={false} key={sectionKey} score={100}>
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
                  <CollapsibleSection title="Component Details" defaultOpen key={sectionKey} score={
                    (['projectnametag','panellabel','sheettitle'].filter(k => (editableData[k] || '').toString().trim() !== '').length / 3) * 100
                  }>
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
                  <CollapsibleSection title={cfg.title} defaultOpen key={sectionKey} score={sectionScores[sectionKey]}>
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
        {dupInfo && (dupInfo.stagingCount > 1 || dupInfo.productionExists) && (
          // Inline override section removed – users must use Duplicate Resolution modal now
          <></>
        )}
        <div 
          className="w-full flex justify-end gap-4 mt-2"
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
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ data: { ...editableData, panellabel: editableData.panellabel }, stagingId: id, overrideComponentId: editableData.__overrideComponentId?.trim() || undefined }),
                });
                if (!response.ok) {
                  const errorData = await response.json();
                  if (response.status === 409 && errorData.error === 'DUPLICATE_COMPONENT') {
                    pushToast('Duplicate detected – open resolver', 'error');
                    await openDuplicateModal();
                    return;
                  }
                  throw new Error(errorData.error || 'Failed to approve data');
                }
                const result = await response.json();
                pushToast(result.message || 'Approved', 'success');
                router.push('/production-planning/data-review');
              } catch (error: any) {
                pushToast(`Failed to approve data: ${error.message || 'Unknown error'}`, 'error');
              }
            }}
          >
            Approve
          </button>
          {dupInfo && (dupInfo.stagingCount > 1 || dupInfo.productionExists) ? (
            <button
              type="button"
              className="bg-red-600 text-white font-semibold px-6 py-2 rounded hover:bg-red-700 transition"
              onClick={() => { openDuplicateModal(); }}
            >
              Resolve Duplicates
            </button>
          ) : (
            <button
              type="button"
              className="bg-red-600 text-white font-semibold px-6 py-2 rounded hover:bg-red-700 transition"
              onClick={handleReject}
            >
              Reject
            </button>
          )}
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
      {showDupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Duplicate Resolution</h2>
              <div className="flex items-center gap-2">
                {dupCompareData && (
                  <button onClick={() => setShowComparison(s => !s)} className="text-xs px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100">
                    {showComparison ? 'Hide' : 'Show'} Comparison
                  </button>
                )}
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowDupModal(false)}>✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              {dupCompareLoading && <div>Loading comparison…</div>}
              {dupCompareError && <div className="text-red-600">{dupCompareError}</div>}
              {!dupCompareLoading && !dupCompareError && dupCompareData && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="text-sm font-semibold mb-2">Staging</h3>
                      <div className="text-xs text-gray-600">
                        <div><strong>ID:</strong> {dupCompareData.staging?.id}</div>
                        <div><strong>Panel Label:</strong> {dupCompareData.staging?.panellabel}</div>
                        <div><strong>Project Name Tag:</strong> {dupCompareData.staging?.projectnametag}</div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="text-sm font-semibold mb-2">Production</h3>
                      <div className="text-xs text-gray-600">
                        <div><strong>ID:</strong> {dupCompareData.production?.id}</div>
                        <div><strong>Component ID:</strong> {dupCompareData.production?.componentId}</div>
                        <div><strong>Project ID:</strong> {dupCompareData.production?.projectId}</div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="text-sm font-semibold mb-2">Other Staging</h3>
                      <div className="text-xs text-gray-600">
                        {dupCompareData.otherStaging?.map((o: any, idx: number) => (
                          <div key={o.id} className="mb-1">
                            <strong>#{idx + 1}:</strong> {o.id}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {showComparison && (
                    <div className="space-y-5">
                      {/* Other staging duplicates navigation */}
                      {dupCompareData.otherStaging?.length > 0 && (
                        <div className="border rounded p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Other Staging Duplicates</h4>
                            <div className="flex flex-wrap gap-2">
                              {dupCompareData.otherStaging.map((o: any, idx: number) => (
                                <button
                                  key={o.id}
                                  onClick={() => setActiveOtherIndex(idx === activeOtherIndex ? null : idx)}
                                  className={`px-2 py-1 text-[10px] rounded border ${idx === activeOtherIndex ? 'bg-rose-600 text-white border-rose-600' : 'bg-white hover:bg-rose-50 border-rose-300 text-rose-700'}`}
                                  title={o.id}
                                >{idx+1}</button>
                              ))}
                            </div>
                          </div>
                          {activeOtherIndex !== null && dupCompareData.otherStaging[activeOtherIndex] && (
                            <div className="mt-2 text-[11px] overflow-auto max-h-60">
                              {(() => {
                                const other = dupCompareData.otherStaging[activeOtherIndex];
                                const rows: Array<{ path: string; a: any; b: any }>[] = [] as any;
                                // shallow compare of top-level values between target staging & this other staging rawData
                                const aData = dupCompareData.staging || {};
                                const bData = other.rawData || {};
                                const keys = Array.from(new Set([...Object.keys(aData), ...Object.keys(bData)])).slice(0, 200); // cap
                                return (
                                  <table className="w-full border">
                                    <thead className="bg-gray-100 text-[10px]">
                                      <tr>
                                        <th className="px-2 py-1 text-left">Field</th>
                                        <th className="px-2 py-1 text-left">This Staging</th>
                                        <th className="px-2 py-1 text-left">Other #{activeOtherIndex+1}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {keys.map(k => {
                                        const av = (aData as any)[k];
                                        const bv = (bData as any)[k];
                                        const same = JSON.stringify(av) === JSON.stringify(bv);
                                        return (
                                          <tr key={k} className={`border-t ${same ? '' : 'bg-amber-50'}`}> 
                                            <td className="px-2 py-1 align-top whitespace-nowrap font-mono text-[10px]">{k}</td>
                                            <td className="px-2 py-1 align-top max-w-[240px] break-words">{formatValue(av)}</td>
                                            <td className="px-2 py-1 align-top max-w-[240px] break-words">{formatValue(bv)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Section Data Comparison (staging vs production) */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Section Data Comparison</h3>
                        <span className="text-[10px] text-gray-500">Staging vs Production</span>
                      </div>
                      {(() => {
                        // Build normalized staging side from editableData (already structured)
                        const stagingSections: { key: string; title: string; rows: any[]; columns: string[] }[] = [];
                        const pushIf = (key: string, title: string, rows: any[], columns: string[]) => { if (rows && rows.length) stagingSections.push({ key, title, rows, columns }); };
                        pushIf('part', 'Part List', editableData.RPPartList || editableData.FPPartList || editableData.WPPartList || [], ['key_0','key_1','key_2','key_3']);
                        pushIf('sheathing', 'Sheathing', (editableData.RPSheathing || editableData.FPSheathing || editableData.WPSheathing || []), ['key_0','key_1','key_2','key_3']);
                        pushIf('connectors', 'Connectors', (editableData.RPConnectors || editableData.FPConnectors || editableData.WPConnectors || []), ['key_0','key_1','key_2']);
                        pushIf('framingTL', 'Framing Total Length', (editableData.WPFramingTL || []), ['key_0','key_1','key_2']);
                        // Production side
                        const prod = dupCompareData.production || {};
                        const prodData: Record<string, any> = {
                          part: Array.isArray(prod.part) ? prod.part.map((p: any) => ({ size: p.size, label: p.label, count: p.count, cutLength: p.cutLength })) : [],
                          sheathing: prod.sheathing ? [{ componentCode: prod.sheathing.componentCode, panelArea: prod.sheathing.panelArea, count: prod.sheathing.count, description: prod.sheathing.description }] : [],
                          connectors: prod.connectors ? [{ label: prod.connectors.label, description: prod.connectors.description, count: prod.connectors.count }] : [],
                          framingTL: prod.framingTL ? [{ ftype: prod.framingTL.ftype, totalLength: prod.framingTL.totalLength, count: prod.framingTL.count }] : [],
                        };
                        const sectionOrderLocal: { key: string; title: string }[] = [
                          { key: 'part', title: 'Part List' },
                          { key: 'sheathing', title: 'Sheathing' },
                          { key: 'connectors', title: 'Connectors' },
                          { key: 'framingTL', title: 'Framing Total Length' },
                        ];
                        return sectionOrderLocal.map(sec => {
                          const stagingSec = stagingSections.find(s => s.key === sec.key);
                          const stagingRows = stagingSec?.rows || [];
                          const prodRows = prodData[sec.key] || [];
                          const heading = sec.title;
                          return (
                            <div key={sec.key} className="border rounded-lg overflow-hidden">
                              <div className="px-3 py-2 bg-gray-100 flex items-center justify-between">
                                <div className="font-medium text-xs">{heading}</div>
                                <div className="text-[10px] text-gray-600">Staging {stagingRows.length} • Production {prodRows.length}</div>
                              </div>
                              <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x">
                                <div className="p-3 overflow-auto max-h-56">
                                  <div className="text-[10px] uppercase tracking-wide font-semibold mb-1 text-gray-500">Staging</div>
                                  {stagingRows.length === 0 && <div className="text-[11px] text-gray-400">No rows</div>}
                                  {stagingRows.length > 0 && (
                                    <table className="w-full text-[11px] border">
                                      <thead className="bg-white">
                                        <tr>
                                          {Object.keys(stagingRows[0]).map(col => (<th key={col} className="px-2 py-1 text-left font-medium border-b bg-gray-50">{col}</th>))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {stagingRows.map((r:any, i:number) => (
                                          <tr key={i} className="border-t">
                                            {Object.keys(stagingRows[0]).map(col => (<td key={col} className="px-2 py-1 align-top border-r last:border-r-0">{r[col] ?? '—'}</td>))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                                <div className="p-3 overflow-auto max-h-56">
                                  <div className="text-[10px] uppercase tracking-wide font-semibold mb-1 text-gray-500">Production</div>
                                  {prodRows.length === 0 && <div className="text-[11px] text-gray-400">No rows</div>}
                                  {prodRows.length > 0 && (
                                    <table className="w-full text-[11px] border">
                                      <thead className="bg-white">
                                        <tr>
                                          {Object.keys(prodRows[0]).map(col => (<th key={col} className="px-2 py-1 text-left font-medium border-b bg-gray-50">{col}</th>))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {prodRows.map((r:any, i:number) => (
                                          <tr key={i} className="border-t">
                                            {Object.keys(prodRows[0]).map(col => (
                                              <td key={col} className={`px-2 py-1 align-top border-r last:border-r-0 ${stagingRows.some((sr:any) => JSON.stringify(sr) === JSON.stringify(r)) ? '' : 'bg-amber-50'}`}>{r[col] ?? '—'}</td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                  <div className="border rounded p-4 bg-amber-50 text-amber-800 text-xs">
                    Choose an action below to resolve the duplicate. Overwrite will replace production component related rows.
                  </div>
                  {/* Action Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded p-4 flex flex-col gap-3">
                      <div className="font-semibold text-sm">Override / Keep Both</div>
                      <label className="text-xs font-medium text-gray-600">New Panel ID</label>
                      <input
                        type="text"
                        value={editableData.__overrideComponentId || ''}
                        onChange={e => { const v = e.target.value; setEditableData({ ...editableData, __overrideComponentId: v }); }}
                        placeholder={autoSuggestion || 'Enter unique ID'}
                        className="border rounded px-2 py-1 text-sm"
                      />
                      {autoSuggestion && !editableData.__overrideComponentId && (
                        <button type="button" className="self-start text-xs text-blue-600 underline" onClick={() => setEditableData({ ...editableData, __overrideComponentId: autoSuggestion })}>Use suggestion {autoSuggestion}</button>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        <button disabled={dupActionBusy!==null} onClick={() => performApprove({ overrideComponentId: editableData.__overrideComponentId?.trim() || autoSuggestion || undefined })} className="px-3 py-1.5 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-500 disabled:opacity-50">Approve With New ID</button>
                        <button disabled={dupActionBusy!==null} onClick={() => performApprove({ overrideComponentId: autoSuggestion || nextAvailableId(editableData.panellabel, [editableData.panellabel, autoSuggestion].filter(Boolean) as string[]) })} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-50">Auto-Suffix & Approve</button>
                      </div>
                    </div>
                    <div className="border rounded p-4 flex flex-col gap-3">
                      <div className="font-semibold text-sm text-red-700">Destructive Options</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button disabled={dupActionBusy!==null} onClick={handleReject} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50">Reject</button>
                        <button disabled={dupActionBusy!==null || !dupCompareData.production} onClick={() => { if (confirm('Overwrite existing production component & related rows?')) performApprove({ overwriteProduction: true }); }} className="px-3 py-1.5 rounded bg-orange-600 text-white text-xs font-medium hover:bg-orange-500 disabled:opacity-50">Overwrite Production</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                type="button"
                onClick={() => setShowDupModal(false)}
                className="px-3 py-1.5 text-xs font-medium bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
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