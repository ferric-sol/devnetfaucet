import { getRecentAirdrops, AirdropRecord } from './airdrop';
import { formatDistanceToNow } from 'date-fns';
import { AirdropWithGithub } from './components/AirdropWithGithub';
import { getServerSession } from "next-auth/next";
import { authOptions } from './lib/auth';

// Component to display recent airdrops
function RecentAirdrops({ airdrops }: { airdrops: AirdropRecord[] }) {
  if (airdrops.length === 0) {
    return <p className="text-center text-gray-500 italic">No recent airdrops</p>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 mb-8">
      <h2 className="text-xl font-bold mb-4 text-center">Recent Airdrops</h2>
      <div className="bg-gray-100 dark:bg-zinc-800/30 rounded-xl border shadow-sm p-4 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-2 px-2">GitHub User</th>
              <th className="text-left py-2 px-2">Wallet</th>
              <th className="text-left py-2 px-2">When</th>
            </tr>
          </thead>
          <tbody>
            {airdrops.map((airdrop, index) => (
              <tr key={index} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-700/30 transition-colors">
                <td className="py-2 px-2">
                  {airdrop.isAnonymous ? (
                    <span className="text-gray-500 dark:text-gray-400">anon</span>
                  ) : (
                    <a 
                      href={`https://github.com/${airdrop.username}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.895-.015 3.29 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      {airdrop.username}
                    </a>
                  )}
                </td>
                <td className="py-2 px-2 font-mono text-xs">
                  {airdrop.walletAddress.substring(0, 4)}...{airdrop.walletAddress.substring(airdrop.walletAddress.length - 4)}
                </td>
                <td className="py-2 px-2 text-sm">
                  {formatDistanceToNow(airdrop.timestamp, { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const faucetAddress = process.env.NEXT_PUBLIC_FAUCET_ADDRESS;
  const airdropAmount = process.env.NEXT_PUBLIC_AIRDROP_AMOUNT;
  
  // Get recent airdrops
  const recentAirdrops = await getRecentAirdrops(10);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-between p-4 lg:p-24 bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-blue-500 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-cyan-500 opacity-10 rounded-full blur-3xl"></div>
      </div>
      
      <header className="relative w-full max-w-6xl flex flex-col md:flex-row md:justify-between items-center gap-4 font-bold text-2xl mb-8">
        <div className="font-mono text-sm rounded-xl border bg-white dark:bg-zinc-800/70 p-4 shadow-lg">
          <div className="flex items-center">
            <svg className="w-8 h-8 mr-2 text-purple-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19C13.1046 19 14 18.1046 14 17C14 15.8954 13.1046 15 12 15C10.8954 15 10 15.8954 10 17C10 18.1046 10.8954 19 12 19Z" fill="currentColor"/>
              <path d="M12 9C13.1046 9 14 8.10457 14 7C14 5.89543 13.1046 5 12 5C10.8954 5 10 5.89543 10 7C10 8.10457 10.8954 9 12 9Z" fill="currentColor"/>
              <path d="M19 12C19 13.1046 18.1046 14 17 14C15.8954 14 15 13.1046 15 12C15 10.8954 15.8954 10 17 10C18.1046 10 19 10.8954 19 12Z" fill="currentColor"/>
              <path d="M9 12C9 13.1046 8.10457 14 7 14C5.89543 14 5 13.1046 5 12C5 10.8954 5.89543 10 7 10C8.10457 10 9 10.8954 9 12Z" fill="currentColor"/>
            </svg>
            <span className="text-xl font-bold">Solana Devnet Faucet</span>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center md:justify-end gap-2">
          <a 
            href="https://github.com/ferric-sol/devnetfaucet" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-mono text-sm rounded-xl border bg-white dark:bg-zinc-800/70 p-3 shadow-md hover:shadow-lg transition-shadow flex items-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.895-.015 3.29 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Fork on Github
          </a>
          
          <a 
            href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fferric-sol%2Fdevnetfaucet&env=NEXT_PUBLIC_FAUCET_ADDRESS,SENDER_SECRET_KEY,NEXT_PUBLIC_AIRDROP_AMOUNT&envDescription=Faucet%20address%2C%20airdrop%20amount%2C%20and%20the%20faucet%27s%20private%20key%20are%20all%20that%20you%20need&project-name=sol-devnet-faucet&repository-name=sol-devnet-faucet&redirect-url=https%3A%2F%2Fdevnetfaucet.org&demo-title=Devnet%20Faucet&demo-description=A%20faucet%20for%20getting%20devnet%20tokens%20on%20Solana&demo-url=https%3A%2F%2Fdevnetfaucet.org&demo-image=https%3A%2F%2Fwww.stakeware.xyz%2Flogo.webp" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-mono text-sm rounded-xl border bg-white dark:bg-zinc-800/70 p-3 shadow-md hover:shadow-lg transition-shadow flex items-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 116 100" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M57.5 0L115 100H0L57.5 0Z" />
            </svg>
            Deploy Your Own
          </a>
        </div>
      </header>

      <div className="relative w-full max-w-2xl mx-auto bg-white dark:bg-zinc-800/90 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
        <AirdropWithGithub 
          faucetAddress={faucetAddress} 
          airdropAmount={airdropAmount} 
        />
      </div>
      
      {/* Display recent airdrops */}
      <div className="relative w-full mt-12">
        <RecentAirdrops airdrops={recentAirdrops} />
      </div>

      <footer className="relative self-stretch text-center font-mono text-sm mt-12 border-t pt-8 dark:border-gray-800">
        <p className="mb-4">
          Other Devnet Faucets: &nbsp;        
          <a href="https://solfaucet.com" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1 mx-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">SOLFaucet</a>
          <a href="https://faucet.quicknode.com/solana/devnet" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1 mx-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Quicknode</a>
          <a href="https://solana.com/developers/guides/getstarted/solana-token-airdrop-and-faucets" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1 mx-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Faucet List</a>
          <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1 mx-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Solana.com</a>
          <a href="https://solanatools.xyz/faucet/testnet.html" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1 mx-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">SolanaTools</a>
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-4 text-xs opacity-75">
          <p>Created by <a href="https://x.com/ferric" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">@ferric</a></p>
          <p>Designed by <a href="https://chat.openai.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">ChatGPT</a></p>
        </div>
      </footer>
    </main>
  );
}