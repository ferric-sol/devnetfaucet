# Devnet Faucet


This app allows anyone to set up a Solana faucet. 

Fill up your NEXT_PUBLIC_FAUCET_ADDRESS with some SOL, set the secret key and the airdrop amount and you're all set!

## Getting Started

1. Generate your faucet key

```bash
solana-keygen new --no-bip39-passphrase -o faucetkey.json
```

2. Copy faucetkey.json (privatekey) and paste it into SENDER_SECRET_KEY on vercel (or in your .env.development.local)

```bash
cat faucetkey.json
```

3. Copy faucet address (pubkey) and paste it into NEXT_PUBLIC_FAUCET_ADDRESS 

```bash
solana-keygen pubkey faucetkey.json
```

4. Set NEXT_PUBLIC_AIRDROP_AMOUNT

5. Deploy

You need three environment variables in your .env.development.local file and on vercel:
- NEXT_PUBLIC_FAUCET_ADDRESS - the address of your faucet account
- SENDER_SECRET_KEY - the secret key to allow the app to send airdrops from the faucet account above
- NEXT_PUBLIC_AIRDROP_AMOUNT - the amount of SOL to send in every airdrop

You can deploy your own faucet here:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fstakeware%2Fdevnetfaucet&env=NEXT_PUBLIC_FAUCET_ADDRESS,SENDER_SECRET_KEY,NEXT_PUBLIC_AIRDROP_AMOUNT&envDescription=Faucet%20address%2C%20airdrop%20amount%2C%20and%20the%20faucet's%20private%20key%20are%20all%20that%20you%20need&project-name=sol-devnet-faucet&repository-name=sol-devnet-faucet&redirect-url=https%3A%2F%2Fdevnetfaucet.org&demo-title=Devnet%20Faucet&demo-description=A%20faucet%20for%20getting%20devnet%20tokens%20on%20Solana&demo-url=https%3A%2F%2Fdevnetfaucet.org&demo-image=https%3A%2F%2Fwww.stakeware.xyz%2Flogo.webp)

Or, run on localhost:

```bash
npm i 
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Data Attribution

This application uses data from the Electric Capital Crypto Ecosystems project to verify GitHub repositories associated with the Solana ecosystem.

<table>
  <tr>
    <td>
      <a href="https://github.com/electric-capital/crypto-ecosystems">
        <img src="https://raw.githubusercontent.com/electric-capital/crypto-ecosystems/master/logo.png" alt="Electric Capital Logo" width="50">
      </a>
    </td>
    <td>
      <strong>Data Source:</strong> <a href="https://github.com/electric-capital/crypto-ecosystems">Electric Capital Crypto Ecosystems</a>
      <br>
      <small>If you're working in open source crypto, <a href="https://github.com/electric-capital/crypto-ecosystems">submit your repository here</a> to be counted.</small>
    </td>
  </tr>
</table>

The repository data is used to validate GitHub users requesting airdrops by checking if they contribute to the Solana ecosystem.

To update the ecosystem data in your deployment, run:

```bash
# First, download the latest solana.jsonl file
# Then, run the update script
npx tsx scripts/update_ecosystem_data.ts
```

