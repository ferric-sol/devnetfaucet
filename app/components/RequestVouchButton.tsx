'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function RequestVouchButton() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tweetText, setTweetText] = useState('');
  const [showTweet, setShowTweet] = useState(false);

  const handleRequestVouch = async () => {
    if (status !== 'authenticated') {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      const response = await fetch('/api/create-vouch-request', {
        method: 'POST',
        body: formData
      });

      const result = await response.text();
      setMessage(result);

      if (result === 'Vouch request created successfully') {
        // Generate tweet text
        const username = session?.user?.name;
        const text = encodeURIComponent(
          `I need SOL for testing on @solana devnet! Can someone vouch for me on DevNet Faucet? https://devnetfaucet.org/${username}/vouch #Solana #DevNet #DevNetFaucet`
        );
        setTweetText(text);
        setShowTweet(true);
      }
    } catch (error) {
      setMessage('An error occurred while requesting a vouch');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return null;
  }

  return (
    <div>
      {status === 'authenticated' && (
        <div className="mt-4">
          <Button
            onClick={handleRequestVouch}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Request a Vouch'}
          </Button>
          
          {message && (
            <div className={`mt-2 p-3 rounded-md ${
              message.includes('success') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}
          
          {showTweet && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                Share this tweet to get someone to vouch for you:
              </p>
              <a 
                href={`https://twitter.com/intent/tweet?text=${tweetText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline inline-block"
              >
                Tweet for a Vouch
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 