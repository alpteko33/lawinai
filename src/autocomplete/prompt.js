// Autocomplete prompt builder
// Temperature deliberately low for deterministic completions

const DEFAULT_TEMPERATURE = 0.01;
const DEFAULT_MAX_TOKENS = 128; // küçük öneriler için yeterli

export const STOP_TOKENS = [
  '\n\n',
  '```',
  '\u0000',
];

function pruneContextWindow(text, limitBytes = 4096) {
  if (!text) return '';
  // Basit UTF-8 tahmini: 1-2 byte ortalama; kabaca kes
  if (text.length <= limitBytes) return text;
  return text.slice(text.length - limitBytes);
}

export function buildPrompt({ prefix, suffix, lang = 'tr' }) {
  const prunedPrefix = pruneContextWindow(prefix || '', 8192);
  const prunedSuffix = pruneContextWindow(suffix || '', 8192);

  const system =
    'Sen bir metin tamamlama motorusun. Kullanıcının imleç konumundaki metni, bağlamı bozmadan kısa ve isabetli şekilde TAMAMLA. '+
    'Sadece imleçten sonra gelmesi gereken karakterleri döndür; mevcut metni ASLA tekrar etme. '+
    'Çok satırlı öneri yalnızca satır sonu boşsa ver. Gereksiz kapanışları ekleme. Türkçe noktalama ve boşluk uyumuna dikkat et.';

  const instruction =
    `Bağlam (prefix) ve devamındaki metin (suffix) aşağıdadır. ` +
    `Prefix: <<<\n${prunedPrefix}\n>>>\n` +
    `Suffix: <<<\n${prunedSuffix}\n>>>\n` +
    `Yalnızca tamamlanacak kısmı döndür. Ön ekleri veya açıklama ekleme.`;

  return {
    system,
    instruction,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
    stop: STOP_TOKENS,
    prunedPrefix,
    prunedSuffix,
  };
}

export default { buildPrompt, STOP_TOKENS };


