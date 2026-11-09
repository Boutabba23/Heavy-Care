'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return <div className="loading">Redirection...</div>;
}
