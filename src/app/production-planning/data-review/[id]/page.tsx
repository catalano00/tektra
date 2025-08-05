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

  useEffect(() => {
    async function fetchBlob() {
      try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch file');
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    }

    fetchBlob();

    // Cleanup the object URL when the component is unmounted
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url]);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!blobUrl) {
    return <div className="text-gray-500">Loading file...</div>;
  }

  return (
    <iframe
      src={blobUrl}
      title="File Viewer"
      className="w-full h-full"
      style={{
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
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
      setLeftWidth(Math.max(400, Math.min(900, startWidth + dx))); // Min/max width
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

  const renamedSections: Record<string, string> = {
    framingtl: 'Framing Total Length',
    timestamps: 'Time Stamps',
    assemblypartlist: 'Assembly Part List',
  };

  const sectionOrder = ['documentProperties', 'componentDetails', 'assemblypartlist', 'framingtl', 'timestamps'];

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="min-h-screen w-full flex flex-col items-center bg-white p-8">
        <h1 className="text-2xl font-bold mb-4">File Details</h1>
        <div
          ref={containerRef}
          className="w-full max-w-[1800px] flex flex-row gap-0 relative"
          style={{ userSelect: isResizing.current ? 'none' : 'auto' }}
        >
          {/* Left Panel */}
          <div
            className="bg-white shadow-lg border rounded-xl px-8 py-6 overflow-y-auto flex flex-col text-sm" // Added `text-sm` here
            style={{
              width: leftWidth,
              minWidth: 400,
              maxWidth: 900,
              height: 'calc(75vh + 100px)',
              transition: isResizing.current ? 'none' : 'width 0.2s',
            }}
          >
            {sectionOrder.map((sectionKey) => {
              if (sectionKey === 'documentProperties') {
                return (
                  <CollapsibleSection title="Document Properties" defaultOpen={false} key={sectionKey}>
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
              } else if (sectionKey === 'assemblypartlist') {
                return (
                  <CollapsibleSection title="Assembly Part List" defaultOpen key={sectionKey}>
                    <EditableTable
                      columns={[
                        { key: 'key_0', label: 'Size' },
                        { key: 'key_1', label: 'Label' },
                        { key: 'key_2', label: 'Count' },
                        { key: 'key_3', label: 'Cut Length' },
                      ]}
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
                          [sectionKey]: [...editableData[sectionKey], {}],
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
              } else if (sectionKey === 'framingtl') {
                return (
                  <CollapsibleSection title="Framing Total Length" defaultOpen key={sectionKey}>
                    <EditableTable
                      columns={[
                        { key: 'key_0', label: 'Type' },
                        { key: 'key_1', label: 'Total Length' },
                        { key: 'key_2', label: 'Count' },
                      ]}
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
                          [sectionKey]: [...editableData[sectionKey], {}],
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
              } else if (sectionKey === 'timestamps') {
                return (
                  <CollapsibleSection title="Time Stamps" defaultOpen key={sectionKey}>
                    <EditableTable
                      columns={[
                        { key: 'key_0', label: 'Date' },
                        { key: 'key_1', label: 'Description' },
                      ]}
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
                          [sectionKey]: [...editableData[sectionKey], {}],
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
              } else {
                return (
                  <CollapsibleSection title={renamedSections[sectionKey] || sectionKey} defaultOpen key={sectionKey}>
                    {Array.isArray(editableData[sectionKey]) ? (
                      <EditableTable
                        columns={Object.keys(editableData[sectionKey][0] || {}).map((col) => ({
                          key: col,
                          label: col,
                        }))}
                        data={editableData[sectionKey]}
                        onChange={(rowIdx, col, val) => {
                          const updated = editableData[sectionKey].map((row: any, idx: number) =>
                            idx === rowIdx ? { ...row, [col]: val } : row
                          );
                          setEditableData({ ...editableData, [sectionKey]: updated });
                        }}
                        onAdd={() =>
                          setEditableData({
                            ...editableData,
                            [sectionKey]: [...editableData[sectionKey], {}],
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
                    ) : (
                      <textarea
                        value={JSON.stringify(editableData[sectionKey], null, 2)}
                        onChange={(e) =>
                          setEditableData({
                            ...editableData,
                            [sectionKey]: JSON.parse(e.target.value),
                          })
                        }
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                        rows={5}
                      />
                    )}
                  </CollapsibleSection>
                );
              }
            })}
          </div>
          {/* Drag Handle */}
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
          {/* Right Panel */}
          <div
            className="flex-1 bg-white shadow-lg border rounded-xl flex flex-col items-center"
            style={{ minWidth: 250 }}
          >
            <BlobFileViewer url={editableData.media_link} />
          </div>
        </div>
        {/* Action Buttons */}
        <div className="w-full max-w-[1800px] flex justify-end gap-4 mt-8">
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
                  body: JSON.stringify({ data: editableData }), // Send editableData to the API
                });

                if (!response.ok) {
                  throw new Error('Failed to approve data');
                }

                const result = await response.json();
                alert(result.message); // Show success message
                router.push('/production-planning/data-review'); // Navigate back to the data review page
              } catch (error) {
                console.error('Error approving data:', error);
                alert('Failed to approve data');
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
            onClick={() => {
              /* handle save logic */
            }}
          >
            Save
          </button>
        </div>
      </main>
    </DndProvider>
  );
}