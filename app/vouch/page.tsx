'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface VouchRequest {
  username: string;
  isLoading: boolean;
  message: string;
  isWhitelisted?: boolean;
  reason?: string;
}

export default function VouchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vouchRequests, setVouchRequests] = useState<VouchRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VouchRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchVouchRequests();
    }
  }, [status, router]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRequests(vouchRequests);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredRequests(
        vouchRequests.filter(
          req => 
            req.username.toLowerCase().includes(query) || 
            (req.reason && req.reason.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, vouchRequests]);

  const fetchVouchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/vouch-requests');
      
      if (!response.ok) {
        // Check if this is the "not eligible" error
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.error === 'Not eligible') {
            throw new Error(errorData.message || 'You need to be vouched for before you can vouch for others');
          }
        }
        throw new Error('Failed to fetch vouch requests');
      }
      
      const data = await response.json();
      setTotalUsers(data.total);
      
      setVouchRequests(
        data.users.map((user: any) => ({
          username: user.username,
          isLoading: false,
          message: '',
          isWhitelisted: user.isWhitelisted,
          reason: user.reason
        }))
      );
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVouch = async (username: string, index: number) => {
    // Update the specific vouch request's loading state
    setVouchRequests(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isLoading: true,
        message: '',
      };
      return updated;
    });

    try {
      const formData = new FormData();
      formData.append('username', username);

      const response = await fetch('/api/vouch', {
        method: 'POST',
        body: formData,
      });

      const result = await response.text();
      
      // Update the specific vouch request with the response
      setVouchRequests(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          isLoading: false,
          message: result,
        };
        return updated;
      });

      // If the vouch was successful, remove the request after a delay
      if (result.includes('success')) {
        setTimeout(() => {
          setVouchRequests(prev => prev.filter((_, i) => i !== index));
        }, 3000);
      }
    } catch (error: any) {
      setVouchRequests(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          isLoading: false,
          message: 'An error occurred',
        };
        return updated;
      });
    }
  };

  if (status === 'loading' || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Not Eligible to Vouch</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-500 dark:text-amber-400 mb-4">{error}</p>
            <p className="mb-4">You need to be either:</p>
            <ul className="list-disc pl-5 mb-6 space-y-2">
              <li>A contributor to a Solana ecosystem project</li>
              <li>Vouched for by another user</li>
              <li>An upgraded user</li>
            </ul>
            <div className="flex gap-4">
              <Button onClick={() => router.push('/')}>Return Home</Button>
              <Button onClick={fetchVouchRequests} variant="outline">Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Vouch for Users</CardTitle>
          <CardDescription>
            These users need your vouch to access SOL on devnet for testing. 
            Total users: {totalUsers}
          </CardDescription>

          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              placeholder="Search by username or reason..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((request, index) => {
                // Find the actual index in the original array
                const originalIndex = vouchRequests.findIndex(r => r.username === request.username);
                return (
                  <div 
                    key={request.username} 
                    className="p-4 border rounded-md flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{request.username}</div>
                      {request.isWhitelisted && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Whitelisted User
                        </div>
                      )}
                      {request.reason && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 max-w-lg">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </div>
                      )}
                      {request.message && (
                        <div 
                          className={`mt-2 text-sm ${
                            request.message.includes('success') 
                              ? 'text-green-500' 
                              : 'text-red-500'
                          }`}
                        >
                          {request.message}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleVouch(request.username, originalIndex)}
                      disabled={request.isLoading}
                      variant={request.message && request.message.includes('success') ? "outline" : "default"}
                    >
                      {request.isLoading 
                        ? 'Processing...' 
                        : (request.message && request.message.includes('success') 
                          ? 'Vouched' 
                          : 'Vouch')}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              {searchQuery ? 'No users match your search.' : 'No users currently need a vouch. Check back later!'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 