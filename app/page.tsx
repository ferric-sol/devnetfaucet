import { FaucetForm } from "./components/FaucetForm";
import { getServerSession } from "next-auth/next";
import { SignInButton } from "./components/SignInButton";
import { authOptions } from './utils/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const faucetAddress = process.env.NEXT_PUBLIC_FAUCET_ADDRESS;
  const airdropAmount = process.env.NEXT_PUBLIC_AIRDROP_AMOUNT;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-between p-4 lg:p-24">
      <header className="self-stretch flex justify-between items-center font-bold text-2xl mb-4">
        <p className="font-mono text-sm lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          <code className="font-bold">Solana</code> Devnet Faucet
        </p>
        <p className="font-mono text-sm lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          <code className="font-bold">
            <a href="https://github.com/stakeware/devnetfaucet">Fork on Github</a>
          </code>
        </p>
        <p className="font-mono text-sm lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          <code className="font-bold">
            <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fstakeware%2Fdevnetfaucet&env=NEXT_PUBLIC_FAUCET_ADDRESS,SENDER_SECRET_KEY,NEXT_PUBLIC_AIRDROP_AMOUNT&envDescription=Faucet%20address%2C%20airdrop%20amount%2C%20and%20the%20faucet%27s%20private%20key%20are%20all%20that%20you%20need&project-name=sol-devnet-faucet&repository-name=sol-devnet-faucet&redirect-url=https%3A%2F%2Fdevnetfaucet.org&demo-title=Devnet%20Faucet&demo-description=A%20faucet%20for%20getting%20devnet%20tokens%20on%20Solana&demo-url=https%3A%2F%2Fdevnetfaucet.org&demo-image=https%3A%2F%2Fwww.stakeware.xyz%2Flogo.webp">Deploy Your Own Faucet</a>
          </code>
        </p>
      </header>

      {!session ? (
        <SignInButton />
      ) : (
        <FaucetForm 
          faucetAddress={faucetAddress} 
          airdropAmount={airdropAmount} 
        />
      )}

      <footer className="self-stretch text-center font-mono text-sm mt-4">
        Other Devnet Faucets: &nbsp;        
        [<a href="https://solfaucet.com" target="_blank" rel="noopener noreferrer">SOLFaucet</a>]&nbsp;
        [<a href="https://faucet.quicknode.com/solana/devnet" target="_blank" rel="noopener noreferrer">Quicknode</a>]&nbsp;
        [<a href="https://solana.com/developers/guides/getstarted/solana-token-airdrop-and-faucets" target="_blank" rel="noopener noreferrer">Faucet List</a>]&nbsp;
        [<a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer">Official Solana.com Faucet</a>]&nbsp;
        [<a href="https://solanatools.xyz/faucet/testnet.html" target="_blank" rel="noopener noreferrer">SolanaTools Faucet</a>]&nbsp;
        <p className="text-xs mt-2">
          Created by <a href="https://x.com/ferric" target="_blank" rel="noopener noreferrer">@ferric</a>
        </p>
        <p className="text-xs mt-2">
          Designed by <a href="https://chat.openai.com" target="_blank" rel="noopener noreferrer">ChatGPT</a>
        </p>
      </footer>
    </main>
  );
}