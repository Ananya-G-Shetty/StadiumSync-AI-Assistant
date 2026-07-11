'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type FontSize = 'normal' | 'large' | 'xlarge';

interface AccessibilityContextType {
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  readAloud: boolean;
  setReadAloud: (val: boolean) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  screenReaderHelper: boolean;
  setScreenReaderHelper: (val: boolean) => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  announceToScreenReader: (text: string) => void;
  srAnnouncement: string;
  speechLanguage: string;
  setSpeechLanguage: (lang: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('normal');
  const [readAloud, setReadAloud] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [screenReaderHelper, setScreenReaderHelper] = useState(false);
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const [speechLanguage, setSpeechLanguage] = useState('en-US');

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('splang');
    if (savedLang) setSpeechLanguage(savedLang);
    const savedContrast = localStorage.getItem('hc');
    if (savedContrast === 'true') setHighContrast(true);

    const savedSize = localStorage.getItem('fs') as FontSize;
    if (savedSize && ['normal', 'large', 'xlarge'].includes(savedSize)) {
      setFontSize(savedSize);
    }

    const savedReadAloud = localStorage.getItem('ra');
    if (savedReadAloud === 'true') setReadAloud(true);

    const savedRate = localStorage.getItem('srate');
    if (savedRate) {
      const parsed = parseFloat(savedRate);
      if (!isNaN(parsed)) setSpeechRate(parsed);
    }

    const savedHelper = localStorage.getItem('srh');
    if (savedHelper === 'true') setScreenReaderHelper(true);
  }, []);

  // Sync state to HTML tags and localStorage
  useEffect(() => {
    localStorage.setItem('hc', String(highContrast));
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('fs', fontSize);
    const docEl = document.documentElement;
    docEl.classList.remove('text-normal', 'text-large', 'text-xlarge');
    docEl.classList.add(`text-${fontSize}`);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('ra', String(readAloud));
    if (!readAloud) {
      stopSpeaking();
    }
  }, [readAloud]);

  useEffect(() => {
    localStorage.setItem('srate', String(speechRate));
  }, [speechRate]);

  useEffect(() => {
    localStorage.setItem('srh', String(screenReaderHelper));
  }, [screenReaderHelper]);

  useEffect(() => {
    localStorage.setItem('splang', speechLanguage);
  }, [speechLanguage]);

  const speak = (text: string) => {
    if (!readAloud || typeof window === 'undefined' || !window.speechSynthesis) return;

    // Stop current speech
    window.speechSynthesis.cancel();

    // Clean text from markdown or special characters before speaking
    const cleanText = text
      .replace(/[*#_`~\[\]()]/g, '') // remove markdown symbols
      .replace(/https?:\/\/\S+/g, '') // remove urls
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate;
    
    // Choose appropriate voice if available
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => v.lang.toLowerCase() === speechLanguage.toLowerCase());
    
    if (!selectedVoice) {
      // Fallback to general language code prefix match (e.g. "en", "hi")
      const prefix = speechLanguage.split('-')[0].toLowerCase();
      selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const announceToScreenReader = (text: string) => {
    setSrAnnouncement(text);
    // Clear after announcement to allow re-announcement of same text if needed
    setTimeout(() => {
      setSrAnnouncement((curr) => (curr === text ? '' : curr));
    }, 3000);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        setHighContrast,
        fontSize,
        setFontSize,
        readAloud,
        setReadAloud,
        speechRate,
        setSpeechRate,
        screenReaderHelper,
        setScreenReaderHelper,
        speak,
        stopSpeaking,
        announceToScreenReader,
        srAnnouncement,
        speechLanguage,
        setSpeechLanguage,
      }}
    >
      {children}
      {/* Visually hidden container for aria-live announcements */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        }}
      >
        {srAnnouncement}
      </div>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
