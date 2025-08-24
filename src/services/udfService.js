// UDF (UYAP Doküman Formatı) servisi
import JSZip from 'jszip';

class UDFService {
  constructor() {
    this.defaultProperties = {
      mediaSizeName: "1", // A4
      leftMargin: "70.875",
      rightMargin: "70.875", 
      topMargin: "70.875",
      bottomMargin: "70.875",
      paperOrientation: "1", // Portrait
      headerFOffset: "20.0",
      footerFOffset: "20.0"
    };

    this.defaultStyles = {
      default: {
        name: "default",
        description: "Geçerli",
        family: "Lucida Grande",
        size: "13",
        bold: "false",
        italic: "false"
      },
      "hvl-default": {
        name: "hvl-default",
        family: "Times New Roman", 
        size: "12",
        description: "Gövde"
      }
    };
  }

  // UDF dosyasını oku
  async readUDF(file) {
    try {
      const zip = new JSZip();
      let zipContent;

      // Electron vs Web file handling
      if (typeof file === 'string') {
        // Electron - file path string
        if (window.electronAPI && window.electronAPI.readFile) {
          const buffer = await window.electronAPI.readFile(file);
          zipContent = await zip.loadAsync(buffer);
        } else {
          throw new Error('Electron API not available for file reading');
        }
      } else if (file instanceof File || file instanceof Blob) {
        // Web - File/Blob object
        zipContent = await zip.loadAsync(file);
      } else if (file.path && typeof file.path === 'string') {
        // Electron - file object with path
        if (window.electronAPI && window.electronAPI.readFile) {
          const buffer = await window.electronAPI.readFile(file.path);
          zipContent = await zip.loadAsync(buffer);
        } else {
          throw new Error('Electron API not available for file reading');
        }
      } else {
        // Fallback - try direct loading
        zipContent = await zip.loadAsync(file);
      }
      
      // content.xml dosyasını oku
      const contentXml = await zipContent.file("content.xml").async("string");
      
      // XML'i parse et
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(contentXml, "text/xml");
      
      // Content CDATA'sını çıkart
      const contentNode = xmlDoc.querySelector('content');
      const content = contentNode ? contentNode.textContent : '';
      
      // Properties'i çıkart
      const propertiesNode = xmlDoc.querySelector('properties');
      const properties = this.parseProperties(propertiesNode);
      
      // Elements'i çıkart (rich formatting için)
      const elementsNode = xmlDoc.querySelector('elements');
      const elements = this.parseElements(elementsNode);
      
      // Styles'i çıkart
      const stylesNode = xmlDoc.querySelector('styles');
      const styles = this.parseStyles(stylesNode);

      return {
        content: content.trim(),
        properties,
        elements,
        styles,
        formatId: xmlDoc.querySelector('template')?.getAttribute('format_id') || '1.8'
      };
    } catch (error) {
      console.error('UDF okuma hatası:', error);
      console.error('File type:', typeof file);
      console.error('File details:', file);
      throw new Error('UDF dosyası okunamadı: ' + error.message);
    }
  }

  // UDF dosyası oluştur
  async createUDF(content, title = "Hukuki Metin", properties = {}) {
    try {
      const zip = new JSZip();
      
      // Properties'i birleştir
      const finalProperties = { ...this.defaultProperties, ...properties };
      
      // XML içeriği oluştur
      const xmlContent = this.generateXML(content, title, finalProperties);
      
      // content.xml'i zip'e ekle
      zip.file("content.xml", xmlContent);
      
      // Basit dijital imza dosyası oluştur (boş)
      const signContent = this.generateSignature();
      zip.file("sign.sgn", signContent);
      
      // ZIP dosyasını oluştur
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });
      
