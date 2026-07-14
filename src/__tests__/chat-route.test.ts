import { describe, it, expect, vi } from 'vitest';
import { POST } from '../app/api/chat/route';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock AI SDK modules
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(),
}));

vi.mock('ai', () => ({
  streamText: vi.fn(),
}));


describe('Chat API Route (/api/chat)', () => {
  
  it('should return 400 Bad Request if messages array is missing', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: 'metlife-stadium' }),
    });
    
    const res = await POST(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('messages must be an array');
  });

  it('should fall back to smart local mock-stream responses when GEMINI_API_KEY is absent', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hi, where is the closest accessible restroom?' }
        ],
        venueId: 'metlife-stadium',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    expect(res.headers.get('x-vercel-ai-ui-message-stream')).toBe('v1');

    // Read and verify the stream payload
    const reader = res.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let streamText = '';
    
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      streamText += decoder.decode(value, { stream: true });
    }

    expect(streamText).toContain('text-start');
    expect(streamText).toContain('text-delta');
    expect(streamText).toContain('text-end');
    expect(streamText).toContain('Restrooms');
  });

  it('should return multilingual answers in Spanish on fallback stream', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '¿dónde está el elevador?' }
        ],
        venueId: 'sofi-stadium',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let streamText = '';
    
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      streamText += decoder.decode(value, { stream: true });
    }

    expect(streamText).toContain('Accesibilidad');
    expect(streamText).toContain('Elevador');
  });

  it('should return multilingual answers in French on fallback stream', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'ou se trouve la toilette?' }
        ],
        venueId: 'estadio-azteca',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let streamText = '';
    
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      streamText += decoder.decode(value, { stream: true });
    }

    expect(streamText).toContain('Toilettes');
  });

  it('should call streamText with correct model and prompts when API key is present', async () => {
    process.env.GEMINI_API_KEY = 'mock-api-key';

    const mockModel = { id: 'mock-model' };
    const mockGoogle = vi.fn().mockReturnValue(mockModel);
    
    vi.mocked(createGoogleGenerativeAI).mockReturnValue(mockGoogle as any);

    const mockStreamResult = {
      toUIMessageStreamResponse: () => new Response('mock-stream-response'),
    };
    vi.mocked(streamText).mockResolvedValue(mockStreamResult as any);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hello' }],
        venueId: 'metlife-stadium',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('mock-stream-response');

    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({ apiKey: 'mock-api-key' });
    expect(mockGoogle).toHaveBeenCalledWith('gemini-1.5-flash');

    expect(streamText).toHaveBeenCalled();
    const streamArgs = vi.mocked(streamText).mock.calls[0][0];
    expect(streamArgs.model).toBe(mockModel);
    expect(streamArgs.system).toContain('StadiumSync AI');
    expect(streamArgs.system).toContain('MetLife Stadium');

    delete process.env.GEMINI_API_KEY;
    vi.mocked(streamText).mockClear();
    mockGoogle.mockClear();
  });

}, 25000);

