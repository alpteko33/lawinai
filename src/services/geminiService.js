import { GoogleGenerativeAI } from '@google/generative-ai';
import udfService from './udfService';
import ragService from './ragService';
import aiTrainingService from './aiTrainingService';
import cacheService from './cacheService';
import systemMessageBuilder from './systemMessageBuilder';
import { getSystemMessageByMode, completionOptionsByMode } from '@/llm/systemMessagesLegal';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro';

if (!API_KEY) {
  console.error('VITE_GEMINI_API_KEY is not defined in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);

const safetySettings = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
];

const generationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 8192,
};

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({
        model: MODEL_NAME,
      generationConfig,
      safetySettings,
    });
    this.chat = null;
    this.isInitialized = false;
    this.conversationId = null;
    this.appliedRules = [];
  }

  // Desteklenen dosya türlerini kontrol et
  isSupportedFileType(fileType) {
    if (!fileType) return false;
    
    const supportedTypes = [
      'pdf', 'udf',
      'jpg', 'jpeg', 'png', 'gif', 'webp',
      'tiff', 'tif'
    ];
    
    return supportedTypes.includes(fileType.toLowerCase());
  }

  // Dosya türüne göre MIME type belirle
  getMimeType(fileType) {
    const type = fileType?.toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'udf': 'application/pdf', // UDF dosyaları PDF olarak işlenir
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'tiff': 'image/tiff',
      'tif': 'image/tiff'
    };
    
    return mimeTypes[type] || 'application/octet-stream';
  }

  // Dilekçe önerisi algılama
  isDocumentGenerationRequest(message) {
    const docKeywords = [
      'dilekçe', 'dava', 'başvuru', 'petition', 'yazı', 'belge', 'metin',
      'hazırla', 'oluştur', 'yaz', 'prepare', 'create', 'metni', 'draft',
      'boşanma', 'düzenle', 'ayarla', 'düzelt', 'revize',
      'iş', 'labor', 'ceza', 'criminal', 'ticaret', 'commercial',
      'değiştir', 'ekle', 'çıkar', 'güncelle', 'dilekçesi', 'sözleşme', 'sözleşmesi'
    ];
    
    return docKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // UDF dosyasını metin içeriğine çevir
  async convertUDFToText(file) {
    try {
      console.log('UDF dosyası metin içeriğine çevriliyor:', file.name);
      const udfContent = await udfService.readUDF(file);
      console.log('UDF içeriği başarıyla okundu:', {
        contentLength: udfContent.content.length,
        formatId: udfContent.formatId
      });
      return udfContent.content;
    } catch (error) {
      console.error('UDF dosyası metin içeriğine çevrilemedi:', error);
      throw new Error(`UDF dosyası okunamadı: ${file.name} - ${error.message}`);
    }
  }

  // Dosyayı base64'ten FileData'ya dönüştür veya UDF için metin olarak hazırla
  async fileToGenerativePart(file) {
    try {
      if (!file || !file.path || !file.type || !file.name) {
        console.error('Eksik dosya bilgisi:', file);
        throw new Error(`Dosya bilgisi eksik veya hatalı: ${file ? file.name : 'bilinmiyor'}`);
      }

      const fileType = file.type?.toLowerCase();

      // UDF dosyaları için özel işlem
      if (fileType === 'udf') {
        console.log('UDF dosyası tespit edildi, metin içeriğine çevriliyor...');
        const textContent = await this.convertUDFToText(file);
        
        // UDF içeriğini metin olarak gönder
        return {
          text: `UDF Dosya İçeriği (${file.name}):\n\n${textContent}`
        };
      }

      // Diğer dosya türleri için normal base64 işlemi
      const base64Data = await window.electronAPI.readFileAsBase64(file.path);
      if (!base64Data || base64Data.length < 10) {
        console.error('Base64 veri okunamadı veya çok kısa:', file.name, base64Data);
        throw new Error(`Dosya okunamadı veya boş: ${file.name}`);
      }
      
      const mimeType = this.getMimeType(file.type);
      if (!mimeType) {
        console.error('MIME type belirlenemedi:', file.type);
        throw new Error(`MIME type belirlenemedi: ${file.type}`);
      }
      
      // Log: Hangi dosya, hangi mime ile gönderiliyor?
      console.log('AI için dosya hazırlanıyor:', { name: file.name, type: file.type, mimeType, size: file.size });
      
      return {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };
    } catch (error) {
      console.error('Error converting file to generative part:', error);
      throw new Error(`Dosya okunamadı: ${file && file.name ? file.name : 'bilinmiyor'} - ${error.message}`);
    }
  }

  // Geçmişteki son dilekçe taslağını çıkar
  getLastDocumentFromHistory(historyMessages = []) {
    try {
      if (!Array.isArray(historyMessages)) return null;
      for (let i = historyMessages.length - 1; i >= 0; i--) {
        const m = historyMessages[i];
        if (!m || !m.content) continue;
        const content = m.content;
        const match = content.match(/```dilekce\n([\s\S]*?)(?:\n```|$)/);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      // Fallback: son asistan mesajının tamamını kullan (kısaltılmış)
      for (let i = historyMessages.length - 1; i >= 0; i--) {
        const m = historyMessages[i];
        if (m && m.role === 'assistant' && m.content) {
          const text = String(m.content);
          // Basit heuristik: başlıklar veya mahkeme adları
          const startIdx = text.search(/(SULH HUKUK MAHKEMESI|SULH HUKUK MAHKEMESİ|DİLEKÇE TASLAĞI|DAVACI|DAVALI|KONU|AÇIKLAMALAR|SONUÇ VE İSTEM)/i);
          if (startIdx >= 0) {
            return text.substring(startIdx, startIdx + 30000);
          }
          // Aksi halde ilk 30k karakteri ver
          return text.substring(0, 30000);
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // Mesaj bir takip/güncelleme talebi mi?
  isFollowUpEditRequest(message) {
    if (!message) return false;
    const s = message.toLowerCase();
    const keywords = [
      'kaldığın yerden', 'devam et', 'aynı dilekçe', 'güncelle', 'değiştir', 'ekle', 'çıkar', 'revize',
      'continue', 'update', 'modify', 'revise', 'append', 'edit'
    ];
    return keywords.some(k => s.includes(k));
  }

  // Chat'i başlat
  async startChat(historyMessages = [], mode = 'sor') {
    try {
      // UI mesajlarını Gemini chat geçmiş formatına dönüştür
      const mappedHistory = Array.isArray(historyMessages)
        ? historyMessages
            .filter(m => m && m.content && (m.role === 'user' || m.role === 'assistant'))
            .map(m => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            }))
        : [];

      // Build system message using rules engine
      const base = getSystemMessageByMode(mode) || systemMessageBuilder.getBaseSystemMessage('chat');
      const { systemMessage, appliedRules } = await systemMessageBuilder.attachRulesToSystemMessage(base, '', [], {});
      this.appliedRules = appliedRules || [];

      const systemHistory = systemMessage ? [{ role: 'user', parts: [{ text: `Sistem: ${systemMessage}` }] }] : [];

      const modeCfg = completionOptionsByMode(mode) || {};
      const genCfg = {
        ...generationConfig,
        ...(typeof modeCfg.temperature === 'number' ? { temperature: modeCfg.temperature } : {}),
        ...(typeof modeCfg.maxOutputTokens === 'number' ? { maxOutputTokens: modeCfg.maxOutputTokens } : {}),
      };
      this.chat = this.model.startChat({
        history: [...systemHistory, ...mappedHistory],
        generationConfig: genCfg,
        safetySettings,
      });
      this.isInitialized = true;
      if (!this.conversationId) {
        this.conversationId = cacheService.getOrCreateConversationId(null);
      }
      return this.chat;
    } catch (error) {
      console.error('Error starting chat:', error);
      throw new Error('Chat başlatılamadı');
    }
  }

  // Mevcut chat yoksa, verilen geçmiş ile başlat
  async ensureChat(historyMessages = [], mode = 'sor') {
    if (!this.isInitialized || !this.chat) {
      await this.startChat(historyMessages, mode);
    }
  }

  // Mesaj gönder (dosya desteği ile)
  async sendMessage(message, attachments = [], useRAG = true, historyMessages = null, mode = 'sor') {
    try {
      await this.ensureChat(historyMessages || [], mode);

      // EĞİTİM VERİLERİNİ ENTEGRE ET
      const trainingData = aiTrainingService.trainingData;
      let enhancedMessage = message;
      
      if (trainingData && trainingData.length > 0) {
        console.log(`Eğitim verileri entegre ediliyor: ${trainingData.length} parça`);
        
        // En alakalı 3 eğitim parçasını seç (basit benzerlik kontrolü)
        const relevantChunks = trainingData
          .filter(chunk => {
            const messageWords = message.toLowerCase().split(' ');
            const chunkWords = chunk.content.toLowerCase().split(' ');
            const commonWords = messageWords.filter(word => 
              chunkWords.some(chunkWord => chunkWord.includes(word) || word.includes(chunkWord))
            );
            return commonWords.length > 0;
          })
          .slice(0, 3);
        
        if (relevantChunks.length > 0) {
          const trainingContext = relevantChunks
            .map((chunk, index) => `Eğitim Bilgisi ${index + 1} (${chunk.metadata.documentName}):\n${chunk.content}`)
            .join('\n\n');
          
          enhancedMessage = `Aşağıdaki eğitim verilerini kullanarak yanıt ver. Bu bilgiler Türk hukuk sistemi ve mevzuatı hakkında güvenilir kaynaklardan alınmıştır:\n\n${trainingContext}\n\nKullanıcı Sorusu: ${message}\n\nLütfen eğitim verilerindeki bilgileri kullanarak detaylı ve doğru bir yanıt ver.`;
          
          console.log(`${relevantChunks.length} eğitim parçası entegre edildi`);
        } else {
          // Alakalı parça bulunamadıysa genel eğitim verilerini kullan
          const generalChunks = trainingData.slice(0, 2);
          const trainingContext = generalChunks
            .map((chunk, index) => `Genel Eğitim Bilgisi ${index + 1} (${chunk.metadata.documentName}):\n${chunk.content}`)
            .join('\n\n');
          
          enhancedMessage = `Aşağıdaki genel eğitim verilerini de göz önünde bulundurarak yanıt ver:\n\n${trainingContext}\n\nKullanıcı Sorusu: ${message}`;
          
          console.log(`${generalChunks.length} genel eğitim parçası entegre edildi`);
        }
      }

      // RAG modu aktifse ve doküman varsa RAG kullan
      if (useRAG && attachments && attachments.length > 0) {
        console.log('RAG modu ile mesaj gönderiliyor...');
        return await this.sendMessageWithRAG(enhancedMessage, attachments);
      }

      const parts = [];
      
      // Metin mesajını ekle
      if (enhancedMessage && enhancedMessage.trim()) {
        // Build system message with context-based rules
        const base = getSystemMessageByMode(mode) || systemMessageBuilder.getBaseSystemMessage('chat');
        const contextItems = (attachments || []).map(f => ({ path: f.path || f.name, name: f.name }));
        const { systemMessage, appliedRules } = await systemMessageBuilder.attachRulesToSystemMessage(base, message, contextItems, {});
        this.appliedRules = appliedRules || [];
        if (systemMessage) {
          parts.push({ text: `Sistem: ${systemMessage}` });
        }
        // Dilekçe önerisi için özel prompt ekle
        const isDocumentRequest = this.isDocumentGenerationRequest(message);
        let finalMessage = enhancedMessage;
        
        if (isDocumentRequest) {
          finalMessage = `${enhancedMessage}\n\nLütfen yanıtınızı aşağıdaki formatta verin:\n\n1. Önce kısa bir açıklama yapın\n2. Sonra dilekçe metnini \`\`\`dilekce ve \`\`\` etiketleri arasında verin\n\nÖrnek format:\n\nSize yardımcı olmaktan memnuniyet duyarım. İşte hazırladığım dilekçe:\n\n\`\`\`dilekce\n[Burada dilekçe metnini yazın]\n\`\`\`\n\nNot: Dilekçe metni Türk hukuk sistemi standartlarına uygun olmalıdır.`;
        }

        // Eğer bu bir takip/güncelleme isteği ise, geçmişteki son dilekçeyi ek bağlam olarak ver
        const lastDoc = this.isFollowUpEditRequest(message) ? this.getLastDocumentFromHistory(historyMessages || []) : null;
        if (lastDoc) {
          finalMessage = `Aşağıdaki mevcut dilekçeye verilen talimatları uygula. SADECE DEĞİŞTİRİLEN PARAGRAF(LARI) döndür. Tüm dilekçeyi tekrar yazma, sadece değişen bölümleri ver.\n\nTalimatlar:\n${enhancedMessage}\n\nMevcut Dilekçe:\n\n\`\`\`dilekce\n${lastDoc.substring(0, 30000)}\n\`\`\`\n\nÖnemli: Yanıtında sadece değiştirilen paragraf(lar)ı \`\`\`dilekce ve \`\`\` etiketleri arasında ver. Tüm dilekçeyi tekrar yazma.`;
        }
        
        parts.push({
          text: finalMessage
        });
      }
      
      // Dosyaları ekle
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          if (this.isSupportedFileType(file.type)) {
            try {
              const filePart = await this.fileToGenerativePart(file);
              parts.push(filePart);
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
              // Dosya hatası olsa bile diğer dosyaları işlemeye devam et
            }
          }
        }
      }
      
      if (parts.length === 0) {
        throw new Error('Gönderilecek içerik bulunamadı');
      }

      // 1) Kısa süreli bağlam önbelleği (cached content) kullanmayı dene
      // Conversation kimliği: mevcut geçmişten türet; yoksa oluştur
      const conversationId = this.conversationId || cacheService.getOrCreateConversationId(
        (historyMessages && historyMessages.length > 0 && `conv_${historyMessages[0].id || historyMessages[0].timestamp || ''}`) || null
      );
      this.conversationId = conversationId;

      // Önbelleği henüz oluşturmadıysak, bağlam olarak dosyaları ve eğitim verisi özetini ekleyerek oluştur
      if (!cacheService.getCacheEntry(conversationId)) {
        const contextParts = [];
        // Dosyaları bağlam olarak ekle (metin ya da inlineData base64 gönderimi)
        for (const p of parts) {
          if (p.text) {
            // Çok uzunluğu sınırlı tut (örnek: ilk 8000 karakter) - 2k token minimumu hedefle
            contextParts.push({ text: p.text.substring(0, 8000) });
          } else if (p.inlineData && p.inlineData.data && p.inlineData.mimeType) {
            // Artık görsel/PDF gibi inlineData parçalarını da kısa süreli cache'e koyuyoruz
            contextParts.push({ inlineData: { data: p.inlineData.data, mimeType: p.inlineData.mimeType } });
          }
        }

        // UI'dan gelen ekler varsa, onları da bağlama dahil et
        if (attachments && attachments.length > 0) {
          for (const file of attachments) {
            try {
              if (this.isSupportedFileType(file.type)) {
                const filePart = await this.fileToGenerativePart(file);
                if (filePart.text) {
                  contextParts.push({ text: filePart.text.substring(0, 12000) });
                } else if (filePart.inlineData) {
                  contextParts.push({ inlineData: { data: filePart.inlineData.data, mimeType: filePart.inlineData.mimeType } });
                }
              }
            } catch (e) {
              console.warn('Cache için dosya eklenemedi:', file?.name, e?.message || e);
            }
          }
        }

        // Sistem yönergesi: hukuki/dilekçe üretim yaklaşımı
        const systemInstruction = 'Türk hukuk sistemi bağlamında uzman yardımcı olarak yanıt ver; bağlamdaki bilgileri önceliklendir.';
        await cacheService.createCachedContent({
          conversationId,
          contextParts,
          systemInstruction,
        });
      }

      // Önbellekle generate denemesi (yalnızca metin içerik ile)
      const cacheTry = await cacheService.generateWithCache({
        conversationId,
        userText: parts.find(p => p.text)?.text || '',
        generationConfig,
        safetySettings,
      });

      if (cacheTry && cacheTry.text) {
        // Yanıtı da kısa süreli cache'e yaz (gelecek turlar için)
        try {
          const usedText = (parts.find(p => p.text)?.text || '').substring(0, 8000);
          const answerText = cacheTry.text.substring(0, 16000);
          await cacheService.createCachedContent({
            conversationId,
            contextParts: [{ text: usedText }, { text: answerText }],
            systemInstruction: 'Türk hukuk sistemi bağlamında uzman yardımcı olarak yanıt ver; bağlamdaki bilgileri önceliklendir.',
          });
        } catch (_) {}

        return {
          text: cacheTry.text,
          usageMetadata: cacheTry.usageMetadata,
        };
      }

      // 2) Önbellek başarısızsa normal yol
      const result = await this.chat.sendMessage(parts);
      const response = await result.response;
      
      // Yanıtı da kısa süreli cache'e yaz
      try {
        const usedText = (parts.find(p => p.text)?.text || '').substring(0, 8000);
        const answerText = (response.text && response.text()) ? response.text().substring(0, 16000) : '';
        await cacheService.createCachedContent({
          conversationId,
          contextParts: [{ text: usedText }, { text: answerText }],
          systemInstruction: 'Türk hukuk sistemi bağlamında uzman yardımcı olarak yanıt ver; bağlamdaki bilgileri önceliklendir.',
        });
      } catch (_) {}

      return {
        text: response.text(),
        usageMetadata: response.usageMetadata
      };
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Hata mesajlarını Türkçe'ye çevir
      if (error.message.includes('API key')) {
        throw new Error('API anahtarı geçersiz veya eksik');
      } else if (error.message.includes('quota')) {
        throw new Error('API kotası aşıldı');
      } else if (error.message.includes('rate limit')) {
        throw new Error('Çok fazla istek gönderildi, lütfen bekleyin');
      } else if (error.message.includes('file')) {
        throw new Error('Dosya işlenirken hata oluştu');
      } else {
        throw new Error(`Mesaj gönderilemedi: ${error.message}`);
      }
    }
  }

  // RAG ile mesaj gönder
  async sendMessageWithRAG(message, attachments = [], historyMessages = [], mode = 'sor') {
    try {
      console.log('RAG ile mesaj gönderiliyor...');
      
      // EĞİTİM VERİLERİNİ RAG YANITINA ENTEGRE ET
      const trainingData = aiTrainingService.trainingData;
      let enhancedRAGResponse = '';
      
      if (trainingData && trainingData.length > 0) {
        console.log(`RAG için eğitim verileri entegre ediliyor: ${trainingData.length} parça`);
        
        // En alakalı 2 eğitim parçasını seç
        const relevantChunks = trainingData
          .filter(chunk => {
            const messageWords = message.toLowerCase().split(' ');
            const chunkWords = chunk.content.toLowerCase().split(' ');
            const commonWords = messageWords.filter(word => 
              chunkWords.some(chunkWord => chunkWord.includes(word) || word.includes(chunkWord))
            );
            return commonWords.length > 0;
          })
          .slice(0, 2);
        
        if (relevantChunks.length > 0) {
          const trainingContext = relevantChunks
            .map((chunk, index) => `Ek Eğitim Bilgisi ${index + 1} (${chunk.metadata.documentName}):\n${chunk.content}`)
            .join('\n\n');
          
          enhancedRAGResponse = `\n\nEk Eğitim Verileri:\n${trainingContext}\n\nBu ek bilgileri de göz önünde bulundurarak yanıtınızı genişletin.`;
          
          console.log(`RAG için ${relevantChunks.length} eğitim parçası entegre edildi`);
        }
      }
      
      // Önce dosyaları RAG sistemine ekle
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          if (this.isSupportedFileType(file.type)) {
            try {
              const fileContent = await this.fileToGenerativePart(file);
              const document = {
                id: file.id || Date.now() + Math.random(),
                name: file.name,
                content: fileContent.text || fileContent.inlineData?.data,
                type: file.type
              };
              
              await ragService.addDocument(document);
              console.log(`Dosya RAG sistemine eklendi: ${file.name}`);
            } catch (error) {
              console.error(`RAG dosya ekleme hatası: ${file.name}`, error);
            }
          }
        }
      }

      // RAG ile yanıt oluştur
      const ragResponse = await ragService.queryRAG(message);
      
      // Eğitim verilerini RAG yanıtına ekle
      const finalResponse = ragResponse.response + enhancedRAGResponse;
      
      // RAG yanıtını chat'e gönder (opsiyonel - geçmiş için)
      await this.ensureChat(historyMessages || [], mode);
      
      // Prepend system message
      const base = getSystemMessageByMode(mode) || systemMessageBuilder.getBaseSystemMessage('chat');
      const contextItems = (attachments || []).map(f => ({ path: f.path || f.name, name: f.name }));
      const { systemMessage, appliedRules } = await systemMessageBuilder.attachRulesToSystemMessage(base, message, contextItems, {});
      this.appliedRules = appliedRules || [];
      const sysText = systemMessage ? `Sistem: ${systemMessage}\n\n` : '';
      const result = await this.chat.sendMessage({ text: `${sysText}Kullanıcı sorusu: ${message}\n\nRAG yanıtı: ${finalResponse}` });
      
      const response = await result.response;

      // RAG bağlamını kısa süreli önbelleğe al (sonraki mesajlar için maliyeti düşürür)
      try {
        const conversationId = this.conversationId || cacheService.getOrCreateConversationId(
          (historyMessages && historyMessages.length > 0 && `conv_${historyMessages[0].id || historyMessages[0].timestamp || ''}`) || null
        );
        this.conversationId = conversationId;
        const contextParts = [
          { text: `RAG Bağlamı:\n${finalResponse.substring(0, 16000)}` },
        ];
        const systemInstruction = 'Türk hukuk sistemi bağlamında uzman yardımcı olarak yanıt ver; RAG bağlamını önceliklendir.';
        await cacheService.createCachedContent({
          conversationId,
          contextParts,
          systemInstruction,
        });
      } catch (e) {
        console.warn('RAG cache oluşturulamadı:', e?.message || e);
      }
      
      return {
        text: finalResponse,
        usageMetadata: response.usageMetadata,
        ragContext: ragResponse.relevantDocuments,
        contextUsed: ragResponse.contextUsed,
        documentsUsed: ragResponse.documentsUsed,
        trainingDataUsed: enhancedRAGResponse ? true : false
      };
    } catch (error) {
      console.error('RAG message error:', error);
      throw new Error(`RAG mesaj hatası: ${error.message}`);
    }
  }

  // Streaming mesaj gönder
  async sendMessageStream(message, attachments = [], onChunk, onProgress, onThought, useRAG = true, historyMessages = [], mode = 'sor') {
    try {
      await this.ensureChat(historyMessages || [], mode);
      if (onProgress) onProgress('Sohbet hazırlanıyor');

      // EĞİTİM VERİLERİNİ ENTEGRE ET (Streaming için)
      const trainingData = aiTrainingService.trainingData;
      let enhancedMessage = message;
      
      if (trainingData && trainingData.length > 0) {
        if (onProgress) onProgress('Eğitim verileri entegre ediliyor');
        console.log(`Streaming için eğitim verileri entegre ediliyor: ${trainingData.length} parça`);
        
        // En alakalı 3 eğitim parçasını seç (basit benzerlik kontrolü)
        const relevantChunks = trainingData
          .filter(chunk => {
            const messageWords = message.toLowerCase().split(' ');
            const chunkWords = chunk.content.toLowerCase().split(' ');
            const commonWords = messageWords.filter(word => 
              chunkWords.some(chunkWord => chunkWord.includes(word) || word.includes(chunkWord))
            );
            return commonWords.length > 0;
          })
          .slice(0, 3);
        
        if (relevantChunks.length > 0) {
          const trainingContext = relevantChunks
            .map((chunk, index) => `Eğitim Bilgisi ${index + 1} (${chunk.metadata.documentName}):\n${chunk.content}`)
            .join('\n\n');
          
          enhancedMessage = `Aşağıdaki eğitim verilerini kullanarak yanıt ver. Bu bilgiler Türk hukuk sistemi ve mevzuatı hakkında güvenilir kaynaklardan alınmıştır:\n\n${trainingContext}\n\nKullanıcı Sorusu: ${message}\n\nLütfen eğitim verilerindeki bilgileri kullanarak detaylı ve doğru bir yanıt ver.`;
          
          console.log(`Streaming için ${relevantChunks.length} eğitim parçası entegre edildi`);
          if (onThought) onThought('Eğitim verilerinden en alakalı bölümler seçildi.');
        } else {
          // Alakalı parça bulunamadıysa genel eğitim verilerini kullan
          const generalChunks = trainingData.slice(0, 2);
          const trainingContext = generalChunks
            .map((chunk, index) => `Genel Eğitim Bilgisi ${index + 1} (${chunk.metadata.documentName}):\n${chunk.content}`)
            .join('\n\n');
          
          enhancedMessage = `Aşağıdaki genel eğitim verilerini de göz önünde bulundurarak yanıt ver:\n\n${trainingContext}\n\nKullanıcı Sorusu: ${message}`;
          
          console.log(`Streaming için ${generalChunks.length} genel eğitim parçası entegre edildi`);
          if (onThought) onThought('Genel eğitim verileri bağlama eklendi.');
        }
      }

      // RAG modu aktifse ve doküman varsa RAG kullan
      if (useRAG && attachments && attachments.length > 0) {
        console.log('RAG streaming modu ile mesaj gönderiliyor...');
        return await this.sendMessageStreamWithRAG(
          enhancedMessage,
          attachments,
          onChunk,
          onProgress,
          onThought,
          historyMessages || []
        );
      }

      const parts = [];
      
      // Metin mesajını ekle
      if (enhancedMessage && enhancedMessage.trim()) {
        // Build system message with context-based rules
        const base = getSystemMessageByMode(mode) || systemMessageBuilder.getBaseSystemMessage('chat');
        const contextItems = (attachments || []).map(f => ({ path: f.path || f.name, name: f.name }));
        const { systemMessage, appliedRules } = await systemMessageBuilder.attachRulesToSystemMessage(base, message, contextItems, {});
        this.appliedRules = appliedRules || [];
        if (systemMessage) {
          parts.push({ text: `Sistem: ${systemMessage}` });
        }
        // Dilekçe önerisi için özel prompt ekle
        const isDocumentRequest = this.isDocumentGenerationRequest(message);
        let finalMessage = enhancedMessage;
        
        if (isDocumentRequest) {
          finalMessage = `${enhancedMessage}\n\nLütfen yanıtınızı aşağıdaki formatta verin:\n\n1. Önce kısa bir açıklama yapın\n2. Sonra dilekçe metnini \`\`\`dilekce ve \`\`\` etiketleri arasında verin\n\nÖrnek format:\n\nSize yardımcı olmaktan memnuniyet duyarım. İşte hazırladığım dilekçe:\n\n\`\`\`dilekce\n[Burada dilekçe metnini yazın]\n\`\`\`\n\nNot: Dilekçe metni Türk hukuk sistemi standartlarına uygun olmalıdır.`;
        }

        // Takip/güncelleme isteği ise, geçmiş son dilekçeyi bağlama ekle
        const lastDoc = this.isFollowUpEditRequest(message) ? this.getLastDocumentFromHistory(historyMessages || []) : null;
        if (lastDoc) {
          finalMessage = `Aşağıdaki mevcut dilekçeye verilen talimatları uygula. SADECE DEĞİŞTİRİLEN PARAGRAF(LARI) döndür. Tüm dilekçeyi tekrar yazma, sadece değişen bölümleri ver.\n\nTalimatlar:\n${enhancedMessage}\n\nMevcut Dilekçe:\n\n\`\`\`dilekce\n${lastDoc.substring(0, 30000)}\n\`\`\`\n\nÖnemli: Yanıtında sadece değiştirilen paragraf(lar)ı \`\`\`dilekce ve \`\`\` etiketleri arasında ver. Tüm dilekçeyi tekrar yazma.`;
        }
        
        parts.push({
          text: finalMessage
        });
      }
      
      // Dosyaları ekle
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          if (this.isSupportedFileType(file.type)) {
            try {
              if (onProgress) onProgress(`"${file.name}" dosyası inceleniyor`);
              const filePart = await this.fileToGenerativePart(file);
              parts.push(filePart);
              if (onThought) onThought(`"${file.name}" ön işlemeyi tamamladı.`);
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
            }
          }
        }
      }
      
      if (parts.length === 0) {
        throw new Error('Gönderilecek içerik bulunamadı');
      }

      // Kısa süreli bağlam önbelleği: Bu çağrı için stream'i bozmayız, ancak mümkünse cache ile tek atım denemesi yaparız
      try {
        const conversationId = this.conversationId || cacheService.getOrCreateConversationId(
          (historyMessages && historyMessages.length > 0 && `conv_${historyMessages[0].id || historyMessages[0].timestamp || ''}`) || null
        );
        this.conversationId = conversationId;
        if (!cacheService.getCacheEntry(conversationId)) {
          const contextText = parts.find(p => p.text)?.text || '';
          const contextParts = contextText ? [{ text: contextText.substring(0, 12000) }] : [];
          // UI eklerini de bağlama dahil et
          if (attachments && attachments.length > 0) {
            for (const file of attachments) {
              try {
                if (this.isSupportedFileType(file.type)) {
                  const filePart = await this.fileToGenerativePart(file);
                  if (filePart.text) {
                    contextParts.push({ text: filePart.text.substring(0, 12000) });
                  } else if (filePart.inlineData) {
                    contextParts.push({ inlineData: { data: filePart.inlineData.data, mimeType: filePart.inlineData.mimeType } });
                  }
                }
              } catch (e) {
                console.warn('Streaming cache için dosya eklenemedi:', file?.name, e?.message || e);
              }
            }
          }
          if (contextParts.length > 0) {
            const systemInstruction = 'Türk hukuk sistemi bağlamında uzman yardımcı olarak yanıt ver; bağlamdaki bilgileri önceliklendir.';
            if (onProgress) onProgress('Bağlam oluşturuluyor');
            await cacheService.createCachedContent({
              conversationId,
              contextParts,
              systemInstruction,
            });
            if (onThought) onThought('Bağlam oluşturuldu.');
          }
        }

        // Cache ile tek sefer generate denemesi (stream simülasyonu)
        const cacheTry = await cacheService.generateWithCache({
          conversationId,
          userText: parts.find(p => p.text)?.text || '',
          generationConfig,
          safetySettings,
        });

        if (cacheTry && cacheTry.text) {
          if (onProgress) onProgress('Yanıt hazırlanıyor');
          if (onChunk) {
            onChunk(cacheTry.text, cacheTry.text);
          }
          if (onThought) onThought('Yanıt taslağı oluşturuluyor...');
          return {
            text: cacheTry.text,
            usageMetadata: cacheTry.usageMetadata,
          };
        }
      } catch (e) {
        console.warn('Streaming için önbellek oluşturulamadı:', e?.message || e);
      }

      // Streaming için önbellek denemesi: API, stream + cache birlikte resmi olarak sunulmadığından
      // burada doğrudan stream'e devam ediyoruz.
      const result = await this.chat.sendMessageStream(parts);
      if (onProgress) onProgress('Değerlendirme yapılıyor');
      let fullText = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        
        if (onChunk) {
          onChunk(chunkText, fullText);
        }
      }
      if (onThought) onThought('Yanıt sonlandırılıyor...');
      if (onProgress) onProgress('Yanıt hazırlanıyor');
      
      // Streaming sonrası yanıtı da kısa süreli cache'e yaz
      try {
        const usedText = (parts.find(p => p.text)?.text || '').substring(0, 8000);
        await cacheService.createCachedContent({
          conversationId: this.conversationId,
          contextParts: [{ text: usedText }, { text: fullText.substring(0, 16000) }],
          systemInstruction: 'Türk hukuk sistemi bağlamında uzman yardımcı olarak yanıt ver; bağlamdaki bilgileri önceliklendir.',
        });
      } catch (_) {}

      return {
        text: fullText,
        usageMetadata: result.response.usageMetadata
      };
    } catch (error) {
      console.error('Error sending streaming message:', error);
      
      if (error.message.includes('API key')) {
        throw new Error('API anahtarı geçersiz veya eksik');
      } else if (error.message.includes('quota')) {
        throw new Error('API kotası aşıldı');
      } else if (error.message.includes('rate limit')) {
        throw new Error('Çok fazla istek gönderildi, lütfen bekleyin');
      } else if (error.message.includes('file')) {
        throw new Error('Dosya işlenirken hata oluştu');
      } else {
        throw new Error(`Mesaj gönderilemedi: ${error.message}`);
      }
    }
  }

  // RAG ile streaming mesaj gönder
  async sendMessageStreamWithRAG(message, attachments = [], onChunk, onProgress, onThought, historyMessages = [], mode = 'sor') {
    try {
      console.log('RAG streaming ile mesaj gönderiliyor...');
      if (onProgress) onProgress('RAG modu aktif');
      
      // EĞİTİM VERİLERİNİ RAG STREAMING YANITINA ENTEGRE ET
      const trainingData = aiTrainingService.trainingData;
      let enhancedRAGResponse = '';
      
      if (trainingData && trainingData.length > 0) {
        console.log(`RAG streaming için eğitim verileri entegre ediliyor: ${trainingData.length} parça`);
        
        // En alakalı 2 eğitim parçasını seç
        const relevantChunks = trainingData
          .filter(chunk => {
            const messageWords = message.toLowerCase().split(' ');
            const chunkWords = chunk.content.toLowerCase().split(' ');
            const commonWords = messageWords.filter(word => 
              chunkWords.some(chunkWord => chunkWord.includes(word) || word.includes(chunkWord))
            );
            return commonWords.length > 0;
          })
          .slice(0, 2);
        
        if (relevantChunks.length > 0) {
          const trainingContext = relevantChunks
            .map((chunk, index) => `Ek Eğitim Bilgisi ${index + 1} (${chunk.metadata.documentName}):\n${chunk.content}`)
            .join('\n\n');
          
          enhancedRAGResponse = `\n\nEk Eğitim Verileri:\n${trainingContext}\n\nBu ek bilgileri de göz önünde bulundurarak yanıtınızı genişletin.`;
          
          console.log(`RAG streaming için ${relevantChunks.length} eğitim parçası entegre edildi`);
        }
      }
      
      // Önce dosyaları RAG sistemine ekle
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          if (this.isSupportedFileType(file.type)) {
            try {
              if (onProgress) onProgress(`"${file.name}" indeksleniyor`);
              const fileContent = await this.fileToGenerativePart(file);
              const document = {
                id: file.id || Date.now() + Math.random(),
                name: file.name,
                content: fileContent.text || fileContent.inlineData?.data,
                type: file.type
              };
              
              await ragService.addDocument(document);
              console.log(`Dosya RAG sistemine eklendi: ${file.name}`);
              if (onProgress) onProgress(`"${file.name}" eklendi`);
              if (onThought) onThought(`"${file.name}" RAG deposuna eklendi.`);
            } catch (error) {
              console.error(`RAG dosya ekleme hatası: ${file.name}`, error);
            }
          }
        }
      }

      // RAG ile yanıt oluştur
      if (onProgress) onProgress('İlgili içerik aranıyor');
      const ragResponse = await ragService.queryRAG(message);
      if (onThought) onThought('İlgili içeriğe ulaşıldı, değerlendirme başlıyor.');
      
      // Eğitim verilerini RAG yanıtına ekle
      const finalResponseText = ragResponse.response + enhancedRAGResponse;
      
      // RAG yanıtını streaming olarak gönder (context için geçmişi koru)
      let currentText = '';
      if (onProgress) onProgress('Değerlendirme yapılıyor');
      
      // Karakter karakter streaming simülasyonu
      // Prepend system message to streaming as simulated first chunk
      const base = getSystemMessageByMode(mode) || systemMessageBuilder.getBaseSystemMessage('chat');
      const contextItems = (attachments || []).map(f => ({ path: f.path || f.name, name: f.name }));
      const { systemMessage, appliedRules } = await systemMessageBuilder.attachRulesToSystemMessage(base, message, contextItems, {});
      this.appliedRules = appliedRules || [];
      let seed = systemMessage ? `Sistem: ${systemMessage}\n\n` : '';
      let streamingAccumText = '';
      for (let i = 0; i < (seed + finalResponseText).length; i++) {
        streamingAccumText += (seed + finalResponseText)[i];
        if (onChunk) {
          onChunk((seed + finalResponseText)[i], streamingAccumText);
        }
        // Küçük gecikme ile streaming efekti
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      if (onThought) onThought('Yanıt sonlandırılıyor...');
      if (onProgress) onProgress('Yanıt hazırlanıyor');
      
      return {
        text: finalResponseText,
        usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
        ragContext: ragResponse.relevantDocuments,
        contextUsed: ragResponse.contextUsed,
        documentsUsed: ragResponse.documentsUsed,
        trainingDataUsed: enhancedRAGResponse ? true : false
      };
    } catch (error) {
      console.error('RAG streaming error:', error);
      throw new Error(`RAG streaming hatası: ${error.message}`);
    }
  }

  // Chat geçmişini temizle
  clearChat() {
    this.chat = null;
    this.isInitialized = false;
    try {
      // Kısa süreli bağlam önbelleğini temizle
      cacheService.clearAll();
    } catch (_) {
      // sessizce geç
    }
    this.conversationId = null;
  }

  // Chat geçmişini al
  getChatHistory() {
    if (!this.chat) return [];
    return this.chat.getHistory();
  }

  // Sistem prompt'unu ayarla
  async setSystemPrompt(prompt) {
    try {
      if (!this.isInitialized) {
        await this.startChat();
      }
      
      // Sistem prompt'unu ilk mesaj olarak gönder
      await this.chat.sendMessage({
        text: `Sistem: ${prompt}`
      });
    } catch (error) {
      console.error('Error setting system prompt:', error);
      throw new Error('Sistem prompt\'u ayarlanamadı');
    }
  }

  // Dosya analizi için özel prompt
  async analyzeFile(file, customPrompt = '') {
    try {
      if (!this.isSupportedFileType(file.type)) {
        throw new Error('Desteklenmeyen dosya türü');
      }

      const filePart = await this.fileToGenerativePart(file);
      
      let prompt = customPrompt || 'Bu dosyayı detaylı bir şekilde analiz et ve içeriğini özetle.';
      
      if (file.type?.toLowerCase() === 'pdf' || file.type?.toLowerCase() === 'udf') {
        prompt = customPrompt || 'Bu PDF/UDF dosyasını oku ve içeriğini detaylı bir şekilde analiz et. Metin içeriğini, yapısını ve önemli noktaları belirt.';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif'].includes(file.type?.toLowerCase())) {
        prompt = customPrompt || 'Bu görseli detaylı bir şekilde analiz et. Görselde ne olduğunu, metin varsa oku ve önemli detayları belirt.';
      }

      const result = await this.model.generateContent([{
        text: prompt
      }, filePart]);

      const response = await result.response;
      return {
        text: response.text(),
        usageMetadata: response.usageMetadata
      };
    } catch (error) {
      console.error('Error analyzing file:', error);
      throw new Error(`Dosya analiz edilemedi: ${error.message}`);
    }
  }

  // Çoklu dosya analizi
  async analyzeFiles(files, customPrompt = '') {
    try {
      const parts = [];
      const supportedFiles = files.filter(file => this.isSupportedFileType(file.type));
      
      if (supportedFiles.length === 0) {
        throw new Error('Analiz edilebilir dosya bulunamadı');
      }

      for (const file of supportedFiles) {
        const filePart = await this.fileToGenerativePart(file);
        parts.push(filePart);
      }

      let prompt = customPrompt || 'Bu dosyaları detaylı bir şekilde analiz et ve içeriklerini özetle.';
      
      const textPart = {
        text: prompt
      };
      
      parts.unshift(textPart);

      const result = await this.model.generateContent(parts);
      const response = await result.response;
      
      return {
        text: response.text(),
        usageMetadata: response.usageMetadata
      };
    } catch (error) {
      console.error('Error analyzing files:', error);
      throw new Error(`Dosyalar analiz edilemedi: ${error.message}`);
    }
  }

  // Chat başlığı oluşturma - Yapay zeka ile mantıklı başlık üretme
  async generateChatTitle(userMessage) {
    try {
      // Kısa ve öz bir başlık oluşturmak için özel prompt
      const titlePrompt = `
Bu kullanıcı mesajına dayanarak kısa, öz ve açıklayıcı bir sohbet başlığı oluştur.
Başlık maksimum 6-8 kelime olmalı ve mesajın ana konusunu yansıtmalı.
Hukuki terimler varsa kullan, ama genel anlaşılır olsun.

Kullanıcı mesajı: "${userMessage}"

Sadece başlığı döndür, başka açıklama yapma.
`;

      const result = await this.model.generateContent([{
        text: titlePrompt
      }]);

      const response = await result.response;
      let title = response.text().trim();
      
      // Başlığı temizle - gereksiz karakterleri kaldır
      title = title.replace(/^["']|["']$/g, ''); // Başındaki ve sonundaki tırnak işaretlerini kaldır
      title = title.replace(/^\s*-\s*/, ''); // Başındaki tire işaretini kaldır
      title = title.replace(/\n.*$/s, ''); // İlk satırdan sonrasını kaldır
      
      // Eğer çok uzunsa kısalt
      const words = title.split(' ');
      if (words.length > 8) {
        title = words.slice(0, 8).join(' ') + '...';
      }
      
      // Eğer boş veya çok kısa ise fallback kullan
      if (!title || title.length < 3) {
        const words = userMessage.split(' ').slice(0, 4);
        title = words.join(' ') + (userMessage.split(' ').length > 4 ? '...' : '');
      }
      
      return title;
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Hata durumunda eski mantığı kullan
      const words = userMessage.split(' ').slice(0, 4);
      return words.join(' ') + (userMessage.split(' ').length > 4 ? '...' : '');
    }
  }
}

const geminiService = new GeminiService();
export default geminiService; 