      return zipBlob;
    } catch (error) {
      console.error('UDF oluşturma hatası:', error);
      throw new Error('UDF dosyası oluşturulamadı: ' + error.message);
    }
  }

  // XML içeriği oluştur
  generateXML(content, title, properties) {
    const escapedContent = this.escapeXMLContent(content);
    const elementsXML = this.generateElements(content);
    const stylesXML = this.generateStyles();
    const propertiesXML = this.generatePropertiesXML(properties);

    return `<?xml version="1.0" encoding="UTF-8" ?> 

<template format_id="1.8" >
<content><![CDATA[${escapedContent}]]></content>
${propertiesXML}
<elements resolver="hvl-default" >
${elementsXML}
</elements>
${stylesXML}
</template>`;
  }

  // Properties XML'i oluştur
  generatePropertiesXML(properties) {
    return `<properties><pageFormat mediaSizeName="${properties.mediaSizeName}" leftMargin="${properties.leftMargin}" rightMargin="${properties.rightMargin}" topMargin="${properties.topMargin}" bottomMargin="${properties.bottomMargin}" paperOrientation="${properties.paperOrientation}" headerFOffset="${properties.headerFOffset}" footerFOffset="${properties.footerFOffset}" /></properties>`;
  }

  // Elements XML'i oluştur (basit paragraf yapısı)
  generateElements(content) {
    const paragraphs = content.split('\n').filter(p => p.trim());
    let offset = 0;
    let elementsXML = '';

    paragraphs.forEach((paragraph, index) => {
      const length = paragraph.length;
      elementsXML += `<paragraph Alignment="3" LeftIndent="0.0"><content family="Times New Roman" size="11" description="Gövde" startOffset="${offset}" length="${length}" /></paragraph>`;
      offset += length + 1; // +1 for newline
    });

    return elementsXML;
  }

  // Styles XML'i oluştur
  generateStyles() {
    return `<styles><style name="default" description="Geçerli" family="Lucida Grande" size="13" bold="false" italic="false" /><style name="hvl-default" family="Times New Roman" size="12" description="Gövde" /></styles>`;
  }

  // Basit dijital imza oluştur
  generateSignature() {
    const timestamp = new Date().toISOString();
    return `UDF Digital Signature - Generated: ${timestamp}`;
  }

  // HTML'i temiz metne çevir ve XML için escape et
  escapeXMLContent(content) {
    // Önce HTML tag'lerini temizle
    let cleanContent = content;
    
    // HTML tag'lerini kaldır
    cleanContent = cleanContent.replace(/<[^>]*>/g, '');
    
    // HTML entity'lerini decode et
    cleanContent = cleanContent
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&'); // Bu en son olmalı
    
    // Satır sonlarını koru, sadece gereksiz boşlukları temizle
    cleanContent = cleanContent
      .replace(/[ \t]+/g, ' ') // Sadece boşluk ve tab'ları tek boşluğa çevir
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 3+ satır sonunu 2 satır sonuna çevir
      .replace(/^\s+|\s+$/gm, '') // Her satırın başındaki ve sonundaki boşlukları kaldır
      .trim();
    
    // XML için escape et (sadece gerekli olanları)
    return cleanContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Properties parse et
  parseProperties(propertiesNode) {
    if (!propertiesNode) return this.defaultProperties;
    
    const pageFormat = propertiesNode.querySelector('pageFormat');
    if (!pageFormat) return this.defaultProperties;

    return {
      mediaSizeName: pageFormat.getAttribute('mediaSizeName') || "1",
      leftMargin: pageFormat.getAttribute('leftMargin') || "70.875",
      rightMargin: pageFormat.getAttribute('rightMargin') || "70.875",
      topMargin: pageFormat.getAttribute('topMargin') || "70.875", 
      bottomMargin: pageFormat.getAttribute('bottomMargin') || "70.875",
      paperOrientation: pageFormat.getAttribute('paperOrientation') || "1",
      headerFOffset: pageFormat.getAttribute('headerFOffset') || "20.0",
      footerFOffset: pageFormat.getAttribute('footerFOffset') || "20.0"
    };
  }

  // Elements parse et
  parseElements(elementsNode) {
    if (!elementsNode) return [];
    
    const paragraphs = elementsNode.querySelectorAll('paragraph');
    const elements = [];

    paragraphs.forEach(paragraph => {
      const contents = paragraph.querySelectorAll('content');
      contents.forEach(content => {
        elements.push({
          family: content.getAttribute('family') || 'Times New Roman',
          size: content.getAttribute('size') || '12',
          bold: content.getAttribute('bold') === 'true',
          italic: content.getAttribute('italic') === 'true',
          underline: content.getAttribute('underline') === 'true',
          startOffset: parseInt(content.getAttribute('startOffset')) || 0,
          length: parseInt(content.getAttribute('length')) || 0
        });
      });
    });

    return elements;
  }

  // Styles parse et
  parseStyles(stylesNode) {
    if (!stylesNode) return this.defaultStyles;
    
    const styles = {};
    const styleNodes = stylesNode.querySelectorAll('style');
    
    styleNodes.forEach(style => {
      const name = style.getAttribute('name');
      if (name) {
        styles[name] = {
          name,
          description: style.getAttribute('description') || '',
          family: style.getAttribute('family') || 'Times New Roman',
          size: style.getAttribute('size') || '12',
          bold: style.getAttribute('bold') || 'false',
          italic: style.getAttribute('italic') || 'false'
        };
      }
    });

    return styles;
  }

  // Dosya indirme helper
  downloadUDF(blob, filename = 'dokuman.udf') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // UDF dosyası doğrula
  async validateUDF(file) {
    try {
      const zip = new JSZip();
      let zipContent;

      // Electron vs Web file handling (same logic as readUDF)
      if (typeof file === 'string') {
        // Electron - file path string
        if (window.electronAPI && window.electronAPI.readFile) {
          const buffer = await window.electronAPI.readFile(file);
          zipContent = await zip.loadAsync(buffer);
        } else {
          throw new Error('Electron API not available for file reading');
        }
      } else if (file instanceof File || file instanceof Blob) {
        // Web - File/Blob object
        zipContent = await zip.loadAsync(file);
      } else if (file.path && typeof file.path === 'string') {
        // Electron - file object with path
        if (window.electronAPI && window.electronAPI.readFile) {
          const buffer = await window.electronAPI.readFile(file.path);
          zipContent = await zip.loadAsync(buffer);
        } else {
          throw new Error('Electron API not available for file reading');
        }
      } else {
        // Fallback - try direct loading
        zipContent = await zip.loadAsync(file);
      }
      
      // Gerekli dosyaları kontrol et
      const hasContentXml = zipContent.file("content.xml") !== null;
      const hasSignature = zipContent.file("sign.sgn") !== null;
      
      if (!hasContentXml) {
        throw new Error('content.xml dosyası bulunamadı');
      }

      // XML'i parse etmeye çalış
      const contentXml = await zipContent.file("content.xml").async("string");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(contentXml, "text/xml");
      
      // Parse hatalarını kontrol et
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML parse hatası: ' + parseError.textContent);
      }

      // Template node'unu kontrol et
      const template = xmlDoc.querySelector('template');
      if (!template) {
        throw new Error('Template node bulunamadı');
      }

      return {
        valid: true,
        hasSignature,
        formatId: template.getAttribute('format_id') || 'Bilinmiyor'
      };
    } catch (error) {
      console.error('UDF validation error:', error);
      console.error('File type in validation:', typeof file);
      console.error('File details in validation:', file);
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

export default new UDFService(); 