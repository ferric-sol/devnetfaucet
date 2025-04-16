"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full py-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} DevNet Faucet. All rights reserved.
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Data Source:</span>
              <Link 
                href="https://github.com/electric-capital/crypto-ecosystems" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Electric Capital Crypto Ecosystems
              </Link>
              <Link 
                href="https://github.com/electric-capital/crypto-ecosystems" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Image 
                  src="https://raw.githubusercontent.com/electric-capital/crypto-ecosystems/master/logo.png" 
                  alt="Electric Capital Logo"
                  width={20}
                  height={20}
                  className="rounded-sm"
                />
              </Link>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center md:text-right">
              If you're working in open source crypto, {' '}
              <Link 
                href="https://github.com/electric-capital/crypto-ecosystems" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-gray-700 dark:hover:text-gray-300"
              >
                submit your repository here
              </Link>
              {' '} to be counted.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 