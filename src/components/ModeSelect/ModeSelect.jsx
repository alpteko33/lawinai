import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useDispatch, useSelector } from 'react-redux';
import { selectMode, setMode as setModeAction } from '@/renderer/redux/store';

const ModeSelect = () => {
  const dispatch = useDispatch();
  const mode = useSelector(selectMode);

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

  const buttons = [
    { key: 'yazdir', label: 'Yazdır' },
    { key: 'sor', label: 'Sor' },
    { key: 'ozetle', label: 'Özetle' },
  ];

  return (
    <div className="flex items-center space-x-1 mr-2">
      {buttons.map((m) => (
        <Button
          key={m.key}
          variant={mode === m.key ? 'default' : 'ghost'}
          size="sm"
          onClick={() => dispatch(setModeAction(m.key))}
          className={`h-7 px-2 text-xs ${mode === m.key ? 'bg-purple-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}
          title={`Moda geç: ${m.label} (Cmd/Ctrl + . ile döngü)`}
        >
          {m.label}
        </Button>
      ))}
    </div>
  );
};

export default ModeSelect;


