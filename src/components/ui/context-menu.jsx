import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const ContextMenu = ({ 
  isOpen, 
  onClose, 
  position, 
  children,
  className = ''
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (isOpen && menuRef.current && position) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      let { x, y } = position;

      // Adjust horizontal position
      if (x + rect.width > viewport.width) {
        x = viewport.width - rect.width - 10;
      }
      if (x < 10) {
        x = 10;
      }

      // Adjust vertical position
      if (y + rect.height > viewport.height) {
        y = viewport.height - rect.height - 10;
      }
      if (y < 10) {
        y = 10;
      }

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    }
  }, [isOpen, position]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`
        fixed z-50 min-w-[200px] bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        rounded-lg shadow-lg backdrop-blur-sm
        py-1 text-sm
        ${className}
      `}
      style={{
        left: position?.x || 0,
        top: position?.y || 0,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

const ContextMenuItem = ({ 
  children, 
  onClick, 
  disabled = false, 
  destructive = false,
  icon: Icon,
  shortcut,
  className = ''
}) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`
        flex items-center justify-between px-3 py-2 cursor-pointer
        transition-colors duration-150
        ${disabled 
          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
          : destructive
            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
        ${className}
      `}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-3">
        {Icon && <Icon size={16} className="flex-shrink-0" />}
        <span className="font-medium">{children}</span>
      </div>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
          {shortcut}
        </span>
      )}
    </div>
  );
};

const ContextMenuSeparator = () => (
  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
);

export { ContextMenu, ContextMenuItem, ContextMenuSeparator };
