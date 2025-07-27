import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Check, X, ChevronDown, FileText, File, Plus } from 'lucide-react';
import FileViewer from './PDFViewer';
import TipTapEditor from './TipTapEditor';

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
  onTabRename = () => {}, // Tab rename handler
}) {
  const editorRef = useRef(null);
  const highlightRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedText, setSelectedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabTitle, setEditingTabTitle] = useState('');
  
  // Draggable and resizable state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  // Default size: Word document size (A4 equivalent)
  const defaultSize = { width: '210mm', height: '297mm' }; // A4 size
  const defaultPosition = { x: 50, y: 50 }; // Position to ensure full visibility
  
  const [containerPosition, setContainerPosition] = useState(defaultPosition);
  const [containerSize, setContainerSize] = useState(defaultSize);

  // Find active tab
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const isDocumentTab = activeTab?.type === 'document';
  const isPDFTab = activeTab?.type === 'pdf';

  // Combined content: original content + pending content
  const displayContent = content + (pendingContent && isStreamingToEditor ? '\n\n' + pendingContent : '');
  const pendingStartPosition = content.length + (pendingContent && isStreamingToEditor ? 2 : 0); // +2 for \n\n

  const handleTextChange = useCallback((newContent) => {
    // If there's pending content, only update the original content part
    if (pendingContent && isStreamingToEditor) {
      // For TipTap, we need to handle HTML content differently
      onChange(newContent);
    } else {
      onChange(newContent);
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

  // Global mouse event listeners for dragging and resizing
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isDragging) {
        handleMouseMove(e);
      }
      if (isResizing) {
        handleResizeMove(e);
      }
    };

    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, containerPosition]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (editorRef.current) {
      const textarea = editorRef.current;
      
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate proper height based on content
        const scrollHeight = textarea.scrollHeight;
        const containerHeight = 297 * 3.779527559; // 297mm to pixels (1mm = 3.779527559px)
        const padding = 40 * 3.779527559; // 40mm padding to pixels
        const minHeight = containerHeight - padding; // A4 height minus padding
        
        // Set height to accommodate all content or minimum height, whichever is larger
        const newHeight = Math.max(scrollHeight, minHeight);
        textarea.style.height = newHeight + 'px';
        
        // Also adjust container height if needed
        if (containerRef.current) {
          const container = containerRef.current;
          const containerNewHeight = Math.max(newHeight + (40 * 3.779527559), 297 * 3.779527559); // Add padding back
          container.style.height = containerNewHeight + 'px';
        }
        
        console.log('Textarea height adjusted:', {
          scrollHeight,
          minHeight,
          newHeight,
          contentLength: displayContent.length,
          lines: displayContent.split('\n').length
        });
      }, 0);
    }
  }, [content, pendingContent, isStreamingToEditor, displayContent]);

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

  // Dragging handlers
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - containerPosition.x,
        y: e.clientY - containerPosition.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setContainerPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Resizing handlers
  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: containerRef.current?.offsetWidth || 0,
      height: containerRef.current?.offsetHeight || 0
    });
  };

  const handleResizeMove = (e) => {
    if (isResizing && containerRef.current) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(200, resizeStart.width + deltaX);
      const newHeight = Math.max(200, resizeStart.height + deltaY);
      
      setContainerSize({
        width: `${newWidth}px`,
        height: `${newHeight}px`
      });
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '0': // Ctrl+0: Reset position and size to default
          e.preventDefault();
          setContainerPosition(defaultPosition);
          setContainerSize(defaultSize);
          break;
        case '=': // Ctrl+=: Increase size
        case '+':
          e.preventDefault();
          if (containerRef.current) {
            const currentWidth = containerRef.current.offsetWidth;
            const currentHeight = containerRef.current.offsetHeight;
            setContainerSize({
              width: `${currentWidth + 50}px`,
              height: `${currentHeight + 50}px`
            });
          }
          break;
        case '-': // Ctrl+-: Decrease size
          e.preventDefault();
          if (containerRef.current) {
            const currentWidth = containerRef.current.offsetWidth;
            const currentHeight = containerRef.current.offsetHeight;
            setContainerSize({
              width: `${Math.max(200, currentWidth - 50)}px`,
              height: `${Math.max(200, currentHeight - 50)}px`
            });
          }
          break;
      }
    }
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
      <div className="flex-1 overflow-hidden">
        {isPDFTab ? (
          // PDF Viewer Tab
          <FileViewer file={activeTab.data.file} />
        ) : isDocumentTab ? (
          // Document Editor Tab with TipTap
          <>
            {/* Paper Container - A4 Layout */}
            <div 
              className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-8"
              onKeyDown={handleKeyDown}
              tabIndex={0}
            >
              <div className="relative w-full h-full">
                {/* A4 Paper Page - Draggable and Resizable */}
                <div 
                  ref={containerRef} 
                  className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 relative cursor-move"
                  style={{
                    width: containerSize.width,
                    maxWidth: '280mm', // Expanded width
                    minHeight: '297mm', // A4 height
                    height: containerSize.height, // Allow dynamic height
                    padding: '20mm', // Reduced margins for more space
                    fontFamily: "'Times New Roman', serif",
                    fontSize: '12pt',
                    lineHeight: '1.5',
                    margin: '0 auto',
                    overflow: 'visible', // Allow content to overflow naturally
                    transform: `translate(${containerPosition.x}px, ${containerPosition.y}px)`,
                    transition: isDragging || isResizing ? 'none' : 'transform 0.1s ease-out',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' // Add subtle shadow for better visibility
                  }}
                  onMouseDown={handleMouseDown}
                >
                  {/* TipTap Editor */}
                  <TipTapEditor
                    content={displayContent}
                    onChange={handleTextChange}
                    placeholder="Hukuki metninizi buraya yazın..."
                    className="h-full"
                    style={{
                      fontFamily: "'Times New Roman', serif",
                      fontSize: '12pt',
                      lineHeight: '1.5',
                      minHeight: 'calc(297mm - 40mm)',
                    }}
                  />

                  {/* AI Processing Overlay */}
                  {isAIProcessing && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75 flex items-center justify-center z-10">
                      <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                        <Sparkles className="w-5 h-5 animate-spin" />
                        <span>AI metin oluşturuyor...</span>
                      </div>
                    </div>
                  )}

                  {/* Pending Content Approval */}
                  {pendingContent && isStreamingToEditor && (
                    <div className="absolute bottom-4 right-4 flex space-x-2 z-20">
                      <button
                        onClick={onApprovePendingContent}
                        className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-1"
                      >
                        <Check className="w-4 h-4" />
                        <span>Onayla</span>
                      </button>
                      <button
                        onClick={onRejectPendingContent}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
                      >
                        <X className="w-4 h-4" />
                        <span>Reddet</span>
                      </button>
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