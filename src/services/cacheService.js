// Gemini Cached Content yönetimi (kısa süreli bağlam önbelleği)

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro';
const CACHE_TTL_SECONDS = Number(import.meta.env.VITE_GEMINI_CACHE_TTL_SECONDS || 300); // 5 dk varsayılan

// Sadece bellek içi; uygulama kapanınca silinir
const conversationIdToCache = new Map(); // { cacheName, expiresAt }

function modelResourceName(modelName) {
  // REST için bazen 'models/' prefix gerekli
  return modelName.startsWith('models/') ? modelName : `models/${modelName}`;
}

function nowMs() {
  return Date.now();
}

function isCacheValid(entry) {
  if (!entry) return false;
  return entry.expiresAt && entry.expiresAt > nowMs();
}

async function createCachedContent({ conversationId, contextParts = [], systemInstruction = '' }) {
  if (!API_KEY) throw new Error('API anahtarı tanımlı değil');
  if (!contextParts || contextParts.length === 0) return null;

  try {
    const body = {
      model: modelResourceName(MODEL_NAME),
      ttl: `${Math.max(60, CACHE_TTL_SECONDS)}s`, // 60 sn altına düşürme
    };

    if (systemInstruction && systemInstruction.trim()) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    // REST formatında contents => [{ role, parts }]
    body.contents = [
      {
        role: 'user',
        parts: contextParts,
      },
    ];

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${encodeURIComponent(API_KEY)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Cache oluşturma hatası: ${resp.status} ${errText}`);
    }

    const data = await resp.json();
    const cacheName = data.name; // 'cachedContents/...' beklenir
    // expireTime RFC3339 gelebilir; biz TTL üzerinden hesaplarız
    const expiresAt = nowMs() + Math.max(60, CACHE_TTL_SECONDS) * 1000 - 5000; // 5 sn pay

    if (conversationId) {
      conversationIdToCache.set(conversationId, { cacheName, expiresAt });
    }

    return { cacheName, expiresAt };
  } catch (error) {
    console.error('createCachedContent error:', error);
    return null;
  }
}

async function generateWithCache({
  conversationId,
  userText,
  generationConfig,
  safetySettings,
}) {
  if (!API_KEY) throw new Error('API anahtarı tanımlı değil');

  const entry = conversationIdToCache.get(conversationId);
  if (!isCacheValid(entry)) return null;

  const cacheName = entry.cacheName;

  try {
    const body = {
      contents: [
        { role: 'user', parts: [{ text: userText }] },
      ],
      cachedContent: cacheName,
    };

    if (generationConfig) body.generationConfig = generationConfig;
    if (safetySettings) body.safetySettings = safetySettings;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${modelResourceName(MODEL_NAME)}:generateContent?key=${encodeURIComponent(API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      // Önbellek yok olmuş/expired ise sessizce null dön; arka plana düşeriz
      console.warn('generateWithCache failed:', resp.status, errText);
      return null;
    }

    const data = await resp.json();
    const candidate = data.candidates && data.candidates[0];
    const parts = candidate?.content?.parts || [];
    const text = parts.map(p => p.text || '').join('');
    return {
      text,
      usageMetadata: data.usageMetadata,
      model: MODEL_NAME,
    };
  } catch (error) {
    console.error('generateWithCache error:', error);
    return null;
  }
}

function getOrCreateConversationId(existingId) {
  if (existingId) return existingId;
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getCacheEntry(conversationId) {
  const entry = conversationIdToCache.get(conversationId);
  return isCacheValid(entry) ? entry : null;
}

function clearCache(conversationId) {
  conversationIdToCache.delete(conversationId);
}

export default {
  createCachedContent,
  generateWithCache,
  getOrCreateConversationId,
  getCacheEntry,
  clearCache,
  clearAll: () => conversationIdToCache.clear(),
};


