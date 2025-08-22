import cacheService from './cacheService.js';
import { buildPrompt } from '../autocomplete/prompt.js';
import { matchDictionarySuggestion } from '../autocomplete/legalDictionary.js';

async function getGeminiService() {
  const mod = await import('./geminiService.js');
  return mod.default;
}

// Basit unicode/whitespace düzeltmeleri (opsiyonel)
export function normalizeCompletion(text) {
  if (!text) return '';
  return text
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '') // zero-width
    .replace(/\s+$/g, '') // trailing spaces
    ;
}

export function dedupeWithSuffix(completionText, suffix) {
  if (!completionText) return '';
  if (!suffix) return completionText;
  let i = 0;
  while (i < completionText.length && i < suffix.length && completionText[i] === suffix[i]) {
    i++;
  }
  return completionText.slice(i);
}

async function* streamFromGemini({ promptText }) {
  // Gemini SDK chat üzerinden stream kullanıyoruz
  // Burada basit bir fallback olarak tek atım + parça parça emit yapabiliriz
  const geminiService = await getGeminiService();
  if (!geminiService.chat) {
    await geminiService.ensureChat([]);
  }
  const result = await geminiService.chat.sendMessageStream([{ text: promptText }]);
  let fullText = '';
  for await (const chunk of result.stream) {
    const delta = chunk.text();
    fullText += delta;
    yield { delta, fullText };
  }
}

export async function streamAutocomplete({ prefix, suffix, completionId }, abortSignal) {
  // Prefix boşsa autocomplete çalıştırma
  if (!prefix || prefix.trim() === '') {
    return {
      type: 'empty',
      async *[Symbol.asyncIterator]() {
        // Boş iterator döndür
      },
      onDone: () => {},
      onAbort: () => {},
    };
  }
  
  const { prunedPrefix, prunedSuffix, system, instruction, temperature, maxTokens } = buildPrompt({ prefix, suffix });

  // 1) HUKUK SÖZLÜĞÜ: yerel öneriyi önce dene (anında)
  try {
    const local = matchDictionarySuggestion({ prefix: prunedPrefix, suffix: prunedSuffix });
    if (local && local.remainder) {
      const deduped = dedupeWithSuffix(local.remainder, prunedSuffix);
      const normalized = normalizeCompletion(deduped);
      if (normalized) {
        return {
          type: 'local',
          async *[Symbol.asyncIterator]() {
            yield { delta: normalized, fullText: normalized };
          },
          onDone: () => {},
          onAbort: () => {},
        };
      }
    }
  } catch (_) {}

  const cacheKey = prunedPrefix; // belirtilen anahtar şeması
  let cachedRemainder = null;
  try {
    if (window?.electronAPI?.autocompleteCache) {
      cachedRemainder = await window.electronAPI.autocompleteCache.get(cacheKey);
    } else {
      cachedRemainder = cacheService.autocompleteGet(cacheKey);
    }
  } catch (_) {}
  if (cachedRemainder) {
    // Önbellek vuruşu: anında tam yanıt simülasyonu
    const remainder = dedupeWithSuffix(cachedRemainder, prunedSuffix);
    const normalized = normalizeCompletion(remainder);
    return {
      type: 'cached',
      async *[Symbol.asyncIterator]() {
        yield { delta: normalized, fullText: normalized };
      },
      onDone: () => {},
      onAbort: () => {},
    };
  }

  // Prompt metni
  const promptText = [
    `Sistem:\n${system}`,
    `Talimat:\n${instruction}`,
    `Ayarlar: temperature=${temperature}, maxTokens=${maxTokens}`,
  ].join('\n\n');

  let aborted = false;
  const controller = new AbortController();
  const signal = abortSignal || controller.signal;
  if (signal) {
    signal.addEventListener('abort', () => { aborted = true; }, { once: true });
  }

  let full = '';
  const iterator = (async function* () {
    try {
      for await (const { delta, fullText } of streamFromGemini({ promptText })) {
        if (aborted) break;
        const deduped = dedupeWithSuffix(delta, prunedSuffix);
        if (!deduped) continue;
        full += deduped;
        const normalized = normalizeCompletion(deduped);
        yield { delta: normalized, fullText: full };
      }
    } catch (e) {
      // Ağ hataları sessiz (loglayıp yut)
      console.warn('autocomplete stream error:', e?.message || e);
    }
  })();

  return {
    type: 'stream',
    async *[Symbol.asyncIterator]() {
      for await (const item of iterator) {
        yield item;
      }
    },
    onDone: async () => {
      if (!aborted && full) {
        try {
          if (window?.electronAPI?.autocompleteCache) {
            await window.electronAPI.autocompleteCache.put(cacheKey, full);
          } else {
            cacheService.autocompletePut(cacheKey, full);
          }
        } catch (_) {}
      }
    },
    onAbort: () => {
      aborted = true;
    },
  };
}

export default { streamAutocomplete };


