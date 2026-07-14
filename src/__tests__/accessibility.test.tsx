// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AccessibilityProvider, useAccessibility } from '../context/AccessibilityContext';

beforeAll(() => {
  // Stub SpeechSynthesis and SpeechSynthesisUtterance inside JSDOM environment
  global.SpeechSynthesisUtterance = vi.fn().mockImplementation(function (text) {
    return {
      text,
      lang: '',
      rate: 1.0,
      voice: null,
    };
  }) as any;

  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([
        { name: 'Google US English', lang: 'en-US', default: true },
      ]),
    },
    writable: true,
  });
});

describe('Accessibility Context and Hooks', () => {
  beforeEach(() => {
    // Clear DOM and LocalStorage before each test runs
    document.documentElement.className = '';
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default states and reflect in localStorage', () => {
    const { result } = renderHook(() => useAccessibility(), {
      wrapper: AccessibilityProvider,
    });

    expect(result.current.highContrast).toBe(false);
    expect(result.current.fontSize).toBe('normal');
    expect(result.current.readAloud).toBe(false);
    expect(result.current.speechRate).toBe(1.0);
    expect(result.current.screenReaderHelper).toBe(false);
    expect(result.current.speechLanguage).toBe('en-US');
  });

  it('should toggle high contrast and update document class list', () => {
    const { result } = renderHook(() => useAccessibility(), {
      wrapper: AccessibilityProvider,
    });

    act(() => {
      result.current.setHighContrast(true);
    });

    expect(result.current.highContrast).toBe(true);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    expect(localStorage.getItem('hc')).toBe('true');

    act(() => {
      result.current.setHighContrast(false);
    });

    expect(result.current.highContrast).toBe(false);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
    expect(localStorage.getItem('hc')).toBe('false');
  });

  it('should change font sizes and update document text-scaling classes', () => {
    const { result } = renderHook(() => useAccessibility(), {
      wrapper: AccessibilityProvider,
    });

    act(() => {
      result.current.setFontSize('large');
    });

    expect(result.current.fontSize).toBe('large');
    expect(document.documentElement.classList.contains('text-large')).toBe(true);
    expect(document.documentElement.classList.contains('text-normal')).toBe(false);
    expect(localStorage.getItem('fs')).toBe('large');

    act(() => {
      result.current.setFontSize('xlarge');
    });

    expect(result.current.fontSize).toBe('xlarge');
    expect(document.documentElement.classList.contains('text-xlarge')).toBe(true);
    expect(document.documentElement.classList.contains('text-large')).toBe(false);
    expect(localStorage.getItem('fs')).toBe('xlarge');
  });

  it('should set screen reader announcement text and clear it with timeout', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useAccessibility(), {
      wrapper: AccessibilityProvider,
    });

    act(() => {
      result.current.announceToScreenReader('Accessibility voice helper activated');
    });

    expect(result.current.srAnnouncement).toBe('Accessibility voice helper activated');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.srAnnouncement).toBe('');
    vi.useRealTimers();
  });

  it('should trigger speech synthesis speak call when readAloud is active', () => {
    const { result } = renderHook(() => useAccessibility(), {
      wrapper: AccessibilityProvider,
    });

    // Speak should not trigger when readAloud is false
    act(() => {
      result.current.speak('Hello Visitor');
    });
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();

    // Activate readAloud
    act(() => {
      result.current.setReadAloud(true);
    });
    expect(localStorage.getItem('ra')).toBe('true');

    // Speak should now trigger speech synthesis API
    act(() => {
      result.current.speak('Welcome to MetLife Stadium');
    });
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });
});
