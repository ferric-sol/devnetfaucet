"use client";

import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { signIn, useSession } from "next-auth/react";
import airdrop, { verifyXFollowAndAirdrop } from "@/app/airdrop";
import VouchLink from "./VouchLink";

const SHARE_TWEET_URL = `https://x.com/intent/tweet?text=${encodeURIComponent('I just got devnet SOL from https://devnetfaucet.org')}`;

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
  const [showFollowPrompt, setShowFollowPrompt] = useState(false);
  const [xUsername, setXUsername] = useState('');
  const [showVouchBanner, setShowVouchBanner] = useState(false);
  const [showShare, setShowShare] = useState(false);

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
        setShowFollowPrompt(true);
        setAirdropResult('');
      } else {
        setAirdropResult(result);
        if (result === 'Airdrop successful') {
          setShowVouchBanner(true);
          setShowShare(true);
        }
      }
    } catch (error) {
      console.error('Error during airdrop:', error);
      setAirdropResult('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyFollow = async () => {
    if (!session) {
      signIn("github");
      return;
    }

    if (!walletAddress.trim()) {
      setAirdropResult('Please enter a wallet address');
      return;
    }

    if (!xUsername.trim()) {
      setAirdropResult('Please enter your X username');
      return;
    }

    setIsProcessing(true);
    setAirdropResult('Checking your follow and post...');

    try {
      const formData = new FormData();
      formData.append('xUsername', xUsername.trim());
      formData.append('walletAddress', walletAddress);
      formData.append('isAnonymous', isAnonymous.toString());
      const result = await verifyXFollowAndAirdrop(formData);

      if (result === 'Airdrop successful') {
        setShowFollowPrompt(false);
        setAirdropResult(`Airdrop successful! ${airdropAmount} SOL is on its way.`);
        setShowVouchBanner(true);
      } else {
        setAirdropResult(result === 'NO_REPO_FOUND' ? 'Could not verify your follow. Please try again.' : result);
      }
    } catch (error) {
      console.error('Error verifying follow:', error);
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
            : airdropResult.endsWith('...')
              ? 'bg-gray-100 text-gray-800 dark:bg-zinc-800/50 dark:text-gray-300'
            : airdropResult.includes('Try again')
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
              : 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
        }`}>
          {airdropResult}
        </div>
      )}

      {showFollowPrompt && (
        <div className="w-full p-4 rounded-md border-2 border-gray-300 dark:border-gray-600 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Your GitHub account isn&apos;t on the Solana ecosystem whitelist yet. Follow @ferric and post about the faucet on X to unlock {airdropAmount} SOL.
          </p>
          <ol className="space-y-4">
            <li className="flex items-center gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium flex items-center justify-center">1</span>
              <a
                href="https://x.com/ferric"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 inline-flex items-center"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Follow @ferric
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium flex items-center justify-center">2</span>
              <a
                href={SHARE_TWEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 inline-flex items-center"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Post about the faucet
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium flex items-center justify-center">3</span>
              <input
                id="xUsername"
                value={xUsername}
                onChange={(e) => setXUsername(e.target.value)}
                placeholder="Your X username"
                aria-label="Your X username"
                autoComplete="off"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-700 dark:border-gray-600 dark:text-white"
              />
            </li>
            <li className="flex items-center gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium flex items-center justify-center">4</span>
              <button
                onClick={handleVerifyFollow}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-md hover:opacity-90 focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-50"
                disabled={isProcessing || faucetEmpty || !xUsername.trim()}
              >
                {isProcessing ? 'Checking...' : "I've followed & posted"}
              </button>
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <span className="flex-none w-6 h-6 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium flex items-center justify-center">5</span>
              We drop {airdropAmount} SOL to your wallet.
            </li>
          </ol>
        </div>
      )}

      {showShare && (
        <div className="w-full p-4 rounded-md border-2 border-gray-300 dark:border-gray-600 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
            Got your SOL? Let people know where to find it.
          </p>
          <a
            href={SHARE_TWEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-none px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 inline-flex items-center"
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Post on X
          </a>
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

      <div className="flex flex-col items-center space-y-2 text-xs sm:text-sm opacity-80 px-2">
        <p className="text-center">
          Send donations to: 
          <span className="font-mono block sm:inline break-all sm:break-normal mt-1 sm:mt-0">{faucetAddress}</span>
        </p>
        <p className="text-center">
          Current faucet balance: 
          <span className="font-bold">{faucetBalance}</span>
        </p>
      </div>
    </div>
  );
} 