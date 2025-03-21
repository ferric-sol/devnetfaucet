"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface AccessRequest {
  username: string;
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

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [whitelistedUsers, setWhitelistedUsers] = useState<WhitelistedUser[]>([]);
  const [airdropHistory, setAirdropHistory] = useState<AirdropRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [requestsRes, whitelistedRes, historyRes] = await Promise.all([
          fetch('/api/admin/access-requests'),
          fetch('/api/admin/whitelisted-users'),
          fetch('/api/admin/airdrop-history')
        ]);

        if (!requestsRes.ok || !whitelistedRes.ok || !historyRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [requestsData, whitelistedData, historyData] = await Promise.all([
          requestsRes.json(),
          whitelistedRes.json(),
          historyRes.json()
        ]);

        setRequests(requestsData);
        setWhitelistedUsers(whitelistedData);
        setAirdropHistory(historyData);
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
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject request');
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
          <h2 className="text-2xl font-semibold mb-4">Access Requests</h2>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                {requests.map((request) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(request.timestamp, { addSuffix: true })}
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
                      {record.isAnonymous ? (
                        <span className="text-gray-500">Anonymous</span>
                      ) : (
                        <a 
                          href={`https://github.com/${record.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {record.username}
                        </a>
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