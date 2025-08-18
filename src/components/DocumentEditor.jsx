import React, { useState, useMemo } from 'react';
import { Sparkles, Check, X, FileText, File, Plus } from 'lucide-react';
import FileViewer from './PDFViewer';
import TipTapEditor from './TipTapEditor';
import textFormattingService from '../services/textFormattingService';

function DocumentEditor({ 
  content, 
  onChange, 
  onSave,
  aiChanges = [],
  isAIProcessing = false,
  diffHighlights = [],
  onApproveChange,
  onRejectChange,
  pendingContent = '',
  isStreamingToEditor = false,
  onApprovePendingContent,
  onRejectPendingContent,
  openTabs = [],
  activeTabId = null,
  onTabChange = () => {},
  onTabClose = () => {},
  onTabRename = () => {},
  // Yeni props - AI metin durumu için
  aiTextState = null, // 'pending', 'changes', null
  originalText = '', // Değişiklik öncesi metin
  pendingChanges = [], // AI'ın önerdiği değişiklikler
}) {
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabTitle, setEditingTabTitle] = useState('');

  // Find active tab
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const isDocumentTab = activeTab?.type === 'document';
  const isPDFTab = activeTab?.type === 'pdf';

  const handleTextChange = (newContent) => {
    onChange(newContent);
  };

  // AI değişiklikleri onaylama
  const handleApproveAllChanges = () => {
    try {
      // Tüm pending değişiklikleri onayla
      const currentPendingChanges = textFormattingService.getPendingChanges();
      currentPendingChanges.forEach(change => {
        textFormattingService.approveChange(change.id);
      });

      // Diff highlight'ları temizle
      const cleanContent = textFormattingService.clearDiffHighlights(content);
      onChange(cleanContent);

      // Parent component'e bildir
      if (onApproveChange) {
        onApproveChange('all');
      }

      console.log('AI değişiklikleri onaylandı');
    } catch (error) {
      console.error('Değişiklikleri onaylarken hata:', error);
    }
  };

  // AI değişiklikleri reddetme
  const handleRejectAllChanges = () => {
    try {
      // Tüm pending değişiklikleri reddet
      const currentPendingChanges = textFormattingService.getPendingChanges();
      currentPendingChanges.forEach(change => {
        textFormattingService.rejectChange(change.id);
      });

      // Original text'e geri dön
      if (originalText) {
        onChange(originalText);
      }

      // Parent component'e bildir
      if (onRejectChange) {
        onRejectChange('all');
      }

      console.log('AI değişiklikleri reddedildi');
    } catch (error) {
      console.error('Değişiklikleri reddederken hata:', error);
    }
  };

  // Pending content onaylama (ilk kez yazılan metin)
  const handleApprovePendingContent = () => {
    try {
      // Pending content'i normal content haline getir
      if (pendingContent) {
        const cleanContent = textFormattingService.clearDiffHighlights(pendingContent);
        onChange(cleanContent);
      }

      // Parent component'e bildir
      if (onApprovePendingContent) {
        onApprovePendingContent();
      }

      console.log('AI tarafından oluşturulan metin onaylandı');
    } catch (error) {
      console.error('Pending content onaylanırken hata:', error);
    }
  };

  // Pending content reddetme (ilk kez yazılan metin)
  const handleRejectPendingContent = () => {
    try {
      // Content'i temizle veya eski haline getir
      onChange(originalText || '');

      // Parent component'e bildir
      if (onRejectPendingContent) {
        onRejectPendingContent();
      }

      console.log('AI tarafından oluşturulan metin reddedildi');
    } catch (error) {
      console.error('Pending content reddedilirken hata:', error);
    }
  };

  // Tab icon helper
  const getTabIcon = (tab) => {
    if (tab.type === 'pdf') return <File className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  // Truncate tab title
  const truncateTitle = (title, maxLength = 20) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  // Handle tab rename
  const handleTabRename = (tabId, newTitle) => {
    if (onTabRename) {
      onTabRename(tabId, newTitle);
    }
    setEditingTabId(null);
    setEditingTabTitle('');
  };

  // Handle tab double click or right click
  const handleTabEdit = (tab) => {
    setEditingTabId(tab.id);
    setEditingTabTitle(tab.title);
  };



  // Memoize word and character counts to prevent recalculation on every render - FIXED for diff content
  const contentStats = useMemo(() => {
    if (!content) return { chars: 0, words: 0, lines: 0 };
    
    // Clean HTML tags and diff markers for accurate counting
    const textContent = content
      .replace(/<[^>]*>/g, ' ')           // Remove all HTML tags (including diff spans)
      .replace(/&nbsp;/g, ' ')           // Replace &nbsp; with space
      .replace(/&amp;/g, '&')            // Unescape common entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')              // Normalize whitespace
      .trim();
    
    // Count lines more accurately based on content structure
    const lines = Math.max(1, textContent.split(/[.!?]\s+|[\n\r]+/).filter(line => line.trim().length > 0).length);
    
    return {
      chars: textContent.length,
      words: textContent.split(/\s+/).filter(word => word.length > 0).length,
      lines: lines
    };
  }, [content]);

  // AI Text State'e göre content durumunu belirle - FIXED: removed changesStats dependency
  const getAIStatusText = () => {
    if (aiTextState === 'pending') {
      return 'AI metni onay bekliyor';
    } else if (aiTextState === 'changes') {
      return 'AI değişiklikleri mevcut';
    } else if (isAIProcessing) {
      return 'AI metin üretiyor';
    }
    return null;
  };

  const aiStatusText = getAIStatusText();

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      {/* Tab Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200/0 dark:border-gray-700/0">
        <div className="flex items-center px-4 py-2">
          {/* Existing Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto">
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center space-x-2 px-3 py-2 rounded-t-lg border-b-2 cursor-pointer transition-colors min-w-0 ${
                  activeTabId === tab.id
                    ? 'bg-gray-50 dark:bg-gray-700 border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => onTabChange(tab.id)}
                onDoubleClick={() => handleTabEdit(tab)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleTabEdit(tab);
                }}
              >
                {getTabIcon(tab)}
                <span className="truncate">
                  {editingTabId === tab.id ? (
                    <input
                      type="text"
                      value={editingTabTitle}
                      onChange={(e) => setEditingTabTitle(e.target.value)}
                      onBlur={() => {
                        if (editingTabTitle.trim()) {
                          onTabRename(tab.id, editingTabTitle.trim());
                        }
                        setEditingTabId(null);
                        setEditingTabTitle('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editingTabTitle.trim()) {
                            onTabRename(tab.id, editingTabTitle.trim());
                          }
                          setEditingTabId(null);
                          setEditingTabTitle('');
                        } else if (e.key === 'Escape') {
                          setEditingTabId(null);
                          setEditingTabTitle('');
                        }
                      }}
                      className="bg-transparent border-none outline-none text-sm min-w-0"
                      autoFocus
                    />
                  ) : (
                    truncateTitle(tab.title)
                  )}
                </span>
                {openTabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose(tab.id);
                    }}
                    className="ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* New Tab Button */}
          <button
            onClick={() => {
              const newTab = {
                id: `doc-${Date.now()}`,
                type: 'document',
                title: 'Yeni Belge',
                data: {
                  content: '',
                  hasChanges: false,
                  aiChanges: []
                }
              };
              onTabChange(newTab.id, newTab);
            }}
            className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Yeni Sekme"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {isPDFTab ? (
          // PDF Viewer Tab
          <FileViewer
            fileUrl={activeTab.data.fileUrl}
            fileName={activeTab.data.file?.name || activeTab.title}
            fileType={activeTab.data.fileType}
          />
        ) : isDocumentTab ? (
          // Document Editor Tab with TipTap
          <div className="h-full bg-white dark:bg-gray-800">
            <TipTapEditor
              content={content}
              onChange={handleTextChange}
              placeholder=""
              className="h-full"
              isAIProcessing={isAIProcessing}
              pendingContent={pendingContent}
              isStreamingToEditor={isStreamingToEditor}
              onApprovePendingContent={handleApprovePendingContent}
              onRejectPendingContent={handleRejectPendingContent}
              diffHighlights={diffHighlights}
              onApproveChange={onApproveChange}
              onRejectChange={onRejectChange}
              // Yeni props
              aiTextState={aiTextState}
              pendingChanges={pendingChanges}
              onApproveAllChanges={handleApproveAllChanges}
              onRejectAllChanges={handleRejectAllChanges}
              originalText={originalText}
            />
          </div>
        ) : null}
      </div>

      {/* Footer - Document Stats */}
      <div className="h-8 bg-gray-50 dark:bg-gray-800 border-t border-gray-200/0 dark:border-gray-700/0 flex items-center justify-between px-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{contentStats.chars} karakter</span>
          <span>{contentStats.words} kelime</span>
          <span>{contentStats.lines} satır</span>
          {aiStatusText && (
            <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center">
              <Sparkles className="w-3 h-3 mr-1" />
              {aiStatusText}
            </span>
          )}
        </div>
        
        {/* AI Status Indicator */}
        {(aiTextState || isAIProcessing) && (
          <div className="flex items-center space-x-2">
            {isAIProcessing && (
              <div className="flex items-center text-blue-600 dark:text-blue-400">
                <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent mr-1"></div>
                <span className="text-xs">AI çalışıyor</span>
              </div>
            )}
            {aiTextState === 'pending' && (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-current rounded-full mr-1"></div>
                <span className="text-xs">Onay bekliyor</span>
              </div>
            )}
            {aiTextState === 'changes' && (
              <div className="flex items-center text-orange-600 dark:text-orange-400">
                <div className="w-2 h-2 bg-current rounded-full mr-1"></div>
                <span className="text-xs">Değişiklikler mevcut</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentEditor; 