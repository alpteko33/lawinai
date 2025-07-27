# 🤖 AI Eğitim Kılavuzu

Bu kılavuz, LawInAI uygulamasında yapay zeka modelini eğitmek için kullanılan AI Training Panel'i açıklar.

## 📋 Genel Bakış

AI Training Panel, yapay zeka modelini eğitmek için gerekli verileri hazırlamanızı sağlar. Bu panel sadece geliştirici tarafından kullanılır ve kullanıcılara gösterilmez.

## 🚀 Başlangıç

### 1. AI Training Panel'e Erişim

1. Uygulamayı başlatın
2. Login ekranında **"AI Eğitim Paneli"** butonuna tıklayın
3. Panel açılacak ve eğitim verilerini yönetebileceksiniz

### 2. Desteklenen Dosya Formatları

#### Metin Dosyaları
- **TXT** - Düz metin dosyaları
- **PDF** - PDF dokümanları
- **DOC/DOCX** - Microsoft Word dosyaları
- **MD** - Markdown dosyaları

#### Hukuki Dokümanlar
- **UDF** - UYAP Doküman Formatı (Türk hukuk sistemi için özel format)

#### Görsel Dosyalar (OCR ile metin çıkarılır)
- **JPG/JPEG** - JPEG görselleri
- **PNG** - PNG görselleri
- **TIFF/TIF** - TIFF görselleri
- **WEBP** - WebP görselleri
- **BMP** - Bitmap görselleri

## 📊 Panel Özellikleri

### İstatistikler
Panel üst kısmında şu istatistikleri görebilirsiniz:
- **Doküman Sayısı** - Yüklenen toplam doküman sayısı
- **Parça Sayısı** - Oluşturulan toplam parça sayısı
- **Karakter Sayısı** - Toplam karakter sayısı
- **Embedding Boyutu** - Embedding vektörlerinin boyutu

### Ana İşlemler

#### 1. Eğitim Verisi Yükleme
- **Dosya Seç** butonuna tıklayın
- Birden fazla dosya seçebilirsiniz
- Dosyalar otomatik olarak parçalara bölünür ve embedding'ler oluşturulur

#### 2. Eğitim Verilerini Dışa Aktarma
- **JSON, CSV & Embeddings** butonuna tıklayın
- Üç farklı format oluşturulur:
  - `training-data.json` - Tüm eğitim verileri
  - `training-data.csv` - CSV formatında veriler
  - `embeddings.json` - Sadece embedding'ler

#### 3. Veri Doğrulama
- **Verileri Doğrula** butonuna tıklayın
- Eğitim verilerinin geçerliliği kontrol edilir
- Hatalar ve uyarılar varsa detaylı rapor gösterilir
- İçerik kalitesi ve embedding tutarlılığı kontrol edilir

#### 4. Veri Yönetimi
- **Tüm Verileri Temizle** - Tüm eğitim verilerini siler
- ⚠️ Bu işlem geri alınamaz!

### Arama ve Filtreleme
- Arama kutusuna terim girin
- **Ara** butonuna tıklayın
- Eğitim verilerinde arama yapın

### Dosya Doğrulama
- Yüklenen dosyalar otomatik olarak doğrulanır
- Dosya türü ve boyut kontrolü yapılır
- Geçersiz dosyalar işlenmez
- Doğrulama sonuçları detaylı olarak gösterilir

## 🔧 Teknik Detaylar

### Doküman İşleme
1. **Dosya Türü Tespiti**: Sistem dosya uzantısına göre işleme yöntemini belirler
2. **İçerik Çıkarma**:
   - **Metin Dosyaları**: Doğrudan okunur
   - **UDF Dosyaları**: UDF servisi ile XML içeriği çıkarılır
   - **Görsel Dosyalar**: Google Gemini OCR ile metin çıkarılır
3. **Parçalama**: Dokümanlar 1000 karakterlik parçalara bölünür
4. **Embedding**: Her parça için Google Gemini embedding modeli kullanılır
5. **Metadata**: Her parça için detaylı metadata oluşturulur

### Çıktı Formatları

#### JSON Format
```json
{
  "metadata": {
    "totalDocuments": 5,
    "totalChunks": 25,
    "totalEmbeddings": 25,
    "exportDate": "2024-03-01T10:00:00.000Z",
    "version": "1.0"
  },
  "trainingData": [
    {
      "id": "doc1_chunk_0",
      "content": "Doküman içeriği...",
      "embedding": [0.1, 0.2, 0.3, ...],
      "metadata": {
        "documentId": "doc1",
        "documentName": "boşanma_dilekcesi.txt",
        "documentType": "txt",
        "chunkIndex": 0,
        "totalChunks": 5,
        "timestamp": "2024-03-01T10:00:00.000Z",
        "chunkLength": 850
      }
    }
  ],
  "embeddings": [[0.1, 0.2, 0.3, ...], ...]
}
```

