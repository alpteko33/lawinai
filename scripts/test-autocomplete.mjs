import assert from 'assert';
import { dedupeWithSuffix, normalizeCompletion } from '../src/services/autocompleteService.js';
import cacheService from '../src/services/cacheService.js';

// Basit testler (node --experimental-modules gerektirmez, mjs olarak çalışır)

function testCachePutGet() {
  cacheService.autocompleteClear();
  const key = 'hello world';
  const val = ' test';
  cacheService.autocompletePut(key, val);
  const got = cacheService.autocompleteGet(key);
  assert.strictEqual(got, val, 'LRU get eşleşmeli');
}

function testDedup() {
  const suffix = 'world!';
  const completion = 'world! how are you?';
  const deduped = dedupeWithSuffix(completion, suffix);
  assert.strictEqual(deduped, ' how are you?', 'suffix ile çakışan kısım kırpılmalı');
}

function testNormalize() {
  const raw = 'Hello\u200B  ';
  const norm = normalizeCompletion(raw);
  assert.strictEqual(norm, 'Hello', 'unicode ve trailing whitespace temizlenmeli');
}

try {
  testCachePutGet();
  testDedup();
  testNormalize();
  console.log('✅ Autocomplete basit testleri geçti');
  process.exit(0);
} catch (e) {
  console.error('❌ Test hatası:', e?.message || e);
  process.exit(1);
}


