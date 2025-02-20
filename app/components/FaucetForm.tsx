"use client";

import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import airdrop from "@/app/airdrop";

interface FaucetFormProps {
  faucetAddress?: string;
  airdropAmount?: string;
}

export function FaucetForm({ faucetAddress, airdropAmount }: FaucetFormProps) {
  const [airdropResult, setAirdropResult] = useState('');
  const [faucetBalance, setFaucetBalance] = useState('');
  const [faucetEmpty, setFaucetEmpty] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setAirdropResult('Processing...');
    const result = await airdrop(formData);
    setAirdropResult(result);
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
    <form action={handleSubmit} className="flex flex-col items-center justify-center space-y-4 w-full max-w-2xl px-4">
      <div className="text-center mb-2">
        Enter wallet address to get {airdropAmount} devnet SOL airdropped
      </div>
      <div className="flex w-full">
        <input
          id="walletAddress"
          name="walletAddress"
          placeholder="Enter devnet wallet address"
          className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onFocus={() => setAirdropResult('')}
          required
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:ring-4 focus:ring-blue-300"
          disabled={faucetEmpty}
        >
          Airdrop!
        </button>
      </div>
      <p className="text-sm my-2">
        Send donation <strong>devnet</strong> sol to: {faucetAddress}
      </p>
      <p className="text-sm my-2">
        Current faucet balance is: {faucetBalance}
      </p>
      <p className="text-sm my-2">
        Airdrop status: {airdropResult}
      </p>
    </form>
  );
} 