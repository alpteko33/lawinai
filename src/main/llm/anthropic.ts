type Role = 'user' | 'assistant' | 'system';

export type AnthropicMessage = {
  role: Role;
  content: string;
};

export type CacheBehavior = {
  cacheSystemMessage?: boolean;
  cacheConversation?: boolean;
};

export type BuildOptions = {
  model?: string;
  temperature?: number;
};

/** Anthropic prompt caching beta başlığı. */
export const PROMPT_CACHING_BETA = 'prompt-caching-2024-07-31';

/**
 * Anthropic Messages API isteği gövdesini ve gerekli header'ları üretir.
 * - cacheSystemMessage: system mesajına ephemeral cache_control ekler
 * - cacheConversation: son iki user mesajına ephemeral cache_control ekler
 */
export function buildAnthropicRequest(
  messages: AnthropicMessage[],
  cacheBehavior: CacheBehavior = {},
  options: BuildOptions = {}
): { body: any; headers: Record<string, string> } {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  let needPromptCachingHeader = false;

  const bodyMessages: any[] = messages.map((m) => ({ role: m.role, content: m.content }));

  if (cacheBehavior.cacheSystemMessage) {
    const idx = bodyMessages.findIndex((m) => m.role === 'system');
    if (idx >= 0) {
      bodyMessages[idx] = {
        ...bodyMessages[idx],
        cache_control: { type: 'ephemeral' },
      };
      needPromptCachingHeader = true;
    }
  }

  if (cacheBehavior.cacheConversation) {
    // son iki user mesajını bul
    const userIndexes = bodyMessages
      .map((m, i) => ({ m, i }))
      .filter((x) => x.m.role === 'user')
      .map((x) => x.i);
    const targets = userIndexes.slice(-2);
    for (const i of targets) {
      bodyMessages[i] = { ...bodyMessages[i], cache_control: { type: 'ephemeral' } };
      needPromptCachingHeader = true;
    }
  }

  if (needPromptCachingHeader) {
    headers['anthropic-beta'] = PROMPT_CACHING_BETA;
  }

  const body: any = {
    model: options.model || 'claude-3-5-sonnet-20240620',
    temperature: options.temperature ?? 0.2,
    messages: bodyMessages,
  };

  return { body, headers };
}


