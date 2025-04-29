"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

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

interface UpgradedUser {
  username: string;
  upgradedAt: number;
}

interface VouchRecord {
  username: string;
  vouchedBy: string;
  timestamp: number;
  voucherType: 'github' | 'upgraded';
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [whitelistedUsers, setWhitelistedUsers] = useState<WhitelistedUser[]>([]);
  const [upgradedUsers, setUpgradedUsers] = useState<UpgradedUser[]>([]);
  const [airdropHistory, setAirdropHistory] = useState<AirdropRecord[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<RejectedUser[]>([]);
  const [vouchRequests, setVouchRequests] = useState<string[]>([]);
  const [vouchedUsers, setVouchedUsers] = useState<VouchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeUsername, setUpgradeUsername] = useState('');
  const [upgradeMessage, setUpgradeMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dedupeStatus, setDedupeStatus] = useState<{
    originalCount: number;
    dedupedCount: number;
    removedCount: number;
  } | null>(null);
  const [testUserToRemove, setTestUserToRemove] = useState('');
  const [removeUserMessage, setRemoveUserMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          requestsRes, 
          whitelistedRes, 
          historyRes, 
          rejectedRes, 
          upgradedRes,
          vouchRequestsRes,
          vouchedUsersRes
        ] = await Promise.all([
          fetch('/api/admin/access-requests'),
          fetch('/api/admin/whitelisted-users'),
          fetch('/api/admin/airdrop-history'),
          fetch('/api/admin/rejected-users'),
          fetch('/api/admin/upgraded-users'),
          fetch('/api/admin/vouch-requests'),
          fetch('/api/admin/vouched-users')
        ]);

        if (!requestsRes.ok || !whitelistedRes.ok || !historyRes.ok || 
            !rejectedRes.ok || !upgradedRes.ok || !vouchRequestsRes.ok || 
            !vouchedUsersRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [
          requestsData, 
          whitelistedData, 
          historyData, 
          rejectedData, 
          upgradedData,
          vouchRequestsData,
          vouchedUsersData
        ] = await Promise.all([
          requestsRes.json(),
          whitelistedRes.json(),
          historyRes.json(),
          rejectedRes.json(),
          upgradedRes.json(),
          vouchRequestsRes.json(),
          vouchedUsersRes.json()
        ]);

        setRequests(requestsData);
        setWhitelistedUsers(whitelistedData);
        setAirdropHistory(historyData);
        setRejectedUsers(rejectedData);
        setUpgradedUsers(upgradedData);
        setVouchRequests(vouchRequestsData);
        setVouchedUsers(vouchedUsersData);
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

  const handleUpgradeUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeUsername.trim()) return;
    
    setProcessing(true);
    setUpgradeMessage(null);
    
