import React, { useCallback, useEffect, useState } from 'react';

// Basitleştirilmiş Editör (TipTap yerine)
const TipTapEditor = ({ 
  content, 
  onChange, 
  placeholder = "Metninizi buraya yazın...",
  className = "",
  style = {},
  ...props 
}) => {
  const [localContent, setLocalContent] = useState(content || '');

  useEffect(() => {
    if (content !== localContent) {
      setLocalContent(content || '');
    }
  }, [content]);

  const handleChange = (e) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onChange(newContent);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Basit Toolbar */}
      <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
        <button
          onClick={() => {
            const textarea = document.querySelector('.tiptap-textarea');
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const selectedText = textarea.value.substring(start, end);
              const newText = `**${selectedText}**`;
              const newContent = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
              setLocalContent(newContent);
              onChange(newContent);
            }
          }}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Kalın"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => {
            const textarea = document.querySelector('.tiptap-textarea');
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const selectedText = textarea.value.substring(start, end);
              const newText = `*${selectedText}*`;
              const newContent = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
              setLocalContent(newContent);
              onChange(newContent);
            }
          }}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="İtalik"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => {
            const textarea = document.querySelector('.tiptap-textarea');
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const selectedText = textarea.value.substring(start, end);
              const newText = `~~${selectedText}~~`;
              const newContent = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
              setLocalContent(newContent);
              onChange(newContent);
            }
          }}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Üstü Çizili"
        >
          <s>S</s>
        </button>
      </div>

      {/* Textarea Editor */}
      <textarea
        value={localContent}
        onChange={handleChange}
        placeholder={placeholder}
        className={`flex-1 p-4 min-h-[400px] focus:outline-none tiptap-textarea ${className}`}
        style={{
          fontFamily: "'Times New Roman', serif",
          fontSize: '12pt',
          lineHeight: '1.5',
          resize: 'none',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'inherit',
          ...style
        }}
        {...props}
      />
    </div>
  );
};

export default TipTapEditor; 