import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

const InputDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  placeholder = '', 
  defaultValue = '',
  confirmText = 'Tamam',
  cancelText = 'İptal'
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
      // Focus input when dialog opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    if (inputValue.trim()) {
      onConfirm(inputValue.trim());
      setInputValue('');
    }
  };

  const handleCancel = () => {
    onClose();
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {message && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {message}
            </p>
          )}
        </div>
        
        {/* Content */}
        <div className="px-6 py-4">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
          />
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!inputValue.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InputDialog;
