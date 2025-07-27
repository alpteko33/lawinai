// Görsel dosya işleme servisi
import { GoogleGenerativeAI } from '@google/generative-ai';

class ImageProcessingService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp', 'bmp'];
  }

  // Desteklenen format kontrolü
  isSupportedFormat(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    return this.supportedFormats.includes(extension);
  }

  // Dosyayı base64'e çevir
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // data:image/...;base64, kısmını çıkar
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Electron için dosya okuma
  async readFileAsBase64(filePath) {
    if (window.electronAPI && window.electronAPI.readFileAsBase64) {
      return await window.electronAPI.readFileAsBase64(filePath);
    } else {
      throw new Error('Electron API not available for base64 reading');
    }
  }

  // Görselden metin çıkar (OCR)
  async extractTextFromImage(file) {
    try {
      console.log(`Görsel işleniyor: ${file.name}`);
      
      let base64Data;
      
      // Dosya türüne göre base64'e çevir
      if (typeof file === 'string') {
        // Electron - file path string
        base64Data = await this.readFileAsBase64(file);
      } else if (file instanceof File || file instanceof Blob) {
        // Web - File/Blob object
        base64Data = await this.fileToBase64(file);
      } else if (file.path && typeof file.path === 'string') {
        // Electron - file object with path
        base64Data = await this.readFileAsBase64(file.path);
      } else {
        throw new Error('Desteklenmeyen dosya formatı');
      }

      // MIME type belirle
      const extension = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
      const mimeType = this.getMimeType(extension);

      // Gemini'ye gönder
      const prompt = `
Bu görsel bir hukuki doküman içeriyor. Lütfen görseldeki tüm metni çıkar ve aşağıdaki kurallara göre formatla:

1. Tüm metni düz metin olarak çıkar
2. Paragrafları koru
3. Başlıkları ve alt başlıkları koru
4. Tabloları metin olarak düzenle
5. İmzaları ve tarihleri dahil et
6. Hukuki terimleri doğru yaz
7. Türkçe karakterleri koru
8. Numaralandırmaları koru

Sadece çıkarılan metni döndür, ek açıklama ekleme.
`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ]);

      const response = await result.response;
      const extractedText = response.text().trim();

      console.log(`Görsel işleme tamamlandı: ${file.name}`);
      console.log(`Çıkarılan metin uzunluğu: ${extractedText.length} karakter`);

      return extractedText;
    } catch (error) {
      console.error(`Görsel işleme hatası: ${file.name}`, error);
      throw new Error(`Görsel işlenemedi: ${error.message}`);
    }
  }

  // MIME type belirle
  getMimeType(extension) {
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'tiff': 'image/tiff',
      'tif': 'image/tiff',
      'webp': 'image/webp',
      'bmp': 'image/bmp'
    };
    return mimeTypes[extension] || 'image/jpeg';
  }

  // Görsel kalitesini kontrol et
  async checkImageQuality(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const quality = {
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          resolution: img.width * img.height,
          isGoodQuality: img.width >= 800 && img.height >= 600
        };
        resolve(quality);
      };
      img.onerror = () => {
        resolve({ error: 'Görsel yüklenemedi' });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // Birden fazla görseli işle
  async processMultipleImages(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const extractedText = await this.extractTextFromImage(file);
        results.push({
          fileName: file.name,
          success: true,
          text: extractedText,
          textLength: extractedText.length
        });
      } catch (error) {
        results.push({
          fileName: file.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Görsel önizleme oluştur
  async createThumbnail(file, maxWidth = 200, maxHeight = 200) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Boyutları hesapla
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Görseli çiz
        ctx.drawImage(img, 0, 0, width, height);
        
        // Base64'e çevir
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
      };
      
      img.onerror = () => {
        resolve(null);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  // Görsel metadata'sını çıkar
  async extractImageMetadata(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const metadata = {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          resolution: img.width * img.height,
          lastModified: file.lastModified ? new Date(file.lastModified) : null
        };
        resolve(metadata);
      };
      img.onerror = () => {
        resolve({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          error: 'Metadata çıkarılamadı'
        });
      };
      img.src = URL.createObjectURL(file);
    });
  }
}

export default new ImageProcessingService(); 