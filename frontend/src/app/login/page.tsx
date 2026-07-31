'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { fetchAPI } from '../../utils/api';
import { Shield, Lock, Mail, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { loginUser } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response.token && response.user) {
        loginUser(response.token, response.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors">
      <div className="absolute top-4 left-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>
      </div>

      <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-600 p-3 rounded-2xl text-white shadow-lg mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sign In to GroupTrust</h2>
          <p className="text-sm text-slate-500 mt-1">Enter your account credentials to access your dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700 dark:focus:border-brand-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700 dark:focus:border-brand-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 shadow transition-all hover:scale-[1.02] disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
