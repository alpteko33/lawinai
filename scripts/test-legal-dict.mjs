import assert from 'assert';
import { matchDictionarySuggestion, findFragmentAtPrefix } from '../src/autocomplete/legalDictionary.js';

function testFragment() {
  assert.strictEqual(findFragmentAtPrefix('Mah'), 'Mah');
  assert.strictEqual(findFragmentAtPrefix('Merhaba Mah'), 'Mah');
  assert.strictEqual(findFragmentAtPrefix('Merhaba '), '');
}

function testMatch() {
  const s1 = matchDictionarySuggestion({ prefix: 'Mah', suffix: '' });
  assert.ok(s1 && s1.remainder, 'Mah -> remainder olmalı');
  const s2 = matchDictionarySuggestion({ prefix: 'Tal', suffix: '' });
  assert.ok(s2 && s2.remainder && s2.target.toLowerCase().includes('talep'), 'Tal -> talep önerisi');
  const s3 = matchDictionarySuggestion({ prefix: 'Say', suffix: '' });
  assert.ok(s3 && s3.remainder && s3.target.toLowerCase().includes('saygılarımla'), 'Say -> saygılarımla');
  const s4 = matchDictionarySuggestion({ prefix: 'Vek', suffix: '' });
  assert.ok(s4 && s4.remainder && s4.target.toLowerCase().includes('vekalet'), 'Vek -> vekalet');
}

try {
  testFragment();
  testMatch();
  console.log('✅ Hukuk sözlüğü testleri geçti');
  process.exit(0);
} catch (e) {
  console.error('❌ Hukuk sözlüğü test hatası:', e?.message || e);
  process.exit(1);
}


