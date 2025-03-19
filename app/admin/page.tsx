"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from 'date-fns';

interface AccessRequest {
  username: string;
  timestamp: number;
}

interface WhitelistedUser {
  username: string;
  approvedAt: number;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [whitelistedUsers, setWhitelistedUsers] = useState<WhitelistedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [requestsRes, whitelistRes] = await Promise.all([
          fetch('/api/admin/access-requests'),
          fetch('/api/admin/whitelisted-users')
        ]);

        if (!requestsRes.ok || !whitelistRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [requests, whitelist] = await Promise.all([
          requestsRes.json(),
          whitelistRes.json()
        ]);

        setAccessRequests(requests);
        setWhitelistedUsers(whitelist);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleApprove = async (username: string) => {
    try {
      const response = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!response.ok) throw new Error('Failed to approve request');

      // Update local state
      setAccessRequests(prev => prev.filter(req => req.username !== username));
      const newWhitelistedUser = {
        username,
        approvedAt: Date.now()
      };
      setWhitelistedUsers(prev => [...prev, newWhitelistedUser]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  const handleReject = async (username: string) => {
    try {
      const response = await fetch('/api/admin/reject-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!response.ok) throw new Error('Failed to reject request');

      // Update local state
      setAccessRequests(prev => prev.filter(req => req.username !== username));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    }
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Please sign in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
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
        <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

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
                {accessRequests.map((request) => (
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
      </div>
    </div>
  );
} 