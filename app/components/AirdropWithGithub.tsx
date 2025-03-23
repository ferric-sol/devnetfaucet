"use client";

import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { signIn, useSession } from "next-auth/react";
import airdrop, { requestAccess } from "@/app/airdrop";

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

    setIsProcessing(true);
    setAirdropResult('Submitting access request...');

    try {
      const formData = new FormData();
      formData.append('reason', accessReason.trim());
      const result = await requestAccess(formData);
      setAirdropResult(result);
      setShowAccessRequest(false);
      setAccessReason('');
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
      return 'Error fetching balance';
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

      {airdropResult && (
        <div className={`w-full p-4 rounded-md ${
          airdropResult.includes('successful')
            ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300'
            : airdropResult.includes('Try again')
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
              : 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
        }`}>
          {airdropResult}
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
              </div>
              <button
                onClick={handleRequestAccess}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 transition-all duration-200"
                disabled={isProcessing || !accessReason.trim()}
              >
                {isProcessing ? 'Submitting...' : 'Request Access'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center space-y-2 text-sm opacity-80">
        <p>Send donations to: <span className="font-mono">{faucetAddress}</span></p>
        <p>Current faucet balance: <span className="font-bold">{faucetBalance}</span></p>
      </div>
    </div>
  );
} 