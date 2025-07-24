import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  FileText, 
  Lightbulb, 
  BookOpen,
  Trash2,
  MoreVertical,
  Copy,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const QUICK_PROMPTS = [
  {
    title: "Dilekçe Taslağı",
    prompt: "Bu dava için standart dilekçe taslağı hazırla",
    icon: FileText,
    category: "template"
  },
  {
    title: "Hukuki Analiz",
    prompt: "Bu konudaki hukuki durumu analiz et",
    icon: BookOpen,
    category: "analysis"
  },
  {
    title: "İyileştir",
    prompt: "Bu metni daha profesyonel hale getir",
    icon: Lightbulb,
    category: "improve"
  },
  {
    title: "Özet Çıkar",
    prompt: "Bu belgelerin özetini çıkar",
    icon: FileText,
    category: "summary"
  }
];

function AIChatPanel({ 
  messages = [], 
  onSendMessage, 
  onClearChat,
  isTyping = false,
  documentContext = null,
  apiKey = null,
  onOpenSettings
}) {
  const [inputValue, setInputValue] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const scrollAreaRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Yeni mesaj geldiğinde scroll down
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    onSendMessage(inputValue, documentContext);
    setInputValue('');
    setSelectedPrompt(null);
  };

  const handleQuickPrompt = (prompt) => {
    setInputValue(prompt.prompt);
    setSelectedPrompt(prompt);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  const rateMessage = (messageId, rating) => {
    console.log(`Message ${messageId} rated: ${rating}`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">AI Asistan</span>
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onClearChat}
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* API Key Warning */}
      {!apiKey && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                  AI Asistan Hazır Değil
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  AI asistanı kullanmak için OpenAI API anahtarı gerekli.
                </p>
                <button
                  onClick={onOpenSettings}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  API Anahtarı Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Prompts */}
      {messages.length === 0 && apiKey && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Hızlı Başlangıç
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {QUICK_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleQuickPrompt(prompt)}
                className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={!apiKey}
              >
                <div className="flex items-start space-x-2">
                  <prompt.icon className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {prompt.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {prompt.prompt}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                {/* Message Bubble */}
                <div
                  className={`p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                  
                  {message.suggestions && (
                    <div className="mt-3 space-y-1">
                      <div className="text-xs opacity-75">Öneriler:</div>
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInputValue(suggestion)}
                          className="block w-full text-left text-xs p-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Actions */}
                {message.role === 'assistant' && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {new Date(message.timestamp).toLocaleTimeString('tr-TR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.content)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rateMessage(message.id, 'up')}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-green-600"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rateMessage(message.id, 'down')}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    AI yazıyor...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        {selectedPrompt && (
          <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center space-x-2">
              <selectedPrompt.icon className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {selectedPrompt.title}
              </span>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={apiKey ? "AI asistanına sorunuzu yazın..." : "AI kullanmak için API anahtarı gerekli"}
            disabled={!apiKey}
            className="flex-1 min-h-[40px] max-h-32 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping || !apiKey}
            className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {documentContext && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            📄 Aktif belge: {documentContext.title || 'Başlıksız dilekçe'}
          </div>
        )}
      </div>
    </div>
  );
}

export default AIChatPanel; 