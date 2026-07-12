'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Bot, 
  Map as MapIcon, 
  Compass, 
  Calendar, 
  Eye, 
  Type, 
  Volume2, 
  VolumeX,
  ShieldAlert,
  Info
} from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { 
    highContrast, 
    setHighContrast, 
    fontSize, 
    setFontSize, 
    readAloud, 
    setReadAloud, 
    screenReaderHelper,
    setScreenReaderHelper,
    stopSpeaking,
    speechLanguage,
    setSpeechLanguage
  } = useAccessibility();

  // Register Service Worker for PWA offline capabilities
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('ServiceWorker registered:', reg.scope))
          .catch((err) => console.error('ServiceWorker registration failed:', err));
      });
    }
  }, []);

  // Cycle font size
  const cycleFontSize = () => {
    if (fontSize === 'normal') setFontSize('large');
    else if (fontSize === 'large') setFontSize('xlarge');
    else setFontSize('normal');
  };

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'AI Assist', href: '/chat', icon: Bot },
    { name: 'Stadium Map', href: '/map', icon: MapIcon },
    { name: 'Amenities', href: '/amenities', icon: Compass },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
  ];

  return (
    <div className="flex flex-col min-h-screen text-foreground bg-transparent transition-colors duration-200">
      {/* Skip Navigation Link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-link sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-primary focus:text-primary-foreground focus:z-50 focus:rounded-b-md"
      >
        Skip to main content
      </a>

      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-sm" role="banner">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
            <Compass className="h-5 w-5 animate-spin-slow" aria-hidden="true" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            StadiumSync <span className="text-primary font-extrabold">AI</span>
          </span>
          <span className="bg-secondary/15 text-secondary text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
            FIFA 2026
          </span>
        </div>

        {/* Quick Accessibility Toggles */}
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="Accessibility Settings Quick Bar">
          {/* Speech Voice Language Selector */}
          <select
            value={speechLanguage}
            onChange={(e) => setSpeechLanguage(e.target.value)}
            className="h-8 px-1 rounded-lg bg-muted/80 border border-border text-[10px] font-bold text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer"
            aria-label="Select speech language voice"
            title="Speech Voice Language"
          >
            <option value="en-US">🇺🇸 English</option>
            <option value="es-ES">🇪🇸 Español</option>
            <option value="fr-FR">🇫🇷 Français</option>
            <option value="hi-IN">🇮🇳 हिन्दी (Hindi)</option>
            <option value="bn-IN">🇮🇳 বাংলা (Bengali)</option>
            <option value="te-IN">🇮🇳 తెలుగు (Telugu)</option>
            <option value="ta-IN">🇮🇳 தமிழ் (Tamil)</option>
            <option value="kn-IN">🇮🇳 ಕನ್ನಡ (Kannada)</option>
            <option value="ml-IN">🇮🇳 മലയാളം (Malayalam)</option>
          </select>

          {/* Read Aloud Speech Toggle */}
          <button
            onClick={() => {
              setReadAloud(!readAloud);
              if (readAloud) stopSpeaking();
            }}
            className={`p-2 rounded-lg transition-colors border ${
              readAloud 
                ? 'bg-secondary text-secondary-foreground border-secondary' 
                : 'hover:bg-muted border-border'
            }`}
            aria-label={readAloud ? 'Disable screen read-aloud' : 'Enable screen read-aloud'}
            aria-pressed={readAloud}
            title="Read Responses Aloud Toggle"
          >
            {readAloud ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
          </button>

          {/* Text Size Scale Toggle */}
          <button
            onClick={cycleFontSize}
            className="p-2 rounded-lg hover:bg-muted border border-border flex items-center gap-0.5 text-xs font-bold"
            aria-label={`Change text size. Current: ${fontSize}. Press to cycle sizes.`}
            title="Text Size Scaling"
          >
            <Type className="h-4.5 w-4.5" aria-hidden="true" />
            <span className="uppercase text-[10px]">{fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}</span>
          </button>

          {/* High Contrast Mode Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`p-2 rounded-lg transition-colors border ${
              highContrast 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'hover:bg-muted border-border'
            }`}
            aria-label={highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
            aria-pressed={highContrast}
            title="High Contrast Mode Toggle"
          >
            <Eye className="h-4.5 w-4.5" />
          </button>

          {/* Audio Instructions Tooltip Helper */}
          <button
            onClick={() => setScreenReaderHelper(!screenReaderHelper)}
            className={`p-2 rounded-lg transition-colors border hidden sm:inline-block ${
              screenReaderHelper 
                ? 'bg-info/20 text-info border-info/50' 
                : 'hover:bg-muted border-border'
            }`}
            aria-label={screenReaderHelper ? 'Hide accessibility helper instructions' : 'Show accessibility helper instructions'}
            aria-pressed={screenReaderHelper}
            title="Interactive Accessibility Hints Toggle"
          >
            <Info className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Screen Reader Helpful HUD */}
      {screenReaderHelper && (
        <div className="bg-info/10 border-b border-info/30 px-4 py-2 text-xs flex items-center justify-between text-foreground">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-info flex-shrink-0" />
            <span>
              <strong>Accessibility Active:</strong> Use keyboard <kbd className="bg-muted px-1.5 py-0.5 rounded border">Tab</kbd> to move, <kbd className="bg-muted px-1.5 py-0.5 rounded border">Enter</kbd> to select. Press <kbd className="bg-muted px-1.5 py-0.5 rounded border">Alt + H</kbd> for High Contrast, <kbd className="bg-muted px-1.5 py-0.5 rounded border">Alt + T</kbd> for Text Scaling.
            </span>
          </div>
          <button 
            onClick={() => setScreenReaderHelper(false)} 
            className="text-[10px] font-bold underline hover:text-info/80 ml-2"
            aria-label="Dismiss helper guidance"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main 
        id="main-content" 
        className="flex-1 max-w-6xl mx-auto w-full px-4 pt-4 pb-24 focus:outline-none" 
        tabIndex={-1}
        role="main"
      >
        {children}
      </main>

      {/* Bottom Nav Bar (Mobile-first floating layout) */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border max-w-6xl mx-auto w-full shadow-lg"
        role="navigation"
        aria-label="Primary Navigation Bar"
      >
        <ul className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.name} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center h-full w-full transition-all gap-1 ${
                    isActive 
                      ? 'text-primary scale-105 font-semibold' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`h-5.5 w-5.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} aria-hidden="true" />
                  <span className="text-[10px] tracking-wide leading-none">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
