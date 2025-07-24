# ⚖️ LawInAI

**AI-powered legal assistant for Turkish lawyers**

LawInAI, Türk avukatlar için geliştirilmiş yapay zeka destekli hukuki asistan uygulamasıdır. Dava dosyalarınızı analiz eder, dilekçe hazırlar ve hukuki süreçlerinizi hızlandırır.

## ✨ Özellikler

- 🤖 **AI Destekli Sohbet** - Hukuki sorularınızı sorun, uzman seviyesinde cevaplar alın
- 📄 **Dilekçe Oluşturma** - PDF ve Word dosyalarınızdan otomatik dilekçe hazırlayın
- ⚡ **Hızlı Analiz** - Dava dosyalarınızı saniyeler içinde analiz edin
- 🔒 **Güvenli & Gizli** - Verileriniz tamamen gizli ve güvende tutulur
- 🇹🇷 **Türk Hukuku** - Türk hukuk sistemine özel eğitilmiş AI
- 💼 **Avukat Dostu** - Avukatlar için tasarlanmış, profesyonel arayüz

## 🚀 Hızlı Başlangıç

### Gereksinimler

- **Node.js** (v18 veya üzeri)
- **npm** veya **yarn**
- **OpenAI API Key** ([Buradan alın](https://platform.openai.com/api-keys))

### Kurulum

1. **Projeyi klonlayın:**
   ```bash
   git clone https://github.com/yourusername/lawinai.git
   cd lawinai
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Uygulamayı geliştirme modunda çalıştırın:**
   ```bash
   npm run dev
   ```

4. **API anahtarınızı ayarlayın:**
   - Uygulama açıldıktan sonra **Ayarlar** sekmesine gidin
   - OpenAI API anahtarınızı girin ve kaydedin

## 📱 Kullanım

### 1. Dosya Yükleme
- **Dosya Yükle** butonuna tıklayın
- PDF, Word veya metin dosyalarınızı seçin
- Dosyalar otomatik olarak işlenir

### 2. AI ile Sohbet
- Chat alanına hukuki sorunuzu yazın
- AI asistanınız anında cevap verir
- Yüklediğiniz dosyalara dayalı analiz yapar

### 3. Dilekçe Hazırlama
- Dilekçe türünü seçin (Boşanma, Tazminat, vb.)
- AI size profesyonel dilekçe hazırlar
- Markdown formatında indirebilirsiniz

## 🛠️ Geliştirme

### VS Code Kurulumu

En iyi geliştirme deneyimi için önerilen extension'ları kurun:
- **Tailwind CSS IntelliSense** - Tailwind class'ları için auto-completion
- **PostCSS Language Support** - CSS syntax highlighting

Proje `.vscode/settings.json` dosyası ile otomatik olarak şunları yapılandırır:
- Tailwind CSS desteği
- `@tailwind` direktifleri için CSS validation uyarılarını devre dışı bırakır
- className attribute'larında autocomplete'i aktif eder

### Mevcut Komutlar

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır
npm run dev

# Production build oluştur
npm run build

# Uygulamayı paketler (.exe, .dmg, vb.)
npm run dist

# Sadece klasör olarak paketler
npm run pack
```

### Proje Yapısı

```
lawinai/
├── main.js                 # Electron main process
├── preload.js              # Güvenli IPC bridge
├── src/
│   ├── components/         # React componentleri
│   │   ├── ChatInterface.jsx
│   │   ├── Sidebar.jsx
│   │   ├── WelcomeScreen.jsx
│   │   └── SettingsPanel.jsx
│   ├── App.jsx             # Ana uygulama
│   ├── main.jsx            # React giriş noktası
│   └── index.css           # Global stiller
├── package.json
└── README.md
```

## 🔧 API Konfigürasyonu

### OpenAI API Anahtarı

1. [OpenAI Platform](https://platform.openai.com/api-keys) adresine gidin
2. Yeni API anahtarı oluşturun
3. Anahtarı LawInAI ayarlarında kaydedin

**Not:** API anahtarınız sadece cihazınızda saklanır, hiçbir yere gönderilmez.

## 🔒 Gizlilik & Güvenlik

- ✅ **Yerel Depolama** - Tüm veriler cihazınızda saklanır
- ✅ **Şifrelenmiş API** - API anahtarı güvenli şekilde şifrelenir
- ✅ **No Tracking** - Hiçbir kişisel veri toplanmaz
- ✅ **Offline-Ready** - İnternet sadece AI yanıtları için gerekli

## 📋 Desteklenen Dosya Formatları

- **PDF** (.pdf) - Mahkeme kararları, sözleşmeler
- **Microsoft Word** (.doc, .docx) - Dilekçeler, raporlar  
- **Metin** (.txt) - Notlar, özetler

## 🎯 Kullanım Senaryoları

### Avukatlar için:
- Dava dosyası analizi
- Dilekçe hazırlama
- Hukuki risk değerlendirmesi
- İçtihat araştırması
- Sözleşme incelemesi

### Desteklenen Dava Türleri:
- Boşanma Davaları
- Tazminat Davaları
- İcra İtirazları
- İş Davaları
- Kira Davaları
- Miras Davaları
- Ticari Davalar

## 🚧 Bilinen Sınırlamalar

- Şu anda sadece **simülasyon modu** çalışıyor
- Gerçek PDF okuma henüz aktif değil
- Yerel AI modeli desteği gelecek sürümlerde

## 🛣️ Gelecek Özellikler

- [ ] Gerçek PDF/DOC işleme
- [ ] Vector database entegrasyonu
- [ ] Offline AI modeli desteği
- [ ] Çoklu dil desteği
- [ ] İmza ve noter entegrasyonu
- [ ] Bulut senkronizasyonu (opsiyonel)

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje [MIT License](LICENSE) altında lisanslanmıştır.

## ⚖️ Yasal Uyarı

**Önemli:** LawInAI bir yardımcı araçtır ve profesyonel hukuki tavsiye yerine geçmez. Her zaman qualified bir avukattan görüş alınız.

## 📞 Destek

Sorunlar için [GitHub Issues](https://github.com/yourusername/lawinai/issues) kullanın.

---

**LawInAI ile hukuki süreçlerinizi modernleştirin! ⚖️✨** 