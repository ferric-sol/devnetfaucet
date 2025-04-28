'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function VouchLink() {
  const { data: session, status } = useSession();
  const [isEligible, setIsEligible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only check eligibility if the user is logged in
    if (status === 'authenticated') {
      checkEligibility();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/check-eligibility');
      
      if (response.ok) {
        const data = await response.json();
        setIsEligible(data.isEligible);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === 'loading') {
    return null;
  }

  // Only show the vouch link to eligible users (GitHub repos or upgraded)
  if (status === 'authenticated' && isEligible) {
    return (
      <div className="text-center mt-2">
        <Link href="/vouch" className="text-blue-500 hover:underline">
          Vouch for others
        </Link>
      </div>
    );
  }

  return null;
} 