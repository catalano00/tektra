'use client';

import { useState } from 'react';

export default function DocparserResultsPage() {
  const [documentId, setDocumentId] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchResults() {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch(`/api/docparser-webhook?documentId=${documentId}`);
      if (!res.ok) throw new Error('Failed to fetch results');
      const data = await res.json();
      setResults(data.results);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    }

    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Docparser Results Viewer</h1>
      <div className="mb-6">
        <input
          type="text"
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          placeholder="Enter Document ID"
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