#### CSV Format
```csv
id,content,document_name,document_type,chunk_index,total_chunks,timestamp,chunk_length
doc1_chunk_0,"Doküman içeriği...",boşanma_dilekcesi.txt,txt,0,5,2024-03-01T10:00:00.000Z,850
```

## 📈 Eğitim Süreci

### 1. Veri Toplama
- Hukuki dokümanları toplayın
- Dilekçeler, mahkeme kararları, kanun metinleri
- Yüksek kaliteli ve güncel veriler kullanın

### 2. Veri Hazırlama
- Dokümanları uygun formata çevirin
- Gereksiz bilgileri temizleyin
- Tutarlı formatlama yapın

### 3. Eğitim Verisi Oluşturma
- AI Training Panel'e dosyaları yükleyin
- Verileri doğrulayın
- İstatistikleri kontrol edin

### 4. Dışa Aktarma
- JSON, CSV ve embedding dosyalarını oluşturun
- Bu dosyaları AI eğitim sürecinde kullanın

## 🎯 En İyi Uygulamalar

### Veri Kalitesi
- ✅ Yüksek kaliteli, güncel dokümanlar kullanın
- ✅ Tutarlı formatlama yapın
- ✅ Gereksiz bilgileri temizleyin
- ❌ Eski veya güncel olmayan veriler kullanmayın

### Veri Miktarı
- ✅ En az 100-500 doküman hedefleyin
- ✅ Çeşitli hukuki alanları kapsayın
- ✅ Farklı doküman türleri ekleyin
- ✅ Farklı işleme türlerini (text, udf, image) dengeli kullanın

### Veri Çeşitliliği
- ✅ Boşanma davaları
- ✅ Tazminat davaları
- ✅ İcra takipleri
- ✅ Sözleşmeler
- ✅ Mahkeme kararları
- ✅ Kanun metinleri
- ✅ UDF formatında hukuki dokümanlar
- ✅ Taranmış belgeler (OCR ile)
- ✅ Fotoğraflar ve görseller

## 🔍 Sorun Giderme

### Yaygın Sorunlar

#### 1. Dosya Yükleme Hatası
- Dosya formatını kontrol edin
- Dosya boyutunu kontrol edin
- Dosya bozuk olup olmadığını kontrol edin

#### 2. UDF Dosya Hatası
- UDF dosyasının geçerli olduğunu kontrol edin
- content.xml dosyasının mevcut olduğunu kontrol edin
- XML formatının doğru olduğunu kontrol edin

#### 3. Görsel İşleme Hatası
- Görsel kalitesini kontrol edin (minimum 800x600 piksel önerilir)
- Görsel formatının desteklendiğini kontrol edin
- Görselde metin olduğunu kontrol edin

#### 2. Embedding Oluşturma Hatası
- API anahtarını kontrol edin
- İnternet bağlantısını kontrol edin
- Dosya içeriğini kontrol edin

#### 3. Dışa Aktarma Hatası
- Disk alanını kontrol edin
- Dosya izinlerini kontrol edin
- Dosya yolunu kontrol edin

### Hata Mesajları
- **"Boş içerikli doküman atlandı"** - Dosya içeriği boş
- **"Embedding oluşturulamadı"** - API hatası
- **"Dosya okunamadı"** - Dosya formatı desteklenmiyor
- **"UDF dosyası okunamadı"** - UDF dosyası bozuk veya geçersiz
- **"Görsel işlenemedi"** - OCR işlemi başarısız
- **"Desteklenmeyen dosya formatı"** - Dosya türü tanınmıyor

## 📞 Destek

Sorunlar için:
1. Console loglarını kontrol edin
2. Hata mesajlarını not edin
3. Dosya formatlarını kontrol edin
4. API anahtarını kontrol edin

## 🔒 Güvenlik

- Eğitim verileri yerel olarak saklanır
- API anahtarı güvenli şekilde kullanılır
- Veriler şifrelenmez, güvenlik için ek önlemler alın

---

**Not**: Bu panel sadece geliştirici kullanımı içindir. Kullanıcılara gösterilmemelidir. 