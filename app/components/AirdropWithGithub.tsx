"use client";

import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { signIn, useSession } from "next-auth/react";
import airdrop, { requestAccess } from "@/app/airdrop";
import VouchLink from "./VouchLink";

interface AirdropWithGithubProps {
  faucetAddress?: string;
  airdropAmount?: string;
}

export function AirdropWithGithub({ faucetAddress, airdropAmount }: AirdropWithGithubProps) {
  const { data: session } = useSession();
  const [walletAddress, setWalletAddress] = useState('');
  const [airdropResult, setAirdropResult] = useState('');
  const [faucetBalance, setFaucetBalance] = useState('');
  const [faucetEmpty, setFaucetEmpty] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  const [showVouchBanner, setShowVouchBanner] = useState(false);
  const [tweetText, setTweetText] = useState('');
  const [showTweetPrompt, setShowTweetPrompt] = useState(false);
  const [username, setUsername] = useState('');

  const handleAirdrop = async () => {
    if (!session) {
      signIn("github");
      return;
    }

    if (!walletAddress.trim()) {
      setAirdropResult('Please enter a wallet address');
      return;
    }

    setIsProcessing(true);
    setAirdropResult('Processing...');

    const formData = new FormData();
    formData.append('walletAddress', walletAddress);
    formData.append('isAnonymous', isAnonymous.toString());

    try {
      const result = await airdrop(formData);
      if (result === 'NO_REPO_FOUND') {
        setShowAccessRequest(true);
        setAirdropResult('No eligible repository found in Solana ecosystem');
      } else {
        setAirdropResult(result);
        if (result === 'Airdrop successful') {
          setShowVouchBanner(true);
        }
      }
    } catch (error) {
      console.error('Error during airdrop:', error);
      setAirdropResult('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!session) {
      signIn("github");
      return;
    }

    if (!accessReason.trim()) {
      setAirdropResult('Please provide a reason for requesting access');
      return;
    }

    if (!walletAddress.trim()) {
      setAirdropResult('Please enter a wallet address');
      return;
    }

    setIsProcessing(true);
    setAirdropResult('Submitting access request...');

    try {
      const formData = new FormData();
      formData.append('reason', accessReason.trim());
      formData.append('walletAddress', walletAddress);
      formData.append('isAnonymous', isAnonymous.toString());
      const result = await requestAccess(formData);
      
      if (result.startsWith('ACCESS_APPROVED:')) {
        // Parse the response to get username and message
        const parts = result.split(':');
        const githubUsername = parts[1];
        const message = parts.slice(2).join(':'); // In case the message itself contains ':'
        
        setUsername(githubUsername);
        setAirdropResult(message);
        
        // Generate tweet text for vouching
        const encodedTweetText = encodeURIComponent(
          `I need SOL for testing on @solana devnet! Can someone vouch for me on DevNet Faucet? https://devnetfaucet.org/${githubUsername}/vouch #Solana #DevNet #DevNetFaucet`
        );
        setTweetText(encodedTweetText);
        setShowTweetPrompt(true);
      } else {
        // Handle the old format for backwards compatibility
        setAirdropResult(result);
        
        // If the result indicates access was approved, try to fetch the username for tweet sharing
        if (result.includes('Access approved')) {
          try {
            const usernameResponse = await fetch('/api/get-github-username');
            if (usernameResponse.ok) {
              const data = await usernameResponse.json();
              if (data.username) {
                const encodedTweetText = encodeURIComponent(
                  `I need SOL for testing on @solana devnet! Can someone vouch for me on DevNet Faucet? https://devnetfaucet.org/${data.username}/vouch #Solana #DevNet #DevNetFaucet`
                );
                setTweetText(encodedTweetText);
                setShowTweetPrompt(true);
                setUsername(data.username);
              }
            }
          } catch (error) {
            console.error('Error fetching GitHub username:', error);
          }
        }
      }
      
      setShowAccessRequest(false);
      setAccessReason('');
      
      if (result.includes('successful') || result.includes('approved')) {
        setShowVouchBanner(true);
      }
    } catch (error) {
      console.error('Error requesting access:', error);
      setAirdropResult('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFaucetBalance = useCallback(async () => {
    if(!faucetAddress) return 'No faucet!';
    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const faucetPublicKey = new PublicKey(faucetAddress);
      const balanceInLamports = await connection.getBalance(faucetPublicKey);
      const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL;
      setFaucetEmpty(parseInt(balanceInSol.toFixed(2)) < 2);
      return balanceInSol.toFixed(2) + ' SOL';
    } catch (error) {
      console.error('Error fetching balance:', error);
      try {
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const faucetPublicKey = new PublicKey(faucetAddress);
        const balanceInLamports = await connection.getBalance(faucetPublicKey);
        const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL;
        setFaucetEmpty(parseInt(balanceInSol.toFixed(2)) < 2);
        return balanceInSol.toFixed(2) + ' SOL';
      } catch (fallbackError) {
        console.error('Fallback error fetching balance:', fallbackError);
        return 'Error fetching balance';
      }
    }
  }, [faucetAddress]);

  useEffect(() => {
    let mounted = true;

    const updateBalance = async () => {
      const balance = await getFaucetBalance();
      if (mounted) {
        setFaucetBalance(balance);
      }
    };

    updateBalance();

    return () => {
      mounted = false;
    };
  }, [airdropResult, getFaucetBalance]);

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-2xl px-4">
      <div className="text-center mb-2 text-xl">
        Get {airdropAmount} devnet SOL airdropped to your wallet
      </div>
      
      <div className="w-full">
        <div className="relative">
          <input
            id="walletAddress"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter devnet wallet address"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onFocus={() => setAirdropResult('')}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isAnonymous"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isAnonymous" className="text-sm text-gray-600 dark:text-gray-400">
          Make airdrop anonymous
        </label>
      </div>
      
      <button
        onClick={handleAirdrop}
        className={`w-full px-6 py-3 ${
          session 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
            : 'bg-gradient-to-r from-gray-700 to-gray-900'
        } text-white font-medium rounded-md hover:opacity-90 focus:ring-4 focus:ring-blue-300 transition-all duration-200 transform hover:scale-105`}
        disabled={faucetEmpty || isProcessing}
      >
        {session 
          ? isProcessing ? 'Processing...' : 'Get Airdrop'
          : 'Airdrop with GitHub'
        }
      </button>

      <VouchLink />

      {airdropResult && (
        <div className={`w-full p-4 rounded-md ${
          airdropResult.includes('successful') || airdropResult.includes('approved')
            ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300'
            : airdropResult.includes('Try again')
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
              : 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
        }`}>
          {airdropResult}
          
          {/* Show tweet prompt if access was approved */}
          {showTweetPrompt && (
            <div className="mt-4 p-3 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300">
              <p className="font-medium mb-2">
                Share this tweet to get someone to vouch for you:
              </p>
              <a 
                href={`https://twitter.com/intent/tweet?text=${tweetText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 inline-flex items-center"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mr-2" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
                Tweet for a Vouch
              </a>
              <p className="text-sm mt-2">
                This will help you get a vouch from an existing Solana developer.
              </p>
            </div>
          )}
          
          {showAccessRequest && (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="accessReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Why do you need devnet SOL?
                </label>
                <textarea
                  id="accessReason"
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                  placeholder="I need devnet sol for..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                  required
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto pb-1">
                  <span>Need to use our new RPC? Include: </span>
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded whitespace-nowrap">
                    http://rpc.devnetfaucet.org:8899/
                  </code>
                </div>
              </div>
              <button
                onClick={handleRequestAccess}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 transition-all duration-200"
                disabled={isProcessing || !accessReason.trim()}
              >
                {isProcessing ? 'Submitting...' : 'Request Access & Create Vouch Request'}
              </button>
              
              <div className="mt-4">
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  After requesting access, you'll be able to share a link to get vouched by an existing Solana developer.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showVouchBanner && (
        <div className="w-full p-4 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300">
          <div className="text-center mb-2">
            Help others get access to devnet SOL by vouching for them!
          </div>
          <div className="flex justify-center">
            <a 
              href="/vouch" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200"
            >
              Vouch for others
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center space-y-2 text-sm opacity-80">
        <p>Send donations to: <span className="font-mono">{faucetAddress}</span></p>
        <p>Current faucet balance: <span className="font-bold">{faucetBalance}</span></p>
      </div>
    </div>
  );
} 