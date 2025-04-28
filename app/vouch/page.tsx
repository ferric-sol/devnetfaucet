'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface VouchRequest {
  username: string;
  isLoading: boolean;
  message: string;
}

export default function VouchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vouchRequests, setVouchRequests] = useState<VouchRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchVouchRequests();
    }
  }, [status, router]);

  const fetchVouchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/vouch-requests');
      
      if (!response.ok) {
        throw new Error('Failed to fetch vouch requests');
      }
      
      const data = await response.json();
      
      setVouchRequests(
        data.map((username: string) => ({
          username,
          isLoading: false,
          message: '',
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
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchVouchRequests} className="mt-4">Try Again</Button>
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
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vouchRequests.length > 0 ? (
            <div className="space-y-4">
              {vouchRequests.map((request, index) => (
                <div 
                  key={request.username} 
                  className="p-4 border rounded-md flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{request.username}</div>
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
                    onClick={() => handleVouch(request.username, index)}
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
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              No users currently need a vouch. Check back later!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 