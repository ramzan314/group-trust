'use client';

import React, { useEffect } from 'react';
import { useAuth, translations } from '../app/context/AuthContext';
import { Volume2, VolumeX } from 'lucide-react';

interface VoiceAssistantProps {
  readoutText?: string;
}

export default function VoiceAssistant({ readoutText }: VoiceAssistantProps) {
  const { voiceEnabled, setVoiceEnabled, speak, language } = useAuth();
  const t = translations[language];

  useEffect(() => {
    if (voiceEnabled && readoutText) {
      const timer = setTimeout(() => {
        speak(readoutText);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [voiceEnabled, readoutText, language]);

  const toggleVoice = () => {
    const nextVal = !voiceEnabled;
    setVoiceEnabled(nextVal);
    if (nextVal) {
      speak(readoutText || t.speakWelcome);
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  };

  return (
    <button
      onClick={toggleVoice}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
        voiceEnabled
          ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-950/40 dark:border-brand-800 dark:text-brand-400'
          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
      title="Toggle Speech Guidance"
    >
      {voiceEnabled ? (
        <>
          <Volume2 className="h-4 w-4 animate-pulse text-brand-600 dark:text-brand-400" />
          <span>{t.voice}: ON</span>
        </>
      ) : (
        <>
          <VolumeX className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span>{t.voice}: OFF</span>
        </>
      )}
    </button>
  );
}
