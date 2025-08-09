#!/usr/bin/env node

/**
 * AI Eğitim Scripti
 * 
 * Bu script, AI Training Panel'den dışa aktarılan verileri kullanarak
 * yapay zeka modelini eğitmek için gerekli dosyaları hazırlar.
 * 
 * Kullanım:
 * node scripts/train-ai.js [options]
 * 
 * Seçenekler:
 * --input: Eğitim verilerinin bulunduğu klasör (varsayılan: ./)
 * --output: Çıktı klasörü (varsayılan: ./training-output)
 * --format: Çıktı formatı (json, csv, embeddings) (varsayılan: all)
 */

const fs = require('fs');
const path = require('path');

// Komut satırı argümanlarını parse et
const args = process.argv.slice(2);
const options = {
  input: './',
  output: './training-output',
  format: 'all'
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && args[i + 1]) {
    options.input = args[i + 1];
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    options.output = args[i + 1];
    i++;
  } else if (args[i] === '--format' && args[i + 1]) {
    options.format = args[i + 1];
    i++;
  }
}

console.log('🤖 AI Eğitim Scripti Başlatılıyor...');
console.log('📁 Giriş klasörü:', options.input);
console.log('📁 Çıkış klasörü:', options.output);
console.log('📄 Format:', options.format);

// Çıkış klasörünü oluştur
if (!fs.existsSync(options.output)) {
  fs.mkdirSync(options.output, { recursive: true });
  console.log('✅ Çıkış klasörü oluşturuldu:', options.output);
}

// Eğitim verilerini yükle
function loadTrainingData() {
  const trainingDataPath = path.join(options.input, 'training-data.json');
  
  if (!fs.existsSync(trainingDataPath)) {
    console.error('❌ training-data.json dosyası bulunamadı:', trainingDataPath);
    console.log('💡 AI Training Panel\'den verileri dışa aktarın');
    process.exit(1);
  }
  
  try {
    const data = fs.readFileSync(trainingDataPath, 'utf8');
    const trainingData = JSON.parse(data);
    console.log('✅ Eğitim verileri yüklendi');
    console.log(`   📊 ${trainingData.metadata.totalDocuments} doküman`);
    console.log(`   📊 ${trainingData.metadata.totalChunks} parça`);
    console.log(`   📊 ${trainingData.metadata.totalEmbeddings} embedding`);
    return trainingData;
  } catch (error) {
    console.error('❌ Eğitim verileri yüklenemedi:', error.message);
    process.exit(1);
  }
}

// Verileri analiz et
function analyzeData(trainingData) {
  console.log('\n📈 Veri Analizi:');
  
  const { trainingData: chunks } = trainingData;
  
  // Doküman türlerine göre analiz
  const documentTypes = {};
  const documentNames = {};
  const processingTypes = {};
  
  chunks.forEach(chunk => {
    const type = chunk.metadata.documentType;
    const name = chunk.metadata.documentName;
    const processingType = chunk.metadata.processingType || 'text';
    
    documentTypes[type] = (documentTypes[type] || 0) + 1;
    documentNames[name] = (documentNames[name] || 0) + 1;
    processingTypes[processingType] = (processingTypes[processingType] || 0) + 1;
  });
  
  console.log('   📄 Doküman Türleri:');
  Object.entries(documentTypes).forEach(([type, count]) => {
    console.log(`      ${type.toUpperCase()}: ${count} parça`);
  });
  
  console.log('   📄 Dokümanlar:');
  Object.entries(documentNames).forEach(([name, count]) => {
    console.log(`      ${name}: ${count} parça`);
  });
  
  console.log('   🔧 İşleme Türleri:');
  Object.entries(processingTypes).forEach(([type, count]) => {
    console.log(`      ${type}: ${count} parça`);
  });
  
  // Embedding boyutu
  if (chunks.length > 0 && chunks[0].embedding) {
    console.log(`   🔢 Embedding Boyutu: ${chunks[0].embedding.length}`);
  }
  
  return { documentTypes, documentNames, processingTypes };
}

// Eğitim verilerini hazırla
function prepareTrainingData(trainingData) {
  console.log('\n🔧 Eğitim Verileri Hazırlanıyor...');
  
  const { trainingData: chunks } = trainingData;
  
  // Farklı formatlarda veri hazırla
  const formats = {
    json: prepareJSONFormat(trainingData),
    csv: prepareCSVFormat(chunks),
    embeddings: prepareEmbeddingsFormat(chunks),
    metadata: prepareMetadataFormat(trainingData.metadata)
  };
  
  return formats;
}

// JSON formatı hazırla
function prepareJSONFormat(trainingData) {
  return {
    filename: 'training-data-processed.json',
    content: JSON.stringify(trainingData, null, 2)
  };
}

// CSV formatı hazırla
function prepareCSVFormat(chunks) {
  const headers = ['id', 'content', 'document_name', 'document_type', 'chunk_index', 'total_chunks', 'chunk_length'];
  const rows = chunks.map(chunk => [
    chunk.id,
    `"${chunk.content.replace(/"/g, '""')}"`,
    chunk.metadata.documentName,
    chunk.metadata.documentType,
    chunk.metadata.chunkIndex,
    chunk.metadata.totalChunks,
    chunk.metadata.chunkLength
  ]);
  
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  
  return {
    filename: 'training-data.csv',
    content: csvContent
  };
}

