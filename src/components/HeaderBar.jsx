import React, { useState, useEffect, useRef } from 'react';
import { Scale, Settings, User, Sun, Moon, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import udfService from '../services/udfService';

function HeaderBar({ currentDocument, onExport, onNewDocument, onOpenSettings, darkMode, onToggleTheme }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };

    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [exportMenuOpen]);

  // UDF Export handler
  const handleUDFExport = async () => {
    if (!currentDocument?.content) {
      alert('Export edilecek içerik bulunamadı');
      return;
    }

    try {
      setIsExporting(true);
      
      // UDF dosyası oluştur
      const udfBlob = await udfService.createUDF(
        currentDocument.content,
        currentDocument.title || 'Hukuki Metin'
      );
      
      // Dosyayı indir
      const filename = `${currentDocument.title || 'hukuki-metin'}.udf`;
      udfService.downloadUDF(udfBlob, filename);
      
      console.log('UDF export başarılı');
    } catch (error) {
      console.error('UDF export hatası:', error);
      alert('UDF dosyası oluşturulurken hata oluştu: ' + error.message);
    } finally {
      setIsExporting(false);
      setExportMenuOpen(false);
    }
  };

  // PDF Export handler
  const handlePDFExport = () => {
    if (onExport) {
      onExport('pdf');
    }
    setExportMenuOpen(false);
  };

  return (
    <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
      {/* Left: App Logo & Document Title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Scale className="w-6 h-6 text-primary" />
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">LawInAI</span>
        </div>
        
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center space-x-2">
        {/* Export Dropdown Menu */}
        <div className="relative" ref={exportMenuRef}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            disabled={!currentDocument?.content || isExporting}
            title="Dokümanı Dışa Aktar"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </Button>

          {/* Export Menu Dropdown */}
          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="py-2">
                <button
                  onClick={handleUDFExport}
                  disabled={isExporting}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <FileText className="w-4 h-4" />
                  <div>
                    <div className="font-medium">UDF Formatı</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">UYAP uyumlu format</div>
                  </div>
                </button>
                
                <button
                  onClick={handlePDFExport}
                  disabled={isExporting}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <FileText className="w-4 h-4" />
                  <div>
                    <div className="font-medium">PDF Formatı</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Portable Document Format</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

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