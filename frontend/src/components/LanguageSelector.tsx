'use client';

import React from 'react';
import { useAuth } from '../app/context/AuthContext';
import { Globe } from 'lucide-react';

export default function LanguageSelector() {
  const { language, setLanguage } = useAuth();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 transition"
    >
      <Globe className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      <span>{language === 'en' ? 'हिन्दी (HI)' : 'English (EN)'}</span>
    </button>
  );
}
