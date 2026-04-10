import React, { useState } from 'react';

const FollowupsDebug: React.FC<{ leadId: string }> = ({ leadId }) => {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const testFollowupsAPI = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/leads/${leadId}/followups`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      console.log('Direct API response:', data);
      setResponse(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-900/20">
      <h3 className="text-lg font-bold mb-2">Followups API Debug</h3>
      <p className="text-sm mb-2">Lead ID: {leadId}</p>
      <button
        onClick={testFollowupsAPI}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {response && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Response:</h4>
          <pre className="p-3 bg-gray-100 dark:bg-gray-800 rounded overflow-auto text-xs">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default FollowupsDebug;
