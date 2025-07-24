import React, { useState, useRef, useCallback } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Undo,
  Redo,
  Save,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function DocumentEditor({ 
  content, 
  onChange, 
  onSave,
  aiChanges = [],
  isAIProcessing = false 
}) {
  const editorRef = useRef(null);
  const [selectedText, setSelectedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  const handleTextChange = useCallback((e) => {
    const value = e.target.value;
    onChange(value);
    
    // Cursor position hesapla
    const textarea = e.target;
    const text = value.substring(0, textarea.selectionStart);
    const lines = text.split('\n');
    setCursorPosition({
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    });
  }, [onChange]);

  const handleSelection = useCallback(() => {
    if (editorRef.current) {
      const selection = window.getSelection().toString();
      setSelectedText(selection);
    }
  }, []);

  const formatText = (format) => {
    // Basit text formatting (gerçek implementasyon için rich text editor gerekli)
    console.log(`Formatting: ${format}`);
  };

  const requestAIAssistance = () => {
    console.log('AI assistance requested for:', selectedText || 'current paragraph');
  };

  // AI değişikliklerini syntax highlighting ile göster
  const renderContentWithHighlights = () => {
    if (!aiChanges.length) return content;
    
    let highlightedContent = content;
    
    // AI değişikliklerini renklerle işaretle
    aiChanges.forEach((change, index) => {
      const { type, text, start, end } = change;
      let className = '';
      
      switch (type) {
        case 'addition':
          className = 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200';
          break;
        case 'deletion':
          className = 'bg-red-200 text-red-800 line-through dark:bg-red-900 dark:text-red-200';
          break;
        case 'modification':
          className = 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
          break;
        default:
          className = '';
      }
      
      if (className) {
        const before = highlightedContent.substring(0, start);
        const highlighted = `<span class="${className}" data-change-id="${index}">${text}</span>`;
        const after = highlightedContent.substring(end);
        highlightedContent = before + highlighted + after;
      }
    });
    
    return highlightedContent;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="h-12 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center space-x-1">
          {/* Formatting Tools */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => formatText('bold')}
            className="h-8 w-8 p-0"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => formatText('italic')}
            className="h-8 w-8 p-0"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => formatText('underline')}
            className="h-8 w-8 p-0"
          >
            <Underline className="w-4 h-4" />
          </Button>
          
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
          
          {/* Alignment */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => formatText('align-left')}
            className="h-8 w-8 p-0"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => formatText('align-center')}
            className="h-8 w-8 p-0"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => formatText('align-right')}
            className="h-8 w-8 p-0"
          >
            <AlignRight className="w-4 h-4" />
          </Button>
          
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
          
          {/* AI Assistant */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={requestAIAssistance}
            disabled={isAIProcessing}
            className="h-8 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            {isAIProcessing ? 'İşleniyor...' : 'AI Yardım'}
          </Button>
        </div>

        {/* Right side - Status & Actions */}
        <div className="flex items-center space-x-2">
          {aiChanges.length > 0 && (
            <div className="flex items-center space-x-1">
              <Badge variant="outline" className="text-xs border-green-400 text-green-600">
                {aiChanges.filter(c => c.type === 'addition').length} Ekleme
              </Badge>
              <Badge variant="outline" className="text-xs border-red-400 text-red-600">
                {aiChanges.filter(c => c.type === 'deletion').length} Silme
              </Badge>
            </div>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={onSave}
            className="h-8"
          >
            <Save className="w-4 h-4 mr-1" />
            Kaydet
          </Button>
          
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Satır {cursorPosition.line}, Sütun {cursorPosition.column}
          </span>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative">
        {/* Line Numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {content.split('\n').map((_, index) => (
            <div 
              key={index} 
              className="h-6 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500"
            >
              {index + 1}
            </div>
          ))}
        </div>

        {/* Text Editor */}
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleTextChange}
          onSelect={handleSelection}
          placeholder="Dilekçenizi buraya yazın veya AI'dan yardım isteyin..."
          className="w-full h-full pl-16 pr-4 py-4 resize-none border-none outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm leading-6"
          style={{
            fontFamily: "'JetBrains Mono', 'Consolas', 'Monaco', monospace",
            tabSize: 2
          }}
        />

        {/* AI Processing Overlay */}
        {isAIProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-purple-600 animate-spin" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  AI dilekçenizi analiz ediyor...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Document Stats */}
      <div className="h-8 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{content.length} karakter</span>
          <span>{content.split(/\s+/).filter(word => word.length > 0).length} kelime</span>
          <span>{content.split('\n').length} satır</span>
        </div>
        
        {selectedText && (
          <span>{selectedText.length} karakter seçili</span>
        )}
      </div>
    </div>
  );
}

export default DocumentEditor; 