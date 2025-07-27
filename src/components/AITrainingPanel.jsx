import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Upload, 
  Download, 
  FileText, 
  BarChart3, 
  Trash2, 
  Search, 
  CheckCircle, 
  AlertCircle,
  Database,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import aiTrainingService from '../services/aiTrainingService';

function AITrainingPanel() {
  const [trainingData, setTrainingData] = useState([]);
  const [stats, setStats] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [validation, setValidation] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileValidation, setFileValidation] = useState(null);

  useEffect(() => {
    // İstatistikleri güncelle
    updateStats();
  }, []);

  const updateStats = () => {
    const currentStats = aiTrainingService.analyzeTrainingData();
    setStats(currentStats);
  };

  // Dosya yükleme
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    // Dosyaları önce doğrula
    const validationResults = aiTrainingService.validateFiles(files);
    setFileValidation(validationResults);
    
    const validFiles = files.filter((file, index) => validationResults[index].valid);
    const invalidFiles = files.filter((file, index) => !validationResults[index].valid);
    
    if (invalidFiles.length > 0) {
      const errorMessage = `Aşağıdaki dosyalar geçersiz:\n${invalidFiles.map(f => f.name).join('\n')}`;
      alert(errorMessage);
      
      if (validFiles.length === 0) {
        return;
      }
    }
    
    setIsProcessing(true);

    try {
      const results = [];
      
      for (const file of validFiles) {
        console.log(`Dosya işleniyor: ${file.name}`);
        const result = await aiTrainingService.processAndAddFile(file);
        results.push(result);
        
        if (result.success) {
          console.log(`Eğitim dokümanı eklendi: ${file.name} (${result.processingType})`);
        } else {
          console.error(`Dosya işleme hatası: ${file.name} - ${result.error}`);
        }
      }

      updateStats();
      
      // Sonuçları göster
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      let message = `${successCount} dosya başarıyla eğitim verilerine eklendi!`;
      if (errorCount > 0) {
        message += `\n${errorCount} dosya işlenemedi.`;
      }
      
      alert(message);
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
      alert(`Dosya yükleme hatası: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setFileValidation(null);
    }
  };

  // Dosya içeriğini oku
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Eğitim verilerini dışa aktar
  const handleExportTrainingData = async () => {
    try {
      setIsProcessing(true);
      
      // JSON formatında dışa aktar
      const jsonResult = await aiTrainingService.exportTrainingData();
      
      // CSV formatında dışa aktar
      const csvResult = await aiTrainingService.exportTrainingDataCSV();
      
      // Embedding'leri ayrı dosyaya kaydet
      const embeddingsResult = await aiTrainingService.exportEmbeddings();
      
      alert(`Eğitim verileri başarıyla dışa aktarıldı!\n\nJSON: ${jsonResult.outputPath}\nCSV: ${csvResult.outputPath}\nEmbeddings: ${embeddingsResult.outputPath}`);
    } catch (error) {
      console.error('Dışa aktarma hatası:', error);
      alert(`Dışa aktarma hatası: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Eğitim verilerini doğrula
  const handleValidateData = () => {
    const validationResult = aiTrainingService.validateTrainingData();
    setValidation(validationResult);
    
    if (validationResult.isValid) {
      alert('✅ Eğitim verileri geçerli!');
    } else {
      alert(`❌ Eğitim verilerinde ${validationResult.errors.length} hata bulundu!`);
    }
  };

  // Eğitim verilerini temizle
  const handleClearData = async () => {
    if (confirm('Tüm eğitim verilerini silmek istediğinizden emin misiniz?')) {
      try {
        await aiTrainingService.clearTrainingData();
        updateStats();
        setValidation(null);
        alert('Eğitim verileri temizlendi!');
      } catch (error) {
        console.error('Veri temizleme hatası:', error);
        alert('Veri temizleme hatası: ' + error.message);
      }
    }
  };

  // Eğitim verilerini ara
  const handleSearch = () => {
    const results = aiTrainingService.searchTrainingData(searchQuery);
    setTrainingData(results);
  };

  // Doküman listesini indir
  const handleDownloadDocumentList = () => {
    if (!stats?.documents || stats.documents.length === 0) {
      alert('İndirilecek doküman bulunamadı!');
      return;
    }

    try {
      // AI Training Service'ten doküman listesini al
      const documents = aiTrainingService.getUniqueDocuments();
      
      // CSV formatında doküman listesi oluştur
      const csvContent = [
        ['Doküman Adı', 'Dosya Türü', 'Parça Sayısı', 'Karakter Sayısı', 'İşleme Türü', 'Yükleme Tarihi'],
        ...documents.map(doc => [
          doc.name,
          doc.type.toUpperCase(),
          doc.chunks,
          doc.totalLength.toLocaleString(),
          doc.processingType || 'text',
          new Date().toLocaleDateString('tr-TR')
        ])
      ].map(row => row.join(',')).join('\n');

      // Dosyayı indir
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `dokuman-listesi-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`${documents.length} dokümanın listesi başarıyla indirildi!`);
    } catch (error) {
      console.error('Doküman listesi indirme hatası:', error);
      alert('Doküman listesi indirilemedi: ' + error.message);
    }
  };

  // Dosya türü istatistiklerini al
  const getFileTypeStats = () => {
    if (!stats?.documents) return {};
    
    const typeStats = {};
    stats.documents.forEach(doc => {
      const type = doc.type.toUpperCase();
      if (!typeStats[type]) {
        typeStats[type] = { 
          count: 0, 
          chunks: 0, 
          totalLength: 0,
          processingType: doc.processingType || 'text'
        };
      }
      typeStats[type].count++;
      typeStats[type].chunks += doc.chunks;
      typeStats[type].totalLength += doc.totalLength;
    });
    
    return typeStats;
  };

  return (
    <div className="h-screen overflow-y-auto bg-white dark:bg-gray-900">
      <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              AI Eğitim Paneli
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yapay zeka modelini eğitmek için veri yönetimi
            </p>
          </div>
        </div>
        
        <Badge variant="secondary" className="text-xs">
          Geliştirici Modu
        </Badge>
      </div>

             {/* İstatistikler */}
       {stats && (
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
           <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
             <div className="flex items-center space-x-2">
               <FileText className="w-5 h-5 text-blue-600" />
               <div>
                 <div className="text-2xl font-bold text-blue-600">{stats.totalDocuments}</div>
                 <div className="text-sm text-blue-600">Doküman</div>
               </div>
             </div>
           </div>
           
           <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
             <div className="flex items-center space-x-2">
               <Database className="w-5 h-5 text-green-600" />
               <div>
                 <div className="text-2xl font-bold text-green-600">{stats.totalChunks}</div>
                 <div className="text-sm text-green-600">Parça</div>
               </div>
             </div>
           </div>
           
           <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
             <div className="flex items-center space-x-2">
               <BarChart3 className="w-5 h-5 text-purple-600" />
               <div>
                 <div className="text-2xl font-bold text-purple-600">{stats.totalLength.toLocaleString()}</div>
                 <div className="text-sm text-purple-600">Karakter</div>
               </div>
             </div>
           </div>
           
           <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
             <div className="flex items-center space-x-2">
               <Settings className="w-5 h-5 text-orange-600" />
               <div>
                 <div className="text-2xl font-bold text-orange-600">{stats.embeddingDimension}</div>
                 <div className="text-sm text-orange-600">Embedding Boyutu</div>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* İşleme Türü İstatistikleri */}
       {stats?.processingTypeStats && Object.keys(stats.processingTypeStats).length > 0 && (
         <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6">
           <h3 className="text-lg font-semibold mb-4">İşleme Türü Dağılımı</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {Object.entries(stats.processingTypeStats).map(([type, count]) => {
               const colors = {
                 text: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
                 udf: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200',
                 image: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200'
               };
               
               const icons = {
                 text: '📄',
                 udf: '⚖️',
                 image: '🖼️'
               };
               
               return (
                 <div key={type} className={`p-4 rounded-lg ${colors[type] || 'bg-gray-100 dark:bg-gray-700'}`}>
                   <div className="flex items-center space-x-3">
                     <span className="text-2xl">{icons[type] || '📄'}</span>
                     <div>
                       <div className="font-bold text-lg">{count}</div>
                       <div className="text-sm opacity-80">
                         {type === 'text' ? 'Metin Dosyası' : 
                          type === 'udf' ? 'UDF Dokümanı' : 
                          type === 'image' ? 'Görsel Dosyası' : type.toUpperCase()}
                       </div>
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
         </div>
       )}

      {/* Ana İşlemler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Dosya Yükleme */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Eğitim Verisi Yükle</span>
          </h3>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                             <input
                 type="file"
                 multiple
                 accept=".txt,.pdf,.doc,.docx,.md,.udf,.jpg,.jpeg,.png,.tiff,.tif,.webp,.bmp"
                 onChange={handleFileUpload}
                 className="hidden"
                 id="file-upload"
                 disabled={isProcessing}
               />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isProcessing ? 'İşleniyor...' : 'Dosyaları seçin veya sürükleyin'}
                </p>
                                 <p className="text-xs text-gray-500 mt-1">
                   Desteklenen formatlar: TXT, PDF, DOC, DOCX, MD, UDF, JPG, PNG, TIFF, WEBP, BMP
                 </p>
              </label>
            </div>
            
            <Button
              onClick={() => document.getElementById('file-upload').click()}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  İşleniyor...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Dosya Seç
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Dışa Aktarma */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Eğitim Verilerini Dışa Aktar</span>
          </h3>
          
          <div className="space-y-3">
            <Button
              onClick={handleExportTrainingData}
              disabled={isProcessing || !stats?.totalChunks}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Dışa Aktarılıyor...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  JSON, CSV & Embeddings
                </>
              )}
            </Button>
            
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Eğitim verilerini JSON, CSV ve embedding formatlarında dışa aktarır
            </div>
          </div>
        </div>
      </div>

      {/* Doğrulama ve Temizleme */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Doğrulama */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>Veri Doğrulama</span>
          </h3>
          
          <div className="space-y-3">
            <Button
              onClick={handleValidateData}
              disabled={isProcessing || !stats?.totalChunks}
              className="w-full"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Verileri Doğrula
            </Button>
            
                         {validation && (
               <div className={`p-3 rounded-lg text-sm ${
                 validation.isValid 
                   ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                   : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
               }`}>
                 <div className="flex items-center space-x-2 mb-2">
                   {validation.isValid ? (
                     <CheckCircle className="w-4 h-4" />
                   ) : (
                     <AlertCircle className="w-4 h-4" />
                   )}
                   <span className="font-medium">
                     {validation.isValid ? 'Veriler Geçerli' : 'Hatalar Bulundu'}
                   </span>
                 </div>
                 <div>
                   Toplam: {validation.totalChunks} parça, 
                   Geçerli: {validation.validChunks} parça
                   {!validation.isValid && (
                     <div className="mt-2">
                       <strong>Hatalar:</strong>
                       <ul className="list-disc list-inside mt-1">
                         {validation.errors.slice(0, 3).map((error, index) => (
                           <li key={index}>{error}</li>
                         ))}
                         {validation.errors.length > 3 && (
                           <li>... ve {validation.errors.length - 3} hata daha</li>
                         )}
                       </ul>
                     </div>
                   )}
                   {validation.warnings && validation.warnings.length > 0 && (
                     <div className="mt-2">
                       <strong>Uyarılar:</strong>
                       <ul className="list-disc list-inside mt-1">
                         {validation.warnings.slice(0, 3).map((warning, index) => (
                           <li key={index}>{warning}</li>
                         ))}
                         {validation.warnings.length > 3 && (
                           <li>... ve {validation.warnings.length - 3} uyarı daha</li>
                         )}
                       </ul>
                     </div>
                   )}
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* Temizleme */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Trash2 className="w-5 h-5" />
            <span>Veri Yönetimi</span>
          </h3>
          
          <div className="space-y-3">
            <Button
              onClick={handleClearData}
              disabled={isProcessing || !stats?.totalChunks}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Tüm Verileri Temizle
            </Button>
            
            <div className="text-xs text-gray-600 dark:text-gray-400">
              ⚠️ Bu işlem geri alınamaz! Tüm eğitim verilerini siler.
            </div>
          </div>
                 </div>
       </div>

       {/* Dosya Doğrulama Sonuçları */}
       {fileValidation && (
         <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6">
           <h3 className="text-lg font-semibold mb-4">Dosya Doğrulama Sonuçları</h3>
           <div className="space-y-2 max-h-64 overflow-y-auto">
             {fileValidation.map((result, index) => (
               <div key={index} className={`p-3 rounded border ${
                 result.valid 
                   ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                   : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
               }`}>
                 <div className="flex items-center justify-between">
                   <span className="font-medium text-gray-900 dark:text-gray-100">
                     {result.fileName}
                   </span>
                   <Badge variant={result.valid ? "default" : "destructive"} className="text-xs">
                     {result.valid ? 'Geçerli' : 'Geçersiz'}
                   </Badge>
                 </div>
                 {result.errors.length > 0 && (
                   <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                     <strong>Hatalar:</strong>
                     <ul className="list-disc list-inside mt-1">
                       {result.errors.map((error, errorIndex) => (
                         <li key={errorIndex}>{error}</li>
                       ))}
                     </ul>
                   </div>
                 )}
                 {result.warnings.length > 0 && (
                   <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                     <strong>Uyarılar:</strong>
                     <ul className="list-disc list-inside mt-1">
                       {result.warnings.map((warning, warningIndex) => (
                         <li key={warningIndex}>{warning}</li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
             ))}
           </div>
         </div>
       )}

       {/* Arama */}
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Search className="w-5 h-5" />
          <span>Eğitim Verilerini Ara</span>
        </h3>
        
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Arama terimi girin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
            <Search className="w-4 h-4 mr-2" />
            Ara
          </Button>
        </div>
        
        {trainingData.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Arama Sonuçları ({trainingData.length})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {trainingData.map((chunk) => (
                <div key={chunk.id} className="p-3 bg-white dark:bg-gray-700 rounded border">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {chunk.metadata.documentName}
                    </span>
                    <span className="text-xs text-gray-500">
                      Parça {chunk.metadata.chunkIndex + 1}/{chunk.metadata.totalChunks}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

             {/* Dosya Türü İstatistikleri */}
       {stats?.documents && stats.documents.length > 0 && (
         <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-6">
           <h3 className="text-lg font-semibold mb-4">Dosya Türü İstatistikleri</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {Object.entries(getFileTypeStats()).map(([type, data]) => (
               <div key={type} className="bg-white dark:bg-gray-700 p-4 rounded border">
                 <div className="flex items-center justify-between mb-2">
                   <span className="font-medium text-gray-900 dark:text-gray-100">{type}</span>
                   <Badge variant="secondary" className="text-xs">
                     {data.count} dosya
                   </Badge>
                 </div>
                 <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                   <div>Parça: {data.chunks}</div>
                   <div>Karakter: {data.totalLength.toLocaleString()}</div>
                   <div className="text-xs opacity-75">
                     {data.processingType === 'text' ? '📄 Metin' : 
                      data.processingType === 'udf' ? '⚖️ UDF' : 
                      data.processingType === 'image' ? '🖼️ Görsel' : data.processingType}
                   </div>
                 </div>
               </div>
             ))}
           </div>
         </div>
       )}

       {/* Doküman Listesi Özeti */}
       {stats?.documents && stats.documents.length > 0 && (
         <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold">Yüklenen Dokümanlar</h3>
             <div className="flex items-center space-x-2">
               <Badge variant="secondary" className="text-sm">
                 {stats.documents.length} doküman
               </Badge>
               <Button
                 size="sm"
                 variant="outline"
                 onClick={handleDownloadDocumentList}
                 className="text-xs"
               >
                 <Download className="w-4 h-4 mr-1" />
                 Liste İndir
               </Button>
             </div>
           </div>
           
           {/* Özet Bilgiler */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             <div className="bg-white dark:bg-gray-700 p-3 rounded border">
               <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Dosya</div>
               <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                 {stats.documents.length}
               </div>
             </div>
             <div className="bg-white dark:bg-gray-700 p-3 rounded border">
               <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Parça</div>
               <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                 {stats.documents.reduce((sum, doc) => sum + doc.chunks, 0).toLocaleString()}
               </div>
             </div>
             <div className="bg-white dark:bg-gray-700 p-3 rounded border">
               <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Karakter</div>
               <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                 {stats.documents.reduce((sum, doc) => sum + doc.totalLength, 0).toLocaleString()}
               </div>
             </div>
           </div>

           {/* Son 5 Doküman (Önizleme) */}
           {stats.documents.length > 0 && (
             <div>
               <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                 Son Yüklenen Dokümanlar (İlk 5)
               </h4>
               <div className="space-y-2 max-h-48 overflow-y-auto">
                 {stats.documents.slice(0, 5).map((doc) => (
                   <div key={doc.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border text-sm">
                     <div className="flex items-center space-x-2">
                       <FileText className="w-3 h-3 text-gray-500" />
                       <div>
                         <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                           {doc.name}
                         </div>
                         <div className="text-xs text-gray-500">
                           {doc.type.toUpperCase()} • {doc.chunks} parça
                         </div>
                       </div>
                     </div>
                     <Button
                       size="sm"
                       variant="ghost"
                       onClick={async () => {
                         try {
                           await aiTrainingService.removeDocument(doc.id);
                           updateStats();
                         } catch (error) {
                           console.error('Doküman silme hatası:', error);
                           alert('Doküman silinemedi: ' + error.message);
                         }
                       }}
                       className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                     >
                       <Trash2 className="w-3 h-3" />
                     </Button>
                   </div>
                 ))}
                 {stats.documents.length > 5 && (
                   <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
                     ... ve {stats.documents.length - 5} doküman daha
                   </div>
                 )}
               </div>
             </div>
           )}
         </div>
       )}
      </div>
    </div>
  );
}

export default AITrainingPanel; 