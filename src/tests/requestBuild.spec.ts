import { describe, it, expect } from 'vitest';
import { getSystemMessageByMode, buildMessages } from '@/llm/systemMessagesLegal';

describe('LLM request build', () => {
  it('returns correct system message per mode', () => {
    expect(getSystemMessageByMode('sor')).toMatch(/Hukuki danışman/);
    expect(getSystemMessageByMode('yazdir')).toMatch(/Kıdemli hukukçu/);
    expect(getSystemMessageByMode('ozetle')).toMatch(/Hukuki analist/);
  });

  it('builds messages including system and user', () => {
    const msgs = buildMessages({ mode: 'sor', userInput: 'Test', contextText: 'CTX' } as any);
    expect(msgs[0].role).toBe('system');
    expect(msgs[msgs.length - 1].role).toBe('user');
    expect(msgs[msgs.length - 1].content).toMatch(/BAĞLAM ÖZETİ/);
  });
});


