import React, { useState, useEffect } from 'react';
import { FileText, MessageSquare, Settings, Upload, Bot, Scale } from 'lucide-react';
import HeaderBar from './components/HeaderBar';
import LeftSidebar from './components/LeftSidebar';
import DocumentEditor from './components/DocumentEditor';
import AIChatPanel from './components/AIChatPanel';
import WelcomeScreen from './components/WelcomeScreen';
import SettingsPanel from './components/SettingsPanel';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

function App() {
  const [activeView, setActiveView] = useState('editor'); // welcome, editor, settings
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Document Editor State
  const [currentDocument, setCurrentDocument] = useState({
    id: null,
    title: 'Yeni Dilekçe',
    content: '',
    hasChanges: false,
    aiChanges: [],
    lastSaved: null
  });
  
  // AI Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [isAITyping, setIsAITyping] = useState(false);

  // App initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Hide loading screen
        document.body.classList.add('app-loaded');
        
        // Load saved API key
        if (window.electronAPI) {
          const savedApiKey = await window.electronAPI.security.getApiKey();
          if (savedApiKey) {
            setApiKey(savedApiKey);
          }
        }
        
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
      title: 'Yeni Dilekçe',
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

  // File handlers
  const handleFileUpload = async () => {
    if (window.electronAPI) {
      const files = await window.electronAPI.openFileDialog();
      if (files) {
        const newFiles = files.map(filePath => ({
          id: Date.now() + Math.random(),
          name: filePath.split(/[\\/]/).pop(),
          path: filePath,
          type: filePath.split('.').pop().toLowerCase(),
          size: 0, // Will be filled by actual file size
          uploadedAt: new Date().toISOString()
        }));
        
        setUploadedFiles(prev => [...prev, ...newFiles]);
        
        // Switch to editor view after file upload
        if (activeView === 'welcome') {
          setActiveView('editor');
        }
      }
    }
  };

  const handleFileSelect = (file) => {
    console.log('File selected:', file);
    // Implement file open logic
  };

  const handleTemplateSelect = (template) => {
    setCurrentDocument({
      id: null,
      title: template.title,
      content: `# ${template.title}\n\n[Bu alan ${template.category} kategorisindeki ${template.title} şablonu ile doldurulacak]\n\nSayın Mahkeme Başkanlığına,\n\n`,
      hasChanges: true,
      aiChanges: [],
      lastSaved: null
    });
    setActiveView('editor');
  };

  // AI Chat handlers
  const handleAISendMessage = async (message, documentContext) => {
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsAITyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Size ${message} konusunda yardımcı olmaya çalışayım. Lütfen daha fazla detay verin.`,
        timestamp: new Date().toISOString(),
        suggestions: [
          "Bu konuyla ilgili hukuki dayakları açıkla",
          "Benzer emsal kararları bul",
          "Dilekçe taslağı hazırla"
        ]
      };
      setChatMessages(prev => [...prev, aiMessage]);
      setIsAITyping(false);
    }, 2000);
  };

  const handleClearChat = () => {
    setChatMessages([]);
  };

  // Handle API key save
  const handleApiKeySave = async (newApiKey) => {
    setApiKey(newApiKey);
    if (window.electronAPI) {
      await window.electronAPI.security.setApiKey(newApiKey);
    }
  };

  if (isLoading) {
    return null; // Loading screen is handled by HTML
  }

  // Show welcome screen only on first visit
  if (activeView === 'welcome') {
    return (
      <div className="h-screen bg-gray-900 text-white">
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
      <div className="h-screen bg-gray-900 text-white">
        <SettingsPanel 
          apiKey={apiKey}
          onApiKeySave={handleApiKeySave}
          onBack={() => setActiveView('editor')}
        />
      </div>
    );
  }

  // Main Cursor-like Layout
  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header Bar */}
      <HeaderBar 
        currentDocument={currentDocument}
        onExport={handleExport}
        onNewDocument={handleNewDocument}
        onOpenSettings={() => setActiveView('settings')}
      />

      {/* 3-Panel Layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar - Files, Templates, etc. */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <LeftSidebar 
            files={uploadedFiles}
            onFileUpload={handleFileUpload}
            onFileSelect={handleFileSelect}
            onTemplateSelect={handleTemplateSelect}
            onNewDocument={handleNewDocument}
            currentDocument={currentDocument}
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
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Sidebar - AI Chat */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <AIChatPanel 
            messages={chatMessages}
            onSendMessage={handleAISendMessage}
            onClearChat={handleClearChat}
            isTyping={isAITyping}
            documentContext={currentDocument}
            apiKey={apiKey}
            onOpenSettings={() => setActiveView('settings')}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default App; 