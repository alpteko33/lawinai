import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Mark } from '@tiptap/core';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Highlighter,
  Palette,
  Check,
  X
} from 'lucide-react';
import textFormattingService from '../services/textFormattingService';

// Custom extensions for TipTap diff highlighting - FIXED VERSION
const DiffInsert = Mark.create({
  name: 'diffInsert',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      'data-diff-type': {
        default: 'inline-insert',
        parseHTML: element => element.getAttribute('data-diff-type'),
        renderHTML: attributes => {
          return {
            'data-diff-type': attributes['data-diff-type'] || 'inline-insert',
          }
        },
      },
      'data-diff-user-id': {
        default: 'AI',
        parseHTML: element => element.getAttribute('data-diff-user-id'),
        renderHTML: attributes => {
          return {
            'data-diff-user-id': attributes['data-diff-user-id'] || 'AI',
          }
        },
      },
      'data-change-id': {
        default: null,
        parseHTML: element => element.getAttribute('data-change-id'),
        renderHTML: attributes => {
          if (!attributes['data-change-id']) {
            return {}
          }
          return {
            'data-change-id': attributes['data-change-id'],
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-diff-type="inline-insert"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    console.log('🟢 DiffInsert renderHTML called with attributes:', HTMLAttributes);
    
    // Detect dark mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    const style = isDarkMode 
      ? 'background-color: #14532d !important; color: #bbf7d0 !important; border: 2px solid #16a34a !important; border-radius: 4px; padding: 2px 6px; font-weight: 600; margin: 0 2px; box-shadow: 0 0 0 1px rgba(22, 163, 74, 0.4) !important; display: inline;'
      : 'background-color: #dcfce7 !important; color: #166534 !important; border: 2px solid #22c55e !important; border-radius: 4px; padding: 2px 6px; font-weight: 600; margin: 0 2px; box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.3) !important; display: inline;';
    
    return ['span', {
      'data-diff-type': 'inline-insert',
      'data-diff-user-id': HTMLAttributes['data-diff-user-id'] || 'AI',
      style,
      ...HTMLAttributes
    }, 0]
  },

  addCommands() {
    return {
      setDiffInsert: (attributes) => ({ commands }) => {
        return commands.setMark(this.name, attributes)
      },
      toggleDiffInsert: (attributes) => ({ commands }) => {
        return commands.toggleMark(this.name, attributes)
      },
      unsetDiffInsert: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },
})

const DiffDelete = Mark.create({
  name: 'diffDelete',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      'data-diff-type': {
        default: 'inline-delete',
        parseHTML: element => element.getAttribute('data-diff-type'),
        renderHTML: attributes => {
          return {
            'data-diff-type': attributes['data-diff-type'] || 'inline-delete',
          }
        },
      },
      'data-diff-user-id': {
        default: 'AI',
        parseHTML: element => element.getAttribute('data-diff-user-id'),
        renderHTML: attributes => {
          return {
            'data-diff-user-id': attributes['data-diff-user-id'] || 'AI',
          }
        },
      },
      'data-change-id': {
        default: null,
        parseHTML: element => element.getAttribute('data-change-id'),
        renderHTML: attributes => {
          if (!attributes['data-change-id']) {
            return {}
          }
          return {
            'data-change-id': attributes['data-change-id'],
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-diff-type="inline-delete"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    console.log('🔴 DiffDelete renderHTML called with attributes:', HTMLAttributes);
    
    // Detect dark mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    const style = isDarkMode 
      ? 'background-color: #7f1d1d !important; color: #fca5a5 !important; border: 2px solid #dc2626 !important; border-radius: 4px; padding: 2px 6px; font-weight: 600; text-decoration: line-through; margin: 0 2px; box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.4) !important; display: inline;'
      : 'background-color: #fef2f2 !important; color: #dc2626 !important; border: 2px solid #ef4444 !important; border-radius: 4px; padding: 2px 6px; font-weight: 600; text-decoration: line-through; margin: 0 2px; box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.3) !important; display: inline;';
    
    return ['span', {
      'data-diff-type': 'inline-delete',
      'data-diff-user-id': HTMLAttributes['data-diff-user-id'] || 'AI',
      style,
      ...HTMLAttributes
    }, 0]
  },

  addCommands() {
    return {
      setDiffDelete: (attributes) => ({ commands }) => {
        return commands.setMark(this.name, attributes)
      },
      toggleDiffDelete: (attributes) => ({ commands }) => {
        return commands.toggleMark(this.name, attributes)
      },
      unsetDiffDelete: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },
})

const DiffPending = Mark.create({
  name: 'diffPending',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      'data-diff-type': {
        default: 'pending',
        parseHTML: element => element.getAttribute('data-diff-type'),
        renderHTML: attributes => {
          return {
            'data-diff-type': attributes['data-diff-type'] || 'pending',
          }
        },
      },
      'data-diff-user-id': {
        default: 'AI',
        parseHTML: element => element.getAttribute('data-diff-user-id'),
        renderHTML: attributes => {
          return {
            'data-diff-user-id': attributes['data-diff-user-id'] || 'AI',
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-diff-type="pending"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    console.log('🔵 DiffPending renderHTML called with attributes:', HTMLAttributes);
    
    // Detect dark mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    const style = isDarkMode 
      ? 'background-color: #1e3a8a !important; color: #93c5fd !important; border: 2px solid #2563eb !important; border-radius: 4px; padding: 2px 6px; font-weight: 600; margin: 0 2px; box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.4) !important; display: inline; animation: diff-glow 2s ease-in-out infinite alternate;'
      : 'background-color: #dbeafe !important; color: #1e40af !important; border: 2px solid #3b82f6 !important; border-radius: 4px; padding: 2px 6px; font-weight: 600; margin: 0 2px; box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3) !important; display: inline; animation: diff-glow 2s ease-in-out infinite alternate;';
    
    return ['span', {
      'data-diff-type': 'pending',
      'data-diff-user-id': HTMLAttributes['data-diff-user-id'] || 'AI',
      style,
      ...HTMLAttributes
    }, 0]
  },

  addCommands() {
    return {
      setDiffPending: (attributes) => ({ commands }) => {
        return commands.setMark(this.name, attributes)
      },
      toggleDiffPending: (attributes) => ({ commands }) => {
        return commands.toggleMark(this.name, attributes)
      },
      unsetDiffPending: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },
})

const TipTapEditor = React.memo(({ 
  content, 
  onChange, 
  placeholder = "Hukuki metninizi buraya yazın...",
  className = "",
  style = {},
  isAIProcessing = false,
  pendingContent = '',
  isStreamingToEditor = false,
  onApprovePendingContent,
  onRejectPendingContent,
  diffHighlights = [], // AI değişiklikleri
  onApproveChange,
  onRejectChange,
  // Yeni props
  aiTextState = null, // 'pending', 'changes', null
  pendingChanges = [], // AI'ın önerdiği değişiklikler
  onApproveAllChanges,
  onRejectAllChanges,
  originalText = '', // Değişiklik öncesi metin
  ...props 
}) => {
  const editorRef = useRef(null);
  const lastContentRef = useRef('');
  const isUpdatingRef = useRef(false);

  // Memoize editor configuration to prevent recreation
  const editorConfig = useMemo(() => {
    console.log('🔧 TipTap editor config creating with diff extensions');
    return {
      extensions: [
        StarterKit.configure({
          // Disable some features we don't need
          heading: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
        }),
        Placeholder.configure({
          placeholder: placeholder,
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Highlight,
        Color,
        TextStyle,
        DiffInsert,
        DiffDelete,
        DiffPending,
      ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none text-gray-900 dark:text-white',
        style: 'min-height: 400px;',
      },
      // Allow HTML span elements for diff highlighting
      handleDOMEvents: {
        paste: (view, event) => {
          // Allow HTML paste for diff spans
          return false;
        },
      },
    },
    // Allow HTML parsing for diff highlights  
    parseOptions: {
      preserveWhitespace: 'full',
    },
    // Enable HTML mode for diff highlighting
    enableInputRules: true,
    enablePasteRules: true,
    onUpdate: ({ editor }) => {
      if (!isUpdatingRef.current) {
        const newContent = editor.getHTML();
        if (newContent !== lastContentRef.current) {
          lastContentRef.current = newContent;
          onChange(newContent);
        }
      }
    },
  };
  }, [placeholder, onChange]);

  const editor = useEditor(editorConfig);

  // Optimized content update with debouncing - FIXED for diff support
  const updateContent = useCallback((newContent) => {
    if (!editor || isUpdatingRef.current) return;
    
    console.log('🔄 TipTap updateContent called with:', newContent?.substring(0, 200) + '...');
    console.log('🔍 Content contains diff markers:', newContent?.includes('data-diff-type'));
    
    const currentContent = editor.getHTML();
    if (currentContent !== newContent) {
      isUpdatingRef.current = true;
      
      try {
        // KRITIK: TipTap editörüne HTML content'i diff extension'larıyla birlikte set et
        console.log('🎯 Setting content with diff extensions support');
        
        // Clear content first
        editor.commands.clearContent();
        
        // Insert new content with proper parsing
        if (newContent && newContent.trim()) {
          // Force TipTap to parse HTML with diff extensions
          editor.commands.setContent(newContent, false, {
            preserveWhitespace: 'full',
            parseOptions: {
              preserveWhitespace: 'full',
            }
          });
          
          console.log('✅ Content set successfully with diff support');
          console.log('🔍 New editor HTML:', editor.getHTML().substring(0, 200) + '...');
        }
        
        lastContentRef.current = newContent;
      } catch (error) {
        console.error('❌ Error updating TipTap content:', error);
        // Fallback: basic setContent
        try {
          editor.commands.setContent(newContent || '');
          console.log('⚠️ Fallback content set');
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
        }
      }
      
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  }, [editor]);

  // Update content when prop changes (debounced)
  useEffect(() => {
    if (content !== lastContentRef.current) {
      updateContent(content);
    }
  }, [content, updateContent]);

  // Handle AI streaming content (optimized)
  useEffect(() => {
    if (editor && pendingContent && isStreamingToEditor) {
      // Only update if content actually changed
      const currentContent = editor.getHTML();
      const newContent = currentContent + (pendingContent ? '\n\n' + pendingContent : '');
      if (currentContent !== newContent) {
        updateContent(newContent);
      }
    }
  }, [editor, pendingContent, isStreamingToEditor, updateContent]);

  // Simplified content processing - diff markers already added in App.jsx
  const processedContent = useMemo(() => {
    console.log('=== TIPTAP PROCESSED CONTENT ===');
    console.log('aiTextState:', aiTextState);
    console.log('content:', content?.substring(0, 100) + '...');
    console.log('content contains diff markers:', content?.includes('data-diff-type'));
    
    // Content already has diff markers added by App.jsx, just return it
    return content;
  }, [content, aiTextState]);





  // Apply processed content to editor
  useEffect(() => {
    if (processedContent !== lastContentRef.current) {
      updateContent(processedContent);
    }
  }, [processedContent, updateContent]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Editör yükleniyor...</div>
      </div>
    );
  }

  const MenuBar = React.memo(() => {
    return (
      <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-3 rounded-lg transition-colors duration-200 border ${
            editor.isActive('bold') 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50' 
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Kalın (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-3 rounded-lg transition-colors duration-200 border ${
            editor.isActive('italic') 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50' 
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="İtalik (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-3 rounded-lg transition-colors duration-200 border ${
            editor.isActive('underline') 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50' 
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Altı Çizili (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-3 rounded-lg transition-colors duration-200 border ${
            editor.isActive('strike') 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50' 
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Üstü Çizili"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />

        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-3 rounded-lg transition-colors duration-200 border ${
            editor.isActive({ textAlign: 'left' }) 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50' 
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Sola Hizala"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-3 rounded-lg transition-colors duration-200 border ${
            editor.isActive({ textAlign: 'center' }) 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50' 
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Ortala"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-3 rounded-lg transition-colors duration-200 border ${
            editor.isActive({ textAlign: 'right' }) 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50' 
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Sağa Hizala"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-3 rounded-lg transition-colors duration-200 border ${
            editor.isActive({ textAlign: 'justify' }) 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50' 
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="İki Yana Yasla"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />

        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`p-3 rounded-lg transition-colors duration-200 border ${
            editor.isActive('highlight') 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-700/50' 
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Vurgula"
        >
          <Highlighter className="w-4 h-4" />
        </button>
      </div>
    );
  });

  return (
    <div className={`flex flex-col h-full ${className}`} style={style}>
      <MenuBar />
      
      <div className="relative flex-1 overflow-auto bg-white dark:bg-gray-900">
        <EditorContent 
          ref={editorRef}
          editor={editor} 
          className="h-full p-6 focus:outline-none text-gray-900 dark:text-white tiptap-editor overflow-auto"
          style={{
            fontFamily: "'Times New Roman', serif",
            fontSize: '12pt',
            lineHeight: '1.6',
            color: 'inherit',
          }}
        />

        {/* AI Processing Overlay */}
        {isAIProcessing && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 bg-white/90 dark:bg-gray-800/90 px-6 py-4 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="font-medium">AI metin oluşturuyor...</span>
            </div>
          </div>
        )}








      </div>
    </div>
  );
});

TipTapEditor.displayName = 'TipTapEditor';

export default TipTapEditor; 