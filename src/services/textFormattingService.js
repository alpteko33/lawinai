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

  // Metin değişikliklerini hesapla (diff algoritması)
  calculateTextDiff(originalText, newText) {
    console.log('=== DIFF CALCULATION START ===');
    console.log('Original:', originalText?.substring(0, 100) + '...');
    console.log('New:', newText?.substring(0, 100) + '...');
    
    if (!originalText && !newText) return [];
    if (!originalText) {
      const result = [{
        type: 'addition',
        text: newText,
        start: 0,
        end: newText.length,
        id: this.generateChangeId()
      }];
      console.log('Full addition:', result);
      return result;
    }
    if (!newText) {
      const result = [{
        type: 'deletion', 
        text: originalText,
        start: 0,
        end: originalText.length,
        id: this.generateChangeId()
      }];
      console.log('Full deletion:', result);
      return result;
    }

    const changes = [];
    const words1 = originalText.split(/(\s+)/);
    const words2 = newText.split(/(\s+)/);
    
    console.log('Words comparison:', { words1: words1.slice(0, 5), words2: words2.slice(0, 5) });
    
    // Basit diff algoritması - word level
    const dp = Array(words1.length + 1).fill(null).map(() => Array(words2.length + 1).fill(0));
    
    // LCS (Longest Common Subsequence) hesapla
    for (let i = 1; i <= words1.length; i++) {
      for (let j = 1; j <= words2.length; j++) {
        if (words1[i-1] === words2[j-1]) {
          dp[i][j] = dp[i-1][j-1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
      }
    }

    // Backtrack edip değişiklikleri bul
    let i = words1.length;
    let j = words2.length;
    let pos1 = originalText.length;
    let pos2 = newText.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && words1[i-1] === words2[j-1]) {
        // Aynı kelime - geri git
        pos1 -= words1[i-1].length;
        pos2 -= words2[j-1].length;
        i--;
        j--;
      } else if (i > 0 && (j === 0 || dp[i-1][j] >= dp[i][j-1])) {
        // Silinen kelime
        const word = words1[i-1];
        pos1 -= word.length;
        changes.unshift({
          type: 'deletion',
          text: word,
          start: pos1,
          end: pos1 + word.length,
          id: this.generateChangeId()
        });
        i--;
      } else {
        // Eklenen kelime
        const word = words2[j-1];
        pos2 -= word.length;
        changes.unshift({
          type: 'addition',
          text: word,
          start: pos2,
          end: pos2 + word.length,
          id: this.generateChangeId()
        });
        j--;
      }
    }

    console.log('Changes calculated:', changes);
    console.log('=== DIFF CALCULATION END ===');
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

  // Pending metni highlight'larıyla birlikte döndür - Enhanced TipTap Style
  getPendingTextWithHighlights(originalText, newText) {
    const changes = this.calculateTextDiff(originalText, newText);
    
    // TipTap inspired inline diff approach
    let result = this.createTipTapStyleDiff(originalText, newText, changes);
    
    return {
      highlightedText: result,
      changes: changes
    };
  }

  // TipTap style diff oluştur - FIXED: No HTML escaping for clean display
  createTipTapStyleDiff(originalText, newText, changes) {
    console.log('=== TIPTAP STYLE DIFF START ===');
    console.log('Original text:', originalText?.substring(0, 100));
    console.log('New text:', newText?.substring(0, 100));
    console.log('Changes:', changes);
    
    if (!changes || changes.length === 0) {
      return newText;
    }
    
    // Extract text content from HTML for comparison (no tags)
    const originalTextContent = this.stripHTML(originalText);
    const newTextContent = this.stripHTML(newText);
    
    // Word-by-word comparison for inline diffs (TipTap approach)
    const originalWords = this.tokenizeText(originalTextContent);
    const newWords = this.tokenizeText(newTextContent);
    
    console.log('Original words (clean):', originalWords.slice(0, 10));
    console.log('New words (clean):', newWords.slice(0, 10));
    
    let result = '';
    let i = 0, j = 0;
    
    while (i < originalWords.length || j < newWords.length) {
      if (i >= originalWords.length) {
        // Sadece yeni kelimeler kaldı - inline-insert
        while (j < newWords.length) {
          // CLEAN: No HTML escaping for proper display
          const additionHTML = `<span data-diff-type="inline-insert" data-diff-user-id="AI">${newWords[j]}</span>`;
          console.log('Adding insertion:', additionHTML);
          result += additionHTML;
          j++;
        }
        break;
      }
      
      if (j >= newWords.length) {
        // Sadece eski kelimeler kaldı - inline-delete
        while (i < originalWords.length) {
          const deletionHTML = `<span data-diff-type="inline-delete" data-diff-user-id="AI">${originalWords[i]}</span>`;
          console.log('Adding deletion:', deletionHTML);
          result += deletionHTML;
          i++;
        }
        break;
      }
      
      if (originalWords[i] === newWords[j]) {
        // Aynı kelime - değişiklik yok, clean display
        result += newWords[j];
        i++;
        j++;
      } else {
        // Farklı kelimeler - deletion + insertion (TipTap style)
        const deletionHTML = `<span data-diff-type="inline-delete" data-diff-user-id="AI">${originalWords[i]}</span>`;
        const insertionHTML = `<span data-diff-type="inline-insert" data-diff-user-id="AI">${newWords[j]}</span>`;
        console.log('Different words - deletion:', deletionHTML, 'insertion:', insertionHTML);
        result += deletionHTML + insertionHTML;
        i++;
        j++;
      }
    }
    
    // Wrap in paragraph for proper TipTap structure
    const finalResult = `<p>${result}</p>`;
    console.log('Final TipTap diff result:', finalResult.substring(0, 300) + '...');
    console.log('=== TIPTAP STYLE DIFF END ===');
    return finalResult;
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

  // Legacy support - redirects to TipTap style diff
  createVisibleDiffView(originalText, newText, changes) {
    return this.createTipTapStyleDiff(originalText, newText, changes);
  }

  createInlineDiff(originalText, newText, changes) {
    return this.createTipTapStyleDiff(originalText, newText, changes);
  }

  createSimpleDiffView(originalText, newText, changes) {
    return this.createTipTapStyleDiff(originalText, newText, changes);
  }

  // AI'ın ilk kez yazdığı metni pending olarak işaretle - CLEAN VERSION
  markTextAsPending(text) {
    if (!text) return text;
    
    console.log('🔵 markTextAsPending input:', text.substring(0, 200) + '...');
    
    // Extract clean text content (no HTML tags or escaping)
    const cleanTextContent = this.stripHTML(text);
    
    // Create pending marker with clean content (no HTML escaping)
    const result = `<p><span data-diff-type="pending" data-diff-user-id="AI">${cleanTextContent}</span></p>`;
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
}

export default new TextFormattingService(); 