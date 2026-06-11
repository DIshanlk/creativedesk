"use client";
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [loading, currentUser, router]);

  if (loading || !currentUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return <Layout>{children}</Layout>;
}
