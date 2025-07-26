import { GoogleGenerativeAI } from '@google/generative-ai';
import udfService from './udfService';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

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
      'dilekçe', 'dava', 'başvuru', 'petition', 'yazı', 'belge', 'document',
      'hazırla', 'oluştur', 'yaz', 'prepare', 'create', 'write', 'draft',
      'boşanma', 'divorce', 'miras', 'inheritance', 'kira', 'rent',
      'iş', 'labor', 'ceza', 'criminal', 'ticaret', 'commercial',
      'değiştir', 'ekle', 'çıkar', 'güncelle', 'revise', 'modify', 'edit'
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

  // Chat'i başlat
  async startChat() {
    try {
      this.chat = this.model.startChat({
        history: [],
        generationConfig,
        safetySettings,
      });
      this.isInitialized = true;
      return this.chat;
    } catch (error) {
      console.error('Error starting chat:', error);
      throw new Error('Chat başlatılamadı');
    }
  }

  // Mesaj gönder (dosya desteği ile)
  async sendMessage(message, attachments = []) {
    try {
      if (!this.isInitialized) {
        await this.startChat();
      }

      const parts = [];
      
      // Metin mesajını ekle
      if (message && message.trim()) {
        // Dilekçe önerisi için özel prompt ekle
        const isDocumentRequest = this.isDocumentGenerationRequest(message);
        let finalMessage = message;
        
        if (isDocumentRequest) {
          finalMessage = `${message}\n\nLütfen yanıtınızı aşağıdaki formatta verin:\n\n1. Önce kısa bir açıklama yapın\n2. Sonra dilekçe metnini \`\`\`dilekce ve \`\`\` etiketleri arasında verin\n\nÖrnek format:\n\nSize yardımcı olmaktan memnuniyet duyarım. İşte hazırladığım dilekçe:\n\n\`\`\`dilekce\n[Burada dilekçe metnini yazın]\n\`\`\`\n\nNot: Dilekçe metni Türk hukuk sistemi standartlarına uygun olmalıdır.`;
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

      const result = await this.chat.sendMessage(parts);
      const response = await result.response;
      
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

  // Streaming mesaj gönder
  async sendMessageStream(message, attachments = [], onChunk) {
    try {
      if (!this.isInitialized) {
        await this.startChat();
      }

      const parts = [];
      
      // Metin mesajını ekle
      if (message && message.trim()) {
        // Dilekçe önerisi için özel prompt ekle
        const isDocumentRequest = this.isDocumentGenerationRequest(message);
        let finalMessage = message;
        
        if (isDocumentRequest) {
          finalMessage = `${message}\n\nLütfen yanıtınızı aşağıdaki formatta verin:\n\n1. Önce kısa bir açıklama yapın\n2. Sonra dilekçe metnini \`\`\`dilekce ve \`\`\` etiketleri arasında verin\n\nÖrnek format:\n\nSize yardımcı olmaktan memnuniyet duyarım. İşte hazırladığım dilekçe:\n\n\`\`\`dilekce\n[Burada dilekçe metnini yazın]\n\`\`\`\n\nNot: Dilekçe metni Türk hukuk sistemi standartlarına uygun olmalıdır.`;
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
            }
          }
        }
      }
      
      if (parts.length === 0) {
        throw new Error('Gönderilecek içerik bulunamadı');
      }

      const result = await this.chat.sendMessageStream(parts);
      let fullText = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        
        if (onChunk) {
          onChunk(chunkText, fullText);
        }
      }
      
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

  // Chat geçmişini temizle
  clearChat() {
    this.chat = null;
    this.isInitialized = false;
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
}

const geminiService = new GeminiService();
export default geminiService; 