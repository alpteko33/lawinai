import { GoogleGenerativeAI } from '@google/generative-ai';

class RAGService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'embedding-001' });
    this.vectorDB = new Map(); // Basit in-memory vector store
    this.documents = [];
    this.isInitialized = false;
  }

  // Servisi başlat
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Embedding modelini test et
      const testEmbedding = await this.createEmbeddings("test");
      console.log('RAG Service başarıyla başlatıldı');
      this.isInitialized = true;
    } catch (error) {
      console.error('RAG Service başlatma hatası:', error);
      throw new Error('RAG Service başlatılamadı: ' + error.message);
    }
  }

  // Metin parçalarını embedding'e çevir
  async createEmbeddings(text) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Boş metin embedding oluşturulamaz');
      }

      const result = await this.embeddingModel.embedContent(text);
      const embedding = await result.embedding;
      return embedding.values;
    } catch (error) {
      console.error('Embedding oluşturma hatası:', error);
      throw new Error(`Embedding oluşturulamadı: ${error.message}`);
    }
  }

  // Dokümanı parçalara böl ve vector store'a ekle
  async addDocument(document) {
    try {
      if (!document.content || document.content.trim().length === 0) {
        console.warn('Boş içerikli doküman atlandı:', document.name);
        return;
      }

      console.log(`Doküman RAG sistemine ekleniyor: ${document.name}`);
      
      const chunks = this.chunkText(document.content, 1000); // 1000 karakterlik parçalar
      console.log(`${chunks.length} parça oluşturuldu`);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.trim().length === 0) continue;
        
        const embedding = await this.createEmbeddings(chunk);
        
        const documentChunk = {
          id: `${document.id}_chunk_${i}`,
          content: chunk,
          metadata: {
            documentId: document.id,
            documentName: document.name,
            documentType: document.type,
            chunkIndex: i,
            totalChunks: chunks.length,
            timestamp: new Date().toISOString(),
            chunkLength: chunk.length
          },
          embedding: embedding
        };
        
        this.documents.push(documentChunk);
        this.vectorDB.set(documentChunk.id, documentChunk);
      }
      
      console.log(`Doküman başarıyla eklendi: ${document.name} (${chunks.length} parça)`);
    } catch (error) {
      console.error(`Doküman ekleme hatası: ${document.name}`, error);
      throw new Error(`Doküman eklenemedi: ${error.message}`);
    }
  }

  // Metni parçalara böl (akıllı bölme)
  chunkText(text, chunkSize) {
    const chunks = [];
    let currentChunk = '';
    
    // Önce cümlelere böl
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      // Eğer mevcut chunk + yeni cümle çok uzunsa, mevcut chunk'ı kaydet
      if ((currentChunk + trimmedSentence).length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        // Cümleyi ekle
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }
    
    // Son chunk'ı ekle
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    // Çok uzun chunk'ları daha da böl
    const finalChunks = [];
    for (const chunk of chunks) {
      if (chunk.length <= chunkSize) {
        finalChunks.push(chunk);
      } else {
        // Uzun chunk'ları kelime sınırlarından böl
        const words = chunk.split(' ');
        let currentSubChunk = '';
        
        for (const word of words) {
          if ((currentSubChunk + ' ' + word).length > chunkSize && currentSubChunk) {
            finalChunks.push(currentSubChunk.trim());
            currentSubChunk = word;
          } else {
            currentSubChunk += (currentSubChunk ? ' ' : '') + word;
          }
        }
        
        if (currentSubChunk.trim()) {
          finalChunks.push(currentSubChunk.trim());
        }
      }
    }
    
    return finalChunks;
  }

  // Benzerlik hesapla (cosine similarity)
  calculateSimilarity(embedding1, embedding2) {
    try {
      if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
        return 0;
      }
      
      const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
      const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
      const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
      
      if (magnitude1 === 0 || magnitude2 === 0) return 0;
      
      return dotProduct / (magnitude1 * magnitude2);
    } catch (error) {
      console.error('Benzerlik hesaplama hatası:', error);
      return 0;
    }
  }

  // Sorgu için en alakalı dokümanları bul
  async retrieveRelevantDocuments(query, topK = 5) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      if (this.documents.length === 0) {
        console.log('Vector store boş, doküman bulunamadı');
        return [];
      }

      console.log(`Sorgu için doküman aranıyor: "${query}"`);
      
      const queryEmbedding = await this.createEmbeddings(query);
      
      const similarities = this.documents.map(doc => ({
        document: doc,
        similarity: this.calculateSimilarity(queryEmbedding, doc.embedding)
      }));
      
      // Benzerliğe göre sırala ve en iyi topK kadarını döndür
      const relevantDocs = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .filter(item => item.similarity > 0.1) // Minimum benzerlik eşiği
        .map(item => item.document);
      
      console.log(`${relevantDocs.length} alakalı doküman bulundu`);
      return relevantDocs;
    } catch (error) {
      console.error('Doküman arama hatası:', error);
      return [];
    }
  }

  // RAG ile yanıt oluştur
  async generateRAGResponse(query, contextDocuments) {
    try {
      if (!contextDocuments || contextDocuments.length === 0) {
        return {
          response: "Üzgünüm, bu soru için yeterli doküman bulamadım. Lütfen daha fazla doküman yükleyin veya sorunuzu farklı şekilde ifade edin.",
          contextUsed: false
        };
      }

      const context = contextDocuments
        .map((doc, index) => `Doküman ${index + 1}: ${doc.metadata.documentName}\nİçerik: ${doc.content}`)
        .join('\n\n');
      
      const prompt = `
Aşağıdaki bağlam bilgilerini kullanarak soruyu yanıtlayın. Sadece verilen bilgilere dayanarak yanıt verin.

BAĞLAM BİLGİLERİ:
${context}

KULLANICI SORUSU: ${query}

Lütfen:
1. Sadece verilen bağlam bilgilerine dayanarak yanıt verin
2. Eğer bağlamda yeterli bilgi yoksa, bunu açıkça belirtin
3. Türk hukuk sistemi açısından doğru ve güncel bilgiler verin
4. Yanıtınızı net ve anlaşılır şekilde yapılandırın

YANIT:`;

      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.3, // Daha tutarlı yanıtlar için düşük sıcaklık
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        }
      });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return {
        response: response.text(),
        contextUsed: true,
        documentsUsed: contextDocuments.length
      };
    } catch (error) {
      console.error('RAG yanıt oluşturma hatası:', error);
      return {
        response: `Üzgünüm, yanıt oluşturulurken bir hata oluştu: ${error.message}`,
        contextUsed: false,
        error: error.message
      };
    }
  }

  // Ana RAG fonksiyonu
  async queryRAG(userQuery) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`RAG sorgusu başlatılıyor: "${userQuery}"`);
      
      // 1. Sorgu için alakalı dokümanları bul
      const relevantDocs = await this.retrieveRelevantDocuments(userQuery);
      
      // 2. RAG ile yanıt oluştur
      const ragResponse = await this.generateRAGResponse(userQuery, relevantDocs);
      
      console.log('RAG sorgusu tamamlandı');
      
      return {
        response: ragResponse.response,
        relevantDocuments: relevantDocs,
        query: userQuery,
        contextUsed: ragResponse.contextUsed,
        documentsUsed: ragResponse.documentsUsed,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('RAG sorgu hatası:', error);
      return {
        response: `Üzgünüm, sorgu işlenirken bir hata oluştu: ${error.message}`,
        relevantDocuments: [],
        query: userQuery,
        contextUsed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Vector store'u temizle
  clearVectorStore() {
    this.vectorDB.clear();
    this.documents = [];
    console.log('Vector store temizlendi');
  }

  // Belirli bir dokümanı kaldır
  removeDocument(documentId) {
    const documentsToRemove = this.documents.filter(doc => 
      doc.metadata.documentId === documentId
    );
    
    documentsToRemove.forEach(doc => {
      this.vectorDB.delete(doc.id);
    });
    
    this.documents = this.documents.filter(doc => 
      doc.metadata.documentId !== documentId
    );
    
    console.log(`${documentsToRemove.length} parça kaldırıldı: ${documentId}`);
  }

  // Vector store istatistikleri
  getVectorStoreStats() {
    const documentStats = {};
    
    this.documents.forEach(doc => {
      const docId = doc.metadata.documentId;
      if (!documentStats[docId]) {
        documentStats[docId] = {
          id: docId,
          name: doc.metadata.documentName,
          type: doc.metadata.documentType,
          chunks: 0,
          totalLength: 0,
          addedAt: doc.metadata.timestamp
        };
      }
      documentStats[docId].chunks++;
      documentStats[docId].totalLength += doc.metadata.chunkLength;
    });
    
    return {
      totalDocuments: Object.keys(documentStats).length,
      totalChunks: this.documents.length,
      totalStorageSize: this.documents.reduce((sum, doc) => sum + doc.metadata.chunkLength, 0),
      documents: Object.values(documentStats)
    };
  }

  // Doküman arama (basit metin arama)
  searchDocuments(query) {
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    const searchTerm = query.toLowerCase();
    const results = this.documents.filter(doc => 
      doc.content.toLowerCase().includes(searchTerm) ||
      doc.metadata.documentName.toLowerCase().includes(searchTerm)
    );
    
    return results.slice(0, 10); // İlk 10 sonuç
  }
}

const ragService = new RAGService();
export default ragService; 