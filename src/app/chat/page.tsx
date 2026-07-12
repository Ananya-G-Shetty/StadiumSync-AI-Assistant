'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { useAccessibility } from '@/context/AccessibilityContext';
import { DefaultChatTransport, UIMessage } from 'ai';

const getMessageText = (message: UIMessage): string => {
  if (message.parts && message.parts.length > 0) {
    const partsText = message.parts
      ?.filter((part) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
    if (partsText) return partsText;
  }
  
  const content = (message as any).content;
  if (typeof content === 'string' && content) {
    return content;
  }

  return (message as any).text || '';
};
import { 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  StopCircle, 
  Sparkles,
  Bot,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

export default function ChatPage() {
  const { speak, stopSpeaking, readAloud, setReadAloud, announceToScreenReader, speechLanguage } = useAccessibility();
  
  // Local states
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [venueName, setVenueName] = useState<string>('FIFA Stadium');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize selected venue context
  useEffect(() => {
    const savedVenueId = localStorage.getItem('selectedVenueId') || 'metlife-stadium';
    setSelectedVenueId(savedVenueId);
    
    // Map to human name
    const names: Record<string, string> = {
      'metlife-stadium': 'MetLife Stadium (NY/NJ)',
      'sofi-stadium': 'SoFi Stadium (LA)',
      'estadio-azteca': 'Estadio Azteca (Mexico City)'
    };
    setVenueName(names[savedVenueId] || 'FIFA Stadium');
  }, []);

  // Set up Vercel AI useChat hook
  const [chatInput, setChatInput] = useState('');
  const { 
    messages, 
    sendMessage, 
    status,
    stop, 
    error 
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onFinish: (event) => {
      // Auto read aloud if enabled
      const text = getMessageText(event.message);
      if (readAloud && text) {
        speak(text);
      }
      announceToScreenReader('AI finished responding.');
    }
  });

  const isLoading = status === 'submitted';
  const isGenerating = status === 'submitted' || status === 'streaming';

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating || isRecording) return;
    sendMessage({ text: chatInput }, { body: { venueId: selectedVenueId } });
    setChatInput('');
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Recognition Setup (Web Speech API)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = speechLanguage; // Sync with selected speech language

        rec.onstart = () => {
          setIsRecording(true);
          announceToScreenReader('Listening. Speak into your microphone now.');
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setChatInput(transcript);
          announceToScreenReader(`Voice input captured: ${transcript}`);
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          announceToScreenReader(`Speech recognition error occurred: ${event.error}`);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, [announceToScreenReader, speechLanguage]);

  const toggleRecording = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      // Detect language based on query context if possible, default to en-US
      recognitionRef.current.start();
    }
  };

  // Quick Action Chips
  const suggestionChips = [
    { text: 'Where is wheelchair seating?', sr: 'Where is wheelchair seating?' },
    { text: 'Closest sensory room?', sr: 'Where is the closest sensory quiet room?' },
    { text: 'Any low-counter food?', sr: 'Find concession stands with low counters.' },
    { text: 'First Aid locations?', sr: 'Where are first aid medical stations?' },
  ];

  const handleChipClick = (chipText: string) => {
    setChatInput(chipText);
    announceToScreenReader(`Selected prompt: ${chipText}`);
    speak(`Selected ${chipText}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10.5rem)] max-h-[800px] border border-border bg-card rounded-2xl shadow-sm overflow-hidden">
      {/* Venue Context Header */}
      <div className="px-4 py-3 bg-muted/45 border-b border-border/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-bold text-foreground">
            Assistant Context: <span className="text-primary">{venueName}</span>
          </span>
        </div>
        <div className="text-[10px] bg-secondary/15 text-secondary font-bold px-2 py-0.5 rounded-full">
          AI ONLINE
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-label="Chat messages history">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <div className="bg-primary/10 text-primary p-3 rounded-full">
              <Bot className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-foreground">Ask StadiumSync AI</h2>
              <p className="text-xs text-muted-foreground max-w-[280px] leading-normal font-medium">
                Ask about accessible elevators, wheelchair routes, low counters, family toilets, quiet rooms, or match fixtures.
              </p>
            </div>

            {/* Suggestions list */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm pt-2" role="group" aria-label="Suggested Prompts">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip.text)}
                  className="p-2.5 rounded-xl border border-border bg-background text-left text-xs font-semibold hover:border-primary active:scale-98 transition-all"
                  aria-label={`Ask AI: ${chip.sr}`}
                >
                  {chip.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isAI = message.role === 'assistant';
            return (
              <div
                key={message.id}
                className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Visual Avatar */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isAI ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}>
                  {isAI ? <Bot className="h-4 w-4 text-primary-foreground" /> : 'Me'}
                </div>

                {/* Message Body */}
                <div className="space-y-1">
                  <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm border ${
                    isAI 
                      ? 'bg-muted/40 border-border/80 text-foreground rounded-tl-none' 
                      : 'bg-primary text-primary-foreground border-primary rounded-tr-none'
                  }`}>
                    {getMessageText(message)}
                  </div>

                  {/* Accessibility Audio controls for AI responses */}
                  {isAI && (
                    <div className="flex items-center gap-1.5 px-1">
                      <button
                        onClick={() => speak(getMessageText(message))}
                        className="text-[10px] text-muted-foreground hover:text-primary font-bold flex items-center gap-1"
                        aria-label="Speak response aloud"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        Listen
                      </button>
                      <button
                        onClick={stopSpeaking}
                        className="text-[10px] text-muted-foreground hover:text-danger font-bold flex items-center gap-1"
                        aria-label="Stop speaking response"
                      >
                        <StopCircle className="h-3.5 w-3.5" />
                        Stop
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto" aria-live="polite">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              AI
            </div>
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 text-foreground rounded-tl-none flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Errors Display */}
        {error && (
          <div className="p-3 rounded-xl border border-danger/20 bg-danger/10 text-danger text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>Connection issue: Unable to reach Gemini assistant. Please try again.</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Tray */}
      <form 
        onSubmit={handleFormSubmit} 
        className="p-3 bg-muted/20 border-t border-border flex items-center gap-2"
        role="search"
        aria-label="Ask AI Assistant"
      >
        {/* Voice Input Trigger */}
        {speechSupported && (
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-3 rounded-xl transition-all border ${
              isRecording 
                ? 'bg-danger text-danger-foreground border-danger animate-pulse' 
                : 'hover:bg-muted border-border bg-card'
            }`}
            aria-label={isRecording ? 'Stop recording voice' : 'Input using voice speech recognition'}
            aria-pressed={isRecording}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}

        {/* Text Input */}
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={isRecording ? "Listening..." : "Ask StadiumSync AI..."}
          disabled={isRecording || isGenerating}
          className="flex-1 h-12 px-4 rounded-xl border border-border bg-background text-xs font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/60"
          aria-label="Chat input query field"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!chatInput.trim() || isGenerating || isRecording}
          className="p-3 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center"
          aria-label="Send message to AI"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
