"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface AccessRequest {
  username: string;
  reason: string;
  timestamp: number;
}

interface WhitelistedUser {
  username: string;
  approvedAt: number;
}

interface AirdropRecord {
  username: string;
  walletAddress: string;
  timestamp: number;
  isAnonymous?: boolean;
}

interface RejectedUser {
  username: string;
  rejectedAt: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [whitelistedUsers, setWhitelistedUsers] = useState<WhitelistedUser[]>([]);
  const [airdropHistory, setAirdropHistory] = useState<AirdropRecord[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<RejectedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dedupeStatus, setDedupeStatus] = useState<{
    originalCount: number;
    dedupedCount: number;
    removedCount: number;
  } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [requestsRes, whitelistedRes, historyRes, rejectedRes] = await Promise.all([
          fetch('/api/admin/access-requests'),
          fetch('/api/admin/whitelisted-users'),
          fetch('/api/admin/airdrop-history'),
          fetch('/api/admin/rejected-users')
        ]);

        if (!requestsRes.ok || !whitelistedRes.ok || !historyRes.ok || !rejectedRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [requestsData, whitelistedData, historyData, rejectedData] = await Promise.all([
          requestsRes.json(),
          whitelistedRes.json(),
          historyRes.json(),
          rejectedRes.json()
        ]);

        setRequests(requestsData);
        setWhitelistedUsers(whitelistedData);
        setAirdropHistory(historyData);
        setRejectedUsers(rejectedData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleApprove = async (username: string) => {
    try {
      const res = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!res.ok) throw new Error('Failed to approve request');

      // Update local state
      setRequests(prev => prev.filter(req => req.username !== username));
      setWhitelistedUsers(prev => [...prev, { username, approvedAt: Date.now() }]);
    } catch (error) {
      console.error('Error approving request:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve request');
    }
  };

  const handleReject = async (username: string) => {
    try {
      const res = await fetch('/api/admin/reject-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!res.ok) throw new Error('Failed to reject request');

      // Update local state
      setRequests(prev => prev.filter(req => req.username !== username));
      setRejectedUsers(prev => [...prev, { username, rejectedAt: Date.now() }]);
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject request');
    }
  };

  const handleDedupe = async () => {
    try {
      const res = await fetch('/api/admin/dedupe-requests', {
        method: 'POST'
      });

      if (!res.ok) throw new Error('Failed to dedupe requests');

      const data = await res.json();
      setDedupeStatus(data);
      
      // Refresh the requests list
      const requestsRes = await fetch('/api/admin/access-requests');
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData);
      }
    } catch (error) {
      console.error('Error deduping requests:', error);
    }
  };

  const handleRejectWhitelisted = async (username: string) => {
    try {
      const res = await fetch('/api/admin/reject-whitelisted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!res.ok) throw new Error('Failed to reject whitelisted user');

      // Update local state
      setWhitelistedUsers(prev => prev.filter(user => user.username !== username));
      setRejectedUsers(prev => [...prev, { username, rejectedAt: Date.now() }]);
    } catch (error) {
      console.error('Error rejecting whitelisted user:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject whitelisted user');
    }
  };

  const handleApproveRejected = async (username: string) => {
    try {
      const res = await fetch('/api/admin/approve-rejected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!res.ok) throw new Error('Failed to approve rejected user');

      // Update local state
      setRejectedUsers(prev => prev.filter(user => user.username !== username));
      setWhitelistedUsers(prev => [...prev, { username, approvedAt: Date.now() }]);
    } catch (error) {
      console.error('Error approving rejected user:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve rejected user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Access Requests Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Access Requests</h2>
            <button
              onClick={handleDedupe}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Deduplicate Requests
            </button>
          </div>
          {dedupeStatus && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
              Deduplication complete:
              <ul className="list-disc list-inside">
                <li>Original requests: {dedupeStatus.originalCount}</li>
                <li>After deduplication: {dedupeStatus.dedupedCount}</li>
                <li>Removed duplicates: {dedupeStatus.removedCount}</li>
              </ul>
            </div>
          )}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Previous Rejection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                {requests.map((request) => {
                  const previousRejection = rejectedUsers.find(
                    user => user.username === request.username
                  );
                  return (
                    <tr key={request.username}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a 
                          href={`https://github.com/${request.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {request.username}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-md">
                        {request.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(request.timestamp, { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {previousRejection ? (
                          <span className="text-red-500">
                            Rejected {formatDistanceToNow(previousRejection.rejectedAt, { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-gray-400">No previous rejections</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleApprove(request.username)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.username)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rejected Users Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Rejected Users</h2>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rejected</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rejectedUsers.map((user) => (
                  <tr key={user.username}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={`https://github.com/${user.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {user.username}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(user.rejectedAt, { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleApproveRejected(user.username)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Whitelisted Users Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Whitelisted Users</h2>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Approved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                {whitelistedUsers.map((user) => (
                  <tr key={user.username}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={`https://github.com/${user.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {user.username}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(user.approvedAt, { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleRejectWhitelisted(user.username)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Airdrop History Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Complete Airdrop History</h2>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Wallet Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                {airdropHistory.map((record) => (
                  <tr key={`${record.username}-${record.timestamp}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={`https://github.com/${record.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {record.username}
                      </a>
                      {record.isAnonymous && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          (Anonymous)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono">
                      {record.walletAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDistanceToNow(record.timestamp, { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.isAnonymous ? (
                        <span className="text-gray-500">Anonymous</span>
                      ) : (
                        <span className="text-green-500">Public</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 