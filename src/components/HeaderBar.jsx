import React from 'react';
import { Scale, Settings, User, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

function HeaderBar({ onOpenSettings, darkMode, onToggleTheme }) {

  return (
    <div className="h-11 bg-white/5 dark:bg-white/5 backdrop-blur-[6px] border-b border-gray-100/10 dark:border-gray-800/60 flex items-center justify-between px-5">
      {/* Left: App Logo */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <Scale className="w-6 h-6 text-purple-500" />
          <span className="text-base font-semibold text-gray-100 tracking-tight">LawInAI</span>
        </div>
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center space-x-1">

        <Button 
          variant="ghost" 
          size="sm"
          onClick={onToggleTheme}
          title={darkMode ? 'Açık tema' : 'Koyu tema'}
          className="h-8 w-8 p-0 hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          {darkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />}
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          onClick={onOpenSettings}
          className="h-8 w-8 p-0 hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          <Settings className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0 hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </Button>
      </div>
    </div>
  );
}

export default HeaderBar; 