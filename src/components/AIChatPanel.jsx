import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Copy, Check, X, RefreshCw, Edit2, Sparkles, Trash2, ChevronUp, ChevronDown, RotateCcw,
  FileText, Image, FileIcon, AtSign, Search, Plus, Clock, BadgeCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import geminiService from '../services/geminiService';
import { useDispatch, useSelector } from 'react-redux';
import { selectMode, selectContextPercentage } from '@/renderer/redux/store';
import ModeSelect from '@/components/ModeSelect/ModeSelect';



function AIChatPanel({ 
  messages = [], 
  onSendMessage,
  onClearChat,
  isAITyping = false,
  isStreaming = false,
  streamingContent = '',
  onAcceptTextSuggestion,
  onRestoreCheckpoint,
  onExitEditMode,
  onSendEditedMessage,
  editMode,
  uploadedFiles = [], // Yüklenen dosyalar listesi
  openTabs = [], // Açık sekmeler listesi
  chatTitle = '', // Sohbet başlığı
  onChatTitleChange = () => {}, // Sohbet başlığı değişiklik handler'ı
  chatHistory = [], // Geçmiş sohbetler
  onLoadChatFromHistory = () => {}, // Geçmiş sohbet yükleme handler'ı
  progressStatus = '', // Ephemeral durum mesajı
  thoughtSummary = '' // Düşünce özeti (isteğe bağlı, soluk)
}) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSuggestions, setExpandedSuggestions] = useState(new Set());
  const [processedSuggestions, setProcessedSuggestions] = useState(new Set());
  const [selectedAttachments, setSelectedAttachments] = useState([]); // Seçilen dosyalar
  const [showFileSearch, setShowFileSearch] = useState(false); // @ ile dosya arama menüsü
  const [fileSearchQuery, setFileSearchQuery] = useState(''); // Dosya arama sorgusu
  const [fileSearchIndex, setFileSearchIndex] = useState(-1); // Dosya arama indeksi
  const [cursorPosition, setCursorPosition] = useState(0); // Cursor pozisyonu
  const [showTabSearch, setShowTabSearch] = useState(false); // / ile sekme arama menüsü
  const [tabSearchQuery, setTabSearchQuery] = useState(''); // Sekme arama sorgusu
  const [tabSearchIndex, setTabSearchIndex] = useState(-1); // Sekme arama indeksi
  const [textareaRows, setTextareaRows] = useState(2); // Textarea satır sayısı
  const [appliedRules, setAppliedRules] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false); // Geçmiş sohbet dropdown'ı
  const scrollAreaRef = useRef(null);
  const inputRef = useRef(null);
  const fileSearchRef = useRef(null);
  const chatHistoryRef = useRef(null);

  // Mode from global store
  const dispatch = useDispatch();
  const mode = useSelector(selectMode);
  const contextPercentage = useSelector(selectContextPercentage);

  // Mode dependent placeholder
  const getPlaceholderByMode = () => {
    if (editMode) return 'Mesajınızı düzenleyin...';
    switch (mode) {
      case 'yazdir':
        return '';
      case 'ozetle':
        return '';
      case 'sor':
      default:
        return '';
    }
  };

  // ModeSelect bileşeni dinler (Cmd/Ctrl + .). Burada ekstra dinleyici eklemiyoruz.

  // Auto-scroll to bottom when new messages or streaming content appears
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, streamingContent, isStreaming]);

  // Focus input on mount and when edit mode changes
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatHistoryRef.current && !chatHistoryRef.current.contains(event.target)) {
        setShowChatHistory(false);
      }
    };

    if (showChatHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showChatHistory]);

  // Sync applied rules from service
  useEffect(() => {
    setAppliedRules(geminiService.appliedRules || []);
  }, [messages, isStreaming]);

  // Update input value when entering edit mode
  useEffect(() => {
    if (editMode) {
      setInputValue(editMode.originalMessage);
      inputRef.current?.focus();
    }
  }, [editMode]);

  // Textarea otomatik genişleme ve küçülme fonksiyonu
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      const textarea = inputRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const lineHeight = 20; // Yaklaşık satır yüksekliği
      const maxRows = 15;
      const minRows = 2;
      const maxHeight = lineHeight * maxRows;
      
      // Eğer textarea tamamen boşsa, varsayılan boyuta dön
      if (!textarea.value || textarea.value.trim() === '') {
        setTextareaRows(minRows);
        textarea.style.height = `${lineHeight * minRows}px`;
        return;
      }
      
      const newHeight = Math.min(scrollHeight, maxHeight);
      const newRows = Math.max(minRows, Math.min(maxRows, Math.ceil(newHeight / lineHeight)));
      setTextareaRows(newRows);
      textarea.style.height = `${newHeight}px`;
    }
  };

  // @ ile dosya arama işlemi ve textarea dinamik yükseklik
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInputValue(value);
    setCursorPosition(cursorPos);

    // Textarea yüksekliğini ayarla (her değişiklikte)
    setTimeout(adjustTextareaHeight, 0);

    // @ işareti kontrolü
    const beforeCursor = value.substring(0, cursorPos);
    const atMatch = beforeCursor.match(/@([^@\s]*)$/);
    const slashMatch = beforeCursor.match(/\/([^\/\s]*)$/);
    
    if (atMatch) {
      setShowFileSearch(true);
      setShowTabSearch(false);
      setFileSearchQuery(atMatch[1]);
      setFileSearchIndex(-1);
    } else if (slashMatch) {
      setShowFileSearch(false);
      setShowTabSearch(true);
      setTabSearchQuery(slashMatch[1]);
      setTabSearchIndex(-1);
    } else {
      setShowFileSearch(false);
      setShowTabSearch(false);
      setFileSearchQuery('');
      setTabSearchQuery('');
    }
  };

  // Dosya arama sonuçlarını filtrele - Akıllı filtreleme
  const getFilteredFiles = () => {
    const supportedFiles = uploadedFiles.filter(file => 
      geminiService.isSupportedFileType(file.type) || file.type?.toLowerCase() === 'udf'
    );
    
    if (!fileSearchQuery.trim()) {
      // Sorgu yoksa ilk 5 dosyayı göster
      return supportedFiles.slice(0, 5);
    } else {
      // Sorgu varsa filtrele
      return supportedFiles.filter(file => 
        file.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
      );
    }
  };

  const filteredFiles = getFilteredFiles();

  // Dosya seçme işlemi
  const selectFile = (file) => {
    // @ işaretinden önceki kısmı al
    const beforeAt = inputValue.substring(0, cursorPosition).replace(/@[^@\s]*$/, '');
    const afterCursor = inputValue.substring(cursorPosition);
    
    // Dosya referansını ekle
    const fileReference = `@${file.name}`;
    const newInputValue = beforeAt + fileReference + ' ' + afterCursor;
    
    setInputValue(newInputValue);
    setShowFileSearch(false);
    setFileSearchQuery('');
    
    // Dosyayı seçilen dosyalara ekle (eğer yoksa)
    if (!selectedAttachments.find(f => f.id === file.id)) {
      setSelectedAttachments(prev => [...prev, file]);
    }
    
    // Input'a focus ol ve cursor'ı dosya referansından sonraya taşı
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeAt.length + fileReference.length + 1;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
        adjustTextareaHeight();
      }
    }, 0);
  };

  // Sekme seçme işlemi
  const selectTab = (tab) => {
    // / işaretinden önceki kısmı al
    const beforeSlash = inputValue.substring(0, cursorPosition).replace(/\/[^\/\s]*$/, '');
    const afterCursor = inputValue.substring(cursorPosition);
    
    // Sekme referansını ekle
    const tabReference = `/${tab.title}`;
    const newInputValue = beforeSlash + tabReference + ' ' + afterCursor;
    
    setInputValue(newInputValue);
    setShowTabSearch(false);
    setTabSearchQuery('');
    
    // Input'a focus ol ve cursor'ı sekme referansından sonraya taşı
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeSlash.length + tabReference.length + 1;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
        adjustTextareaHeight();
      }
    }, 0);
  };

  // Klavye navigasyonu için dosya arama
  const handleKeyDown = (e) => {
    if (showFileSearch && filteredFiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFileSearchIndex(prev => 
          prev < filteredFiles.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFileSearchIndex(prev => 
          prev > 0 ? prev - 1 : filteredFiles.length - 1
        );
      } else if (e.key === 'Enter' && fileSearchIndex >= 0) {
        e.preventDefault();
        selectFile(filteredFiles[fileSearchIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowFileSearch(false);
        setFileSearchQuery('');
        setFileSearchIndex(-1);
      }
    } else if (showTabSearch && openTabs && openTabs.length > 0) {
      const documentTabs = openTabs.filter(tab => tab.type === 'document');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setTabSearchIndex(prev => 
          prev < documentTabs.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setTabSearchIndex(prev => 
          prev > 0 ? prev - 1 : documentTabs.length - 1
        );
      } else if (e.key === 'Enter' && tabSearchIndex >= 0) {
        e.preventDefault();
        selectTab(documentTabs[tabSearchIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowTabSearch(false);
        setTabSearchQuery('');
        setTabSearchIndex(-1);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);
    setIsLoading(true);
    setShowFileSearch(false);
    setShowTabSearch(false);
    setFileSearchQuery('');
    setTabSearchQuery('');
    setFileSearchIndex(-1);
    setTabSearchIndex(-1);
    setTextareaRows(2); // Textarea'yı sıfırla

    try {
      // Check if in edit mode
      if (editMode && onSendEditedMessage) {
        await onSendEditedMessage(userMessage, selectedAttachments);
      } else {
        // Normal mesaj gönderimi
        await onSendMessage(userMessage, selectedAttachments);
      }
      
      // Clear attachments after sending
      setSelectedAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    // Could add a toast notification here
  };

  // Dosya ikonu belirle
  const getFileIcon = (fileType) => {
    const type = fileType?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif'].includes(type)) {
      return <Image className="w-4 h-4" />;
    } else if (type === 'pdf') {
      return <FileText className="w-4 h-4" />;
    } else if (type === 'udf') {
      return <FileText className="w-4 h-4" />;
    } else {
      return <FileIcon className="w-4 h-4" />;
    }
  };

  // Dosya boyutunu formatla
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Mesaj içeriğini render et (dosya referanslarını mavi yap)
  const renderMessageContent = (content) => {
    if (!content) return content;
    
    // @ ile başlayan dosya referanslarını bul ve mavi yap
    const parts = content.split(/(@[^\s]+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const fileName = part.substring(1);
        const file = uploadedFiles.find(f => f.name === fileName);
        
        if (file) {
          return (
            <span key={index} className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
              {getFileIcon(file.type)}
              <span>{fileName}</span>
            </span>
          );
        }
      }
      return part;
    });
  };

  // Toggle expanded state for suggestion
  const toggleSuggestionExpanded = (messageId) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedSuggestions(newExpanded);
  };

  // Parse AI response for text suggestions
  const parseTextSuggestion = (content) => {
    console.log('Parsing text suggestion from content:', content.substring(0, 200) + '...');
    
    // Look for document suggestions in AI response
    const suggestionMatch = content.match(/```dilekce\n([\s\S]*?)\n```/);
    if (suggestionMatch) {
      console.log('Found suggestion match:', suggestionMatch[1].substring(0, 100) + '...');
      return {
        hasTextSuggestion: true,
        suggestionText: suggestionMatch[1].trim(),
        explanationText: content.replace(/```dilekce\n[\s\S]*?\n```/, '').trim()
      };
    }
    console.log('No suggestion match found');
    return { hasTextSuggestion: false, suggestionText: '', explanationText: content };
  };

  // Handle accepting text suggestion
  const handleAcceptSuggestion = (suggestion, messageId) => {
    console.log('Accepting suggestion:', suggestion);
    if (onAcceptTextSuggestion && suggestion.suggestionText) {
      onAcceptTextSuggestion(suggestion.suggestionText, 'replace');
    }
    
    // Mark this suggestion as processed
    setProcessedSuggestions(prev => new Set([...prev, messageId]));
  };

  // Handle declining text suggestion
  const handleDeclineSuggestion = (messageId) => {
    // Mark this suggestion as processed
    setProcessedSuggestions(prev => new Set([...prev, messageId]));
  };

  // Render streaming message with typewriter effect
  const renderStreamingMessage = () => {
    if (!isStreaming) return null;

    return (
      <div className="mb-4">
        {/* AI Header */}
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">LawInAI</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse mr-1"></div>
              Yazıyor...
            </span>
          </div>
        </div>
        
        {/* Ephemeral progress & optional thoughts */}
        {(progressStatus || thoughtSummary) && (
          <div className="mb-1 space-y-0.5">
            {progressStatus && (
              <div className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                {progressStatus}
              </div>
            )}
            {thoughtSummary && (
              <div className="text-[10px] text-gray-500 dark:text-gray-400 italic line-clamp-2">
                {thoughtSummary}
              </div>
            )}
          </div>
        )}

        {/* Streaming Content */}
        {Boolean(streamingContent) && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {renderMessageContent(streamingContent)}
              <span className="inline-block w-2 h-4 bg-purple-600 animate-pulse ml-1 align-text-bottom">|</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Enhanced render message with suggestion handling
  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const parsed = isUser ? null : parseTextSuggestion(message.content);
    const isExpanded = expandedSuggestions.has(message.id);
    const isProcessed = processedSuggestions.has(message.id);

    return (
      <div key={message.id} className="w-full mb-3">
        {/* Message Header */}
        <div className="flex items-center mb-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {isUser ? 'Sen' : 'LawInAI'}
          </span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 ml-3"></div>
          
          {/* Restore Checkpoint Button - only for user messages */}
          {index > 0 && isUser && (
            <button
              onClick={() => onRestoreCheckpoint && onRestoreCheckpoint(index)}
              className="ml-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Bu noktaya geri dön"
            >
              <RotateCcw className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>

        {/* Message Content */}
        <div className="w-full">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="whitespace-pre-wrap text-xs text-gray-900 dark:text-gray-100">
              {!isUser && parsed?.hasTextSuggestion ? (
                <div className="space-y-2">
                  {/* Explanation Text */}
                  {parsed.explanationText && (
                    <div className="text-gray-700 dark:text-gray-300">
                      {renderMessageContent(parsed.explanationText)}
                    </div>
                  )}
                  
                  {/* Document Suggestion - Improved */}
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                    {/* Suggestion Text Display */}
                    <div className="bg-white dark:bg-gray-800 rounded p-2 mb-2">
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {(() => {
                          const lines = parsed.suggestionText.split('\n');
                          if (!isExpanded && lines.length > 5) {
                            return lines.slice(0, 5).join('\n') + '\n...';
                          }
                          return parsed.suggestionText;
                        })()}
                      </pre>
                      
                      {/* Show More/Less Button */}
                      {parsed.suggestionText.split('\n').length > 5 && (
                        <button
                          onClick={() => toggleSuggestionExpanded(message.id)}
                          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3 mr-1" />
                              Daralt
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3 mr-1" />
                              Devamını Oku ({parsed.suggestionText.split('\n').length - 5} satır daha)
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Action Buttons - Show only if not processed */}
                    {!isProcessed && (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDeclineSuggestion(message.id)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Reddet"
                        >
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </button>
                        <button
                          onClick={() => handleAcceptSuggestion(parsed, message.id)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Kabul Et"
                        >
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        </button>
                      </div>
                    )}

                    {/* Status indicator for processed suggestions */}
                    {isProcessed && (
                      <div className="flex items-center justify-end">
                        <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                          İşleme alındı
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {renderMessageContent(message.content)}
                  
                  {/* Show attachments for user messages */}
                  {isUser && message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Eklenen dosyalar:</div>
                      <div className="flex flex-wrap gap-1">
                        {message.attachments.map((file, fileIndex) => (
                          <div
                            key={fileIndex}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded text-xs"
                          >
                            {getFileIcon(file.type)}
                            <span className="text-blue-700 dark:text-blue-300">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Message Actions */}
            {!isUser && !message.isError && (
              <div className="flex items-center justify-start mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyMessage(message.content)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center"
                  >
                    <Copy className="w-2 h-2 mr-1" />
                    Kopyala
                  </button>
                </div>
              </div>
            )}

            {/* Persistent thinking steps (if any) */}
            {!isUser && Array.isArray(message.thinkingSteps) && message.thinkingSteps.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-0.5">
                  {message.thinkingSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full mt-1 mr-2"></span>
                      <span className="italic">
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">LawInAI</span>
            <Badge variant="secondary" className="text-xs">Pro</Badge>
          </div>
          
          {/* Chat Title - Second line */}
          {chatTitle && (
            <div className="mt-0.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-48" title={chatTitle}>
                {chatTitle}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Edit Mode Indicator */}
          {editMode && (
            <div className="flex items-center space-x-2 mr-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                Düzenleme Modu
              </span>
            </div>
          )}

          {/* New Chat Button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onClearChat && onClearChat()}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Yeni Sohbet"
          >
            <Plus className="w-4 h-4" />
          </Button>

          {/* Chat History Button */}
          <div className="relative" ref={chatHistoryRef}>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Sohbet Geçmişi"
            >
              <Clock className="w-4 h-4" />
            </Button>

            {/* Chat History Dropdown */}
            {showChatHistory && chatHistory.length > 0 && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
                    Geçmiş Sohbetler
                  </div>
                  {chatHistory.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        onLoadChatFromHistory(chat);
                        setShowChatHistory(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex flex-col"
                    >
                      <div className="font-medium truncate">{chat.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(chat.timestamp).toLocaleDateString('tr-TR')} - {chat.messages.length} mesaj
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>


          
          {/* Exit Edit Mode Button */}
          {editMode && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onExitEditMode}
              className="h-8 px-2 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
            >
              <X className="w-3 h-3 mr-1" />
              <span className="text-xs">İptal</span>
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClearChat}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Sohbeti Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          {/* Applied Rules Badge */}
          {Array.isArray(appliedRules) && appliedRules.length > 0 && (
            <button
              onClick={() => setShowRules(!showRules)}
              className="h-8 px-2 text-xs rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              title="Uygulanan Kurallar"
            >
              <BadgeCheck className="w-3 h-3 mr-1 text-green-600" />
              Uygulanan Kurallar ({appliedRules.length})
            </button>
          )}
        </div>
      </div>

      {/* Input Area - Show at top only if no messages */}
      {messages.length === 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {/* Özetle modunda context yüzdesi ve dosya sayısı göstergesi */}
          {mode === 'ozetle' && (
            <div className="mb-2 text-[10px] text-gray-600 dark:text-gray-400">
              {selectedAttachments.length > 0 && (
                <span className="mr-3">Seçili dosya: {selectedAttachments.length}</span>
              )}
              {typeof contextPercentage === 'number' && (
                <span>Bağlam kullanımı: %{Math.round(contextPercentage)}</span>
              )}
            </div>
          )}
          {/* Selected Attachments */}
          {selectedAttachments.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Eklenen dosyalar:</div>
              <div className="flex flex-wrap gap-2">
                {selectedAttachments.map((file) => (
                  <div
                    key={file.id}
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg"
                  >
                    {getFileIcon(file.type)}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-blue-900 dark:text-blue-100">{file.name}</span>
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        {file.type?.toUpperCase()} • {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedAttachments(prev => prev.filter(f => f.id !== file.id))}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={getPlaceholderByMode()}
                className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={textareaRows}
                style={{ minHeight: '40px', maxHeight: '300px' }}
              />
              
              {/* File Search Dropdown - Sadeleştirilmiş */}
              {showFileSearch && (
                <div 
                  ref={fileSearchRef}
                  className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                >
                  <div className="p-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <AtSign className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Dosya Ara ({filteredFiles.length} sonuç)
                      </span>
                    </div>
                    
                    {filteredFiles.length === 0 ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                        {fileSearchQuery ? `"${fileSearchQuery}" için sonuç bulunamadı` : 'Dosya bulunamadı'}
                      </div>
                    ) : (
                      filteredFiles.map((file, index) => (
                        <button
                          key={file.id}
                          onClick={() => selectFile(file)}
                          className={`w-full flex items-center space-x-2 px-2 py-2 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            index === fileSearchIndex ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                              {file.name}
                            </div>
                          </div>
                          {index === fileSearchIndex && <Check className="w-3 h-3 text-blue-600" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab Search Dropdown */}
              {showTabSearch && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  <div className="p-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Sekme Ara ({openTabs.filter(tab => tab.type === 'document').length} sekme)
                      </span>
                    </div>
                    {openTabs.filter(tab => tab.type === 'document').length === 0 ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                        Açık sekme bulunamadı
                      </div>
                    ) : (
                      openTabs
                        .filter(tab => tab.type === 'document')
                        .filter(tab =>
                          !tabSearchQuery ||
                          tab.title.toLowerCase().includes(tabSearchQuery.toLowerCase())
                        )
                        .map((tab, index) => (
                          <button
                            key={tab.id}
                            onClick={() => selectTab(tab)}
                            className={`w-full flex items-center space-x-2 px-2 py-2 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              index === tabSearchIndex ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : ''
                            }`}
                          >
                            <FileText className="w-4 h-4 text-gray-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                {tab.title}
                              </div>
                            </div>
                            {index === tabSearchIndex && <Check className="w-3 h-3 text-green-600" />}
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Mode Select - Input alanının altında */}
          <div className="mt-3 flex items-center justify-center">
            <ModeSelect />
          </div>
        </div>
      )}

      {/* Messages Display */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => renderMessage(message, index))}

          {/* Applied Rules tooltip/panel */}
          {showRules && Array.isArray(appliedRules) && appliedRules.length > 0 && (
            <div className="p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs">
              <div className="font-medium mb-1">Uygulanan Kurallar</div>
              <ul className="list-disc list-inside space-y-0.5">
                {appliedRules.map((r, i) => (
                  <li key={i}>{r.name}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Streaming Message */}
          {renderStreamingMessage()}
          
          {/* Loading Indicator - only show if typing but not streaming */}
          {isAITyping && !isStreaming && (
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs">AI düşünüyor...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - Show at bottom if messages exist */}
      {messages.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {/* Mode Select - Input alanının üstünde */}
          {/* Özetle modunda context yüzdesi ve dosya sayısı göstergesi */}
          {mode === 'ozetle' && (
            <div className="mb-2 text-[10px] text-gray-600 dark:text-gray-400">
              {selectedAttachments.length > 0 && (
                <span className="mr-3">Seçili dosya: {selectedAttachments.length}</span>
              )}
              {typeof contextPercentage === 'number' && (
                <span>Bağlam kullanımı: %{Math.round(contextPercentage)}</span>
              )}
            </div>
          )}
          {/* Edit Mode Info */}
          {editMode && (
            <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center text-xs text-orange-700 dark:text-orange-300">
                <span className="font-medium">Düzenleme Modu:</span>
                <span className="ml-2">Mesajınızı düzenleyin ve yeniden gönderin</span>
              </div>
            </div>
          )}
          
          {/* Selected Attachments */}
          {selectedAttachments.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Eklenen dosyalar:</div>
              <div className="flex flex-wrap gap-2">
                {selectedAttachments.map((file) => (
                  <div
                    key={file.id}
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg"
                  >
                    {getFileIcon(file.type)}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-blue-900 dark:text-blue-100">{file.name}</span>
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        {file.type?.toUpperCase()} • {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedAttachments(prev => prev.filter(f => f.id !== file.id))}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={getPlaceholderByMode()}
                className={`w-full resize-none border rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${
                  editMode 
                    ? 'border-orange-300 dark:border-orange-600 focus:ring-orange-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-purple-500'
                }`}
                rows={textareaRows}
                style={{ minHeight: '40px', maxHeight: '300px' }}
              />
              
              {/* File Search Dropdown - Sadeleştirilmiş */}
              {showFileSearch && (
                <div 
                  ref={fileSearchRef}
                  className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                >
                  <div className="p-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <AtSign className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Dosya Ara ({filteredFiles.length} sonuç)
                      </span>
                    </div>
                    
                    {filteredFiles.length === 0 ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                        {fileSearchQuery ? `"${fileSearchQuery}" için sonuç bulunamadı` : 'Dosya bulunamadı'}
                      </div>
                    ) : (
                      filteredFiles.map((file, index) => (
                        <button
                          key={file.id}
                          onClick={() => selectFile(file)}
                          className={`w-full flex items-center space-x-2 px-2 py-2 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            index === fileSearchIndex ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                              {file.name}
                            </div>
                          </div>
                          {index === fileSearchIndex && <Check className="w-3 h-3 text-blue-600" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab Search Dropdown */}
              {showTabSearch && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  <div className="p-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Sekme Ara ({openTabs.filter(tab => tab.type === 'document').length} sekme)
                      </span>
                    </div>
                    {openTabs.filter(tab => tab.type === 'document').length === 0 ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                        Açık sekme bulunamadı
                      </div>
                    ) : (
                      openTabs
                        .filter(tab => tab.type === 'document')
                        .filter(tab =>
                          !tabSearchQuery ||
                          tab.title.toLowerCase().includes(tabSearchQuery.toLowerCase())
                        )
                        .map((tab, index) => (
                          <button
                            key={tab.id}
                            onClick={() => selectTab(tab)}
                            className={`w-full flex items-center space-x-2 px-2 py-2 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              index === tabSearchIndex ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : ''
                            }`}
                          >
                            <FileText className="w-4 h-4 text-gray-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                {tab.title}
                              </div>
                            </div>
                            {index === tabSearchIndex && <Check className="w-3 h-3 text-green-600" />}
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                editMode
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Mode Select - Input alanının altında */}
          <div className="mt-3 flex items-center justify-center">
            <ModeSelect />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-800 dark:text-red-200">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatPanel; 