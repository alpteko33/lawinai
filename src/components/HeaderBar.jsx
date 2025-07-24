import React from 'react';
import { Scale, Download, FileText, Settings, User } from 'lucide-react';
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

function HeaderBar({ currentDocument, onExport, onNewDocument, onOpenSettings }) {
  return (
    <div className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
      {/* Left: App Logo & Document Title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Scale className="w-6 h-6 text-law-gold" />
          <span className="text-lg font-bold text-white">LawInAI</span>
          <Badge variant="secondary" className="text-xs">Pro</Badge>
        </div>
        
        <div className="h-6 w-px bg-gray-600" />
        
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">
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
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          Yeni
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-white">Dilekçeyi Dışa Aktar</DialogTitle>
              <DialogDescription className="text-gray-400">
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
                className="border-gray-600 text-gray-300"
              >
                <FileText className="w-4 h-4 mr-2" />
                TXT
              </Button>
              <Button 
                onClick={() => window.print()}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Yazdır
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="h-6 w-px bg-gray-600" />

        <Button 
          variant="ghost" 
          size="sm"
          onClick={onOpenSettings}
          className="text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <Settings className="w-4 h-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <User className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default HeaderBar; 