'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, translations } from '../context/AuthContext';
import { Shield, LogOut, Landmark } from 'lucide-react';
import LanguageSelector from '../../components/LanguageSelector';
import VoiceAssistant from '../../components/VoiceAssistant';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, loading, logoutUser, language } = useAuth();
  const router = useRouter();
  const t = translations[language];

  useEffect(() => {
    if (!loading && (!token || !user)) {
      router.push('/login');
    }
  }, [loading, token, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'NGO_ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'SECRETARY':
        return 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300';
      default:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    }
  };

  const getSpeechWelcomeText = () => {
    const userName = user?.name || 'User';
    if (language === 'hi') {
      return `डैशबोर्ड में आपका स्वागत है, ${userName}। आपकी भूमिका ${
        user.role === 'NGO_ADMIN'
          ? 'एनजीओ व्यवस्थापक'
          : user.role === 'SECRETARY'
          ? 'सचिव'
          : 'सदस्य'
      } है।`;
    }
    return `Welcome to your dashboard, ${user.name}. You are logged in as ${
      user.role === 'NGO_ADMIN'
        ? 'NGO Administrator'
        : user.role === 'SECRETARY'
        ? 'Group Secretary'
        : 'Member'
    }.`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <nav className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
              <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-500/10">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-brand-600 dark:text-brand-400">
                GroupTrust
              </span>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <Landmark className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>TrustCare Group Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <VoiceAssistant readoutText={getSpeechWelcomeText()} />
            <LanguageSelector />
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${getRoleBadge(user.role)}`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={logoutUser}
                className="p-2 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-600 dark:border-slate-800 dark:hover:border-red-950 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
