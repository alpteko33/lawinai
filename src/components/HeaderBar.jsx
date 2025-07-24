import React from 'react';
import { Scale, Download, FileText, Settings, User, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function HeaderBar({ currentDocument, onExport, onNewDocument, onOpenSettings, darkMode, onToggleTheme }) {
  return (
    <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
      {/* Left: App Logo & Document Title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Scale className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold text-foreground">LawInAI</span>
          <Badge variant="secondary" className="text-xs">Pro</Badge>
        </div>
        
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {currentDocument?.title || 'Yeni Dilekçe'}
          </span>
          {currentDocument?.hasChanges && (
            <Badge variant="outline" className="text-xs text-orange-400 border-orange-400">
              Kaydedilmedi
            </Badge>
          )}
        </div>
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onNewDocument}
        >
          <FileText className="w-4 h-4 mr-2" />
          Yeni
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Dilekçeyi Dışa Aktar</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Dilekçenizi farklı formatlarda kaydedin
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button 
                onClick={() => onExport('pdf')}
                className="bg-red-600 hover:bg-red-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button 
                onClick={() => onExport('docx')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                DOCX
              </Button>
              <Button 
                onClick={() => onExport('txt')}
                variant="outline"
              >
                <FileText className="w-4 h-4 mr-2" />
                TXT
              </Button>
              <Button 
                onClick={() => window.print()}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Yazdır
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="h-6 w-px bg-border" />

        <Button 
          variant="ghost" 
          size="sm"
          onClick={onToggleTheme}
          title={darkMode ? 'Açık tema' : 'Koyu tema'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          onClick={onOpenSettings}
        >
          <Settings className="w-4 h-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
        >
          <User className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default HeaderBar; 