import React from 'react';
import { FileText, Upload, Scale, ChevronRight, FolderOpen, File } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';

function Sidebar({ files, onFileUpload, activeView, onViewChange, navigationItems }) {
  
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-400" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'txt':
        return <File className="w-4 h-4 text-gray-400" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatFileSize = (path) => {
    // Simulate file size (in real app, get from file system)
    return `${Math.floor(Math.random() * 500 + 50)} KB`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Logo & Navigation */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Scale className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg">LawInAI</span>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.view)}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors',
                  activeView === item.view
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                
                {item.badge && (
                  <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.5rem] text-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Hızlı İşlemler</h3>
        <Button
          onClick={onFileUpload}
          variant="default"
          size="lg"
          className="w-full"
        >
          <Upload className="w-4 h-4" />
          Dosya Yükle
        </Button>
      </div>

      {/* File Explorer */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2 mb-3">
            <FolderOpen className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-400">Dava Dosyaları</h3>
          </div>
          
          {files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">Henüz dosya yüklenmedi</p>
              <p className="text-xs text-gray-600">
                PDF, Word veya metin dosyalarınızı yükleyin
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-400 mb-2">
              {files.length} dosya yüklendi
            </div>
          )}
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {files.map((file) => (
            <Card 
              key={file.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors border-gray-600 bg-gray-700/50"
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm text-white truncate mb-1">
                      {file.name}
                    </CardTitle>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">
                        {formatFileSize(file.path)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(file.uploadedAt)}
                      </span>
                    </div>
                    <CardDescription className="text-xs text-gray-500">
                      {file.type.toUpperCase()} belgesi
                    </CardDescription>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Status Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-850">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Hazır</span>
          </div>
          <div>
            v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar; 