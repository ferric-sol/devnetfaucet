"use server";

import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { unstable_noStore as noStore } from 'next/cache';
import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth/next";
import { parse as parseTOML } from '@iarna/toml';
import { authOptions } from '@/app/config/auth.config';

interface Repository {
  url: string;
  missing?: boolean;
}

interface TomlData {
  repo?: Repository[];
}

async function fetchAndParseToml() {
  const response = await fetch('https://raw.githubusercontent.com/electric-capital/crypto-ecosystems/refs/heads/master/data/ecosystems/s/solana.toml');
  const tomlContent = await response.text();
  return parseTOML(tomlContent) as TomlData;
}

async function checkUserHasRepo(username: string) {
  const tomlData = await fetchAndParseToml();
  const repos = tomlData.repo || [];
  
  return repos.some((repo) => {
    const repoUrl = repo.url.toLowerCase();
    return repoUrl.includes(`github.com/${username.toLowerCase()}/`);
  });
}

export default async function airdrop(formData: FormData) {
    noStore();

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
      return 'Please sign in with GitHub first';
    }

    const hasRepo = await checkUserHasRepo(session.user.name);
    if (!hasRepo) {
      return 'No eligible repository found in Solana ecosystem';
    }

    const walletAddress = formData.get('walletAddress');
    try { 
      if (!walletAddress || walletAddress === null) {
        throw new Error('Wallet address is required');
      }

      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const walletAddressString = walletAddress?.toString();

      const lastAirdropTimestampString = String(await kv.get(walletAddressString));
      const lastAirdropTimestamp = lastAirdropTimestampString ? parseInt(lastAirdropTimestampString) : null;

      const TIMEOUT_HOURS = Number(process.env.TIMEOUT_HOURS) || 24;
      const oneHourAgo = Date.now() - TIMEOUT_HOURS * 60 * 60 * 1000;

      if (lastAirdropTimestamp && lastAirdropTimestamp > oneHourAgo) {
        const minutesLeft = Math.ceil((lastAirdropTimestamp - oneHourAgo) / 60000);
        return `Try again in ${minutesLeft} minutes`;
      } 

      const secretKey = process.env.SENDER_SECRET_KEY;
      if(!secretKey) return 'Airdrop failed';

      // Changed to 100 SOL as requested
      const airdropAmount = 100;
      const airdropAmountLamports = airdropAmount * LAMPORTS_PER_SOL;

      const secretKeyUint8Array = new Uint8Array(
        secretKey.split(',').map((num) => parseInt(num, 10))
      );

      const senderKeypair = Keypair.fromSecretKey(secretKeyUint8Array);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: new PublicKey(walletAddress as string),
          lamports: airdropAmountLamports
        })
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair]
      );

      kv.set(walletAddress as string, Date.now());

      return 'Airdrop successful';
    } catch(error) {
      console.log('error airdropping: ', error);
      return 'Airdrop failed';
    }
}