import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, MessageSquare, Settings, Upload, Bot, Scale } from 'lucide-react';
import HeaderBar from './components/HeaderBar';

import FileExplorer from './components/FileExplorer';
import DocumentEditor from './components/DocumentEditor';
import AIChatPanel from './components/AIChatPanel';
import AITrainingPanel from './components/AITrainingPanel';
import WelcomeScreen from './components/WelcomeScreen';
import LoginScreen from './components/LoginScreen';
import SettingsPanel from './components/SettingsPanel';
import geminiService from './services/geminiService';
import udfService from './services/udfService';
import ragService from './services/ragService';
import textFormattingService from './services/textFormattingService';
import DiffMatchPatch from 'diff-match-patch';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

function App() {
  const [activeView, setActiveView] = useState('login'); // login, welcome, editor, settings, training
  const [previousView, setPreviousView] = useState('login'); // Önceki view'ı hatırlamak için
  const [darkMode, setDarkMode] = useState(true); // New dark mode state
  
  // Force login screen at component mount (especially for Electron)
  useEffect(() => {
    console.log('App mounted, forcing login screen');
    setActiveView('login');
  }, []);
  
  // Theme management
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Main states
  const [currentView, setCurrentView] = useState('welcome');
  const [selectedTheme, setSelectedTheme] = useState('dark');  
  
  // Workspace state - Cursor benzeri proje yönetimi
  const [currentWorkspace, setCurrentWorkspace] = useState(null); // { path: string, name: string }
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  
  const [currentDocument, setCurrentDocument] = useState({
    name: 'Yeni Dilekçe',
    title: 'Hukuki Metin', // UDF export için başlık
    content: '',
    hasChanges: false,
    aiChanges: [] // Track AI-suggested changes with positions
  });
  const [isAITyping, setIsAITyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatTitle, setChatTitle] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  
  // Checkpoint system for conversation and document state
  const [checkpoints, setCheckpoints] = useState([]);
  const [editMode, setEditMode] = useState(null); // { messageIndex: number, originalMessage: string }
  const [highlightRefresh, setHighlightRefresh] = useState(0); // Force refresh for highlights
  const [approvedChanges, setApprovedChanges] = useState(new Set());
  const [rejectedChanges, setRejectedChanges] = useState(new Set());

  // Streaming states - for real-time AI response
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [pendingContent, setPendingContent] = useState(''); // Content waiting for approval (green in editor)
  const [streamingToEditor, setStreamingToEditor] = useState(false); // Is currently writing to editor

  // New AI Text State Management - Enhanced diff system
  const [aiTextState, setAiTextState] = useState(null); // 'pending', 'changes', null
  const [originalText, setOriginalText] = useState(''); // Değişiklik öncesi metin
  const [pendingChanges, setPendingChanges] = useState([]); // AI'ın önerdiği değişiklikler

  // Tab Management State
  const [openTabs, setOpenTabs] = useState([
    {
      id: 'doc-main',
      type: 'document',
      title: 'Hukuki Metin',
      data: {
        content: '',
        hasChanges: false,
        aiChanges: []
      }
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('doc-main');
  const [selectedFile, setSelectedFile] = useState(null);

  // Optimized highlight refresh - only when needed
  useEffect(() => {
    const timer = setInterval(() => {
      // Only refresh if there are active changes
      if (currentDocument.aiChanges && currentDocument.aiChanges.length > 0) {
        setHighlightRefresh(prev => prev + 1);
      }
    }, 5000); // Reduced frequency to 5 seconds
    
    return () => clearInterval(timer);
  }, [currentDocument.aiChanges]);

  // Workspace initialization - son açılan workspace'i yükle
  useEffect(() => {
    const loadWorkspace = async () => {
      if (window.electronAPI) {
        try {
          const savedWorkspace = await window.electronAPI.store.get('currentWorkspace');
          if (savedWorkspace && savedWorkspace.path) {
            setCurrentWorkspace(savedWorkspace);
            console.log('Saved workspace loaded:', savedWorkspace);
            
            // File watcher'ı başlat
            await window.electronAPI.watchWorkspace(savedWorkspace.path);
          }
        } catch (error) {
          console.error('Workspace loading error:', error);
        }
      }
      setWorkspaceLoaded(true);
    };

    loadWorkspace();
  }, []);

  // App initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Hide loading screen
        document.body.classList.add('app-loaded');
        
        // Clear any cached view state in Electron
        if (window.electronAPI) {
          await window.electronAPI.store.set('activeView', 'login');
          console.log('Cleared Electron activeView cache');
        }
        
        // Always start with login screen (force after clearing cache)
        console.log('Initialization complete, setting activeView to login');
        setActiveView('login');
        
        setIsLoading(false);
      } catch (error) {
        console.error('App initialization error:', error);
        setIsLoading(false);
      }
    };

    // Small delay for smooth loading transition
    setTimeout(initializeApp, 1000);
  }, []);

  // Document handlers
  const handleDocumentChange = (content) => {
    console.log('Document change for tab:', activeTabId, 'Content length:', content.length);
    
    // Update active tab's content
    setOpenTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, data: { ...tab.data, content, hasChanges: true } }
        : tab
    ));
    
    // Also update currentDocument for backward compatibility
    setCurrentDocument(prev => ({
      ...prev,
      content,
      hasChanges: true
    }));
  };

  const handleDocumentSave = async () => {
    if (!currentWorkspace) {
      alert('Dosyayı kaydetmek için önce bir proje klasörü açın');
      return;
    }

    try {
      // Dosya adı belirle
      const fileName = `${currentDocument.title || 'dilekce'}.txt`;
      const filePath = window.electronAPI ? 
        require('path').join(currentWorkspace.path, fileName) : 
        fileName;

      if (window.electronAPI) {
        // Electron - workspace içine kaydet
        await window.electronAPI.writeFile(filePath, currentDocument.content);
        console.log('Document saved to workspace:', filePath);
      } else {
        // Web fallback - download as file
        const blob = new Blob([currentDocument.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      setCurrentDocument(prev => ({
        ...prev,
        hasChanges: false,
        lastSaved: new Date().toISOString()
      }));

      // Workspace dosyalarını yenile
      if (currentWorkspace) {
        loadWorkspaceFiles();
      }
    } catch (error) {
      console.error('Document save error:', error);
      alert('Dosya kaydedilirken hata oluştu: ' + error.message);
    }
  };

  const handleNewDocument = () => {
    setCurrentDocument({
      id: null,
      name: 'Yeni Dilekçe',
      title: 'Hukuki Metin',
      content: '',
      hasChanges: false,
      aiChanges: [],
      lastSaved: null
    });
  };

  const handleExport = async (format) => {
    console.log(`Exporting document as ${format}`);
    // Implement export logic
  };

  // File handlers - Fixed for Electron compatibility
  const handleFileUpload = async () => {
    console.log('handleFileUpload called');
    console.log('Current uploaded files:', uploadedFiles);
    
    if (window.electronAPI) {
      try {
        console.log('Using Electron API for file upload');
        const result = await window.electronAPI.openFileDialog();
        console.log('Raw Electron file upload result:', result);
        console.log('Result type:', typeof result);
        console.log('Result keys:', result ? Object.keys(result) : 'result is null/undefined');
        
        // Handle different possible Electron API response formats
        if (result) {
          // Check for different possible property names
          const cancelled = result.cancelled || result.canceled;
          const filePaths = result.filePaths || result.filePath || (result.path ? [result.path] : null);
          
          console.log('Parsed - cancelled:', cancelled, 'filePaths:', filePaths);
          
          if (!cancelled && filePaths && Array.isArray(filePaths) && filePaths.length > 0) {
            // Process uploaded files
            for (const [index, filePath] of filePaths.entries()) {
              const fileName = filePath.split('/').pop() || filePath.split('\\').pop(); // Handle both Unix and Windows paths
              const fileExtension = fileName.split('.').pop().toLowerCase();
              
              let finalFilePath = filePath;
              
              // Eğer workspace varsa, dosyayı workspace'e kopyala
              if (currentWorkspace) {
                try {
                  const copyResult = await window.electronAPI.copyToWorkspace(
                    filePath, 
                    currentWorkspace.path, 
                    fileName
                  );
                  if (copyResult.success) {
                    finalFilePath = copyResult.targetPath;
                    console.log('File copied to workspace:', finalFilePath);
                  }
                } catch (error) {
                  console.error('Error copying to workspace:', error);
                  // Hata durumunda orijinal dosya yolu kullanılır
                }
              }
              
              const newFile = {
                id: Date.now() + index,
                name: fileName,
                path: finalFilePath,
                type: fileExtension,
                size: 0, // Electron could provide this if we implement file stats
                uploadedAt: new Date().toISOString(),
                isWorkspaceFile: !!currentWorkspace
              };
              
              console.log('Adding new Electron file:', newFile);
              
              // Eğer workspace'e kopyalandıysa, file watcher otomatik ekleyecek
              // Değilse manuel olarak ekle
              if (!currentWorkspace) {
                setUploadedFiles(prev => {
                  const updated = [...prev, newFile];
                  console.log('Updated files list after Electron upload:', updated);
                  return updated;
                });
              }
              
              // Dosyayı RAG sistemine ekle
              addFileToRAG(newFile);
            }
          } else {
            console.log('Electron file dialog cancelled or no files selected');
          }
        } else {
          console.log('Electron file dialog returned null/undefined result');
        }
      } catch (error) {
        console.error('Electron file upload error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
    } else {
      // Web fallback - Enhanced for better browser compatibility
      console.log('Using web fallback for file upload');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.tiff,.tif,.udf';
      input.multiple = true;
      input.style.display = 'none'; // Hide the input
      
      input.onchange = (e) => {
        console.log('File input changed:', e.target.files);
        const files = Array.from(e.target.files);
        
        if (files.length === 0) {
          console.log('No files selected');
          return;
        }
        
        files.forEach((file, index) => {
          const newFile = {
            id: Date.now() + Math.random() + index,
            name: file.name,
            type: file.name.split('.').pop().toLowerCase(),
            size: file.size,
            uploadedAt: new Date().toISOString(),
            file: file
          };
          
          console.log('Processing file:', newFile);
          setUploadedFiles(prev => {
            const updated = [...prev, newFile];
            console.log('Files after adding:', updated);
            return updated;
          });
          
          // Dosyayı RAG sistemine ekle
          addFileToRAG(newFile);
        });
      };
      
      // Add to document temporarily to trigger click
      document.body.appendChild(input);
      input.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(input);
      }, 1000);
    }
  };

  // Dosyayı RAG sistemine ekle
  const addFileToRAG = async (file) => {
    try {
      if (geminiService.isSupportedFileType(file.type)) {
        console.log(`Dosya RAG sistemine ekleniyor: ${file.name}`);
        
        // Dosya içeriğini al
        let fileContent;
        if (file.path && window.electronAPI) {
          // Electron - dosyayı oku
          const base64Data = await window.electronAPI.readFileAsBase64(file.path);
          fileContent = base64Data;
        } else if (file.file) {
          // Web - FileReader kullan
          fileContent = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(file.file);
          });
        }
        
        if (fileContent) {
          const document = {
            id: file.id,
            name: file.name,
            content: fileContent,
            type: file.type
          };
          
          await ragService.addDocument(document);
          console.log(`Dosya başarıyla RAG sistemine eklendi: ${file.name}`);
        }
      }
    } catch (error) {
      console.error(`RAG dosya ekleme hatası: ${file.name}`, error);
    }
  };

  const handleFileSelect = (file) => {
    console.log('Selected file:', file);
    setSelectedFile(file);
    
    // Dosyayı görüntüleme modunda aç
    if (file && file.type !== 'folder') {
      handleViewFile(file);
    }
  };

  const handleTemplateSelect = (template) => {
    console.log('Selected template:', template);
    // Implement template selection logic
  };

  // Tab Management Functions
  const handleTabChange = (tabId, newTab = null) => {
    console.log('Tab change to:', tabId, 'New tab:', newTab);
    
    if (newTab) {
      // Adding new tab
      setOpenTabs(prev => {
        const exists = prev.find(tab => tab.id === tabId);
        if (exists) return prev;
        return [...prev, newTab];
      });
    }
    
    // Update currentDocument to match the active tab's content
    const targetTab = openTabs.find(tab => tab.id === tabId);
    console.log('Target tab:', targetTab);
    
    if (targetTab && targetTab.type === 'document') {
      console.log('Loading content for tab:', targetTab.title, 'Content:', targetTab.data.content?.substring(0, 50) + '...');
      setCurrentDocument(prev => ({
        ...prev,
        title: targetTab.title,
        content: targetTab.data.content || '',
        hasChanges: targetTab.data.hasChanges || false,
        aiChanges: targetTab.data.aiChanges || []
      }));
    }
    
    setActiveTabId(tabId);
  };

  const handleTabClose = (tabId) => {
    setOpenTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);
      // If closing active tab, switch to another tab
      if (tabId === activeTabId && filtered.length > 0) {
        setActiveTabId(filtered[0].id);
      } else if (filtered.length === 0) {
        setActiveTabId(null);
      }
      return filtered;
    });
  };

  const handleTabRename = (tabId, newTitle) => {
    setOpenTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, title: newTitle }
        : tab
    ));
    
    // Eğer yeniden adlandırılan tab aktif tab ise currentDocument.title'ı da güncelle
    if (tabId === activeTabId) {
      setCurrentDocument(prev => ({
        ...prev,
        title: newTitle
      }));
    }
  };

  // Load chat from history
  const handleLoadChatFromHistory = (chatHistoryItem) => {
    setChatMessages(chatHistoryItem.messages);
    setChatTitle(chatHistoryItem.title);
    setCheckpoints([]);
    setEditMode(null);
    setIsStreaming(false);
    setStreamingContent('');
    setPendingContent('');
    setStreamingToEditor(false);
    setApprovedChanges(new Set());
    setRejectedChanges(new Set());
    
    // Clear Gemini chat history and reload with historical messages
    geminiService.clearChat();
  };

  // File management functions
  const handleFileRemove = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    
    // Close related tabs
    setOpenTabs(prev => {
      const filteredTabs = prev.filter(tab => {
        if (tab.type === 'pdf' && tab.data?.file?.id === fileId) {
          return false;
        }
        return true;
      });
      
      // If active tab was closed, switch to another
      if (activeTabId && !filteredTabs.find(tab => tab.id === activeTabId)) {
        setActiveTabId(filteredTabs.length > 0 ? filteredTabs[0].id : null);
      }
      
      return filteredTabs;
    });
  };

  const handleFileRename = (fileId, newName) => {
    setUploadedFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, name: newName } : file
    ));
    
    // Update related tabs
    setOpenTabs(prev => prev.map(tab => {
      if (tab.type === 'pdf' && tab.data?.file?.id === fileId) {
        return { ...tab, title: newName };
      }
      return tab;
    }));
  };

  const handleCreateFolder = (folderName) => {
    // For now, create a virtual folder representation
    const newFolder = {
      id: Date.now() + Math.random(),
      name: `📁 ${folderName}`,
      type: 'folder',
      isFolder: true,
      children: [],
      uploadedAt: new Date().toISOString()
    };
    
    setUploadedFiles(prev => [...prev, newFolder]);
  };

  const handleCreateFile = (fileName) => {
    // Create a new empty text file
    const newFile = {
      id: Date.now() + Math.random(),
      name: fileName,
      type: fileName.split('.').pop()?.toLowerCase() || 'txt',
      size: 0,
      content: '', // Empty content
      isNew: true,
      uploadedAt: new Date().toISOString()
    };
    
    setUploadedFiles(prev => [...prev, newFile]);
    
    // Optionally open in editor if it's a text file
    const textTypes = ['txt', 'md', 'json', 'js', 'html', 'css'];
    if (textTypes.includes(newFile.type)) {
      // Create a document tab for text files
      const docTab = {
        id: `doc-${newFile.id}`,
        type: 'document',
        title: fileName,
        data: { fileId: newFile.id }
      };
      setOpenTabs(prev => [...prev, docTab]);
      setActiveTabId(docTab.id);
    }
  };

  const handlePasteFile = (newFile) => {
    // Handle pasted file by adding it to the files list
    setUploadedFiles(prev => [...prev, newFile]);
  };

  const handleViewFile = async (file) => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    // UDF dosyası kontrolü
    if (fileType === 'udf') {
      try {
        console.log('UDF dosyası açılıyor:', file.name);
        
        // Doğru file object'i belirle
        let fileToRead;
        if (window.electronAPI) {
          // Electron - path kullan
          fileToRead = file.path || file;
        } else {
          // Web - file object kullan
          fileToRead = file.file || file;
        }
        
        console.log('File to read:', fileToRead, 'Type:', typeof fileToRead);
        
        // UDF dosyasını doğrula
        const validation = await udfService.validateUDF(fileToRead);
        if (!validation.valid) {
          alert(`UDF dosyası geçersiz: ${validation.error}`);
          return;
        }
        
        // UDF dosyasını oku
        const udfData = await udfService.readUDF(fileToRead);
        
        // Yeni doküman tab'ı oluştur
        const docTab = {
          id: `udf-${file.id}`,
          type: 'document',
          title: file.name.replace('.udf', ''),
          data: { 
            fileId: file.id,
            isUDF: true,
            udfData: udfData
          }
        };
        
        // Tab'ı aç ve içeriği yükle
        setOpenTabs(prev => {
          const exists = prev.find(tab => tab.id === docTab.id);
          if (exists) return prev;
          return [...prev, docTab];
        });
        setActiveTabId(docTab.id);
        
        // Doküman içeriğini güncelle
        setCurrentDocument({
          id: file.id,
          name: file.name,
          title: file.name.replace('.udf', ''),
          content: udfData.content,
          hasChanges: false,
          aiChanges: [],
          isUDF: true,
          udfData: udfData
        });
        
        console.log('UDF dosyası başarıyla açıldı');
        return;
      } catch (error) {
        console.error('UDF dosyası açma hatası:', error);
        alert('UDF dosyası açılırken hata oluştu: ' + error.message);
        return;
      }
    }
    
    // Supported file types
    const supportedTypes = [
      'pdf', 
      'jpg', 'jpeg', 'png', 'gif', 'webp',  // Standard images
      'tiff', 'tif'  // TIFF images
    ];
    
    if (supportedTypes.includes(fileType)) {
      // Handle different file sources (Electron vs Web)
      let fileUrl;
      if (file.path) {
        // Electron - convert to file:// URL
        fileUrl = `file://${file.path}`;
      } else if (file.file) {
        // Web - create blob URL
        fileUrl = URL.createObjectURL(file.file);
      } else {
        console.error('No file path or file object found:', file);
        return;
      }

      // Create file viewer tab
      const fileTab = {
        id: `file-${file.id}`,
        type: 'pdf', // Keep as 'pdf' for now to reuse existing tab logic
        title: file.name,
        data: {
          fileUrl: fileUrl,
          fileType: fileType,
          file: file
        }
      };
      
      // Check if tab already exists
      const existingTab = openTabs.find(tab => tab.id === fileTab.id);
      if (existingTab) {
        setActiveTabId(fileTab.id);
      } else {
        setOpenTabs(prev => [...prev, fileTab]);
        setActiveTabId(fileTab.id);
      }
    } else {
      alert(`Dosya türü desteklenmiyor: ${fileType?.toUpperCase() || 'UNKNOWN'}\n\nDesteklenen türler:\n• UDF (UYAP Doküman Formatı)\n• PDF\n• JPG, JPEG, PNG, GIF, WEBP\n• TIFF, TIF`);
    }
  };

  // AI Chat handlers with real Gemini API
  // Handle AI message sending with streaming
  const handleAISendMessage = async (message, attachments = []) => {
    if (!message.trim()) return;
    
    // Add user message immediately
    const userMessage = {
      id: Date.now(),
      content: message,
      role: 'user',
      timestamp: new Date().toISOString(),
      attachments: attachments // Eklenen dosyaları mesaja dahil et
    };
    
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    
    // Generate chat title on first message
    if (chatMessages.length === 0) {
      const newTitle = generateChatTitle(message);
      setChatTitle(newTitle);
    }
    
    // Create checkpoint for user message
    createCheckpoint(updatedMessages.length - 1, currentDocument);
    
    // Start streaming AI response
    setIsAITyping(true);
    setIsStreaming(true);
    setStreamingContent('');
    
    try {
      // Streaming response handlers
      let accumulatedContent = '';
      let isDocumentContent = false;
      let documentContent = '';
      
      const onChunk = (chunkText, fullContent) => {
        accumulatedContent = fullContent;
        setStreamingContent(fullContent);
        
        // Check if this is document content (between ```dilekce``` markers)
        const docMatch = fullContent.match(/```dilekce\n([\s\S]*?)(?:\n```|$)/);
        if (docMatch) {
          const newDocContent = docMatch[1];
          if (newDocContent !== documentContent) {
            documentContent = newDocContent;
            
            // Start streaming to editor if not already started
            if (!streamingToEditor && newDocContent.length > 0) {
              setStreamingToEditor(true);
              startEditorStreaming(newDocContent);
            } else if (streamingToEditor) {
              // Update pending content for editor
              setPendingContent(newDocContent);
            }
          }
        }
      };
      
      const onComplete = (response) => {
        console.log('🚀 AI Response Complete - DEBUG START');
        
        // Extract document content if present
        const docMatch = response.content.match(/```dilekce\n([\s\S]*?)(?:\n```|$)/);
        if (docMatch) {
          const documentContent = docMatch[1];
          
          console.log('📝 Document content found:', documentContent.substring(0, 100) + '...');
          
          // Format the AI content for proper HTML structure
          const formattedContent = textFormattingService.formatForTipTap(documentContent);
          
          // Determine AI text state based on content
          const currentContent = currentDocument.content;
          
          console.log('🔍 Current content:', currentContent ? currentContent.substring(0, 100) + '...' : 'EMPTY');
          console.log('🆕 New content:', formattedContent.substring(0, 100) + '...');
          
          if (!currentContent || currentContent.trim() === '') {
            // İlk kez metin yazılıyor - pending state
            console.log('✨ Setting AI state to PENDING');
            setAiTextState('pending');
            setOriginalText('');
            setPendingContent(formattedContent); // Raw content for approval/reject
            setPendingChanges([]);
            
            // Document'ı diff marker'larıyla güncelle
            const pendingMarkedContent = textFormattingService.markTextAsPending(formattedContent);
            console.log('🔵 Pending marked content:', pendingMarkedContent.substring(0, 100) + '...');
            
            setCurrentDocument(prev => ({
              ...prev,
              content: pendingMarkedContent, // Content with diff markers
              hasChanges: true
            }));
            
            // Update the active tab with diff markers
            setOpenTabs(prev => prev.map(tab => 
              tab.id === activeTabId 
                ? { ...tab, data: { ...tab.data, content: pendingMarkedContent, hasChanges: true } }
                : tab
            ));
            
          } else {
            // Mevcut metin değiştiriliyor - changes state
            console.log('🔄 Setting AI state to CHANGES');
            setAiTextState('changes');
            setOriginalText(currentContent);
            
            // Yeni diff sistemi ile değişiklikleri hesapla
            const changeId = textFormattingService.addPendingChange(
              currentContent, 
              formattedContent, 
              'replace'
            );
            
            const pendingChange = textFormattingService.getPendingChange(changeId);
            if (pendingChange) {
              console.log('📊 Pending changes:', pendingChange.changes);
              setPendingChanges(pendingChange.changes);
              
              // Document'ı diff highlight'larıyla güncelle
              const diffResult = textFormattingService.getPendingTextWithHighlights(currentContent, formattedContent);
              console.log('🔄 Diff highlighted content:', diffResult.highlightedText.substring(0, 100) + '...');
              
              setCurrentDocument(prev => ({
                ...prev,
                content: diffResult.highlightedText, // Content with diff markers
                hasChanges: true
              }));
              
              // Update the active tab
              setOpenTabs(prev => prev.map(tab => 
                tab.id === activeTabId 
                  ? { ...tab, data: { ...tab.data, content: diffResult.highlightedText, hasChanges: true } }
                  : tab
              ));
            }
          }
          
          // Clear old pending content
          setPendingContent('');
        }
        
        console.log('🏁 AI Response Complete - DEBUG END');
        // Add final AI message to chat
        const aiMessage = {
          id: Date.now() + 1,
          content: response.content,
          role: 'assistant',
          timestamp: response.timestamp,
          model: response.model
        };
        
        const finalMessages = [...updatedMessages, aiMessage];
        setChatMessages(finalMessages);
        
        // Reset streaming states
        setIsStreaming(false);
        setStreamingContent('');
        setStreamingToEditor(false);
        
        // Create checkpoint for AI message
        createCheckpoint(finalMessages.length - 1, currentDocument);
      };
      
      const onError = (error) => {
        console.error('Streaming error:', error);
        
        // Add error message
        const errorMessage = {
          id: Date.now() + 1,
          content: `Üzgünüm, bir hata oluştu: ${error}\n\nLütfen tekrar deneyin veya daha kısa bir mesaj gönderin.`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          isError: true
        };
        
        setChatMessages([...updatedMessages, errorMessage]);
        
        // Reset streaming states
        setIsStreaming(false);
        setStreamingContent('');
        setStreamingToEditor(false);
      };
      
      // Start streaming with attachments
      await geminiService.sendMessageStream(
        message,
        attachments,
        onChunk
      ).then(response => {
        onComplete({
          content: response.text,
          timestamp: new Date().toISOString(),
          model: 'gemini-2.0-flash'
        });
      }).catch(onError);
      
    } catch (error) {
      console.error('AI message error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        content: `Üzgünüm, bir hata oluştu: ${error.message}\n\nLütfen tekrar deneyin veya daha kısa bir mesaj gönderin.`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setChatMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsAITyping(false);
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingToEditor(false);
    }
  };

  // Generate chat title based on first user message
  const generateChatTitle = (message) => {
    const words = message.split(' ').slice(0, 4);
    return words.join(' ') + (message.split(' ').length > 4 ? '...' : '');
  };

  // Handle clear chat messages
  const handleClearChat = () => {
    // Save current chat to history if it has messages
    if (chatMessages.length > 0) {
      const chatToSave = {
        id: Date.now(),
        title: chatTitle || 'Yeni Sohbet',
        messages: [...chatMessages],
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [chatToSave, ...prev.slice(0, 9)]); // Keep last 10 chats
    }
    
    setChatMessages([]);
    setChatTitle('');
    setCheckpoints([]);
    setEditMode(null);
    setIsStreaming(false);
    setStreamingContent('');
    setPendingContent('');
    setStreamingToEditor(false);
    setApprovedChanges(new Set());
    setRejectedChanges(new Set());
    
    // Clear new AI text state
    setAiTextState(null);
    setOriginalText('');
    setPendingChanges([]);
    
    // Clear textFormattingService state
    textFormattingService.clearAllPendingChanges();
    
    // Clear Gemini chat history
    geminiService.clearChat();
  };

  // Workspace handlers
  const handleOpenProject = async () => {
    console.log('Opening project workspace...');
    
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.openFolderDialog();
        console.log('Folder selection result:', result);
        
        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
          const workspacePath = result.filePaths[0];
          const workspaceName = workspacePath.split(/[/\\]/).pop() || 'Workspace';
          
          const workspace = {
            path: workspacePath,
            name: workspaceName,
            openedAt: new Date().toISOString()
          };
          
          setCurrentWorkspace(workspace);
          
          // Workspace'i kalıcı olarak kaydet
          await window.electronAPI.store.set('currentWorkspace', workspace);
          
          // File watcher'ı başlat
          await window.electronAPI.watchWorkspace(workspacePath);
          
          console.log('Workspace opened:', workspace);
          setActiveView('editor');
        }
      } catch (error) {
        console.error('Workspace opening error:', error);
        alert('Proje klasörü açılırken hata oluştu: ' + error.message);
      }
    } else {
      // Web fallback - LocalStorage kullan
      const workspacePath = prompt('Proje klasör yolunu girin:');
      if (workspacePath) {
        const workspace = {
          path: workspacePath,
          name: workspacePath.split(/[/\\]/).pop() || 'Proje',
          openedAt: new Date().toISOString()
        };
        setCurrentWorkspace(workspace);
        localStorage.setItem('currentWorkspace', JSON.stringify(workspace));
        setActiveView('editor');
      }
    }
  };

  const handleCloseWorkspace = async () => {
    // File watcher'ı durdur
    if (window.electronAPI) {
      await window.electronAPI.watchWorkspace(null);
      window.electronAPI.removeWorkspaceFileListener();
    }
    
    setCurrentWorkspace(null);
    if (window.electronAPI) {
      await window.electronAPI.store.set('currentWorkspace', null);
    } else {
      localStorage.removeItem('currentWorkspace');
    }
    setActiveView('welcome');
  };

  // Workspace dosyalarını yükle
  const loadWorkspaceFiles = async () => {
    if (!currentWorkspace || !window.electronAPI) return;

    try {
      const workspaceFiles = await window.electronAPI.listWorkspaceFiles(currentWorkspace.path);
      console.log('Workspace files loaded:', workspaceFiles.length);
      
      // Workspace dosyalarını mevcut dosyalar listesine ekle
      setUploadedFiles(prev => {
        // Workspace dosyalarını filtrele (duplicates önlemek için)
        const nonWorkspaceFiles = prev.filter(file => !file.isWorkspaceFile);
        return [...nonWorkspaceFiles, ...workspaceFiles.map(file => ({
          ...file,
          id: Date.now() + Math.random(),
          uploadedAt: new Date().toISOString()
        }))];
      });
    } catch (error) {
      console.error('Workspace files loading error:', error);
    }
  };

  // Workspace değiştiğinde dosyaları yükle ve file watcher başlat
  useEffect(() => {
    if (currentWorkspace) {
      loadWorkspaceFiles();
      
      // File watcher event listener'ı ekle
      if (window.electronAPI) {
        window.electronAPI.onWorkspaceFileChange((fileInfo) => {
          console.log('File change detected:', fileInfo);
          
          if (fileInfo.event === 'add') {
            // Yeni dosya eklendi
            const newFile = {
              ...fileInfo,
              id: Date.now() + Math.random(),
              uploadedAt: new Date().toISOString()
            };
            
            setUploadedFiles(prev => {
              // Duplicate kontrolü
              const exists = prev.find(f => f.path === fileInfo.path);
              if (exists) return prev;
              return [...prev, newFile];
            });
          } else if (fileInfo.event === 'unlink') {
            // Dosya silindi
            setUploadedFiles(prev => prev.filter(f => f.path !== fileInfo.path));
          } else if (fileInfo.event === 'change') {
            // Dosya değişti
            setUploadedFiles(prev => prev.map(f => 
              f.path === fileInfo.path 
                ? { ...f, size: fileInfo.size, lastModified: fileInfo.lastModified }
                : f
            ));
          }
        });
      }
    }
    
    // Cleanup function
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeWorkspaceFileListener();
      }
    };
  }, [currentWorkspace]);

  const handleOpenSettingsFromLogin = () => {
    setPreviousView('login');
    setActiveView('settings');
  };

  const handleOpenSettings = () => {
    setPreviousView(activeView);
    setActiveView('settings');
  };

  const handleContinueToApp = () => {
    setActiveView('editor');
  };

  // Handle restoring to a checkpoint with edit capability
  const handleRestoreCheckpoint = (messageIndex) => {
    // Find the checkpoint for this message
    const checkpoint = checkpoints.find(cp => cp.messageIndex === messageIndex);
    if (!checkpoint) return;

    // Get the message to edit
    const messageToEdit = chatMessages[messageIndex];
    
    // Restore chat messages (keep messages up to this point)
    const restoredMessages = chatMessages.slice(0, messageIndex);
    setChatMessages(restoredMessages);

    // Restore document state
    setCurrentDocument(checkpoint.documentState);
    
    // Clear checkpoints after this point
    const restoredCheckpoints = checkpoints.filter(cp => cp.messageIndex < messageIndex);
    setCheckpoints(restoredCheckpoints);
    
    // Enter edit mode for the restored message
    if (messageToEdit && messageToEdit.role === 'user') {
      setEditMode({
        messageIndex,
        originalMessage: messageToEdit.content
      });
    }
  };

  // Handle exiting edit mode
  const handleExitEditMode = () => {
    setEditMode(null);
  };

  // Handle sending edited message
  const handleSendEditedMessage = async (editedMessage, attachments = []) => {
    if (!editMode) return;
    
    // Exit edit mode
    setEditMode(null);
    
    // Send the edited message with attachments
    await handleAISendMessage(editedMessage, attachments);
  };

  // Create checkpoint when message is added
  const createCheckpoint = (messageIndex, documentState) => {
    const checkpoint = {
      id: Date.now(),
      messageIndex,
      documentState: { ...documentState },
      timestamp: new Date().toISOString()
    };
    
    setCheckpoints(prev => [...prev, checkpoint]);
  };

  // Handle approving pending content (ilk kez yazılan metin)
  const handleApprovePendingContent = () => {
    try {
      // Pending content'i onayla ve normal duruma getir
      const cleanContent = textFormattingService.clearDiffHighlights(currentDocument.content);
      
      setCurrentDocument(prev => ({
        ...prev,
        content: cleanContent,
        hasChanges: true
      }));
      
      // Update active tab
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, data: { ...tab.data, content: cleanContent, hasChanges: true } }
          : tab
      ));
      
      // Reset AI text state
      setAiTextState(null);
      setOriginalText('');
      setPendingContent('');
      setPendingChanges([]);
      
      console.log('AI tarafından oluşturulan metin onaylandı');
    } catch (error) {
      console.error('Pending content onaylanırken hata:', error);
    }
  };

  // Handle rejecting pending content (ilk kez yazılan metin)
  const handleRejectPendingContent = () => {
    try {
      // Content'i temizle veya eski haline getir
      const restoredContent = originalText || '';
      
      setCurrentDocument(prev => ({
        ...prev,
        content: restoredContent,
        hasChanges: false
      }));
      
      // Update active tab
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, data: { ...tab.data, content: restoredContent, hasChanges: false } }
          : tab
      ));
      
      // Reset AI text state
      setAiTextState(null);
      setOriginalText('');
      setPendingContent('');
      setPendingChanges([]);
      
      console.log('AI tarafından oluşturulan metin reddedildi');
    } catch (error) {
      console.error('Pending content reddedilirken hata:', error);
    }
  };

  // Handle approving all changes (metin değişiklikleri)
  const handleApproveAllChanges = () => {
    try {
      // Tüm pending değişiklikleri onayla
      const currentPendingChanges = textFormattingService.getPendingChanges();
      currentPendingChanges.forEach(change => {
        textFormattingService.approveChange(change.id);
      });

      // Diff highlight'ları temizle
      const cleanContent = textFormattingService.clearDiffHighlights(currentDocument.content);
      
      setCurrentDocument(prev => ({
        ...prev,
        content: cleanContent,
        hasChanges: true
      }));
      
      // Update active tab
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, data: { ...tab.data, content: cleanContent, hasChanges: true } }
          : tab
      ));

      // Reset AI text state
      setAiTextState(null);
      setOriginalText('');
      setPendingChanges([]);
      
      console.log('AI değişiklikleri onaylandı');
    } catch (error) {
      console.error('Değişiklikleri onaylarken hata:', error);
    }
  };

  // Handle rejecting all changes (metin değişiklikleri)
  const handleRejectAllChanges = () => {
    try {
      // Tüm pending değişiklikleri reddet
      const currentPendingChanges = textFormattingService.getPendingChanges();
      currentPendingChanges.forEach(change => {
        textFormattingService.rejectChange(change.id);
      });

      // Original text'e geri dön
      if (originalText) {
        setCurrentDocument(prev => ({
          ...prev,
          content: originalText,
          hasChanges: false
        }));
        
        // Update active tab
        setOpenTabs(prev => prev.map(tab => 
          tab.id === activeTabId 
            ? { ...tab, data: { ...tab.data, content: originalText, hasChanges: false } }
            : tab
        ));
      }

      // Reset AI text state
      setAiTextState(null);
      setOriginalText('');
      setPendingChanges([]);
      
      console.log('AI değişiklikleri reddedildi');
    } catch (error) {
      console.error('Değişiklikleri reddederken hata:', error);
    }
  };

  // Handle approving a change (legacy - eski sistem ile uyumluluk)
  const handleApproveChange = (changeId) => {
    if (changeId === 'all') {
      handleApproveAllChanges();
    } else {
      setApprovedChanges(prev => new Set([...prev, changeId]));
      setRejectedChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(changeId); // Remove from rejected if exists
        return newSet;
      });
    }
  };

  // Handle rejecting a change (legacy ve yeni sistem için)
  const handleRejectChange = (changeId) => {
    if (changeId === 'all') {
      handleRejectAllChanges();
      return;
    }

    // Eski sistem ile uyumluluk
    const changeToReject = currentDocument.aiChanges.find(change => change.id === changeId);
    if (!changeToReject) return;
    
    setRejectedChanges(prev => new Set([...prev, changeId]));
    setApprovedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(changeId); // Remove from approved if exists
      return newSet;
    });
    
    let newContent = currentDocument.content;
    
    if (changeToReject.type === 'addition') {
      // Remove the added text from content
      const before = newContent.substring(0, changeToReject.start);
      const after = newContent.substring(changeToReject.end);
      newContent = before + after;
      
      // Adjust positions for remaining changes
      const remainingChanges = currentDocument.aiChanges
        .filter(change => change.id !== changeId)
        .map(change => {
          if (change.start > changeToReject.end) {
            const adjustment = changeToReject.end - changeToReject.start;
            return {
              ...change,
              start: change.start - adjustment,
              end: change.end - adjustment
            };
          }
          return change;
        });
      
      setCurrentDocument(prev => ({
        ...prev,
        content: newContent,
        aiChanges: remainingChanges
      }));
    } else if (changeToReject.type === 'deletion') {
      // Restore the deleted text to content
      const before = newContent.substring(0, changeToReject.start);
      const after = newContent.substring(changeToReject.start);
      newContent = before + changeToReject.text + after;
      
      // Adjust positions for remaining changes
      const remainingChanges = currentDocument.aiChanges
        .filter(change => change.id !== changeId)
        .map(change => {
          if (change.start >= changeToReject.start) {
            const adjustment = changeToReject.text.length;
            return {
              ...change,
              start: change.start + adjustment,
              end: change.end + adjustment
            };
          }
          return change;
        });
      
      setCurrentDocument(prev => ({
        ...prev,
        content: newContent,
        aiChanges: remainingChanges
      }));
    }
  };

  // Calculate diff highlights for DocumentEditor (no time limit)
  const calculateDiffHighlights = () => {
    // Show all AI changes until they're processed (no time expiration)
    const activeChanges = currentDocument.aiChanges.filter(change => {
      const isNotProcessed = !approvedChanges.has(change.id) && !rejectedChanges.has(change.id);
      return isNotProcessed; // Removed time limit
    });

    console.log('calculateDiffHighlights:', {
      totalChanges: currentDocument.aiChanges.length,
      activeChanges: activeChanges.length,
      changes: activeChanges
    });

    // Return changes in the format DocumentEditor expects
    return activeChanges.map(change => ({
      id: change.id,
      type: change.type,
      start: change.start,
      end: change.end,
      text: change.text,
      timestamp: change.timestamp
    }));
  };

  // Enhanced function to create AI changes with proper positioning
  const createAIChange = (newContent, originalContent, type = 'addition') => {
    const timestamp = Date.now();
    const changeId = `change_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (type === 'addition' && !originalContent) {
      // Complete replacement
      return {
        id: changeId,
        type: 'addition',
        text: newContent,
        start: 0,
        end: newContent.length,
        timestamp: new Date().toISOString()
      };
    }
    
    if (type === 'addition' && originalContent) {
      // Append operation
      const start = originalContent.length;
      const separator = originalContent ? '\n\n' : '';
      return {
        id: changeId,
        type: 'addition',
        text: separator + newContent,
        start: start,
        end: start + separator.length + newContent.length,
        timestamp: new Date().toISOString()
      };
    }
    
    // Default case
    return {
      id: changeId,
      type: type,
      text: newContent,
      start: 0,
      end: newContent.length,
      timestamp: new Date().toISOString()
    };
  };

  // Optimized diff calculation with caching
  const diffCache = useRef(new Map());
  const calculateTextDiff = useCallback((oldText, newText) => {
    if (!oldText && !newText) return [];
    
    // Create cache key
    const cacheKey = `${(oldText || '').length}_${(newText || '').length}_${(oldText || '').substring(0, 20)}_${(newText || '').substring(0, 20)}`;
    if (diffCache.current.has(cacheKey)) {
      return diffCache.current.get(cacheKey);
    }
    
    const timestamp = new Date().toISOString();
    const changes = [];
    
    // Handle edge cases quickly
    if (!oldText && newText) {
      const result = [{
        id: `add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'addition',
        start: 0,
        end: newText.length,
        text: newText,
        timestamp
      }];
      diffCache.current.set(cacheKey, result);
      return result;
    }
    
    if (oldText && !newText) {
      const result = [{
        id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'deletion',
        start: 0,
        end: 0,
        text: oldText,
        timestamp
      }];
      diffCache.current.set(cacheKey, result);
      return result;
    }

    // Skip diff calculation if texts are identical
    if (oldText === newText) {
      diffCache.current.set(cacheKey, []);
      return [];
    }

    // Use simplified diff for performance
    try {
      const dmp = new DiffMatchPatch();
      
      // Set timeout to prevent long calculations
      dmp.Diff_Timeout = 0.5; // 500ms timeout
      
      // Calculate diffs with timeout
      const diffs = dmp.diff_main(oldText, newText);
      
      // Simple cleanup without semantic analysis for performance
      dmp.diff_cleanupEfficiency(diffs);
      
      // Convert diffs to our format (simplified)
      let position = 0;
      
      diffs.forEach((diff, index) => {
        const [operation, text] = diff;
        
        // Skip very small changes for performance
        if (!text || text.length < 2) {
          if (operation === DiffMatchPatch.DIFF_EQUAL) {
            position += text.length;
          }
          return;
        }
        
        switch (operation) {
          case DiffMatchPatch.DIFF_DELETE:
            changes.push({
              id: `del_${Date.now()}_${index}`,
              type: 'deletion',
              start: position,
              end: position,
              text: text,
              timestamp
            });
            break;
            
          case DiffMatchPatch.DIFF_INSERT:
            changes.push({
              id: `add_${Date.now()}_${index}`,
              type: 'addition',
              start: position,
              end: position + text.length,
              text: text,
              timestamp
            });
            position += text.length;
            break;
            
          case DiffMatchPatch.DIFF_EQUAL:
            position += text.length;
            break;
        }
      });
      
      // Cache the result
      diffCache.current.set(cacheKey, changes);
      
      // Limit cache size
      if (diffCache.current.size > 20) {
        const firstKey = diffCache.current.keys().next().value;
        diffCache.current.delete(firstKey);
      }
      
    } catch (error) {
      console.warn('Diff calculation error, using simple diff:', error);
      // Fallback to simple diff
      const result = [{
        id: `add_${Date.now()}`,
        type: 'addition',
        start: 0,
        end: newText.length,
        text: newText,
        timestamp
      }];
      diffCache.current.set(cacheKey, result);
      return result;
    }
    
    return changes;
  }, []);



  // Handle accepting text suggestions with real diff tracking
  const handleAcceptTextSuggestion = (suggestionText, mode = 'replace') => {
    console.log('Accepting text suggestion:', suggestionText.substring(0, 100) + '...', 'Mode:', mode);
    
    // Format the suggestion text for proper HTML structure
    const formattedSuggestion = textFormattingService.formatForTipTap(suggestionText);
    
    if (mode === 'replace') {
      // Use pending content if available, otherwise use suggestion text
      const contentToAdd = pendingContent || formattedSuggestion;
      
      // For replace mode, completely replace the document content
      let finalContent = contentToAdd;
      
      const newDocumentState = {
        ...currentDocument,
        content: finalContent,
        hasChanges: true,
        aiChanges: [] // Clear previous AI changes since content is accepted
      };
      
      // Update both currentDocument and the active tab
      setCurrentDocument(newDocumentState);
      
      // Update the active tab's content
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, data: { ...tab.data, content: finalContent, hasChanges: true, aiChanges: [] } }
          : tab
      ));
      
      // Clear pending content and streaming states
      setPendingContent('');
      setStreamingToEditor(false);
      
      // Clear approval states for new content
      setApprovedChanges(new Set());
      setRejectedChanges(new Set());
      
      // Create checkpoint after accepting suggestion
      createCheckpoint(chatMessages.length - 1, newDocumentState);
    } else if (mode === 'append') {
      // Append to existing content
      const separator = currentDocument.content ? '\n\n' : '';
      const newContent = currentDocument.content + separator + formattedSuggestion;
      
      const newDocumentState = {
        ...currentDocument,
        content: newContent,
        hasChanges: true,
        aiChanges: []
      };
      
      // Update both currentDocument and the active tab
      setCurrentDocument(newDocumentState);
      
      // Update the active tab's content
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, data: { ...tab.data, content: newContent, hasChanges: true, aiChanges: [] } }
          : tab
      ));
      
      // Clear pending states
      setPendingContent('');
      setStreamingToEditor(false);
      
      // Create checkpoint after accepting suggestion
      createCheckpoint(chatMessages.length - 1, newDocumentState);
    }
  };

  // Start streaming text to editor (character by character)
  const startEditorStreaming = async (content) => {
    setPendingContent('');
    
    // Stream character by character to editor (faster)
    for (let i = 0; i < content.length; i++) {
      const partialContent = content.substring(0, i + 1);
      setPendingContent(partialContent);
      
      // Faster delay for typewriter effect
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Break if streaming was cancelled
      if (!streamingToEditor) break;
    }
  };

  if (isLoading) {
    return null; // Loading screen is handled by HTML
  }

  console.log('App rendering with activeView:', activeView);

  // Show login screen on first visit
  if (activeView === 'login') {
    return (
      <LoginScreen
        onOpenProject={handleOpenProject}
        onOpenSettings={handleOpenSettingsFromLogin}
        onContinue={handleContinueToApp}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        onOpenTraining={() => setActiveView('training')}
      />
    );
  }

  // Show welcome screen only on first visit
  if (activeView === 'welcome') {
    return (
      <div className="h-screen bg-background text-foreground">
        <WelcomeScreen 
          onGetStarted={() => setActiveView('editor')}
          onOpenProject={handleOpenProject}
          onUploadFile={handleFileUpload}
        />
      </div>
    );
  }

  // Show settings panel if needed
  if (activeView === 'settings') {
    return (
      <div className="h-screen bg-background text-foreground">
        <SettingsPanel 
          onBack={() => setActiveView(previousView)}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
        />
      </div>
    );
  }

  // Show AI training panel if needed
  if (activeView === 'training') {
    return (
      <div className="h-screen bg-background text-foreground">
        <AITrainingPanel />
      </div>
    );
  }

  // Main Cursor-like Layout
  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Header Bar */}
      <HeaderBar 
        currentDocument={currentDocument}
        onExport={handleExport}
        onNewDocument={handleNewDocument}
        onOpenSettings={handleOpenSettings}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      {/* 3-Panel Layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar - File Explorer */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <FileExplorer 
            files={uploadedFiles}
            onFileUpload={handleFileUpload}
            onFileSelect={handleFileSelect}
            onViewFile={handleViewFile}
            currentWorkspace={currentWorkspace}
            selectedFile={selectedFile}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Editor */}
        <ResizablePanel defaultSize={55} minSize={40}>
          <DocumentEditor 
            content={currentDocument.content}
            onChange={handleDocumentChange}
            onSave={handleDocumentSave}
            aiChanges={currentDocument.aiChanges}
            isAIProcessing={isAITyping}
            diffHighlights={calculateDiffHighlights()}
            onApproveChange={handleApproveChange}
            onRejectChange={handleRejectChange}
            pendingContent={pendingContent}
            isStreamingToEditor={streamingToEditor}
            onApprovePendingContent={handleApprovePendingContent}
            onRejectPendingContent={handleRejectPendingContent}
            onAcceptTextSuggestion={handleAcceptTextSuggestion}
            openTabs={openTabs}
            activeTabId={activeTabId}
            onTabChange={handleTabChange}
            onTabClose={handleTabClose}
            onTabRename={handleTabRename}
            // Yeni AI diff sistemi props'ları
            aiTextState={aiTextState}
            originalText={originalText}
            pendingChanges={pendingChanges}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Sidebar - AI Chat */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <AIChatPanel 
            messages={chatMessages}
            onSendMessage={editMode ? handleSendEditedMessage : handleAISendMessage}
            onClearChat={handleClearChat}
            isAITyping={isAITyping}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onAcceptTextSuggestion={handleAcceptTextSuggestion}
            onRestoreCheckpoint={handleRestoreCheckpoint}
            onExitEditMode={handleExitEditMode}
            onSendEditedMessage={handleSendEditedMessage}
            editMode={editMode}
            uploadedFiles={uploadedFiles} // Yüklenen dosyaları AI chat paneline gönder
            openTabs={openTabs} // Açık sekmeler listesi
            chatTitle={chatTitle}
            chatHistory={chatHistory}
            onLoadChatFromHistory={handleLoadChatFromHistory}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default App; 