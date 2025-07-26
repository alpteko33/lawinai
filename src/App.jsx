import React, { useState, useEffect } from 'react';
import { FileText, MessageSquare, Settings, Upload, Bot, Scale } from 'lucide-react';
import HeaderBar from './components/HeaderBar';
import LeftSidebar from './components/LeftSidebar';
import DocumentEditor from './components/DocumentEditor';
import AIChatPanel from './components/AIChatPanel';
import WelcomeScreen from './components/WelcomeScreen';
import LoginScreen from './components/LoginScreen';
import SettingsPanel from './components/SettingsPanel';
import geminiService from './services/geminiService';
import udfService from './services/udfService';
import DiffMatchPatch from 'diff-match-patch';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

function App() {
  const [activeView, setActiveView] = useState('login'); // login, welcome, editor, settings
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
  const [currentDocument, setCurrentDocument] = useState({
    name: 'Yeni Dilekçe',
    title: 'Hukuki Metin', // UDF export için başlık
    content: '',
    hasChanges: false,
    aiChanges: [] // Track AI-suggested changes with positions
  });
  const [isAITyping, setIsAITyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  
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

  // Force refresh highlights every second to remove expired ones
  useEffect(() => {
    const timer = setInterval(() => {
      setHighlightRefresh(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
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
    // Implement document save logic
    setCurrentDocument(prev => ({
      ...prev,
      hasChanges: false,
      lastSaved: new Date().toISOString()
    }));
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
            filePaths.forEach((filePath, index) => {
              const fileName = filePath.split('/').pop() || filePath.split('\\').pop(); // Handle both Unix and Windows paths
              const fileExtension = fileName.split('.').pop().toLowerCase();
              
              const newFile = {
                id: Date.now() + index,
                name: fileName,
                path: filePath,
                type: fileExtension,
                size: 0, // Electron could provide this if we implement file stats
                uploadedAt: new Date().toISOString()
              };
              
              console.log('Adding new Electron file:', newFile);
              setUploadedFiles(prev => {
                const updated = [...prev, newFile];
                console.log('Updated files list after Electron upload:', updated);
                return updated;
              });
            });
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

  const handleFileSelect = (file) => {
    console.log('Selected file:', file);
    // Implement file selection logic
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
        // Extract document content if present
        const docMatch = response.content.match(/```dilekce\n([\s\S]*?)(?:\n```|$)/);
        if (docMatch) {
          const documentContent = docMatch[1];
          
          // Calculate diff between current content and new content
          const oldContent = currentDocument.content;
          const diffChanges = calculateTextDiff(oldContent, documentContent);
          
          // Update document with new content and AI changes for highlighting
          const updatedDocument = {
            ...currentDocument,
            content: documentContent, // Set new content immediately
            aiChanges: diffChanges, // Set changes for highlighting
            hasChanges: true
          };
          
          // Update both currentDocument and the active tab
          setCurrentDocument(updatedDocument);
          
          // Update the active tab's content
          setOpenTabs(prev => prev.map(tab => 
            tab.id === activeTabId 
              ? { ...tab, data: { ...tab.data, content: documentContent, aiChanges: diffChanges, hasChanges: true } }
              : tab
          ));
          
          // Clear pending content since we've applied changes
          setPendingContent('');
        }
        
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

  // Handle clear chat messages
  const handleClearChat = () => {
    setChatMessages([]);
    setCheckpoints([]);
    setEditMode(null);
    setIsStreaming(false);
    setStreamingContent('');
    setPendingContent('');
    setStreamingToEditor(false);
    setApprovedChanges(new Set());
    setRejectedChanges(new Set());
    
    // Clear Gemini chat history
    geminiService.clearChat();
  };

  // Login screen handlers
  const handleOpenProject = async () => {
    console.log('Opening project...');
    // Implement project opening logic
    setActiveView('editor');
  };

  const handleOpenSettingsFromLogin = () => {
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

  // Handle approving a change
  const handleApproveChange = (changeId) => {
    setApprovedChanges(prev => new Set([...prev, changeId]));
    setRejectedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(changeId); // Remove from rejected if exists
      return newSet;
    });
  };

  // Handle rejecting a change
  const handleRejectChange = (changeId) => {
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

  // Professional diff using Google's diff-match-patch algorithm
  const calculateTextDiff = (oldText, newText) => {
    if (!oldText && !newText) return [];
    
    const timestamp = new Date().toISOString();
    const changes = [];
    
    // Handle edge cases
    if (!oldText && newText) {
      changes.push({
        id: `add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'addition',
        start: 0,
        end: newText.length,
        text: newText,
        timestamp
      });
      return changes;
    }
    
    if (oldText && !newText) {
      changes.push({
        id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'deletion',
        start: 0,
        end: 0,
        text: oldText,
        timestamp
      });
      return changes;
    }

    // Use Google's diff-match-patch for professional text diffing
    const dmp = new DiffMatchPatch();
    
    // Calculate diffs
    const diffs = dmp.diff_main(oldText, newText);
    
    // Clean up semantic diffs for better results
    dmp.diff_cleanupSemantic(diffs);
    
    // Convert diffs to our format
    let position = 0;
    
    diffs.forEach((diff, index) => {
      const [operation, text] = diff;
      
      // Skip empty or whitespace-only changes
      if (!text || text.trim().length === 0) {
        if (operation === DiffMatchPatch.DIFF_EQUAL) {
          position += text.length;
        }
        return;
      }
      
      switch (operation) {
        case DiffMatchPatch.DIFF_DELETE:
          // Text was deleted
          changes.push({
            id: `del_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'deletion',
            start: position,
            end: position,
            text: text,
            timestamp
          });
          // Don't advance position for deletions
          break;
          
        case DiffMatchPatch.DIFF_INSERT:
          // Text was added
          changes.push({
            id: `add_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'addition',
            start: position,
            end: position + text.length,
            text: text,
            timestamp
          });
          position += text.length;
          break;
          
        case DiffMatchPatch.DIFF_EQUAL:
          // Text is the same, just advance position
          position += text.length;
          break;
      }
    });
    
    console.log('Diff-match-patch results:', {
      oldText: oldText.substring(0, 50) + '...',
      newText: newText.substring(0, 50) + '...',
      diffs: diffs.slice(0, 5), // First 5 diffs for debugging
      changes: changes.length
    });
    
    return changes;
  };

  // Handle approving pending content
  const handleApprovePendingContent = () => {
    if (pendingContent) {
      // Replace document content with pending content (not append)
      const finalContent = pendingContent;
      
      const newDocumentState = {
        ...currentDocument,
        content: finalContent,
        hasChanges: true
      };
      
      setCurrentDocument(newDocumentState);
      
      // Clear pending states
      setPendingContent('');
      setStreamingToEditor(false);
      
      // Create checkpoint
      createCheckpoint(chatMessages.length - 1, newDocumentState);
    }
  };

  // Handle rejecting pending content
  const handleRejectPendingContent = () => {
    setPendingContent('');
    setStreamingToEditor(false);
  };

  // Handle accepting text suggestions with real diff tracking
  const handleAcceptTextSuggestion = (suggestionText, mode = 'replace') => {
    console.log('Accepting text suggestion:', suggestionText.substring(0, 100) + '...', 'Mode:', mode);
    
    if (mode === 'replace') {
      // Use pending content if available, otherwise use suggestion text
      const contentToAdd = pendingContent || suggestionText;
      
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
      const newContent = currentDocument.content + separator + suggestionText;
      
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
      />
    );
  }

  // Show welcome screen only on first visit
  if (activeView === 'welcome') {
    return (
      <div className="h-screen bg-background text-foreground">
        <WelcomeScreen 
          onGetStarted={() => setActiveView('editor')}
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
          onBack={() => setActiveView('login')}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
        />
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
        onOpenSettings={() => setActiveView('settings')}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      {/* 3-Panel Layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar - Files, Templates, etc. */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <LeftSidebar 
            files={uploadedFiles}
            onFileUpload={handleFileUpload}
            onFileSelect={handleFileSelect}
            onNewDocument={handleNewDocument}
            currentDocument={currentDocument}
            onViewFile={handleViewFile}
            onFileRemove={handleFileRemove}
            onFileRename={handleFileRename}
            onCreateFolder={handleCreateFolder}
            onCreateFile={handleCreateFile}
            onPasteFile={handlePasteFile}
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
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default App; 