import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';

// Prompt Dialog Component
export const PromptDialog = ({ isOpen, title, message, defaultValue = '', onConfirm, onCancel }) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue, isOpen]);

  const handleConfirm = () => {
    onConfirm(inputValue);
    setInputValue('');
  };

  const handleCancel = () => {
    onCancel();
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {message}
          </p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            placeholder="Değer girin..."
            autoFocus
          />
        </div>
        
        <div className="flex justify-end space-x-2 p-4 border-t dark:border-gray-700">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

// Confirm Dialog Component
export const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, type = 'info' }) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600';
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            {getIcon()}
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm text-white rounded-md ${getButtonColor()}`}
            >
              Tamam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Alert/Info Dialog Component
export const AlertDialog = ({ isOpen, title, message, onClose, type = 'info' }) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            {getIcon()}
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line">
            {message}
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Tamam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Notification Component (for non-blocking messages)
export const Notification = ({ message, type = 'success', duration = 10000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getColors = () => {
    switch (type) {
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-green-500 text-white';
    }
  };

  return (
    <div className={`fixed bottom-4 left-4 ${getColors()} px-3 py-2 rounded-lg shadow-lg z-50 max-w-xs`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-200"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}; 