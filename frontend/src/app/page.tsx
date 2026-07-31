'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { Shield, Users, BookOpen, UserCheck, KeyRound, Sparkles } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import { fetchAPI } from '../utils/api';

export default function LandingPage() {
  const { loginUser } = useAuth();
  const router = useRouter();

  const handleQuickLogin = async (email: string) => {
    try {
      const response = await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'password123' }),
      });
      if (response.token && response.user) {
        loginUser(response.token, response.user);
      }
    } catch (err: any) {
      alert(`Login failed: ${err.message}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Background radial glow */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-brand-100/30 to-transparent dark:from-brand-950/20 pointer-events-none" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/50 dark:border-slate-800/50 transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-500/20">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-brand-600 dark:text-brand-400">
              GroupTrust
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSelector />
            <button
              onClick={() => router.push('/login')}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 shadow transition-all hover:scale-[1.02] dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-6 dark:bg-brand-950/30 dark:border-brand-900 dark:text-brand-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Digital Ledger for Local Self Help Groups</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-slate-900 dark:text-white mb-6">
            Empowering Community Finance with{' '}
            <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent">
              Trust & Transparency
            </span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            Replace paper registers, manual passbooks, and cash errors. Designed for Rotating Savings & Credit Associations (ROSCA), Joint Liability Groups (JLG), and Self Help Groups (SHG).
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 mb-20">
          <div className="p-8 rounded-3xl bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-xl shadow-slate-100/50 dark:shadow-none hover:shadow-2xl hover:scale-[1.01] transition-all">
            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl w-fit text-blue-600 dark:text-blue-400 mb-6">
              <UserCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">NGO Administrators</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Oversee multiple local SHGs/JLGs. Audit transactions, approve member registrations, track default rates, and export compliance reports.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-xl shadow-slate-100/50 dark:shadow-none hover:shadow-2xl hover:scale-[1.01] transition-all">
            <div className="bg-brand-50 dark:bg-brand-950/40 p-4 rounded-2xl w-fit text-brand-600 dark:text-brand-400 mb-6">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Group Secretaries</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Create meetings, capture attendance with coordinates, collect savings, record loans, and execute interactive ROSCA winner lottery draws.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-xl shadow-slate-100/50 dark:shadow-none hover:shadow-2xl hover:scale-[1.01] transition-all">
            <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl w-fit text-purple-600 dark:text-purple-400 mb-6">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Group Members</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Track your savings balance in a digital passbook, review joint liability alerts, vote on peer loan requests, and download statements.
            </p>
          </div>
        </div>

        {/* Demo Fast Login Box */}
        <div className="max-w-xl mx-auto rounded-3xl bg-gradient-to-tr from-brand-600 to-emerald-500 p-1 shadow-2xl shadow-brand-500/20">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[22px]">
            <div className="flex items-center justify-center gap-2 mb-6">
              <KeyRound className="h-5 w-5 text-brand-500" />
              <h3 className="text-lg font-bold text-center">Interactive Quick Demo Login</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-8">
              Click below to immediately log in to pre-seeded profiles and test group dashboard features (Password: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">password123</code>).
            </p>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleQuickLogin('admin@grouptrust.com')}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/20 px-6 py-4 transition-all text-left group"
              >
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">NGO Admin Panel</div>
                  <div className="text-xs text-slate-500">Anjali Sharma &middot; admin@grouptrust.com</div>
                </div>
                <div className="rounded-full bg-blue-50 text-blue-600 p-2 group-hover:bg-blue-600 group-hover:text-white transition">
                  &rarr;
                </div>
              </button>

              <button
                onClick={() => handleQuickLogin('secretary@grouptrust.com')}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/20 dark:border-slate-800 dark:hover:border-brand-800 dark:hover:bg-brand-950/20 px-6 py-4 transition-all text-left group"
              >
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Secretary Workspace</div>
                  <div className="text-xs text-slate-500">Ramesh Kumar &middot; secretary@grouptrust.com</div>
                </div>
                <div className="rounded-full bg-brand-50 text-brand-600 p-2 group-hover:bg-brand-600 group-hover:text-white transition">
                  &rarr;
                </div>
              </button>

              <button
                onClick={() => handleQuickLogin('member1@grouptrust.com')}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/20 dark:border-slate-800 dark:hover:border-purple-800 dark:hover:bg-purple-950/20 px-6 py-4 transition-all text-left group"
              >
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Member Passbook</div>
                  <div className="text-xs text-slate-500">Sunita Devi &middot; member1@grouptrust.com</div>
                </div>
                <div className="rounded-full bg-purple-50 text-purple-600 p-2 group-hover:bg-purple-600 group-hover:text-white transition">
                  &rarr;
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/50 dark:border-slate-800/50 py-8 text-center text-xs text-slate-500 dark:text-slate-600">
        &copy; {new Date().getFullYear()} GroupTrust Inc. Built for Digital Financial Inclusion.
      </footer>
    </div>
  );
}
