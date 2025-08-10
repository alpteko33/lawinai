import assert from 'assert';
import { computeAcceptedText, shouldCancelOnEscape } from '../src/lib/tiptapAutocompletePlugin.js';

function testComputeAccepted() {
  const prefix = 'Merhaba (';
  const suffix = ') dünya';
  const suggestion = ') güzel';
  const out = computeAcceptedText({ prefix, suffix, suggestion });
  // suffix zaten ')' ile başladığı için önerideki fazlalık kapanış kaldırılmalı, bir boşluk kalmalı
  assert.strictEqual(out, ' güzel', 'bracket-aware kabul ve whitespace uyumu doğru olmalı');
}

function testEscapeCancel() {
  assert.strictEqual(shouldCancelOnEscape('abc'), true);
  assert.strictEqual(shouldCancelOnEscape(''), false);
}

try {
  testComputeAccepted();
  testEscapeCancel();
  console.log('✅ Plugin basit testleri geçti');
  process.exit(0);
} catch (e) {
  console.error('❌ Plugin test hatası:', e?.message || e);
  process.exit(1);
}


