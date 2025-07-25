import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Check, X, ChevronDown, FileText, File, Plus } from 'lucide-react';
import FileViewer from './PDFViewer';

function DocumentEditor({ 
  content, 
  onChange, 
  onSave,
  aiChanges = [],
  isAIProcessing = false,
  diffHighlights = [],
  onApproveChange,
  onRejectChange,
  pendingContent = '', // AI streaming content waiting for approval
  isStreamingToEditor = false, // Is AI currently writing to editor
  onApprovePendingContent, // Approve pending content  
  onRejectPendingContent, // Reject pending content
  openTabs = [], // Array of open tabs
  activeTabId = null, // Currently active tab ID
  onTabChange = () => {}, // Tab change handler
  onTabClose = () => {}, // Tab close handler
}) {
  const editorRef = useRef(null);
  const highlightRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedText, setSelectedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Find active tab
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const isDocumentTab = activeTab?.type === 'document';
  const isPDFTab = activeTab?.type === 'pdf';

  // Combined content: original content + pending content
  const displayContent = content + (pendingContent && isStreamingToEditor ? '\n\n' + pendingContent : '');
  const pendingStartPosition = content.length + (pendingContent && isStreamingToEditor ? 2 : 0); // +2 for \n\n

  const handleTextChange = useCallback((e) => {
    const value = e.target.value;
    
    // If there's pending content, only update the original content part
    if (pendingContent && isStreamingToEditor) {
      const pendingStart = content.length + 2; // +2 for \n\n
      const originalContent = value.substring(0, pendingStart);
      onChange(originalContent);
    } else {
      onChange(value);
    }
    
    // Update cursor position
    const textarea = e.target;
    if (textarea && textarea.selectionStart !== undefined) {
    const text = value.substring(0, textarea.selectionStart);
    const lines = text.split('\n');
    setCursorPosition({
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    });
    }
  }, [onChange, content, pendingContent, isStreamingToEditor]);

  const handleSelection = useCallback(() => {
    if (editorRef.current) {
      const selection = window.getSelection().toString();
      setSelectedText(selection);
    }
  }, []);

  // Scroll synchronization
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollLeft } = e.target;
    setScrollTop(scrollTop);
    setScrollLeft(scrollLeft);
  }, []);

  // Sync highlight layer with textarea scroll
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollTop, scrollLeft]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (editorRef.current) {
      const textarea = editorRef.current;
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight to fit content, with minimum height
      const minHeight = 700; // Approximate minimum height in pixels
      textarea.style.height = Math.max(textarea.scrollHeight, minHeight) + 'px';
    }
  }, [content]);

  // Get precise character metrics from textarea
  const getTextMetrics = useCallback(() => {
    if (!editorRef.current) return null;
    
    const textarea = editorRef.current;
    const style = window.getComputedStyle(textarea);
    
    // Create a temporary measurement div with exact same styling
    const measureDiv = document.createElement('div');
    measureDiv.style.font = style.font;
    measureDiv.style.fontFamily = style.fontFamily;
    measureDiv.style.fontSize = style.fontSize;
    measureDiv.style.fontWeight = style.fontWeight;
    measureDiv.style.letterSpacing = style.letterSpacing;
    measureDiv.style.lineHeight = style.lineHeight;
    measureDiv.style.padding = '0';
    measureDiv.style.margin = '0';
    measureDiv.style.border = 'none';
    measureDiv.style.position = 'absolute';
    measureDiv.style.left = '-9999px';
    measureDiv.style.top = '0';
    measureDiv.style.whiteSpace = 'pre';
    measureDiv.style.visibility = 'hidden';
    measureDiv.textContent = 'X'; // Measure single character
    
    document.body.appendChild(measureDiv);
    const charWidth = measureDiv.offsetWidth;
    const lineHeight = measureDiv.offsetHeight;
    document.body.removeChild(measureDiv);
    
    return {
      charWidth,
      lineHeight,
      paddingTop: parseInt(style.paddingTop),
      paddingLeft: parseInt(style.paddingLeft)
    };
  }, []);

  // Convert character position to pixel coordinates (improved)
  const getCharacterCoordinates = useCallback((charIndex) => {
    if (!editorRef.current || !displayContent || charIndex < 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    const metrics = getTextMetrics();
    if (!metrics) return { x: 0, y: 0, width: 0, height: 0 };
    
    // Get text up to character index
    const textBeforeChar = displayContent.substring(0, Math.min(charIndex, displayContent.length));
    const lines = textBeforeChar.split('\n');
    const currentLineIndex = lines.length - 1;
    const charInLine = lines[lines.length - 1].length;
    
    // Calculate position
    const x = metrics.paddingLeft + charInLine * metrics.charWidth;
    const y = metrics.paddingTop + currentLineIndex * metrics.lineHeight;
    
    return {
      x,
      y,
      width: metrics.charWidth,
      height: metrics.lineHeight
    };
  }, [displayContent, getTextMetrics]);

  // Render content with diff highlights using diff-match-patch results
  const renderStyledContent = () => {
    if (!diffHighlights || diffHighlights.length === 0) {
      return displayContent; // Use display content when no highlights
    }

    console.log('Rendering styled content with diff-match-patch highlights:', diffHighlights);

    // Sort highlights by start position for proper rendering
    const sortedHighlights = [...diffHighlights].sort((a, b) => a.start - b.start);
    
    let styledContent = '';
    let currentPosition = 0;

    sortedHighlights.forEach((highlight) => {
      // Add unchanged content before this highlight
      if (currentPosition < highlight.start) {
        styledContent += displayContent.substring(currentPosition, highlight.start);
        currentPosition = highlight.start;
      }
      
      // Add the highlighted content
      if (highlight.type === 'addition') {
        // Green for additions
        const addedText = displayContent.substring(highlight.start, highlight.end);
        styledContent += `<span style="color: #16a34a; font-weight: 600; background-color: rgba(22, 163, 74, 0.15); padding: 2px 4px; border-radius: 3px;">${addedText}</span>`;
        currentPosition = highlight.end;
      } else if (highlight.type === 'deletion') {
        // Red strikethrough for deletions (insert at current position)
        styledContent += `<span style="color: #dc2626; font-weight: 600; text-decoration: line-through; background-color: rgba(220, 38, 38, 0.15); padding: 2px 4px; border-radius: 3px;">${highlight.text}</span>`;
        // Don't advance position for deletions since they're not in the current content
      }
    });

    // Add remaining content after all highlights
    if (currentPosition < displayContent.length) {
      styledContent += displayContent.substring(currentPosition);
    }
    
    return styledContent;
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

  // Show changes summary - simplified
  const changesCount = diffHighlights ? diffHighlights.length : 0;
  const hasChanges = changesCount > 0;

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      {/* Tab Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center px-4 py-2">
          {/* Existing Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto">
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center space-x-2 px-3 py-2 rounded-t-lg border-b-2 cursor-pointer transition-colors min-w-0 ${
                  activeTabId === tab.id
                    ? 'bg-gray-50 dark:bg-gray-700 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => onTabChange(tab.id)}
              >
                {getTabIcon(tab)}
                <span className="text-sm font-medium truncate" title={tab.title}>
                  {truncateTitle(tab.title)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className="flex-shrink-0 w-4 h-4 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* New Tab Button */}
          <button
            className="flex-shrink-0 ml-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            onClick={() => {
              // Create new document tab
              const documentTabs = openTabs.filter(t => t.type === 'document');
              const newTabNumber = documentTabs.length;
              const newTitle = newTabNumber === 0 ? 'Hukuki Metin' : `Hukuki Metin (${newTabNumber})`;
              const newTab = {
                id: `doc-${Date.now()}`,
                type: 'document',
                title: newTitle,
                data: {
                  content: '',
                  hasChanges: false,
                  aiChanges: []
                }
              };
              onTabChange(newTab.id, newTab);
            }}
            title="Yeni Dilekçe"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {!activeTab ? (
          // No tabs open - show welcome message
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Henüz açık sekme yok</p>
              <p className="text-sm">Yeni bir dilekçe oluşturmak için + butonuna tıklayın</p>
            </div>
          </div>
        ) : isPDFTab ? (
          // File Viewer Tab (PDF/Images/TIFF)
          <FileViewer 
            fileUrl={activeTab.data.fileUrl} 
            fileName={activeTab.title}
            fileType={activeTab.data.fileType}
          />
        ) : isDocumentTab ? (
          // Document Editor Tab
          <>
            {/* Paper Container - A4 Layout */}
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-8">
              <div className="max-w-4xl mx-auto">
                {/* A4 Paper Page */}
                <div 
                  ref={containerRef} 
                  className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 relative"
                  style={{
                    width: '100%',
                    maxWidth: '280mm', // Expanded width
                    minHeight: '297mm', // A4 height
                    height: 'auto', // Allow dynamic height
                    padding: '20mm', // Reduced margins for more space
                    fontFamily: "'Times New Roman', serif",
                    fontSize: '12pt',
                    lineHeight: '1.5',
                    margin: '0 auto',
                    overflow: 'visible' // Allow content to overflow naturally
                  }}
                >
                  {/* Enhanced Editor with Diff Visualization */}
                  {(diffHighlights && diffHighlights.length > 0) ? (
                    // Show styled content with highlights
                    <div
                      className="w-full h-full p-0 border-none outline-none bg-transparent text-gray-900 dark:text-gray-100"
                    style={{
                      fontFamily: "'Times New Roman', serif",
                      fontSize: '12pt',
                      lineHeight: '1.5',
                        minHeight: 'calc(297mm - 40mm)',
                      whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        overflow: 'auto'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderStyledContent()
                      }}
                    />
                  ) : (
                    // Show regular textarea when no highlights
                  <textarea
                    ref={editorRef}
                      value={displayContent}
                    onChange={handleTextChange}
                    onSelect={handleSelection}
                    onScroll={handleScroll}
                                      placeholder=""
                      className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-900 dark:text-gray-100"
                    style={{
                      fontFamily: "'Times New Roman', serif",
                      fontSize: '12pt',
                      lineHeight: '1.5',
                      tabSize: 4,
                      overflow: 'hidden', // Remove textarea scroll
                      overflowWrap: 'break-word', // Handle long words
                      wordBreak: 'break-word', // Additional word breaking
                      resize: 'none' // Prevent manual resizing
                    }}
                  />
                  )}

                  {/* AI Processing Overlay */}
                  {isAIProcessing && (
                    <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center z-40">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                          <Sparkles className="w-5 h-5 text-purple-600 animate-spin" />
                          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                            AI dilekçenizi analiz ediyor...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer - Document Stats */}
            <div className="h-8 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>{content.length} karakter</span>
                <span>{content.split(/\s+/).filter(word => word.length > 0).length} kelime</span>
                <span>{content.split('\n').length} satır</span>
                <span>Satır {cursorPosition.line}, Sütun {cursorPosition.column}</span>
                {hasChanges && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    • {changesCount} değişiklik
                  </span>
                )}
              </div>
              
              {selectedText && (
                <span>{selectedText.length} karakter seçili</span>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default DocumentEditor; 