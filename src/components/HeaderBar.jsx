import React, { useState, useEffect, useRef } from 'react';
import { Scale, Settings, User, Sun, Moon, Download, FileText, Folder, X } from 'lucide-react';
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
    <div className="h-12 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-900/50">
      {/* Left: App Logo */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <Scale className="w-7 h-7 text-purple-600 dark:text-purple-400" />
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">LawInAI</span>
        </div>
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center space-x-1">
        {/* Export Dropdown Menu */}
        <div className="relative" ref={exportMenuRef}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            disabled={!currentDocument?.content || isExporting}
            title="Dokümanı Dışa Aktar"
            className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </Button>

          {/* Export Menu Dropdown */}
          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 backdrop-blur-sm">
              <div className="py-2">
                <button
                  onClick={handleUDFExport}
                  disabled={isExporting}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center space-x-3 transition-colors duration-200 rounded-lg mx-2"
                >
                  <FileText className="w-5 h-5 text-emerald-500" />
                  <div>
                    <div className="font-semibold">UDF Formatı</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">UYAP uyumlu format</div>
                  </div>
                </button>
                
                <button
                  onClick={handlePDFExport}
                  disabled={isExporting}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center space-x-3 transition-colors duration-200 rounded-lg mx-2"
                >
                  <FileText className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="font-semibold">PDF Formatı</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Portable Document Format</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <Button 
          variant="ghost" 
          size="sm"
          onClick={onToggleTheme}
          title={darkMode ? 'Açık tema' : 'Koyu tema'}
          className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          {darkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />}
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          onClick={onOpenSettings}
          className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <Settings className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </Button>
      </div>
    </div>
  );
}

export default HeaderBar; 