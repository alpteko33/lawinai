import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { selectMode, setMode as setModeAction } from '@/renderer/redux/store';

const ModeSelect = ({ isTopPosition = false }) => {
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

  const currentMode = modes.find(m => m.key === mode) || modes.find(m => m.key === 'sor');

  const handleModeSelect = (selectedMode) => {
    dispatch(setModeAction(selectedMode));
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative w-full h-full" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="w-full h-full bg-transparent flex items-center justify-center text-[12px] text-[#6E7C89] hover:text-white transition-colors"
        title={`Mevcut mod: ${currentMode?.label || 'Sor'} (Cmd/Ctrl + . ile döngü)`}
      >
        <span className="text-[12px] font-normal">{currentMode?.label || 'Sor'}</span>
        <ChevronDown className={`w-2.5 h-2.5 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 w-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[1300] ${
          isTopPosition ? 'top-full mt-1' : 'bottom-full mb-1'
        }`}>
          <div className="py-1">
            {modes.map((m) => (
              <button
                key={m.key}
                onClick={() => handleModeSelect(m.key)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-full px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                  mode === m.key 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{m.label}</span>
                {mode === m.key && <Check className="w-2.5 h-2.5 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeSelect;


