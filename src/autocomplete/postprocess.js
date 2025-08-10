export function fixWhitespaceAndIndent(text, prefix) {
  if (!text) return '';
  // Eğer prefix boşlukla bitiyorsa, öneri başındaki fazladan boşluğu at
  const prefixEndsWithSpace = /[\s\t]$/.test(prefix || '');
  return text.replace(/^\s+/, prefixEndsWithSpace ? '' : ' ');
}

export function stripUnwantedClosures(text, suffix) {
  if (!text) return '';
  // Suffix zaten kapanış içeriyorsa önerideki fazlalıkları çıkar
  const pairs = [
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
    ['"', '"'],
    ['\'', '\''],
  ];
  let out = text;
  for (const [open, close] of pairs) {
    const sfxStartsWithClose = (suffix || '').trim().startsWith(close);
    if (!sfxStartsWithClose) continue;
    // Sondaki kapanışı kırp
    if (out.endsWith(close)) {
      out = out.slice(0, -close.length);
    }
    // Başta kapanış varsa onu da kırp (ör: ") merhaba" -> merhaba)
    if (out.startsWith(close)) {
      out = out.slice(close.length);
    }
  }
  return out;
}

export default { fixWhitespaceAndIndent, stripUnwantedClosures };