    try {
      const res = await fetch('/api/admin/add-upgraded-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: upgradeUsername.trim() })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        // Add the new user to the local state
        setUpgradedUsers(prev => [...prev, { 
          username: upgradeUsername.trim().toLowerCase(), 
          upgradedAt: Date.now() 
        }]);
        setUpgradeMessage({ type: 'success', text: data.message });
        setUpgradeUsername('');
      } else {
        setUpgradeMessage({ type: 'error', text: data.message || 'Failed to upgrade user' });
      }
    } catch (error) {
      console.error('Error upgrading user:', error);
      setUpgradeMessage({ type: 'error', text: 'An error occurred while upgrading user' });
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveUpgradedUser = async (username: string) => {
    try {
      const res = await fetch('/api/admin/remove-upgraded-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (res.ok) {
        // Update local state
        setUpgradedUsers(prev => prev.filter(user => user.username !== username));
      }
    } catch (error) {
      console.error('Error removing upgraded user:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove upgraded user');
    }
  };

  const handleApproveVouch = async (username: string) => {
    try {
      const res = await fetch('/api/admin/approve-vouch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!res.ok) throw new Error('Failed to approve vouch request');

      // Update local state
      setVouchRequests(prev => prev.filter(req => req !== username));
      
      // Add to vouched users
      setVouchedUsers(prev => [...prev, {
        username,
        vouchedBy: 'ADMIN',
        timestamp: Date.now(),
        voucherType: 'upgraded'
      }]);
    } catch (error) {
      console.error('Error approving vouch request:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve vouch request');
    }
  };

  const handleRejectVouch = async (username: string) => {
    try {
      const res = await fetch('/api/admin/reject-vouch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!res.ok) throw new Error('Failed to reject vouch request');

      // Update local state
      setVouchRequests(prev => prev.filter(req => req !== username));
    } catch (error) {
      console.error('Error rejecting vouch request:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject vouch request');
    }
  };

  const handleUnvouch = async (username: string) => {
    try {
      const res = await fetch('/api/admin/unvouch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!res.ok) throw new Error('Failed to unvouch user');

      // Update local state
      setVouchedUsers(prev => prev.filter(user => user.username !== username));
    } catch (error) {
      console.error('Error unvouching user:', error);
      setError(error instanceof Error ? error.message : 'Failed to unvouch user');
    }
  };

  const handleRemoveTestUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUserToRemove.trim()) return;
    
    setProcessing(true);
    setRemoveUserMessage(null);
    
    try {
      const res = await fetch('/api/admin/remove-test-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUserToRemove.trim() })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove test user');
      }
      
      setRemoveUserMessage({ 
        type: 'success', 
        text: `User ${testUserToRemove} successfully removed. Records removed: ${
          Object.entries(data.removedRecords)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        }` 
      });
      setTestUserToRemove('');
      
      // Refresh all data
      const [
        requestsRes, 
        whitelistedRes, 
        historyRes, 
        rejectedRes, 
        upgradedRes,
        vouchRequestsRes,
        vouchedUsersRes
      ] = await Promise.all([
        fetch('/api/admin/access-requests'),
        fetch('/api/admin/whitelisted-users'),
        fetch('/api/admin/airdrop-history'),
        fetch('/api/admin/rejected-users'),
        fetch('/api/admin/upgraded-users'),
        fetch('/api/admin/vouch-requests'),
        fetch('/api/admin/vouched-users')
      ]);

      if (requestsRes.ok && whitelistedRes.ok && historyRes.ok && 
          rejectedRes.ok && upgradedRes.ok && vouchRequestsRes.ok && 
          vouchedUsersRes.ok) {
        
        const [
          requestsData, 
          whitelistedData, 
          historyData, 
          rejectedData, 
          upgradedData,
          vouchRequestsData,
          vouchedUsersData
        ] = await Promise.all([
          requestsRes.json(),
          whitelistedRes.json(),
          historyRes.json(),
          rejectedRes.json(),
          upgradedRes.json(),
          vouchRequestsRes.json(),
          vouchedUsersRes.json()
        ]);

        setRequests(requestsData);
        setWhitelistedUsers(whitelistedData);
        setAirdropHistory(historyData);
        setRejectedUsers(rejectedData);
        setUpgradedUsers(upgradedData);
        setVouchRequests(vouchRequestsData);
        setVouchedUsers(vouchedUsersData);
      }
    } catch (error) {
      console.error('Error removing test user:', error);
      setRemoveUserMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'An error occurred' 
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>

        {/* Add remove test user section before other content */}
        <div className="mb-8 p-4 border rounded-lg bg-white dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Remove Test User</h2>
          <form onSubmit={handleRemoveTestUser} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={testUserToRemove}
                onChange={(e) => setTestUserToRemove(e.target.value)}
                placeholder="GitHub username to remove"
                className="flex-1 p-2 border rounded"
                disabled={processing}
              />
              <Button type="submit" disabled={processing || !testUserToRemove.trim()}>
                {processing ? 'Removing...' : 'Remove User'}
              </Button>
            </div>
          </form>
          
          {removeUserMessage && (
            <div className={`p-3 rounded ${
              removeUserMessage.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300' 
                : 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
            }`}>
              {removeUserMessage.text}
            </div>
          )}
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            This will completely remove a user from the system, including cooldowns, vouched status, whitelist status, and airdrop history.
            Use this for testing purposes only.
          </p>
        </div>

        {/* Access Requests Section */}
        <div>
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Access Requests</h2>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Requests: {requests.length}
            </p>
            <Button onClick={handleDedupe} className="bg-blue-500 text-white hover:bg-blue-600">
              Dedupe Requests
            </Button>
          </div>
          
          {dedupeStatus && (
            <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md">
              <p>Original count: {dedupeStatus.originalCount}</p>
              <p>Deduped count: {dedupeStatus.dedupedCount}</p>
              <p>Removed: {dedupeStatus.removedCount}</p>
            </div>
          )}
          
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-zinc-700">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Reason</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Requested</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Previous Rejection</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {requests.map((request) => {
                    const previousRejection = rejectedUsers.find(
                      user => user.username === request.username
                    );
                    return (
                      <>
                        <tr key={`${request.username}-main`} className="group">
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <a 
                              href={`https://github.com/${request.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {request.username}
                            </a>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                            {request.reason}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(request.timestamp, { addSuffix: true })}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                            {previousRejection ? (
                              <span className="text-red-500">
                                Rejected {formatDistanceToNow(previousRejection.rejectedAt, { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-gray-400">No previous rejections</span>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0">
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
                            </div>
                          </td>
                        </tr>
                        
                        {/* Mobile-only reason row */}
                        <tr key={`${request.username}-reason`} className="md:hidden bg-gray-50 dark:bg-zinc-700/50">
                          <td colSpan={5} className="px-4 py-2">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase mb-1">Reason:</div>
                            <div className="relative">
                              <div className="overflow-x-auto pb-3 -mx-4 px-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap py-2 pr-16 pl-1">
                                  {request.reason}
                                </div>
                              </div>
                              {/* Fade indicators for horizontal scroll */}
                              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 dark:from-zinc-700/50 to-transparent pointer-events-none"></div>
                              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 dark:from-zinc-700/50 to-transparent pointer-events-none"></div>
                            </div>
                            
                            {/* Visual hint for scrolling */}
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center">
                              <svg className="w-4 h-4 mr-1 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span>Scroll to see more</span>
                              <svg className="w-4 h-4 ml-1 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          </td>
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Whitelisted Users Section */}
        <div>
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Whitelisted Users</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Total Whitelisted Users: {whitelistedUsers.length}
          </p>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-zinc-700">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Approved</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {whitelistedUsers.map((user) => (
                    <tr key={user.username}>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <a 
                          href={`https://github.com/${user.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {user.username}
                        </a>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(user.approvedAt, { addSuffix: true })}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
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
        </div>

        {/* Rejected Users Section */}
        <div>
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Rejected Users</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Total Rejected Users: {rejectedUsers.length}
          </p>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-zinc-700">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rejected</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {rejectedUsers.map((user) => (
                    <tr key={user.username}>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <a 
                          href={`https://github.com/${user.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {user.username}
                        </a>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(user.rejectedAt, { addSuffix: true })}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
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
        </div>

        {/* Airdrop History Section */}
        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Airdrop History</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Total Airdrops: {airdropHistory.length}
          </p>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-zinc-700">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Wallet</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Anonymous</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {airdropHistory.map((record) => (
                    <tr key={`${record.username}-${record.timestamp}`}>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <a 
                          href={`https://github.com/${record.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {record.username}
                        </a>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        <a 
                          href={`https://solscan.io/account/${record.walletAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono hover:underline"
                        >
                          {record.walletAddress.slice(0, 8)}...{record.walletAddress.slice(-8)}
                        </a>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(record.timestamp, { addSuffix: true })}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {record.isAnonymous ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Upgraded Users Section */}
        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Upgraded Users</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Total Upgraded Users: {upgradedUsers.length}
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end mb-4">
            <div className="w-full md:w-auto">
              <form onSubmit={handleUpgradeUser} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Add User to Upgraded List</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={upgradeUsername}
                    onChange={(e) => setUpgradeUsername(e.target.value)}
                    placeholder="GitHub username"
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md"
                    disabled={processing}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                    disabled={processing || !upgradeUsername.trim()}
                  >
                    {processing ? 'Adding...' : 'Add User'}
                  </button>
                </div>
                {upgradeMessage && (
                  <p className={`mt-2 text-sm ${upgradeMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {upgradeMessage.text}
                  </p>
                )}
              </form>
            </div>
          </div>
          
          {/* Upgraded Users List */}
          {upgradedUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border-b text-left">Username</th>
                    <th className="px-4 py-2 border-b text-left">Upgraded At</th>
                    <th className="px-4 py-2 border-b text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upgradedUsers.map((user) => (
                    <tr key={user.username} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b">
                        <a 
                          href={`https://github.com/${user.username}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {user.username}
                        </a>
                      </td>
                      <td className="px-4 py-2 border-b">
                        {user.upgradedAt ? formatDistanceToNow(user.upgradedAt, { addSuffix: true }) : 'N/A'}
                      </td>
                      <td className="px-4 py-2 border-b">
                        <button
                          onClick={() => handleRemoveUpgradedUser(user.username)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No upgraded users</p>
          )}
        </div>

        {/* Vouch Requests Section */}
        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Vouch Requests</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Total Vouch Requests: {vouchRequests.length}
          </p>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-zinc-700">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {vouchRequests.length > 0 ? (
                    vouchRequests.map((username) => (
                      <tr key={username}>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleApproveVouch(username)}
                              className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectVouch(username)}
                              className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-3 py-1 rounded text-xs"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400" colSpan={2}>
                        No vouch requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Vouched Users Section */}
        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Vouched Users</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Total Vouched Users: {vouchedUsers.length}
          </p>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-zinc-700">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vouched By</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Voucher Type</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {vouchedUsers.length > 0 ? (
                    vouchedUsers.map((user) => (
                      <tr key={user.username}>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.vouchedBy}</div>
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.voucherType}</div>
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(user.timestamp), { addSuffix: true })}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleUnvouch(user.username)}
                            className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-3 py-1 rounded text-xs"
                          >
                            Unvouch
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400" colSpan={5}>
                        No vouched users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 