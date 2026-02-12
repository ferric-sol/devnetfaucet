import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';

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

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const airdropAmount = 2; // Hardcoded to 2 SOL as requested
    const lamports = airdropAmount * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: publicKey,
        lamports: lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair]
    );

    return NextResponse.json({
      success: true,
      amount: airdropAmount,
      signature,
      address
    });

  } catch (error: any) {
    console.error('Admin airdrop error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
