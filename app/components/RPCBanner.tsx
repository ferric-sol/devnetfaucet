"use client";

import { useState } from 'react';

export function RPCBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  if (dismissed) return null;
  
  return (
    <div className="w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white py-3 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 7h-2v2h2V7z" fill="currentColor" />
              <path d="M13 11h-2v6h2v-6z" fill="currentColor" />
              <path fillRule="evenodd" clipRule="evenodd" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 100-16 8 8 0 000 16z" fill="currentColor" />
            </svg>
            <div className="font-medium overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent whitespace-nowrap py-1">
              <span className="font-bold">New Devnet RPC:</span> http://rpc.devnetfaucet.org:8899/
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="text-white hover:text-gray-100 focus:outline-none text-sm underline underline-offset-2 sm:ml-4"
            >
              {expanded ? "Hide Details" : "Why Use This?"}
            </button>
            <button 
              onClick={() => setDismissed(true)} 
              className="flex-shrink-0 text-white hover:text-gray-100 focus:outline-none"
              aria-label="Close"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M5.293 5.293a1 1 0 011.414 0L12 10.586l5.293-5.293a1 1 0 111.414 1.414L13.414 12l5.293 5.293a1 1 0 01-1.414 1.414L12 13.414l-5.293 5.293a1 1 0 01-1.414-1.414L10.586 12 5.293 6.707a1 1 0 010-1.414z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/20 text-sm">
            <div className="overflow-x-auto">
              <p className="py-1">
                Our new dedicated RPC endpoint offers improved reliability and performance for your Solana devnet projects.
                Simply configure your connection to use <code className="bg-white/20 px-1 py-0.5 rounded">http://rpc.devnetfaucet.org:8899/</code> as your RPC URL.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 