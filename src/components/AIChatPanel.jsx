import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Copy, Check, X, RefreshCw, Edit2, Sparkles, Trash2, ChevronUp, ChevronDown, RotateCcw,
  FileText, Image, FileIcon, AtSign, Search, Plus, Clock, BadgeCheck, ArrowUp
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
  onNewChat,
  onDeleteChat,
  isAITyping = false,
  isStreaming = false,
  streamingContent = '',
  onAcceptTextSuggestion,
  uploadedFiles = [], // Yüklenen dosyalar listesi
  openTabs = [], // Açık sekmeler listesi
  chatTitle = '', // Sohbet başlığı
  onChatTitleChange = () => {}, // Sohbet başlığı değişiklik handler'ı
  chatHistory = [], // Geçmiş sohbetler
  onLoadChatFromHistory = () => {}, // Geçmiş sohbet yükleme handler'ı
  onDeleteChatFromHistory = () => {}, // Geçmiş sohbet silme handler'ı
  progressStatus = '', // Ephemeral durum mesajı
  thoughtSummary = '' // Düşünce özeti (isteğe bağlı, soluk)
}) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSuggestions, setExpandedSuggestions] = useState(new Set());
  const [processedSuggestions, setProcessedSuggestions] = useState(new Set());
  const [selectedAttachments, setSelectedAttachments] = useState([]); // Seçilen dosyalar
  const [selectedTab, setSelectedTab] = useState(null); // Seçilen sekme
  const [showFileSearch, setShowFileSearch] = useState(false); // @ ile dosya arama menüsü
  const [fileSearchQuery, setFileSearchQuery] = useState(''); // Dosya arama sorgusu
  const [fileSearchIndex, setFileSearchIndex] = useState(-1); // Dosya arama indeksi
  const [cursorPosition, setCursorPosition] = useState(0); // Cursor pozisyonu
  const [showTabSearch, setShowTabSearch] = useState(false); // / ile sekme arama menüsü
  const [tabSearchQuery, setTabSearchQuery] = useState(''); // Sekme arama sorgusu
  const [tabSearchIndex, setTabSearchIndex] = useState(-1); // Sekme arama indeksi
  const [editingMessageId, setEditingMessageId] = useState(null); // Düzenlenen mesaj ID'si
  const [editingMessageText, setEditingMessageText] = useState(''); // Düzenlenen mesaj metni
  const [checkpointIndex, setCheckpointIndex] = useState(null); // Return modu - hangi mesajdan sonrası silinecek
  const [isCheckpointMode, setIsCheckpointMode] = useState(false); // Return modu aktif mi
  const [originalCheckpointIndex, setOriginalCheckpointIndex] = useState(null); // Edit sonrası soluk gösterilecek mesajların başlangıç indeksi
  const [editCompletedAtIndex, setEditCompletedAtIndex] = useState(null); // Edit tamamlandığında mesaj sayısı
  const [dropdownPosition, setDropdownPosition] = useState('down'); // Dropdown açılma yönü: 'up' veya 'down'

  const [appliedRules, setAppliedRules] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false); // Geçmiş sohbet dropdown'ı
  const scrollAreaRef = useRef(null);

  // Sohbet geçmişinden silme fonksiyonu
  const handleDeleteChatFromHistory = async (chatId) => {
    try {
      // Parent component'e bildir - hem backend'den silsin hem de local state'i güncellesin
      if (onDeleteChatFromHistory) {
        await onDeleteChatFromHistory(chatId);
      }
    } catch (error) {
      console.error('Sohbet geçmişinden silme hatası:', error);
    }
  };
  const inputRef = useRef(null);
  const fileSearchRef = useRef(null);
  const tabSearchRef = useRef(null);
  const chatHistoryRef = useRef(null);

  // Mode from global store
  const dispatch = useDispatch();
  const mode = useSelector(selectMode);
  const contextPercentage = useSelector(selectContextPercentage);

  // Mode dependent placeholder
  const getPlaceholderByMode = () => {
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

  // Textarea konumunu tespit et ve dropdown açılma yönünü belirle
  const updateDropdownPosition = () => {
    // Düzenleme modunda editTextareaRef, normal modda inputRef kullan
    const textareaRef = editingMessageId ? editTextareaRef : inputRef;
    
    if (textareaRef.current && scrollAreaRef.current) {
      const textarea = textareaRef.current;
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      
      if (scrollContainer) {
        const textareaRect = textarea.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        
        // Textarea'nın container içindeki konumunu hesapla
        const textareaTop = textareaRect.top - containerRect.top;
        const textareaBottom = textareaRect.bottom - containerRect.top;
        const containerHeight = containerRect.height;
        
        // Textarea container'ın üst yarısında mı alt yarısında mı?
        const isInUpperHalf = textareaTop < containerHeight / 2;
        
        // Aşağı açılması için yeterli alan var mı? (150px dropdown yüksekliği + 10px margin)
        const spaceBelow = containerHeight - textareaBottom;
        const hasSpaceBelow = spaceBelow > 160;
        
        // Yukarı açılması için yeterli alan var mı?
        const spaceAbove = textareaTop;
        const hasSpaceAbove = spaceAbove > 160;
        
        // Karar verme mantığı:
        // 1. Eğer üst yarıdaysa ve aşağıda yer varsa -> aşağı aç
        // 2. Eğer alt yarıdaysa ve yukarıda yer varsa -> yukarı aç  
        // 3. Eğer her iki yönde de yer yoksa -> daha fazla yer olan tarafa aç
        let newPosition = 'down';
        
        if (isInUpperHalf && hasSpaceBelow) {
          newPosition = 'down';
        } else if (!isInUpperHalf && hasSpaceAbove) {
          newPosition = 'up';
        } else {
          // Daha fazla yer olan tarafa aç
          newPosition = spaceBelow > spaceAbove ? 'down' : 'up';
        }
        
        setDropdownPosition(newPosition);
      }
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
    // Textarea başlangıç yüksekliğini 55px olarak ayarla (Figma tasarımına uygun)
    if (inputRef.current) {
      inputRef.current.style.height = '55px';
    }
  }, []);

  // Close dropdowns when clicking outside - Sadece chat history için
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Chat history dropdown
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

  // File search dropdown - sadece gerçekten dışarı tıklandığında kapat
  useEffect(() => {
    const handleFileDropdownClickOutside = (event) => {
      if (showFileSearch && fileSearchRef.current && !fileSearchRef.current.contains(event.target)) {
        setShowFileSearch(false);
        setFileSearchQuery('');
      }
    };

    if (showFileSearch) {
      document.addEventListener('mousedown', handleFileDropdownClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleFileDropdownClickOutside);
    };
  }, [showFileSearch]);

  // Tab search dropdown - sadece gerçekten dışarı tıklandığında kapat
  useEffect(() => {
    const handleTabDropdownClickOutside = (event) => {
      if (showTabSearch && tabSearchRef.current && !tabSearchRef.current.contains(event.target)) {
        setShowTabSearch(false);
        setTabSearchQuery('');
      }
    };

    if (showTabSearch) {
      document.addEventListener('mousedown', handleTabDropdownClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleTabDropdownClickOutside);
    };
  }, [showTabSearch]);

  // Checkpoint modunu iptal etme - dışarı tıklama (Gönder butonu ve Enter hariç)
  const editTextareaRef = useRef(null);
  const sendButtonRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Eğer checkpoint modundaysak ve düzenleme textarea'sının dışına tıklandıysa iptal et
      if (isCheckpointMode && editingMessageId && editTextareaRef.current) {
        const editingContainer = editTextareaRef.current.closest('.relative.min-w-\\[348px\\]');
        
        // Gönder butonuna tıklanmışsa iptal etme
        const isClickOnSendButton = event.target.closest('button[data-send-button="true"]');
        
        // ModeSelect dropdown'ına tıklanmışsa iptal etme
        const isClickOnModeSelect = event.target.closest('[data-modeselect-dropdown="true"]') || 
                                   event.target.closest('.relative.z-\\[400\\]');
        
        // File/Tab dropdown'larına tıklanmışsa iptal etme
        const isClickOnDropdown = event.target.closest('[data-file-search="true"]') || 
                                  event.target.closest('[data-tab-search="true"]');
        
        if (editingContainer && 
            !editingContainer.contains(event.target) && 
            !isClickOnSendButton && 
            !isClickOnModeSelect && 
            !isClickOnDropdown) {
          handleCancelEdit();
        }
      }
    };

    if (isCheckpointMode && editingMessageId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCheckpointMode, editingMessageId]);

  // Sync applied rules from service
  useEffect(() => {
    setAppliedRules(geminiService.appliedRules || []);
  }, [messages, isStreaming]);

  // Yeni sohbet başladığında originalCheckpointIndex'i temizle
  useEffect(() => {
    // Eğer messages boşsa (yeni sohbet) originalCheckpointIndex'i temizle
    if (messages.length === 0) {
      setOriginalCheckpointIndex(null);
      setEditCompletedAtIndex(null);
    }
  }, [messages]);



  // Textarea otomatik genişleme ve küçülme fonksiyonu - Figma tasarımına uygun
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      const textarea = inputRef.current;
      const baseHeight = 55; // Figma tasarımındaki başlangıç yüksekliği 55px
      const maxHeight = 300; // Maksimum yükseklik 300px
      
      // Eğer textarea tamamen boşsa, başlangıç yüksekliğini kullan
      if (!textarea.value || textarea.value.trim() === '') {
        textarea.style.height = `${baseHeight}px`;
        textarea.style.setProperty('height', `${baseHeight}px`, 'important');
        textarea.style.overflow = 'hidden';
        textarea.style.setProperty('overflow', 'hidden', 'important');
        return;
      }
      
      // SCROLLBAR MANTIĞI: İçeriğin gerçek yüksekliğini hesapla
      const getContentHeight = () => {
        // Geçici olarak height'ı auto yap ki scrollHeight doğru hesaplansın
        const originalHeight = textarea.style.height;
        const originalOverflow = textarea.style.overflow;
        textarea.style.height = 'auto';
        textarea.style.overflow = 'hidden';
        
        // İçeriğin gerçek yüksekliğini al (scrollHeight)
        const contentHeight = textarea.scrollHeight;
        
        // Orijinal değerleri geri yükle
        textarea.style.height = originalHeight;
        textarea.style.overflow = originalOverflow;
        
        return contentHeight;
      };
      
      // İçeriğin gerçek yüksekliğini al
      const contentHeight = getContentHeight();
      
      // Yeni yüksekliği hesapla: minimum baseHeight, maksimum maxHeight
      const newHeight = Math.max(baseHeight, Math.min(contentHeight, maxHeight));
      
      // Height'ı güncelle
      textarea.style.height = `${newHeight}px`;
      textarea.style.setProperty('height', `${newHeight}px`, 'important');
      
      // Scrollbar kontrolü: 300px'i aştıysa scrollbar'ı aktif et
      if (contentHeight > maxHeight) {
        textarea.style.overflow = 'auto';
        textarea.style.setProperty('overflow', 'auto', 'important');
      } else {
        textarea.style.overflow = 'hidden';
        textarea.style.setProperty('overflow', 'hidden', 'important');
      }
      
      // Debug için console.log ekle
      console.log('Figma Tasarımı ile Textarea:', {
        value: textarea.value,
        contentHeight,      // İçeriğin gerçek yüksekliği
        newHeight,          // Uygulanan yükseklik
        hasScrollbar: contentHeight > maxHeight, // 300px'i aştıysa scrollbar gerekli
        baseHeight,         // Başlangıç yüksekliği (55px)
        maxHeight           // Maksimum yükseklik
      });
    }
  };

  // @ ile dosya arama işlemi ve textarea dinamik yükseklik
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInputValue(value);
    setCursorPosition(cursorPos);

    // Textarea yüksekliğini ayarla (her değişiklikte)
    adjustTextareaHeight();

    // @ işareti kontrolü
    const beforeCursor = value.substring(0, cursorPos);
    const atMatch = beforeCursor.match(/@([^@\s]*)$/);
    const slashMatch = beforeCursor.match(/\/([^\/\s]*)$/);
    
    if (atMatch) {
      setShowFileSearch(true);
      setShowTabSearch(false);
      setFileSearchQuery(atMatch[1]);
      setFileSearchIndex(-1);
      // Dropdown konumunu güncelle
      setTimeout(() => updateDropdownPosition(), 0);
    } else if (slashMatch) {
      setShowFileSearch(false);
      setShowTabSearch(true);
      setTabSearchQuery(slashMatch[1]);
      setTabSearchIndex(-1);
      // Dropdown konumunu güncelle
      setTimeout(() => updateDropdownPosition(), 0);
    } else {
      setShowFileSearch(false);
      setShowTabSearch(false);
      setFileSearchQuery('');
      setTabSearchQuery('');
    }
  };

  // Dosya arama sonuçlarını filtrele - Geliştirilmiş filtreleme
  const getFilteredFiles = () => {
    const supportedFiles = uploadedFiles.filter(file => 
      geminiService.isSupportedFileType(file.type) || file.type?.toLowerCase() === 'udf'
    );
    
    if (!fileSearchQuery.trim()) {
      // Sorgu yoksa tüm dosyaları göster (artık 5 ile sınırlı değil)
      return supportedFiles;
    } else {
      // Sorgu varsa filtrele
      return supportedFiles.filter(file => 
        file.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
      );
    }
  };

  const filteredFiles = getFilteredFiles();

  // Dosya seçme işlemi - Çoklu dosya seçimi, dropdown açık kalsın
  const selectFile = (file) => {
    // Dosyayı seçilen dosyalara ekle (çoklu seçim)
    setSelectedAttachments(prev => {
      // Eğer dosya zaten seçiliyse, çıkar
      const isAlreadySelected = prev.some(f => f.id === file.id);
      if (isAlreadySelected) {
        return prev.filter(f => f.id !== file.id);
      }
      // Değilse ekle
      return [...prev, file];
    });
    
    // Dropdown'ları KAPATMA - açık kalsın ki kullanıcı başka dosya da seçebilsin
    // setShowFileSearch(false); // Bu satırı kaldırdık
    // setShowTabSearch(false);  // Bu satırı kaldırdık
    // setFileSearchQuery('');   // Bu satırı kaldırdık
    // setTabSearchQuery('');    // Bu satırı kaldırdık
    
    // Input'a focus ol
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Sekme seçme işlemi - Tek sekme seçimi, dropdown kapat
  const selectTab = (tab) => {
    // Seçilen sekmeyi ayarla (sadece bir sekme seçilebilir)
    setSelectedTab(tab);
    
    // Sekme seçildikten sonra dropdown'ları kapat
    setShowTabSearch(false);
    setShowFileSearch(false);
    setTabSearchQuery('');
    setFileSearchQuery('');
    
    // Input'tan / işaretini kaldır ve sekme referansını ekle
    const beforeCursor = inputValue.substring(0, cursorPosition);
    const afterCursor = inputValue.substring(cursorPosition);
    const beforeSlash = beforeCursor.replace(/\/[^\/\s]*$/, '');
    const newValue = `${beforeSlash}[Sekme: ${tab.title}] ${afterCursor}`;
    setInputValue(newValue);
    
    // Cursor pozisyonunu güncelle
    const newCursorPos = beforeSlash.length + tab.title.length + 10; // +10 for "[Sekme: ] "
    setCursorPosition(newCursorPos);
    
    // Input'a focus ol
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Klavye navigasyonu 
  // Mesaj düzenleme modunu başlat
  const handleEditMessage = (messageId, messageText, messageIndex) => {
    setEditingMessageId(messageId);
    setEditingMessageText(messageText);
    setCheckpointIndex(messageIndex);
    setOriginalCheckpointIndex(messageIndex); // Orijinal checkpoint indeksini kaydet
    setIsCheckpointMode(true);
  };

  // Mesaj düzenleme modunu iptal et
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageText('');
    setCheckpointIndex(null);
    setOriginalCheckpointIndex(null); // Orijinal checkpoint indeksini temizle
    setEditCompletedAtIndex(null); // Edit tamamlanma indeksini temizle
    setIsCheckpointMode(false);
  };

  // Düzenlenmiş mesajı gönder
  const handleSendEditedMessage = async () => {
    if (editingMessageText.trim()) {
        try {
          setIsLoading(true);
        setError(null);
        
        // Düzenlenmiş mesajı API'ye gönder
          await onSendMessage(editingMessageText.trim(), selectedAttachments);
      
      // Edit tamamlandığında mevcut mesaj sayısını kaydet
      setEditCompletedAtIndex(messages.length);
      
      // Başarılı gönderimden sonra state'leri temizle
      setEditingMessageId(null);
      setEditingMessageText('');
      setCheckpointIndex(null);
      setIsCheckpointMode(false);
      // originalCheckpointIndex'i temizleme - edit sonrası eski mesajların soluk kalması için
      // setOriginalCheckpointIndex(null); // Bu satırı kaldırdık
      setSelectedAttachments([]); // Eklenen dosyaları da temizle
      setSelectedTab(null); // Seçilen sekmeyi de temizle
      } catch (error) {
        console.error('Error sending edited message:', error);
        setError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
      handleSend();
      } else if (e.key === 'Escape') {
      // Escape ile dropdown'ları kapat
        e.preventDefault();
        setShowFileSearch(false);
        setShowTabSearch(false);
      setFileSearchQuery('');
        setTabSearchQuery('');
      setFileSearchIndex(-1);
        setTabSearchIndex(-1);
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
    // Textarea yüksekliğini sıfırla
    if (inputRef.current) {
      inputRef.current.style.height = '55px';
    }

    try {
        // Normal mesaj gönderimi
        await onSendMessage(userMessage, selectedAttachments);
      
      // Clear attachments and selected tab after sending
      setSelectedAttachments([]);
      setSelectedTab(null);
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

  // Mesaj içeriğini render et (sadece normal metin, artık @ ve / referansları textarea'da olmayacak)
  const renderMessageContent = (content) => {
    if (!content) return content;
    return content;
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
    
    // Checkpoint modunda ve edit sonrasında mesajları soluk göster
    const isDimmed = (() => {
      // Edit mode aktifken: sadece checkpoint sonrası mesajları soluk göster
      if (isCheckpointMode && checkpointIndex !== null) {
        return index > checkpointIndex;
      }
      // Edit tamamlandıktan sonra: orijinal checkpoint ve sonrası mesajları soluk göster
      // ANCAK edit tamamlandıktan sonra gelen yeni mesajları normal göster
      if (!isCheckpointMode && originalCheckpointIndex !== null && editCompletedAtIndex !== null) {
        // Eğer mesaj edit tamamlandıktan sonra geldiyse (yeni mesajsa) normal göster
        if (index >= editCompletedAtIndex) {
          return false; // Normal göster
        }
        // Eğer mesaj edit öncesi orijinal checkpoint'ten sonraysa soluk göster
        return index >= originalCheckpointIndex;
      }
      return false;
    })();

    return (
      <div key={message.id} className={`w-full mb-3 transition-opacity duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}>
        {/* Message Header */}
        <div className="flex items-center mb-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {isUser ? 'Sen' : 'LawInAI'}
          </span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 ml-3"></div>
          
          {/* Restore Checkpoint Button - only for user messages and only if not dimmed */}
          {index > 0 && isUser && !isDimmed && (
            <button
              onClick={() => {
                // Mesajı düzenleme moduna geçir
                handleEditMessage(message.id, message.content, index);
              }}
              className="ml-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Bu noktaya geri dön ve düzenle"
            >
              <RotateCcw className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>

        {/* Message Content */}
        <div className="w-full">
          {/* Düzenleme Modu - Normal Textarea Tasarımı */}
          {editingMessageId === message.id && isUser ? (
            <div className="relative min-w-[300px] w-full max-w-lg min-h-[130px] bg-white/5 dark:bg-white/5 backdrop-blur-[6px] border border-gray-100/10 dark:border-gray-800/60 rounded-[10px] p-4">
                              <div className="flex justify-between mb-2">
                  {/* File Upload Button */}
                  <div className="flex items-center space-x-2 flex-wrap">
                    <button
                      onClick={() => {
                        const newShowFileSearch = !showFileSearch;
                        setShowFileSearch(newShowFileSearch);
                        setShowTabSearch(false);
                        setFileSearchQuery('');
                        setTabSearchQuery('');
                        // Dropdown açılıyorsa konumunu güncelle
                        if (newShowFileSearch) {
                          setTimeout(() => updateDropdownPosition(), 0);
                        }
                      }}
                      className={`${selectedAttachments.length > 0 ? 'w-[20px]' : 'w-[92px]'} h-[20px] border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center justify-center text-[12px] transition-colors ${
                        showFileSearch 
                          ? 'bg-white/20 text-gray-100' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                      }`}
                    >
                      {selectedAttachments.length > 0 ? '@' : '@ Dosya Ekle'}
                    </button>
                    {selectedAttachments.map((file, index) => (
                      <div key={file.id} className="w-[92px] h-[20px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] px-2 flex items-center justify-between">
                        <span className="text-[12px] text-gray-400 truncate max-w-[60px]">
                          {file.name}
                        </span>
                        <button
                          onClick={() => setSelectedAttachments(prev => prev.filter(f => f.id !== file.id))}
                          className="text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const newShowTabSearch = !showTabSearch;
                      setShowTabSearch(newShowTabSearch);
                      setShowFileSearch(false);
                      setFileSearchQuery('');
                      setTabSearchQuery('');
                      // Dropdown açılıyorsa konumunu güncelle
                      if (newShowTabSearch) {
                        setTimeout(() => updateDropdownPosition(), 0);
                      }
                    }}
                    className={`${selectedTab ? 'w-[20px]' : 'w-[92px]'} h-[20px] border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center justify-center text-[12px] transition-colors ${
                      showTabSearch 
                        ? 'bg-white/20 text-gray-100' 
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                    }`}
                  >
                    {selectedTab ? '/' : '/ Sekme Seç'}
                  </button>
                  {selectedTab && (
                    <div className="w-[92px] h-[20px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] px-2 flex items-center justify-between">
                      <span className="text-[12px] text-gray-400 truncate max-w-[60px]">
                        {selectedTab.title}
                      </span>
                      <button
                        onClick={() => setSelectedTab(null)}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative mb-2">
                <textarea
                  ref={editTextareaRef}
                  value={editingMessageText}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cursorPos = e.target.selectionStart;
                    setEditingMessageText(value);
                    setCursorPosition(cursorPos);

                    // Textarea yüksekliğini ayarla
                    setTimeout(() => {
                      if (editTextareaRef.current) {
                        const textarea = editTextareaRef.current;
                        const baseHeight = 55;
                        const maxHeight = 300;
                        
                        if (!textarea.value || textarea.value.trim() === '') {
                          textarea.style.height = `${baseHeight}px`;
                          textarea.style.overflow = 'hidden';
                          return;
                        }
                        
                        const getContentHeight = () => {
                          const originalHeight = textarea.style.height;
                          const originalOverflow = textarea.style.overflow;
                          textarea.style.height = 'auto';
                          textarea.style.overflow = 'hidden';
                          const contentHeight = textarea.scrollHeight;
                          textarea.style.height = originalHeight;
                          textarea.style.overflow = originalOverflow;
                          return contentHeight;
                        };
                        
                        const contentHeight = getContentHeight();
                        const newHeight = Math.max(baseHeight, Math.min(contentHeight, maxHeight));
                        
                        textarea.style.height = `${newHeight}px`;
                        textarea.style.overflow = contentHeight > maxHeight ? 'auto' : 'hidden';
                      }
                    }, 0);

                    // @ ve / işareti kontrolü - Ana textarea ile aynı mantık
                    const beforeCursor = value.substring(0, cursorPos);
                    const atMatch = beforeCursor.match(/@([^@\s]*)$/);
                    const slashMatch = beforeCursor.match(/\/([^\/\s]*)$/);
                    
                    if (atMatch) {
                      setShowFileSearch(true);
                      setShowTabSearch(false);
                      setFileSearchQuery(atMatch[1]);
                      setFileSearchIndex(-1);
                      // Dropdown konumunu güncelle
                      setTimeout(() => updateDropdownPosition(), 0);
                    } else if (slashMatch) {
                      setShowFileSearch(false);
                      setShowTabSearch(true);
                      setTabSearchQuery(slashMatch[1]);
                      setTabSearchIndex(-1);
                      // Dropdown konumunu güncelle
                      setTimeout(() => updateDropdownPosition(), 0);
                    } else {
                      setShowFileSearch(false);
                      setShowTabSearch(false);
                      setFileSearchQuery('');
                      setTabSearchQuery('');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendEditedMessage();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      // Önce dropdown'ları kapat, eğer açık değilse edit'i iptal et
                      if (showFileSearch || showTabSearch) {
                        setShowFileSearch(false);
                        setShowTabSearch(false);
                        setFileSearchQuery('');
                        setTabSearchQuery('');
                        setFileSearchIndex(-1);
                        setTabSearchIndex(-1);
                      } else {
                        handleCancelEdit();
                      }
                    }
                  }}
                  className="w-full bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                  style={{
                    minHeight: '55px',
                    maxHeight: '300px',
                    height: '55px',
                    overflow: 'hidden'
                  }}
                  autoFocus
                />
              </div>

              <div className="flex justify-between items-center">
                {/* ModeSelect */}
                <div className="w-[73px] h-[20px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[10px] flex items-center justify-center relative z-[400]">
                  <ModeSelect isTopPosition={false} />
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendEditedMessage}
                  disabled={!editingMessageText.trim() || isLoading}
                  data-send-button="true"
                  className="w-[26px] h-[26px] bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowUp className="w-4 h-4 text-white" strokeWidth={2} />
                </button>
              </div>

              {/* File Search Dropdown */}
              {showFileSearch && (
                <div 
                  ref={fileSearchRef}
                  data-file-search="true"
                  className={`absolute left-0 w-[150px] bg-[#101827] border border-gray-100/10 dark:border-gray-800/60 rounded-[10px] shadow-lg z-[1100] overflow-hidden pointer-events-auto ${
                    dropdownPosition === 'up' 
                      ? 'bottom-full mb-1' 
                      : 'top-full mt-1'
                  }`}
                >
                  <div className="p-[6px] space-y-[5px]">
                    {/* Search Input */}
                    <div className="w-[137px] h-[19px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center px-[18px]">
                      <input
                        type="text"
                        value={fileSearchQuery}
                        onChange={(e) => {
                          setFileSearchQuery(e.target.value);
                          setFileSearchIndex(-1);
                        }}
                        onKeyDown={(e) => {
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
                        }}
                        placeholder="Dosya Adı Yazınız..."
                        className="w-full bg-transparent text-[12px] text-gray-400 placeholder-gray-500 focus:outline-none border-none"
                        autoFocus
                      />
                    </div>
                    
                    {/* File Results */}
                    {filteredFiles.slice(0, 5).map((file, index) => {
                      const isSelected = selectedAttachments.some(f => f.id === file.id);
                      return (
                        <div
                          key={file.id}
                          onClick={() => selectFile(file)}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`w-[137px] h-[19px] border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center px-[18px] cursor-pointer transition-colors ${
                            index === fileSearchIndex ? 'bg-white/15' : 
                            isSelected ? 'bg-purple-600/20 border-purple-500/30' : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <span className={`text-[12px] truncate ${
                            isSelected ? 'text-purple-300' : 'text-gray-400'
                          }`}>
                            {file.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab Search Dropdown */}
              {showTabSearch && (
                <div 
                  ref={tabSearchRef}
                  data-tab-search="true"
                  className={`absolute left-0 w-[150px] bg-[#101827] border border-gray-100/10 dark:border-gray-800/60 rounded-[10px] shadow-lg z-[1200] overflow-hidden pointer-events-auto ${
                    dropdownPosition === 'up' 
                      ? 'bottom-full mb-1' 
                      : 'top-full mt-1'
                  }`}
                >
                  <div className="p-[6px] space-y-[5px]">
                    {/* Search Input */}
                    <div className="w-[137px] h-[19px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center px-[18px]">
                      <input
                        type="text"
                        value={tabSearchQuery}
                        onChange={(e) => {
                          setTabSearchQuery(e.target.value);
                          setTabSearchIndex(-1);
                        }}
                        onKeyDown={(e) => {
                          const documentTabs = openTabs.filter(tab => tab.type === 'document');
                          const filteredTabs = documentTabs.filter(tab =>
                            !tabSearchQuery ||
                            tab.title.toLowerCase().includes(tabSearchQuery.toLowerCase())
                          );
                          
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setTabSearchIndex(prev => 
                              prev < filteredTabs.length - 1 ? prev + 1 : 0
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setTabSearchIndex(prev => 
                              prev > 0 ? prev - 1 : filteredTabs.length - 1
                            );
                          } else if (e.key === 'Enter' && tabSearchIndex >= 0) {
                            e.preventDefault();
                            selectTab(filteredTabs[tabSearchIndex]);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setShowTabSearch(false);
                            setTabSearchQuery('');
                            setTabSearchIndex(-1);
                          }
                        }}
                        placeholder="Sekme Adı Yazınız..."
                        className="w-full bg-transparent text-[12px] text-gray-400 placeholder-gray-500 focus:outline-none border-none"
                        autoFocus
                      />
                    </div>
                    
                    {/* Tab Results */}
                    {(() => {
                      const documentTabs = openTabs.filter(tab => tab.type === 'document');
                      const filteredTabs = documentTabs.filter(tab =>
                        !tabSearchQuery ||
                        tab.title.toLowerCase().includes(tabSearchQuery.toLowerCase())
                      );
                      
                      return filteredTabs.slice(0, 5).map((tab, index) => (
                        <div
                          key={tab.id}
                          onClick={() => selectTab(tab)}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`w-[137px] h-[19px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center px-[18px] cursor-pointer hover:bg-white/10 transition-colors ${
                            index === tabSearchIndex ? 'bg-white/15' : ''
                          }`}
                        >
                          <span className="text-[12px] text-gray-400 truncate">
                            {tab.title}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          </div>
          )}

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
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="h-[59px] bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
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


          {/* New Chat Button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onNewChat && onNewChat()}
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
              <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[1000] max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
                    Geçmiş Sohbetler
                  </div>
                  {chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-between group"
                    >
                      <button
                        onClick={() => {
                          onLoadChatFromHistory(chat);
                          setShowChatHistory(false);
                        }}
                        className="flex-1 flex flex-col text-left"
                      >
                        <div className="font-medium truncate">{chat.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(chat.timestamp).toLocaleDateString('tr-TR')}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChatFromHistory(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-opacity"
                        title="Sohbeti Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>


          

          
          {/* Delete Current Chat Button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onDeleteChat && onDeleteChat()}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Sohbeti Sil"
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



      {/* Messages Display */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 relative z-[1]">
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

          {/* Input Area - Always at the end of messages - Hidden in checkpoint mode */}
          {!isCheckpointMode && (
            <div className="w-full flex justify-center mt-4">
              <div className="relative min-w-[300px] w-full max-w-lg min-h-[130px] bg-white/5 dark:bg-white/5 backdrop-blur-[6px] border border-gray-100/10 dark:border-gray-800/60 rounded-[10px] p-4">
                <div className="flex justify-between mb-2 flex-wrap gap-2">
                  {/* File Upload Section */}
                  <div className="flex items-center space-x-2 flex-wrap">
                    <button
                      onClick={() => {
                        const newShowFileSearch = !showFileSearch;
                        setShowFileSearch(newShowFileSearch);
                        setShowTabSearch(false);
                        setFileSearchQuery('');
                        setTabSearchQuery('');
                        // Dropdown açılıyorsa konumunu güncelle
                        if (newShowFileSearch) {
                          setTimeout(() => updateDropdownPosition(), 0);
                        }
                      }}
                      className={`${selectedAttachments.length > 0 ? 'w-[20px]' : 'w-[92px]'} h-[20px] border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center justify-center text-[12px] transition-colors ${
                        showFileSearch 
                          ? 'bg-white/20 text-gray-100' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                      }`}
                    >
                      {selectedAttachments.length > 0 ? '@' : '@ Dosya Ekle'}
                    </button>
                    {selectedAttachments.map((file, index) => (
                      <div key={file.id} className="w-[92px] h-[20px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] px-2 flex items-center justify-between">
                        <span className="text-[12px] text-gray-400 truncate max-w-[60px]">
                          {file.name}
                        </span>
                        <button
                          onClick={() => setSelectedAttachments(prev => prev.filter(f => f.id !== file.id))}
                          className="text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Tab Selection Section */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const newShowTabSearch = !showTabSearch;
                        setShowTabSearch(newShowTabSearch);
                        setShowFileSearch(false);
                        setFileSearchQuery('');
                        setTabSearchQuery('');
                        // Dropdown açılıyorsa konumunu güncelle
                        if (newShowTabSearch) {
                          setTimeout(() => updateDropdownPosition(), 0);
                        }
                      }}
                      className={`${selectedTab ? 'w-[20px]' : 'w-[92px]'} h-[20px] border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center justify-center text-[12px] transition-colors ${
                        showTabSearch 
                          ? 'bg-white/20 text-gray-100' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                      }`}
                    >
                      {selectedTab ? '/' : '/ Sekme Seç'}
                    </button>
                    {selectedTab && (
                      <div className="w-[92px] h-[20px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] px-2 flex items-center justify-between">
                        <span className="text-[12px] text-gray-400 truncate max-w-[60px]">
                          {selectedTab.title}
                        </span>
                        <button
                          onClick={() => setSelectedTab(null)}
                          className="text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative mb-2">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder=""
                    className="w-full bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] px-3 py-2 text-xs text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                    style={{
                      minHeight: '55px',
                      maxHeight: '300px',
                      height: inputRef.current ? `${inputRef.current.scrollHeight}px` : '55px',
                      overflow: 'hidden !important'
                    }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  {/* ModeSelect */}
                  <div className="w-[73px] h-[20px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[10px] flex items-center justify-center relative z-[400]">
                    <ModeSelect isTopPosition={false} />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading}
                    className="w-[26px] h-[26px] bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUp className="w-4 h-4 text-white" strokeWidth={2} />
                  </button>
                </div>

                {/* File Search Dropdown */}
                {showFileSearch && (
                  <div 
                    ref={fileSearchRef}
                    data-file-search="true"
                    className={`absolute left-0 w-[150px] bg-[#101827] border border-gray-100/10 dark:border-gray-800/60 rounded-[10px] shadow-lg z-[1100] overflow-hidden pointer-events-auto ${
                      dropdownPosition === 'up' 
                        ? 'bottom-full mb-1' 
                        : 'top-full mt-1'
                    }`}
                  >
                    <div className="p-[6px] space-y-[5px]">
                      {/* Search Input */}
                      <div className="w-[137px] h-[19px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center px-[18px]">
                        <input
                          type="text"
                          value={fileSearchQuery}
                          onChange={(e) => {
                            setFileSearchQuery(e.target.value);
                            setFileSearchIndex(-1);
                          }}
                          onKeyDown={(e) => {
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
                          }}
                          placeholder="Dosya Adı Yazınız..."
                          className="w-full bg-transparent text-[12px] text-gray-400 placeholder-gray-500 focus:outline-none border-none"
                          autoFocus
                        />
                      </div>
                      
                      {/* File Results */}
                      {filteredFiles.slice(0, 5).map((file, index) => {
                        const isSelected = selectedAttachments.some(f => f.id === file.id);
                        return (
                          <div
                            key={file.id}
                            onClick={() => selectFile(file)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`w-[137px] h-[19px] border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center px-[18px] cursor-pointer transition-colors ${
                              index === fileSearchIndex ? 'bg-white/15' : 
                              isSelected ? 'bg-purple-600/20 border-purple-500/30' : 'bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            <span className={`text-[12px] truncate ${
                              isSelected ? 'text-purple-300' : 'text-gray-400'
                            }`}>
                              {file.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab Search Dropdown */}
                {showTabSearch && (
                  <div 
                    ref={tabSearchRef}
                    data-tab-search="true"
                    className={`absolute left-0 w-[150px] bg-[#101827] border border-gray-100/10 dark:border-gray-800/60 rounded-[10px] shadow-lg z-[1200] overflow-hidden pointer-events-auto ${
                      dropdownPosition === 'up' 
                        ? 'bottom-full mb-1' 
                        : 'top-full mt-1'
                    }`}
                  >
                    <div className="p-[6px] space-y-[5px]">
                      {/* Search Input */}
                      <div className="w-[137px] h-[19px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center px-[18px]">
                        <input
                          type="text"
                          value={tabSearchQuery}
                          onChange={(e) => {
                            setTabSearchQuery(e.target.value);
                            setTabSearchIndex(-1);
                          }}
                          onKeyDown={(e) => {
                            const documentTabs = openTabs.filter(tab => tab.type === 'document');
                            const filteredTabs = documentTabs.filter(tab =>
                              !tabSearchQuery ||
                              tab.title.toLowerCase().includes(tabSearchQuery.toLowerCase())
                            );
                            
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setTabSearchIndex(prev => 
                                prev < filteredTabs.length - 1 ? prev + 1 : 0
                              );
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setTabSearchIndex(prev => 
                                prev > 0 ? prev - 1 : filteredTabs.length - 1
                              );
                            } else if (e.key === 'Enter' && tabSearchIndex >= 0) {
                              e.preventDefault();
                              selectTab(filteredTabs[tabSearchIndex]);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setShowTabSearch(false);
                              setTabSearchQuery('');
                              setTabSearchIndex(-1);
                            }
                          }}
                          placeholder="Sekme Adı Yazınız..."
                          className="w-full bg-transparent text-[12px] text-gray-400 placeholder-gray-500 focus:outline-none border-none"
                          autoFocus
                        />
                      </div>
                      
                      {/* Tab Results */}
                      {(() => {
                        const documentTabs = openTabs.filter(tab => tab.type === 'document');
                        const filteredTabs = documentTabs.filter(tab =>
                          !tabSearchQuery ||
                          tab.title.toLowerCase().includes(tabSearchQuery.toLowerCase())
                        );
                        
                        return filteredTabs.slice(0, 5).map((tab, index) => (
                          <div
                            key={tab.id}
                            onClick={() => selectTab(tab)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`w-[137px] h-[19px] bg-white/5 dark:bg-white/5 border border-gray-100/10 dark:border-gray-800/60 rounded-[5px] flex items-center px-[18px] cursor-pointer hover:bg-white/10 transition-colors ${
                              index === tabSearchIndex ? 'bg-white/15' : ''
                            }`}
                          >
                            <span className="text-[12px] text-gray-400 truncate">
                              {tab.title}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>



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
