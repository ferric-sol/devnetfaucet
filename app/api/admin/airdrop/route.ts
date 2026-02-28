import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminToken = process.env.ADMIN_API_KEY;

    if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid Solana address' }, { status: 400 });
    }

    const secretKey = process.env.SENDER_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Faucet sender key not configured' }, { status: 500 });
    }

    const secretKeyUint8Array = new Uint8Array(
      secretKey.split(',').map((num) => parseInt(num, 10))
    );
    const senderKeypair = Keypair.fromSecretKey(secretKeyUint8Array);

    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
    const connection = new Connection(rpcUrl, 'confirmed');
    const airdropAmount = 2; // Hardcoded to 2 SOL as requested
    const lamports = airdropAmount * LAMPORTS_PER_SOL;

    let lastError: any;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: senderKeypair.publicKey,
            toPubkey: publicKey,
            lamports: lamports,
          })
        );

        // Fetch a fresh blockhash each attempt
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = senderKeypair.publicKey;

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [senderKeypair],
          {
            skipPreflight: true, // Skip simulation — devnet RPC simulation is flaky
            preflightCommitment: 'confirmed',
            maxRetries: 3,
          }
        );

        return NextResponse.json({
          success: true,
          amount: airdropAmount,
          signature,
          address
        });
      } catch (err: any) {
        lastError = err;
        console.error(`Admin airdrop attempt ${attempt}/${MAX_RETRIES} failed:`, err?.message || err);
        if (err?.logs) console.error('Transaction logs:', err.logs);
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
      }
    }

    console.error('Admin airdrop exhausted all retries:', lastError);
    return NextResponse.json({ error: lastError?.message || 'Internal server error' }, { status: 500 });

  } catch (error: any) {
    console.error('Admin airdrop error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
