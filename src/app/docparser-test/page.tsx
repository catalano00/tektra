'use client';

import { useState } from 'react';

export default function DocparserTestPage() {
  const [documentId, setDocumentId] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parserId, setParserId] = useState('');
  const [uploadResult, setUploadResult] = useState<any>(null);

  async function fetchResults() {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch(`/api/docparser?documentId=${documentId}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    }
    setLoading(false);
  }

  async function uploadFile() {
    if (!file || !parserId) {
      setError('File and parser ID required');
      return;
    }
    setLoading(true);
    setError('');
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/docparser?parserId=${parserId}`, {
        method: 'PUT',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload error');
      const data = await res.json();
      setUploadResult(data);
      if (data.id) setDocumentId(data.id); // Optionally set documentId for quick testing
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Docparser API Test</h1>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Upload File</h2>
        <input
          type="text"
          value={parserId}
          onChange={e => setParserId(e.target.value)}
          placeholder="Enter Parser ID"
          className="border px-3 py-2 rounded w-full mb-2"
        />
        <input
          type="file"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="mb-2"
        />
        <button
          onClick={uploadFile}
          className="bg-green-600 text-white px-4 py-2 rounded"
          disabled={loading || !file || !parserId}
        >
          {loading ? 'Uploading...' : 'Upload File'}
        </button>
        {uploadResult && (
          <pre className="bg-gray-100 p-4 mt-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(uploadResult, null, 2)}
          </pre>
        )}
      </div>
      <hr className="my-6" />
      <div>
        <h2 className="text-lg font-semibold mb-2">Fetch Results</h2>
        <input
          type="text"
          value={documentId}
          onChange={e => setDocumentId(e.target.value)}
          placeholder="Enter Docparser Document ID"
          className="border px-3 py-2 rounded w-full mb-4"
        />
        <button
          onClick={fetchResults}
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading || !documentId}
        >
          {loading ? 'Loading...' : 'Fetch Results'}
        </button>
        {error && <div className="text-red-500 mt-4">{error}</div>}
        {results && (
          <pre className="bg-gray-100 p-4 mt-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}