import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Download, Copy, Sparkles, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

function ChatInterface({ files, onFileUpload }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPetitionType, setSelectedPetitionType] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Petition types for Turkish legal system
  const petitionTypes = [
    'Boşanma Davası',
    'Tazminat Davası', 
    'İcra İtirazı',
    'İş Davası',
    'Kira Davası',
    'Miras Davası',
    'Ticari Dava',
    'Ceza Davası',
    'İdari Dava'
  ];

  // Quick prompts for legal questions
  const quickPrompts = [
    'Bu dosyalardaki davaların özetini çıkar',
    'Bir boşanma dilekçesi hazırla',
    'Bu belgelere göre tazminat miktarını hesapla',
    'Hukuki riskleri analiz et',
    'Benzer içtihatları bul'
  ];

  // Simulate Gemini AI response (in real app, this would call Google Gemini API)
  const simulateAIResponse = async (userMessage, fileContext) => {
    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    if (userMessage.toLowerCase().includes('dilekçe')) {
      return {
        type: 'petition',
        content: `# ${selectedPetitionType || 'HUKUKİ DİLEKÇE'}

**MAHKEME:** İstanbul 2. Asliye Hukuk Mahkemesi
**DAVACI:** [Müvekkil Adı]
**DAVALI:** [Karşı Taraf]
**DAVA KONUSU:** ${selectedPetitionType || 'Hukuki Talep'}

## MADDİ OLAYLAR

1. Taraflar arasında [tarih] tarihinde imzalanan sözleşme gereğince...
2. Ancak davalı taraf yükümlülüklerini yerine getirmemiştir...
3. Bu durum müvekkilimizin zarara uğramasına neden olmuştur...

## HUKUKİ DAYANAK

- Türk Borçlar Kanunu md. 112, 125
- Türk Medeni Kanunu md. 2
- İlgili Yargıtay kararları

## SONUÇ VE TALEP

Yukarıda açıklanan nedenlerle;
- [Talep konusu]
- Vekalet ücretinin karşı taraftan tahsili
- Yargılama giderlerinin karşı taraftan alınması

... talebimizi saygılarımızla arz ederiz.

**[Tarih ve İmza]**`,
        fileName: `${selectedPetitionType?.replace(/\s+/g, '_')}_Dilekcesi.md`
      };
    }

    if (userMessage.toLowerCase().includes('analiz') || userMessage.toLowerCase().includes('özet')) {
      return {
        type: 'analysis',
        content: `## Dosya Analizi Raporu

### Yüklenen Dosyalar
${files.map(file => `- **${file.name}** (${file.type.toUpperCase()})`).join('\n')}

### Hukuki Değerlendirme

**1. Dava Konusu**
Yüklenen belgeler incelendiğinde [dava konusu] ile ilgili bir hukuki uyuşmazlık tespit edilmiştir.

**2. Hukuki Dayanak**
- İlgili kanun maddeleri: [referanslar]
- Uygulanabilir Yargıtay kararları
- Mahkeme içtihatları

**3. Risk Analizi**
- **Güçlü yanlar:** [liste]
- **Zayıf yanlar:** [liste]
- **Öneriler:** [liste]

**4. Tahmini Süreç**
- Dava süresi: 12-18 ay
- Başarı oranı: %75-80
- Tahmini masraf: [miktar]

### Önerilen Adımlar
1. Ek belge toplama
2. Uzlaşma girişimi
3. Dava açma süreci

Bu analiz yüklenen ${files.length} dosya baz alınarak hazırlanmıştır.`
      };
    }

    // Default response
    return {
      type: 'response',
      content: `Anlıyorum. ${userMessage} konusunda size yardımcı olabilirim. 

${files.length > 0 ? `Yüklediğiniz ${files.length} dosyayı inceleyerek` : 'Dosya yükledikten sonra'} daha detaylı analiz yapabilirim.

Hukuki konularla ilgili sorularınızı sormaktan çekinmeyin. Size yardımcı olabileceğim konular:

- Dilekçe hazırlama
- Dava analizi  
- Hukuki risk değerlendirmesi
- İçtihat araştırması
- Sözleşme incelemesi

Hangi konuda yardım istiyorsunuz?`
    };
  };

  // Handle message send
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    const userMsg = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Get AI response
      const response = await simulateAIResponse(userMessage, files);
      
      // Add AI response
      const aiMsg = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.content,
        responseType: response.type,
        fileName: response.fileName,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      
    } catch (error) {
      console.error('AI Response Error:', error);
      const errorMsg = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick prompt
  const handleQuickPrompt = (prompt) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  // Handle petition type selection
  const handlePetitionRequest = (type) => {
    setSelectedPetitionType(type);
    setInputValue(`${type} için dilekçe hazırla`);
    inputRef.current?.focus();
  };

  // Copy message content
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  // Download content as file
  const downloadContent = (content, fileName) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'lawinai_document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Gemini AI Hukuki Asistanınız</h3>
            <p className="text-gray-400 mb-8">
              {files.length > 0 
                ? `${files.length} dosya yüklendi. Sorularınızı sorabilirsiniz.`
                : 'Dosya yükleyerek başlayın veya doğrudan soru sorun.'
              }
            </p>

            {/* Quick Actions */}
            {files.length === 0 ? (
              <div className="mb-8">
                <h4 className="text-lg font-medium text-white mb-4">Hızlı Başlangıç</h4>
                <button
                  onClick={onFileUpload}
                  className="btn-primary text-lg px-6 py-3"
                >
                  Dosya Yükle
                </button>
              </div>
            ) : (
              <div className="mb-8">
                <h4 className="text-lg font-medium text-white mb-4">Hızlı Komutlar</h4>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickPrompts.slice(0, 3).map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="btn-secondary px-4 py-2 text-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Petition Types */}
            <div>
              <h4 className="text-lg font-medium text-white mb-4">Dilekçe Hazırla</h4>
              <div className="grid grid-cols-3 gap-2 max-w-2xl mx-auto">
                {petitionTypes.slice(0, 6).map((type, index) => (
                  <button
                    key={index}
                    onClick={() => handlePetitionRequest(type)}
                    className="btn-secondary px-3 py-2 text-sm"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'flex space-x-4',
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type !== 'user' && (
                <div className="flex-shrink-0">
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    message.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
                  )}>
                    {message.type === 'error' ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>
              )}

              <div className={clsx(
                'max-w-4xl',
                message.type === 'user' ? 'ml-auto' : 'mr-auto'
              )}>
                <div className={clsx(
                  'chat-message',
                  message.type === 'user' && 'user',
                  message.type === 'assistant' && 'assistant',
                  message.type === 'error' && 'bg-red-900 text-red-100'
                )}>
                  <div className="whitespace-pre-wrap legal-document">
                    {message.content}
                  </div>

                  {/* Action buttons for AI responses */}
                  {message.type === 'assistant' && (
                    <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-600">
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Kopyala</span>
                      </button>
                      
                      {(message.responseType === 'petition' || message.responseType === 'analysis') && (
                        <button
                          onClick={() => downloadContent(message.content, message.fileName)}
                          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span>İndir</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-2">
                  {message.timestamp.toLocaleTimeString('tr-TR')}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="chat-message assistant">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-gray-300">AI düşünüyor...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-6">
        <div className="flex space-x-4">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Hukuki sorunuzu yazın... (Enter ile gönder, Shift+Enter ile yeni satır)"
              className="input-primary w-full resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="btn-primary px-6 py-2 self-end disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Quick prompts */}
        {messages.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatInterface; 