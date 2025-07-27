import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import udfService from './udfService';
import imageProcessingService from './imageProcessingService';

class AITrainingService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'embedding-001' });
    this.trainingData = [];
    this.embeddings = [];
    this.isInitialized = false;
    
    // Uygulama başlangıcında kalıcı verileri yükle
    this.loadPersistentData();
  }

  // Servisi başlat
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('AI Training Service başlatılıyor...');
      this.isInitialized = true;
    } catch (error) {
      console.error('AI Training Service başlatma hatası:', error);
      throw new Error('AI Training Service başlatılamadı: ' + error.message);
    }
  }

  // Kalıcı verileri yükle
  async loadPersistentData() {
    try {
      if (window.electronAPI && window.electronAPI.training) {
        const result = await window.electronAPI.training.load();
        if (result.success && result.data) {
          this.trainingData = result.data.trainingData || [];
          this.embeddings = result.data.embeddings || [];
          console.log('Kalıcı eğitim verileri yüklendi:', this.trainingData.length, 'parça');
          
          if (result.data.lastUpdated) {
            console.log('Son güncelleme:', new Date(result.data.lastUpdated).toLocaleString('tr-TR'));
          }
        } else {
          console.log('Kalıcı veri bulunamadı, yeni başlatılıyor');
        }
      } else {
        console.log('Electron API mevcut değil, yerel depolama kullanılamıyor');
      }
    } catch (error) {
      console.error('Kalıcı veri yükleme hatası:', error);
    }
  }

  // Verileri kalıcı olarak kaydet
  async savePersistentData() {
    try {
      if (window.electronAPI && window.electronAPI.training) {
        const data = {
          trainingData: this.trainingData,
          embeddings: this.embeddings
        };
        
        const result = await window.electronAPI.training.save(data);
        if (result.success) {
          console.log('Eğitim verileri kalıcı olarak kaydedildi:', result.count, 'parça');
        } else {
          console.error('Veri kaydetme hatası:', result.error);
        }
        return result;
      } else {
        console.log('Electron API mevcut değil, yerel depolama kullanılamıyor');
        return { success: false, error: 'Electron API mevcut değil' };
      }
    } catch (error) {
      console.error('Kalıcı veri kaydetme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  // Kalıcı verileri temizle
  async clearPersistentData() {
    try {
      if (window.electronAPI && window.electronAPI.training) {
        const result = await window.electronAPI.training.clear();
        if (result.success) {
          this.trainingData = [];
          this.embeddings = [];
          console.log('Kalıcı eğitim verileri temizlendi');
        }
        return result;
      } else {
        console.log('Electron API mevcut değil, yerel depolama kullanılamıyor');
        return { success: false, error: 'Electron API mevcut değil' };
      }
    } catch (error) {
      console.error('Kalıcı veri temizleme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  // Dokümanı eğitim verisi olarak ekle
  async addTrainingDocument(document) {
    try {
      if (!document.content || document.content.trim().length === 0) {
        console.warn('Boş içerikli doküman atlandı:', document.name);
        return;
      }

      console.log(`Eğitim dokümanı ekleniyor: ${document.name}`);
      
      // Dokümanı parçalara böl
      const chunks = this.chunkText(document.content, 1000);
      console.log(`${chunks.length} eğitim parçası oluşturuldu`);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.trim().length === 0) continue;
        
        // Embedding oluştur
        const embedding = await this.createEmbeddings(chunk);
        
        const trainingChunk = {
          id: `${document.id}_chunk_${i}`,
          content: chunk,
          embedding: embedding,
          metadata: {
            documentId: document.id,
            documentName: document.name,
            documentType: document.type,
            chunkIndex: i,
            totalChunks: chunks.length,
            timestamp: new Date().toISOString(),
            chunkLength: chunk.length,
            processingType: document.processingType || 'text' // text, udf, image
          }
        };
        
        this.trainingData.push(trainingChunk);
        this.embeddings.push(embedding);
      }
      
      // Verileri kalıcı olarak kaydet
      await this.savePersistentData();
      
      console.log(`Eğitim dokümanı başarıyla eklendi: ${document.name} (${chunks.length} parça)`);
    } catch (error) {
      console.error(`Eğitim dokümanı ekleme hatası: ${document.name}`, error);
      throw new Error(`Eğitim dokümanı eklenemedi: ${error.message}`);
    }
  }

  // Dosyayı işle ve eğitim verisi olarak ekle
  async processAndAddFile(file) {
    try {
      console.log(`Dosya işleniyor: ${file.name}`);
      
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let content = '';
      let processingType = 'text';
      
      // Dosya türüne göre işle
      if (fileExtension === 'udf') {
        // UDF dosyası işle
        console.log('UDF dosyası işleniyor...');
        const udfData = await udfService.readUDF(file);
        content = udfData.content;
        processingType = 'udf';
        
        // UDF metadata'sını da ekle
        if (udfData.properties) {
          content += `\n\nUDF Özellikleri:\n`;
          content += `Sayfa Boyutu: ${udfData.properties.mediaSizeName}\n`;
          content += `Sol Kenar: ${udfData.properties.leftMargin}\n`;
          content += `Sağ Kenar: ${udfData.properties.rightMargin}\n`;
          content += `Üst Kenar: ${udfData.properties.topMargin}\n`;
          content += `Alt Kenar: ${udfData.properties.bottomMargin}\n`;
        }
        
      } else if (imageProcessingService.isSupportedFormat(file.name)) {
        // Görsel dosyası işle
        console.log('Görsel dosyası işleniyor...');
        content = await imageProcessingService.extractTextFromImage(file);
        processingType = 'image';
        
        // Görsel metadata'sını da ekle
        const imageMetadata = await imageProcessingService.extractImageMetadata(file);
        content += `\n\nGörsel Bilgileri:\n`;
        content += `Dosya Adı: ${imageMetadata.fileName}\n`;
        content += `Boyut: ${imageMetadata.width}x${imageMetadata.height}\n`;
        content += `Çözünürlük: ${imageMetadata.resolution} piksel\n`;
        content += `Dosya Boyutu: ${(imageMetadata.fileSize / 1024).toFixed(2)} KB\n`;
        
      } else {
        // Normal metin dosyası işle
        console.log('Metin dosyası işleniyor...');
        content = await this.readTextFile(file);
        processingType = 'text';
      }
      
      // Dokümanı oluştur
      const document = {
        id: Date.now() + Math.random(),
        name: file.name,
        content: content,
        type: fileExtension,
        processingType: processingType
      };
      
      // Eğitim verisine ekle
      await this.addTrainingDocument(document);
      
      return {
        success: true,
        fileName: file.name,
        contentLength: content.length,
        processingType: processingType
      };
      
    } catch (error) {
      console.error(`Dosya işleme hatası: ${file.name}`, error);
      return {
        success: false,
        fileName: file.name,
        error: error.message
      };
    }
  }

  // Metin dosyasını oku
  async readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  // Metni parçalara böl
  chunkText(text, chunkSize) {
    const chunks = [];
    let currentChunk = '';
    
    // Cümlelere böl
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      if ((currentChunk + trimmedSentence).length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  // Embedding oluştur
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

  // Eğitim verilerini JSON olarak dışa aktar
  async exportTrainingData(outputPath = './training-data.json') {
    try {
      const exportData = {
        metadata: {
          totalDocuments: this.getUniqueDocumentCount(),
          totalChunks: this.trainingData.length,
          totalEmbeddings: this.embeddings.length,
          exportDate: new Date().toISOString(),
          version: '1.0'
        },
        trainingData: this.trainingData,
        embeddings: this.embeddings
      };

      // JSON dosyasına kaydet
      fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
      
      console.log(`Eğitim verileri dışa aktarıldı: ${outputPath}`);
      console.log(`Toplam ${this.trainingData.length} parça, ${this.embeddings.length} embedding`);
      
      return {
        success: true,
        outputPath,
        stats: exportData.metadata
      };
    } catch (error) {
      console.error('Eğitim verileri dışa aktarma hatası:', error);
      throw new Error(`Eğitim verileri dışa aktarılamadı: ${error.message}`);
    }
  }

  // Eğitim verilerini CSV olarak dışa aktar
  async exportTrainingDataCSV(outputPath = './training-data.csv') {
    try {
      let csvContent = 'id,content,document_name,document_type,chunk_index,total_chunks,timestamp,chunk_length\n';
      
      this.trainingData.forEach(chunk => {
        const content = chunk.content.replace(/"/g, '""'); // CSV için escape
        const row = [
          chunk.id,
          `"${content}"`,
          chunk.metadata.documentName,
          chunk.metadata.documentType,
          chunk.metadata.chunkIndex,
          chunk.metadata.totalChunks,
          chunk.metadata.timestamp,
          chunk.metadata.chunkLength
        ].join(',');
        
        csvContent += row + '\n';
      });

      fs.writeFileSync(outputPath, csvContent);
      
      console.log(`Eğitim verileri CSV olarak dışa aktarıldı: ${outputPath}`);
      
      return {
        success: true,
        outputPath,
        totalRows: this.trainingData.length
      };
    } catch (error) {
      console.error('CSV dışa aktarma hatası:', error);
      throw new Error(`CSV dışa aktarılamadı: ${error.message}`);
    }
  }

  // Doküman listesini dışa aktar
  exportDocumentList(outputPath = './document-list.csv') {
    try {
      const documents = this.getUniqueDocuments();
      
      if (documents.length === 0) {
        throw new Error('Dışa aktarılacak doküman bulunamadı');
      }

      let csvContent = 'Doküman Adı,Dosya Türü,Parça Sayısı,Karakter Sayısı,İşleme Türü,Yükleme Tarihi\n';
      
      documents.forEach(doc => {
        const row = [
          doc.name,
          doc.type.toUpperCase(),
          doc.chunks,
          doc.totalLength.toLocaleString(),
          doc.processingType || 'text',
          new Date().toLocaleDateString('tr-TR')
        ].join(',');
        
        csvContent += row + '\n';
      });

      // Dosyayı kaydet
      fs.writeFileSync(outputPath, csvContent);
      
      console.log(`Doküman listesi dışa aktarıldı: ${outputPath}`);
      console.log(`Toplam ${documents.length} doküman`);
      
      return {
        success: true,
        outputPath,
        totalDocuments: documents.length
      };
    } catch (error) {
      console.error('Doküman listesi dışa aktarma hatası:', error);
      throw new Error(`Doküman listesi dışa aktarılamadı: ${error.message}`);
    }
  }

  // Embedding'leri ayrı dosyaya kaydet
  async exportEmbeddings(outputPath = './embeddings.json') {
    try {
      const embeddingsData = {
        metadata: {
          totalEmbeddings: this.embeddings.length,
          embeddingDimension: this.embeddings[0]?.length || 0,
          exportDate: new Date().toISOString()
        },
        embeddings: this.embeddings
      };

      fs.writeFileSync(outputPath, JSON.stringify(embeddingsData, null, 2));
      
      console.log(`Embedding'ler dışa aktarıldı: ${outputPath}`);
      
      return {
        success: true,
        outputPath,
        totalEmbeddings: this.embeddings.length
      };
    } catch (error) {
      console.error('Embedding dışa aktarma hatası:', error);
      throw new Error(`Embedding'ler dışa aktarılamadı: ${error.message}`);
    }
  }

  // Eğitim verilerini analiz et
  analyzeTrainingData() {
    const documentStats = {};
    const processingTypeStats = {};
    
    this.trainingData.forEach(chunk => {
      const docId = chunk.metadata.documentId;
      const processingType = chunk.metadata.processingType || 'text';
      
      if (!documentStats[docId]) {
        documentStats[docId] = {
          id: docId,
          name: chunk.metadata.documentName,
          type: chunk.metadata.documentType,
          processingType: processingType,
          chunks: 0,
          totalLength: 0,
          addedAt: chunk.metadata.timestamp
        };
      }
      documentStats[docId].chunks++;
      documentStats[docId].totalLength += chunk.metadata.chunkLength;
      
      // İşleme türü istatistikleri
      processingTypeStats[processingType] = (processingTypeStats[processingType] || 0) + 1;
    });

    const totalLength = this.trainingData.reduce((sum, chunk) => sum + chunk.metadata.chunkLength, 0);
    const avgChunkLength = totalLength / this.trainingData.length;

    return {
      totalDocuments: Object.keys(documentStats).length,
      totalChunks: this.trainingData.length,
      totalLength,
      avgChunkLength: Math.round(avgChunkLength),
      documents: Object.values(documentStats),
      embeddingDimension: this.embeddings[0]?.length || 0,
      processingTypeStats: processingTypeStats
    };
  }

  // Benzersiz doküman sayısını hesapla
  getUniqueDocumentCount() {
    const uniqueDocs = new Set();
    this.trainingData.forEach(chunk => {
      uniqueDocs.add(chunk.metadata.documentId);
    });
    return uniqueDocs.size;
  }

  // Benzersiz dokümanları al
  getUniqueDocuments() {
    const documentMap = new Map();
    
    this.trainingData.forEach(chunk => {
      const docId = chunk.metadata.documentId;
      const docName = chunk.metadata.documentName;
      const docType = chunk.metadata.documentType;
      
      if (!documentMap.has(docId)) {
        documentMap.set(docId, {
          id: docId,
          name: docName,
          type: docType,
          chunks: 0,
          totalLength: 0,
          processingType: chunk.metadata.processingType || 'text'
        });
      }
      
      const doc = documentMap.get(docId);
      doc.chunks++;
      doc.totalLength += chunk.metadata.chunkLength || chunk.content.length;
    });
    
    return Array.from(documentMap.values());
  }

  // Eğitim verilerini temizle
  async clearTrainingData() {
    this.trainingData = [];
    this.embeddings = [];
    
    // Kalıcı verileri de temizle
    await this.clearPersistentData();
    
    console.log('Eğitim verileri temizlendi');
  }

  // Belirli bir dokümanı kaldır
  async removeDocument(documentId) {
    const chunksToRemove = this.trainingData.filter(chunk => 
      chunk.metadata.documentId === documentId
    );
    
    chunksToRemove.forEach(chunk => {
      const index = this.trainingData.indexOf(chunk);
      if (index > -1) {
        this.trainingData.splice(index, 1);
        this.embeddings.splice(index, 1);
      }
    });
    
    // Verileri kalıcı olarak kaydet
    await this.savePersistentData();
    
    console.log(`${chunksToRemove.length} eğitim parçası kaldırıldı: ${documentId}`);
  }

  // Eğitim verilerini filtrele
  filterTrainingData(filterFunction) {
    return this.trainingData.filter(filterFunction);
  }

  // Eğitim verilerini arama
  searchTrainingData(query) {
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    const searchTerm = query.toLowerCase();
    const results = this.trainingData.filter(chunk => 
      chunk.content.toLowerCase().includes(searchTerm) ||
      chunk.metadata.documentName.toLowerCase().includes(searchTerm)
    );
    
    return results.slice(0, 10);
  }

  // Eğitim verilerini doğrula
  validateTrainingData() {
    const errors = [];
    const warnings = [];
    
    this.trainingData.forEach((chunk, index) => {
      if (!chunk.content || chunk.content.trim().length === 0) {
        errors.push(`Boş içerik: ${chunk.id}`);
      }
      
      if (!chunk.embedding || chunk.embedding.length === 0) {
        errors.push(`Eksik embedding: ${chunk.id}`);
      }
      
      if (!chunk.metadata) {
        errors.push(`Eksik metadata: ${chunk.id}`);
      }
      
      // İçerik kalitesi kontrolü
      if (chunk.content && chunk.content.length < 50) {
        warnings.push(`Kısa içerik: ${chunk.id} (${chunk.content.length} karakter)`);
      }
      
      // Embedding boyutu kontrolü
      if (chunk.embedding && chunk.embedding.length !== this.embeddings[0]?.length) {
        warnings.push(`Tutarsız embedding boyutu: ${chunk.id}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalChunks: this.trainingData.length,
      validChunks: this.trainingData.length - errors.length
    };
  }

  // Dosya türü desteğini kontrol et
  isFileTypeSupported(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const supportedTypes = [
      'txt', 'pdf', 'doc', 'docx', 'md', // Metin dosyaları
      'udf', // UDF dosyaları
      'jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp', 'bmp' // Görsel dosyalar
    ];
    return supportedTypes.includes(extension);
  }

  // Dosya boyutu kontrolü
  validateFileSize(file, maxSizeMB = 50) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `Dosya boyutu çok büyük: ${(file.size / 1024 / 1024).toFixed(2)} MB (Maksimum: ${maxSizeMB} MB)`
      };
    }
    return { valid: true };
  }

  // Toplu dosya doğrulama
  validateFiles(files) {
    const results = [];
    
    files.forEach(file => {
      const result = {
        fileName: file.name,
        valid: true,
        errors: [],
        warnings: []
      };
      
      // Dosya türü kontrolü
      if (!this.isFileTypeSupported(file.name)) {
        result.valid = false;
        result.errors.push('Desteklenmeyen dosya türü');
      }
      
      // Dosya boyutu kontrolü
      const sizeValidation = this.validateFileSize(file);
      if (!sizeValidation.valid) {
        result.valid = false;
        result.errors.push(sizeValidation.error);
      }
      
      // Dosya adı kontrolü
      if (file.name.length > 200) {
        result.warnings.push('Dosya adı çok uzun');
      }
      
      results.push(result);
    });
    
    return results;
  }
}

const aiTrainingService = new AITrainingService();
export default aiTrainingService; 