// Embedding formatı hazırla
function prepareEmbeddingsFormat(chunks) {
  const embeddings = chunks.map(chunk => chunk.embedding);
  const metadata = {
    totalEmbeddings: embeddings.length,
    embeddingDimension: embeddings[0]?.length || 0,
    exportDate: new Date().toISOString()
  };
  
  return {
    filename: 'embeddings.json',
    content: JSON.stringify({ metadata, embeddings }, null, 2)
  };
}

// Metadata formatı hazırla
function prepareMetadataFormat(metadata) {
  return {
    filename: 'metadata.json',
    content: JSON.stringify(metadata, null, 2)
  };
}

// Dosyaları kaydet
function saveFiles(formats) {
  console.log('\n💾 Dosyalar Kaydediliyor...');
  
  const formatsToSave = options.format === 'all' 
    ? Object.keys(formats) 
    : [options.format];
  
  formatsToSave.forEach(format => {
    if (formats[format]) {
      const filePath = path.join(options.output, formats[format].filename);
      fs.writeFileSync(filePath, formats[format].content);
      console.log(`   ✅ ${formats[format].filename} kaydedildi`);
    }
  });
}

// Eğitim konfigürasyonu oluştur
function createTrainingConfig(trainingData) {
  console.log('\n⚙️ Eğitim Konfigürasyonu Oluşturuluyor...');
  
  const config = {
    model: {
      name: 'lawinai-legal-assistant',
      version: '1.0.0',
      description: 'Türk hukuk sistemi için eğitilmiş AI asistan',
      baseModel: process.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro'
    },
    training: {
      totalDocuments: trainingData.metadata.totalDocuments,
      totalChunks: trainingData.metadata.totalChunks,
      totalEmbeddings: trainingData.metadata.totalEmbeddings,
      embeddingDimension: trainingData.trainingData[0]?.embedding?.length || 0,
      chunkSize: 1000,
      embeddingModel: process.env.VITE_GEMINI_EMBEDDING_MODEL || 'text-embedding-004'
    },
    data: {
      inputFiles: ['training-data-processed.json', 'embeddings.json'],
      outputFormat: 'json',
      validationSplit: 0.2,
      testSplit: 0.1
    },
    hyperparameters: {
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100,
      temperature: 0.3,
      maxTokens: 4096
    },
    metadata: {
      createdAt: new Date().toISOString(),
      author: 'LawInAI Team',
      license: 'MIT',
      domain: 'Turkish Legal System'
    }
  };
  
  const configPath = path.join(options.output, 'training-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('   ✅ training-config.json oluşturuldu');
  
  return config;
}

// README dosyası oluştur
function createREADME(trainingData, config) {
  console.log('\n📝 README Dosyası Oluşturuluyor...');
  
  const readme = `# LawInAI Eğitim Verileri

Bu klasör, LawInAI yapay zeka modelinin eğitimi için hazırlanmış verileri içerir.

## 📊 Veri İstatistikleri

- **Toplam Doküman**: ${trainingData.metadata.totalDocuments}
- **Toplam Parça**: ${trainingData.metadata.totalChunks}
- **Toplam Embedding**: ${trainingData.metadata.totalEmbeddings}
- **Embedding Boyutu**: ${config.training.embeddingDimension}
- **Oluşturulma Tarihi**: ${new Date().toLocaleDateString('tr-TR')}

## 📁 Dosyalar

- \`training-data-processed.json\` - İşlenmiş eğitim verileri
- \`training-data.csv\` - CSV formatında veriler
- \`embeddings.json\` - Embedding vektörleri
- \`metadata.json\` - Veri metadata'sı
- \`training-config.json\` - Eğitim konfigürasyonu

## 🚀 Kullanım

Bu verileri kullanarak AI modelini eğitmek için:

1. Eğitim framework'ünüzü seçin (TensorFlow, PyTorch, vb.)
2. \`training-config.json\` dosyasındaki parametreleri kullanın
3. \`embeddings.json\` dosyasından embedding'leri yükleyin
4. Model eğitimini başlatın

## ⚠️ Önemli Notlar

- Bu veriler Türk hukuk sistemi için özelleştirilmiştir
- Veriler güncel tutulmalıdır
- Eğitim sonrası model performansı test edilmelidir

## 📞 Destek

Sorunlar için LawInAI geliştirme ekibiyle iletişime geçin.
`;

  const readmePath = path.join(options.output, 'README.md');
  fs.writeFileSync(readmePath, readme);
  console.log('   ✅ README.md oluşturuldu');
}

// Ana fonksiyon
function main() {
  try {
    // Eğitim verilerini yükle
    const trainingData = loadTrainingData();
    
    // Verileri analiz et
    analyzeData(trainingData);
    
    // Eğitim verilerini hazırla
    const formats = prepareTrainingData(trainingData);
    
    // Dosyaları kaydet
    saveFiles(formats);
    
    // Eğitim konfigürasyonu oluştur
    const config = createTrainingConfig(trainingData);
    
    // README dosyası oluştur
    createREADME(trainingData, config);
    
    console.log('\n🎉 AI Eğitim Verileri Başarıyla Hazırlandı!');
    console.log(`📁 Çıkış klasörü: ${options.output}`);
    console.log('\n📋 Sonraki Adımlar:');
    console.log('1. Eğitim framework\'ünüzü seçin');
    console.log('2. training-config.json dosyasını inceleyin');
    console.log('3. Model eğitimini başlatın');
    console.log('4. Model performansını test edin');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

// Scripti çalıştır
if (require.main === module) {
  main();
}

module.exports = {
  loadTrainingData,
  analyzeData,
  prepareTrainingData,
  createTrainingConfig
}; 