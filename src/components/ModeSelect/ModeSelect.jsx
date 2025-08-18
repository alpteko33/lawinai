import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { selectMode, setMode as setModeAction } from '@/renderer/redux/store';

const ModeSelect = () => {
  const dispatch = useDispatch();
  const mode = useSelector(selectMode);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Keyboard shortcut: Cmd/Ctrl + . to cycle modes: sor → ozetle → yazdir → sor
  useEffect(() => {
    const handler = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        const order = ['sor', 'ozetle', 'yazdir'];
        const idx = order.indexOf(mode);
        const next = order[(idx + 1) % order.length];
        dispatch(setModeAction(next));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, dispatch]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const modes = [
    { key: 'yazdir', label: 'Yazdır' },
    { key: 'sor', label: 'Sor' },
    { key: 'ozetle', label: 'Özetle' },
  ];

  const currentMode = modes.find(m => m.key === mode);

  const handleModeSelect = (selectedMode) => {
    dispatch(setModeAction(selectedMode));
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleDropdown}
        className="h-8 px-3 text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
        title={`Mevcut mod: ${currentMode?.label} (Cmd/Ctrl + . ile döngü)`}
      >
        <span>{currentMode?.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {modes.map((m) => (
              <button
                key={m.key}
                onClick={() => handleModeSelect(m.key)}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                  mode === m.key 
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{m.label}</span>
                {mode === m.key && <Check className="w-3 h-3 text-purple-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeSelect;


