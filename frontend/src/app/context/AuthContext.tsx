'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: any | null;
  token: string | null;
  loading: boolean;
  language: 'en' | 'hi';
  setLanguage: (lang: 'en' | 'hi') => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  speak: (text: string) => void;
  loginUser: (token: string, userData: any) => void;
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export const translations = {
  en: {
    appName: 'GroupTrust',
    home: 'Home',
    login: 'Login',
    logout: 'Logout',
    dashboard: 'Dashboard',
    role: 'Role',
    kyc: 'KYC Status',
    verified: 'Verified',
    unverified: 'Unverified',
    savings: 'Savings Balance',
    meetings: 'Meetings Scheduled',
    loans: 'Active Loans',
    disbursements: 'Disbursements',
    repayments: 'Repayments',
    totalSavings: 'Total Savings',
    activeCredit: 'Active Credit Book',
    defaultRate: 'Portfolio Default Rate',
    guarantors: 'Loan Guarantors',
    purpose: 'Purpose',
    actions: 'Actions',
    approve: 'Approve',
    reject: 'Reject',
    vote: 'Vote',
    payout: 'Payout Draw',
    language: 'Language',
    voice: 'Voice Guide',
    hindi: 'Hindi',
    english: 'English',
    speakWelcome: 'Welcome to GroupTrust platform.',
    speakSavings: 'Your current savings balance is ',
    speakLoans: 'Your active loans count is ',
    speakNoLoans: 'You have no active loans.',
  },
  hi: {
    appName: 'ग्रुपट्रस्ट',
    home: 'मुख्य पृष्ठ',
    login: 'लॉगिन',
    logout: 'लॉगआउट',
    dashboard: 'डैशबोर्ड',
    role: 'भूमिका',
    kyc: 'केवाईसी स्थिति',
    verified: 'सत्यापित',
    unverified: 'असत्यापित',
    savings: 'बचत राशि',
    meetings: 'आयोजित बैठकें',
    loans: 'सक्रिय ऋण',
    disbursements: 'ऋण वितरण',
    repayments: 'ऋण चुकौती',
    totalSavings: 'कुल बचत',
    activeCredit: 'सक्रिय ऋण पुस्तिका',
    defaultRate: 'डिफ़ॉल्ट दर',
    guarantors: 'ऋण जामिनदार',
    purpose: 'उद्देश्य',
    actions: 'कार्रवाई',
    approve: 'स्वीकृत करें',
    reject: 'अस्वीकार करें',
    vote: 'मतदान',
    payout: 'लाटरी ड्रा',
    language: 'भाषा',
    voice: 'आवाज मार्गदर्शन',
    hindi: 'हिंदी',
    english: 'अंग्रेजी',
    speakWelcome: 'ग्रुपट्रस्ट प्लेटफॉर्म में आपका स्वागत है।',
    speakSavings: 'आपकी वर्तमान बचत शेष राशि है ',
    speakLoans: 'आपके सक्रिय ऋणों की संख्या है ',
    speakNoLoans: 'आपका कोई सक्रिय ऋण नहीं है।',
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<'en' | 'hi'>('en');
  const [voiceEnabled, setVoiceEnabledState] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const router = useRouter();

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedLang = localStorage.getItem('lang') as 'en' | 'hi';
      const storedVoice = localStorage.getItem('voice') === 'true';
      const storedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';

      if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
        } catch (e) {
          console.warn('Invalid user JSON in localStorage, clearing auth tokens');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      if (storedLang) setLanguageState(storedLang);
      setVoiceEnabledState(storedVoice);
      setTheme(storedTheme);
    } catch (err) {
      console.warn('Error reading from localStorage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
    } catch (e) {
      // Ignore localStorage errors in restricted environments
    }
  }, [theme]);

  const setLanguage = (lang: 'en' | 'hi') => {
    setLanguageState(lang);
    try {
      localStorage.setItem('lang', lang);
    } catch (e) {}
  };

  const setVoiceEnabled = (enabled: boolean) => {
    setVoiceEnabledState(enabled);
    try {
      localStorage.setItem('voice', String(enabled));
    } catch (e) {}
  };

  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const loginUser = (newToken: string, userData: any) => {
    setToken(newToken);
    setUser(userData);
    try {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {}
    
    if (userData.role === 'NGO_ADMIN') {
      router.push('/dashboard/ngo');
    } else if (userData.role === 'SECRETARY') {
      router.push('/dashboard/secretary');
    } else {
      router.push('/dashboard/member');
    }
  };

  const logoutUser = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {}
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        language,
        setLanguage,
        voiceEnabled,
        setVoiceEnabled,
        speak,
        loginUser,
        logoutUser,
      }}
    >
      <div className="relative">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="fixed bottom-4 right-4 z-50 rounded-full bg-white p-3 shadow-lg hover:bg-slate-100 transition dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-yellow-400"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          )}
        </button>
        {children}
      </div>
    </AuthContext.Provider>
  );
}
