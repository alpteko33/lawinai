class TextFormattingService {
  
  // Cache for formatted content to avoid re-processing
  constructor() {
    this.formatCache = new Map();
    this.maxCacheSize = 50;
    this.pendingChanges = new Map(); // AI'ın önerdiği değişiklikler
    this.approvedChanges = new Set(); // Onaylanmış değişiklik ID'leri
  }

  // AI'dan gelen düz metni düzgün HTML formatına çevir (optimized)
  formatLegalDocument(plainText) {
    if (!plainText || typeof plainText !== 'string') {
      return plainText;
    }

    // 0. Markdown kalın (**...**) başlık/biçimlendirme kaldır
    plainText = this.sanitizeMarkdownBold(plainText);

    // Check cache first
    const cacheKey = this.generateCacheKey(plainText);
    if (this.formatCache.has(cacheKey)) {
      return this.formatCache.get(cacheKey);
    }

    let formattedText = plainText;

    // 1. Başlıkları formatla (simplified)
    formattedText = this.formatHeadings(formattedText);
    
    // 2. Paragrafları formatla (optimized)
    formattedText = this.formatParagraphs(formattedText);
    
    // 3. Hukuki terimleri formatla (selective)
    formattedText = this.formatLegalTerms(formattedText);

    // Cache the result
    this.setCacheValue(cacheKey, formattedText);

    return formattedText;
  }

  // Markdown kalın (**...**) kullanımını kaldırır (başlık karmaşasını engellemek için)
  sanitizeMarkdownBold(text) {
    if (!text) return text;
    // 1) Tam satırı kaplayan **...** veya **...**: kalıplarını düz metne çevir
    let cleaned = text
      .replace(/^\s*\*\*(.*?)\*\*\s*:?\s*$/gm, '$1')
      .replace(/^\s*\*\*(.*?)\*\*\s*$/gm, '$1');

    // 2) Kalan tüm **...** kalıplarını da sadeleştir (paragraf içi kalınları da kaldır)
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');

    return cleaned;
  }

  // Generate cache key
  generateCacheKey(text) {
    return text.length + '_' + text.substring(0, 50).replace(/\s/g, '');
  }

  // Set cache value with size limit
  setCacheValue(key, value) {
    if (this.formatCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.formatCache.keys().next().value;
      this.formatCache.delete(firstKey);
    }
    this.formatCache.set(key, value);
  }

  // Başlıkları formatla (optimized)
  formatHeadings(text) {
    // Use more efficient regex patterns
    const headingPatterns = [
      { pattern: /^(TARSUS CUMHURİYET BAŞSAVCILIĞINA|.*MAHKEMES[İI]|.*İCRA MÜDÜRLÜĞÜ)$/gm, tag: 'h1' },
      { pattern: /^(ŞÜPHELİ|MÜŞTEKİ|VEKİLİ|SUÇ|KONU|AÇIKLAMALAR|HUKUKİ NEDENLER|DELİLLER|SONUÇ VE İSTEM):\s*$/gm, tag: 'h3' },
      { pattern: /^(DAVACI|DAVALI|DAVA KONUSU|MADDİ OLAYLAR|HUKUKİ DAYANAK|SONUÇ VE TALEP):\s*$/gm, tag: 'h3' }
    ];

    headingPatterns.forEach(({ pattern, tag }) => {
      text = text.replace(pattern, `<${tag}>$1</${tag}>`);
    });

    return text;
  }

  // Paragrafları formatla (simplified)
  formatParagraphs(text) {
    // Simple paragraph formatting - avoid complex regex
    const lines = text.split('\n');
    const formattedLines = lines.map(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        return '<br>';
      }
      if (trimmedLine.startsWith('<h') || trimmedLine.startsWith('<ul') || trimmedLine.startsWith('<li')) {
        return trimmedLine;
      }
      return `<p>${trimmedLine}</p>`;
    });

    return formattedLines.join('\n');
  }

  // Hukuki terimleri formatla (selective)
  formatLegalTerms(text) {
    // Only format the most important terms to avoid performance issues
    const patterns = [
      { pattern: /(\d{2}\.\d{2}\.\d{4})/g, replacement: '<strong>$1</strong>' },
      { pattern: /(\d{4}\/\d+)\s+(Esas|D\.)\s+(sayılı)/g, replacement: '<strong>$1 $2 $3</strong>' }
    ];

    patterns.forEach(({ pattern, replacement }) => {
      text = text.replace(pattern, replacement);
    });

    return text;
  }

  // HTML'i temizle ve düzenle (optimized)
  cleanHTML(html) {
    // Simple cleanup without complex regex
    return html
      .replace(/\s+/g, ' ')
      .replace(/<\/p>\s*<p>/g, '</p><p>')
      .replace(/<p>\s*<\/p>/g, '')
      .trim();
  }

  // Metni TipTap editörü için optimize et (cached)
  formatForTipTap(plainText) {
    if (!plainText) return plainText;

    const cacheKey = 'tiptap_' + this.generateCacheKey(plainText);
    if (this.formatCache.has(cacheKey)) {
      return this.formatCache.get(cacheKey);
    }

    const formattedHTML = this.formatLegalDocument(plainText);
    const cleanedHTML = this.cleanHTML(formattedHTML);
    
    this.setCacheValue(cacheKey, cleanedHTML);
    return cleanedHTML;
  }

  // Hukuki doküman türünü tespit et (simplified)
  detectDocumentType(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('cumhuriyet başsavcılığına')) return 'sikayet_dilekcesi';
    if (lowerText.includes('mahkemesi') && lowerText.includes('davacı')) return 'hukuk_dilekcesi';
    if (lowerText.includes('icra müdürlüğü')) return 'icra_dilekcesi';
    if (lowerText.includes('iş mahkemesi')) return 'is_dilekcesi';
    
    return 'genel_dilekce';
  }

  // Doküman türüne göre özel formatlama (simplified)
  formatByDocumentType(plainText) {
    // Use the general formatter for better performance
    // Specific formatting can be added later if needed
    return this.formatLegalDocument(plainText);
  }

  // Clear cache when needed
  clearCache() {
    this.formatCache.clear();
  }

  // Get cache stats for debugging
  getCacheStats() {
    return {
      size: this.formatCache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.formatCache.keys()).slice(0, 5) // First 5 keys
    };
  }

  // Metin değişikliklerini hesapla (paragraf bazlı diff)
  calculateTextDiff(originalText, newText) {
    console.log('=== PARAGRAPH DIFF START ===');
    console.log('Original:', originalText?.substring(0, 100) + '...');
    console.log('New:', newText?.substring(0, 100) + '...');

    // Hızlı durumlar
    if (!originalText && !newText) return [];
    if (!originalText) {
      const newParagraphs = this._splitIntoParagraphs(newText);
      const cumulativeNewOffsets = this._computeCumulativeOffsets(newParagraphs);
      const result = newParagraphs.map((p, idx) => ({
        type: 'addition',
        text: p,
        start: cumulativeNewOffsets[idx],
        end: cumulativeNewOffsets[idx] + p.length,
        id: this.generateChangeId(),
      }));
      console.log('Full paragraph additions:', result.length);
      return result;
    }
    if (!newText) {
      const origParagraphs = this._splitIntoParagraphs(originalText);
      const cumulativeOrigOffsets = this._computeCumulativeOffsets(origParagraphs);
      const result = origParagraphs.map((p, idx) => ({
        type: 'deletion',
        text: p,
        start: cumulativeOrigOffsets[idx],
        end: cumulativeOrigOffsets[idx] + p.length,
        id: this.generateChangeId(),
      }));
      console.log('Full paragraph deletions:', result.length);
      return result;
    }

    // Paragraflara böl
    const origParagraphs = this._splitIntoParagraphs(originalText);
    const newParagraphs = this._splitIntoParagraphs(newText);

    // LCS tablosu (paragraf bazlı)
    const m = origParagraphs.length;
    const n = newParagraphs.length;
    const dp = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (origParagraphs[i - 1] === newParagraphs[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Operasyonları çıkar (equal/insert/delete sırası)
    const ops = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && origParagraphs[i - 1] === newParagraphs[j - 1]) {
        ops.unshift({ type: 'equal', content: origParagraphs[i - 1], i: i - 1, j: j - 1 });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.unshift({ type: 'insert', content: newParagraphs[j - 1], j: j - 1 });
        j--;
      } else if (i > 0) {
        ops.unshift({ type: 'delete', content: origParagraphs[i - 1], i: i - 1 });
        i--;
      }
    }

    // Start/end pozisyonlarını hesaplamak için kümülatif ofsetler
    const cumOrig = this._computeCumulativeOffsets(origParagraphs);
    const cumNew = this._computeCumulativeOffsets(newParagraphs);

    const changes = [];
    ops.forEach(op => {
      if (op.type === 'insert') {
        const idx = op.j;
        const start = cumNew[idx];
        changes.push({
          type: 'addition',
          text: newParagraphs[idx],
          start,
          end: start + newParagraphs[idx].length,
          id: this.generateChangeId(),
        });
      } else if (op.type === 'delete') {
        const idx = op.i;
        const start = cumOrig[idx];
        changes.push({
          type: 'deletion',
          text: origParagraphs[idx],
          start,
          end: start + origParagraphs[idx].length,
          id: this.generateChangeId(),
        });
      }
    });

    console.log('Paragraph changes calculated:', changes);
    console.log('=== PARAGRAPH DIFF END ===');
    return changes;
  }

  // Değişiklik ID'si oluştur
  generateChangeId() {
    return 'change_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // AI değişikliğini pending olarak kaydet
  addPendingChange(originalText, newText, changeType = 'replace') {
    const changeId = this.generateChangeId();
    const changes = this.calculateTextDiff(originalText, newText);
    
    const pendingChange = {
      id: changeId,
      originalText,
      newText,
      changes,
      changeType,
      timestamp: Date.now(),
      status: 'pending' // pending, approved, rejected
    };

    this.pendingChanges.set(changeId, pendingChange);
    return changeId;
  }

  // Pending değişiklikleri al
  getPendingChanges() {
    return Array.from(this.pendingChanges.values());
  }

  // Belirli bir değişikliği al
  getPendingChange(changeId) {
    return this.pendingChanges.get(changeId);
  }

  // Değişikliği onayla
  approveChange(changeId) {
    const change = this.pendingChanges.get(changeId);
    if (change) {
      change.status = 'approved';
      this.approvedChanges.add(changeId);
      this.pendingChanges.delete(changeId);
      return change;
    }
    return null;
  }

  // Değişikliği reddet
  rejectChange(changeId) {
    const change = this.pendingChanges.get(changeId);
    if (change) {
      change.status = 'rejected';
      this.pendingChanges.delete(changeId);
      return change;
    }
    return null;
  }

  // Metni diff highlight'larıyla işaretle - TipTap Official Style
  highlightTextDiff(text, changes) {
    if (!changes || changes.length === 0) return text;

    let highlightedText = text;
    let offset = 0;

    // Değişiklikleri pozisyona göre sırala
    const sortedChanges = [...changes].sort((a, b) => a.start - b.start);

    for (const change of sortedChanges) {
      const actualStart = change.start + offset;
      const actualEnd = change.end + offset;
      
      if (change.type === 'addition') {
        const beforeText = highlightedText.substring(0, actualStart);
        const changedText = highlightedText.substring(actualStart, actualEnd);
        const afterText = highlightedText.substring(actualEnd);
        
        // TipTap official data-diff-type approach
        const wrappedText = `<span data-diff-type="inline-insert" data-change-id="${change.id}" data-diff-user-id="AI">${changedText}</span>`;
        highlightedText = beforeText + wrappedText + afterText;
        offset += wrappedText.length - changedText.length;
        
      } else if (change.type === 'deletion') {
        const beforeText = highlightedText.substring(0, actualStart);
        const changedText = highlightedText.substring(actualStart, actualEnd);
        const afterText = highlightedText.substring(actualEnd);
        
        // TipTap official data-diff-type approach
        const wrappedText = `<span data-diff-type="inline-delete" data-change-id="${change.id}" data-diff-user-id="AI">${changedText}</span>`;
        highlightedText = beforeText + wrappedText + afterText;
        offset += wrappedText.length - changedText.length;
      }
    }

    return highlightedText;
  }

  // Pending metni highlight'larıyla birlikte döndür - Paragraf Bazlı
  getPendingTextWithHighlights(originalText, newText) {
    const changes = this.calculateTextDiff(originalText, newText);
    const result = this.createParagraphDiffView(originalText, newText);
    return { highlightedText: result, changes };
  }

  // Paragraf bazlı diff görünümü üret
  createParagraphDiffView(originalText, newText) {
    console.log('=== PARAGRAPH DIFF VIEW START ===');
    const orig = this._splitIntoParagraphs(originalText);
    const now = this._splitIntoParagraphs(newText);

    const m = orig.length;
    const n = now.length;
    const dp = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (orig[i - 1] === now[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    // Operasyon şeridi oluştur
    const ops = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && orig[i - 1] === now[j - 1]) {
        ops.unshift({ type: 'equal', content: now[j - 1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.unshift({ type: 'insert', content: now[j - 1] });
        j--;
      } else if (i > 0) {
        ops.unshift({ type: 'delete', content: orig[i - 1] });
        i--;
      }
    }

    // HTML üret
    const html = ops
      .map(op => {
        if (op.type === 'equal') return `<p>${op.content}</p>`;
        if (op.type === 'insert') return `<p data-diff-type="paragraph-insert" data-diff-user-id="AI">${op.content}</p>`;
        if (op.type === 'delete') return `<p data-diff-type="paragraph-delete" data-diff-user-id="AI">${op.content}</p>`;
        return '';
      })
      .join('');

    console.log('=== PARAGRAPH DIFF VIEW END ===');
    return html;
  }

  // HTML escape utility function - Güvenlik için
  escapeHTML(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Strip HTML tags - Clean text extraction for diff comparison
  stripHTML(text) {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '')  // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')  // Replace &nbsp; with space
      .replace(/&amp;/g, '&')   // Unescape common entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  // Text tokenization - TipTap yaklaşımı
  tokenizeText(text) {
    if (!text) return [];
    
    // Word boundaries ve whitespace'leri koruyarak tokenize et
    return text.split(/(\s+)/).filter(token => token.length > 0);
  }

  // AI yanıtının kısmi güncelleme mi tam dilekçe mi olduğunu kontrol et
  isPartialUpdate(originalText, newText) {
    if (!originalText || !newText) return false;
    
    // Paragraf sayılarını karşılaştır
    const originalParagraphs = this._splitIntoParagraphs(originalText);
    const newParagraphs = this._splitIntoParagraphs(newText);
    
    console.log('🔍 Partial update check:');
    console.log('Original paragraphs:', originalParagraphs.length);
    console.log('New paragraphs:', newParagraphs.length);
    
    // Eğer yeni metin orijinal metinden çok daha kısa ise, kısmi güncelleme olabilir
    const lengthRatio = newText.length / originalText.length;
    console.log('Length ratio:', lengthRatio);
    
    // Eğer yeni metin orijinalin %30'undan az ise ve en az 1 paragraf varsa kısmi güncelleme
    if (lengthRatio < 0.3 && newParagraphs.length >= 1 && newParagraphs.length < originalParagraphs.length) {
      console.log('✅ Detected as partial update (length based)');
      return true;
    }
    
    // Alternatif: Yeni paragrafların hiçbiri orijinal metinde tam olarak yoksa kısmi güncelleme
    const hasMatchingParagraphs = newParagraphs.some(newPara => 
      originalParagraphs.some(origPara => origPara.trim() === newPara.trim())
    );
    
    if (!hasMatchingParagraphs && newParagraphs.length < originalParagraphs.length) {
      console.log('✅ Detected as partial update (no matching paragraphs)');
      return true;
    }
    
    console.log('❌ Not a partial update');
    return false;
  }

  // Kısmi güncellemeyi mevcut metinle merge et
  mergePartialUpdate(originalText, partialUpdate) {
    console.log('🔀 Merging partial update');
    console.log('Original text length:', originalText.length);
    console.log('Partial update length:', partialUpdate.length);
    
    const originalParagraphs = this._splitIntoParagraphs(originalText);
    const updateParagraphs = this._splitIntoParagraphs(partialUpdate);
    
    // Basit strateji: Güncellenen paragrafları bul ve değiştir
    // Daha karmaşık algoritmalar için LCS kullanılabilir, ama şimdilik basit yaklaşım
    
    // Güncellenen paragrafı orijinal metinde en çok benzeyen paragrafla eşleştir
    let mergedParagraphs = [...originalParagraphs];
    
    for (const updatePara of updateParagraphs) {
      let bestMatchIndex = -1;
      let bestMatchScore = 0;
      
      // Her orijinal paragrafla benzerlik skoru hesapla
      for (let i = 0; i < originalParagraphs.length; i++) {
        const similarity = this._calculateSimilarity(originalParagraphs[i], updatePara);
        if (similarity > bestMatchScore && similarity > 0.3) { // En az %30 benzerlik
          bestMatchScore = similarity;
          bestMatchIndex = i;
        }
      }
      
      // En iyi eşleşmeyi bulduysa değiştir
      if (bestMatchIndex !== -1) {
        console.log(`🔄 Replacing paragraph ${bestMatchIndex} (similarity: ${bestMatchScore.toFixed(2)})`);
        mergedParagraphs[bestMatchIndex] = updatePara;
      } else {
        // Eşleşme bulunamadıysa sona ekle
        console.log('➕ Adding new paragraph at the end');
        mergedParagraphs.push(updatePara);
      }
    }
    
    const mergedText = mergedParagraphs.join('\n\n');
    console.log('✅ Merge completed, final length:', mergedText.length);
    
    return mergedText;
  }

  // İki paragraf arasındaki benzerlik skorunu hesapla (basit kelime tabanlı)
  _calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = (2 * commonWords.length) / (words1.length + words2.length);
    
    return similarity;
  }

  // Original text'teki pozisyonu hesapla
  getOriginalPosition(change, originalText, newText) {
    if (change.type === 'deletion') {
      return change.start;
    } else {
      // Addition için original text'teki muhtemel pozisyonu tahmin et
      const beforeAddition = newText.substring(0, change.start);
      return this.findPositionInOriginal(beforeAddition, originalText);
    }
  }

  // Original text'te pozisyon bul
  findPositionInOriginal(textBefore, originalText) {
    const index = originalText.indexOf(textBefore);
    return index >= 0 ? index + textBefore.length : 0;
  }

  // Legacy API'ler - artık paragraf bazlı görünüme yönlendirir
  createVisibleDiffView(originalText, newText, changes) {
    return this.createParagraphDiffView(originalText, newText);
  }

  createInlineDiff(originalText, newText, changes) {
    return this.createParagraphDiffView(originalText, newText);
  }

  createSimpleDiffView(originalText, newText, changes) {
    return this.createParagraphDiffView(originalText, newText);
  }

  // AI'ın ilk kez yazdığı metni pending olarak işaretle - Paragraf bazlı
  markTextAsPending(text) {
    if (!text) return text;
    
    console.log('🔵 markTextAsPending input:', text.substring(0, 200) + '...');
    
    // Extract clean text content (no HTML tags or escaping)
    const cleanTextContent = this.stripHTML(text);
    
    // Paragraf seviyesinde pending marker
    const result = `<p data-diff-type="pending" data-diff-user-id="AI">${cleanTextContent}</p>`;
    console.log('🟢 markTextAsPending result (clean):', result.substring(0, 200) + '...');
    return result;
  }

  // Diff highlight'ları temizle - IMPROVED regex patterns
  clearDiffHighlights(text) {
    if (!text) return text;
    
    console.log('🧹 Clearing diff highlights from:', text.substring(0, 100) + '...');
    
    const cleaned = text
      .replace(/<span[^>]*data-diff-type="inline-insert"[^>]*>(.*?)<\/span>/gs, '$1')
      .replace(/<span[^>]*data-diff-type="inline-delete"[^>]*>(.*?)<\/span>/gs, '$1')
      .replace(/<span[^>]*data-diff-type="inline-update"[^>]*>(.*?)<\/span>/gs, '$1')
      .replace(/<span[^>]*data-diff-type="pending"[^>]*>(.*?)<\/span>/gs, '$1')
      // Paragraf bazlı diff temizlikleri
      .replace(/<p[^>]*data-diff-type="paragraph-insert"[^>]*>(.*?)<\/p>/gs, '<p>$1</p>')
      .replace(/<p[^>]*data-diff-type="paragraph-delete"[^>]*>(.*?)<\/p>/gs, '<p>$1</p>')
      .replace(/<p[^>]*data-diff-type="pending"[^>]*>(.*?)<\/p>/gs, '<p>$1</p>')
      .replace(/<span class="diff-addition"[^>]*>(.*?)<\/span>/gs, '$1')
      .replace(/<span class="diff-deletion"[^>]*>(.*?)<\/span>/gs, '$1')
      .replace(/<span class="diff-pending"[^>]*>(.*?)<\/span>/gs, '$1');
    
    console.log('🧹 Cleaned result:', cleaned.substring(0, 100) + '...');
    return cleaned;
  }

  // Enhanced diff creation with user attribution
  createAdvancedDiff(originalText, newText, userId = 'AI') {
    const changes = this.calculateTextDiff(originalText, newText);
    
    if (!changes || changes.length === 0) {
      return {
        highlightedText: newText,
        changes: [],
        stats: { additions: 0, deletions: 0, total: 0 }
      };
    }

    // Create diff with user attribution
    let result = newText;
    let offset = 0;

    // Process changes in reverse order to maintain positions
    const sortedChanges = [...changes].sort((a, b) => b.start - a.start);

    for (const change of sortedChanges) {
      const actualStart = change.start + offset;
      const actualEnd = change.end + offset;
      
      const beforeText = result.substring(0, actualStart);
      const changedText = result.substring(actualStart, actualEnd);
      const afterText = result.substring(actualEnd);
      
      let wrappedText;
      if (change.type === 'addition') {
        wrappedText = `<span data-diff-type="inline-insert" data-diff-user-id="${userId}" data-change-id="${change.id}">${changedText}</span>`;
      } else if (change.type === 'deletion') {
        wrappedText = `<span data-diff-type="inline-delete" data-diff-user-id="${userId}" data-change-id="${change.id}">${changedText}</span>`;
      } else {
        wrappedText = changedText; // Fallback
      }
      
      result = beforeText + wrappedText + afterText;
      offset += wrappedText.length - changedText.length;
    }

    // Calculate stats
    const additions = changes.filter(c => c.type === 'addition').length;
    const deletions = changes.filter(c => c.type === 'deletion').length;

    return {
      highlightedText: result,
      changes: changes,
      stats: { additions, deletions, total: additions + deletions }
    };
  }

  // Tüm pending değişiklikleri temizle
  clearAllPendingChanges() {
    this.pendingChanges.clear();
    this.approvedChanges.clear();
  }

  // Değişiklik istatistikleri
  getChangeStats() {
    const pending = this.pendingChanges.size;
    const approved = this.approvedChanges.size;
    return { pending, approved, total: pending + approved };
  }

  // Yardımcılar — paragraf bölme ve ofset hesaplama
  _splitIntoParagraphs(text) {
    if (!text) return [];
    // Eğer HTML <p> içeriyorsa, içeriği çıkar
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gis;
    const matches = Array.from(text.matchAll(paragraphRegex)).map(m => m[1].trim());
    if (matches.length > 0) {
      return matches.filter(p => p.length > 0);
    }
    // HTML değilse, boş satırlarla ayrılmış paragrafları kullan
    const blocks = text
      .split(/\n{2,}|\r\n{2,}/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    if (blocks.length > 0) return blocks;
    // Tek satırlı içerik fallback
    return [text.trim()].filter(Boolean);
  }

  _computeCumulativeOffsets(paragraphs) {
    const offsets = [];
    let sum = 0;
    for (let k = 0; k < paragraphs.length; k++) {
      offsets.push(sum);
      sum += paragraphs[k].length; // Paragraf içeriği uzunluğu (etiketsiz)
    }
    return offsets;
  }
}

export default new TextFormattingService(); 