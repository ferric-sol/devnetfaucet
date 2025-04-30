'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VouchRecord } from '@/app/airdrop';

export default function UserVouchPage({ params }: { params: { username: string } }) {
  const { username } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tweetText, setTweetText] = useState('');

  // Generate tweet text when component mounts
  useState(() => {
    const text = encodeURIComponent(
      `I need SOL for testing on @solana devnet! Can someone vouch for me on DevNet Faucet? https://devnetfaucet.org/${username}/vouch #Solana #DevNet #DevNetFaucet`
    );
    setTweetText(text);
  });

  const handleVouch = async () => {
    if (!session) {
      router.push('/api/auth/signin');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('username', username);

      const response = await fetch('/api/vouch', {
        method: 'POST',
        body: formData
      });

      const result = await response.text();
      setMessage(result);
    } catch (error) {
      setMessage('An error occurred while vouching for this user');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Vouch for {username}</CardTitle>
          <CardDescription>
            By vouching for this user, you are helping them get access to SOL on devnet for testing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session ? (
            <>
              <Button 
                onClick={handleVouch} 
                disabled={isLoading} 
                className="w-full mb-4"
              >
                {isLoading ? 'Processing...' : 'Vouch for this user'}
              </Button>
              
              {message && (
                <div className={`p-4 rounded-md mb-4 ${
                  message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {message}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mb-4">You need to sign in to vouch for this user.</p>
              <Button onClick={() => router.push('/api/auth/signin')} className="w-full mb-4">
                Sign in with GitHub
              </Button>
            </>
          )}

          {!session && (
            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-2">Are you {username}? Share this tweet to ask for a vouch and receive 20 SOL:</p>
              <a 
                href={`https://twitter.com/intent/tweet?text=${tweetText}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm"
              >
                Tweet for a vouch
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 