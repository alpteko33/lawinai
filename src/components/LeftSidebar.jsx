import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Folder, 
  FolderOpen, 
  File, 
  Settings,
  LayoutTemplate,
  Clock,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const PETITION_TEMPLATES = [
  {
    id: 1,
    title: "İcra Takibi Durdurma",
    category: "İcra Hukuku",
    description: "İcra takibinin durdurulması için dilekçe şablonu",
    lastUsed: "2024-01-15"
  },
  {
    id: 2,
    title: "İşçi Alacağı Davası",
    category: "İş Hukuku", 
    description: "İşçi alacağı davası açılması için dilekçe şablonu",
    lastUsed: "2024-01-10"
  },
  {
    id: 3,
    title: "Tazminat Davası",
    category: "Borçlar Hukuku",
    description: "Maddi ve manevi tazminat davası dilekçe şablonu",
    lastUsed: "2024-01-08"
  }
];

const RECENT_DOCUMENTS = [
  {
    id: 1,
    title: "Mehmet Yılmaz - İcra Takibi",
    lastModified: "2024-01-20T10:30:00Z",
    status: "draft",
    type: "petition"
  },
  {
    id: 2,
    title: "ABC Şirketi - Alacak Davası",
    lastModified: "2024-01-19T15:45:00Z", 
    status: "completed",
    type: "petition"
  }
];

function LeftSidebar({ 
  files = [], 
  onFileUpload, 
  onFileSelect,
  onTemplateSelect,
  onNewDocument,
  currentDocument 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const getFileIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Taslak', variant: 'secondary' },
      completed: { label: 'Tamamlandı', variant: 'default' },
      review: { label: 'İncelemede', variant: 'outline' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = PETITION_TEMPLATES.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4">
        <div className="flex items-center space-x-2 flex-1">
          <Folder className="w-5 h-5 text-blue-400" />
          <span className="font-semibold">Dosyalar</span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewDocument}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Dosya, şablon ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="files" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 mb-4 bg-gray-800">
          <TabsTrigger value="files" className="text-xs">Dosyalar</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">Şablonlar</TabsTrigger>
          <TabsTrigger value="recent" className="text-xs">Son Kullanılan</TabsTrigger>
        </TabsList>

        {/* Files Tab */}
        <TabsContent value="files" className="flex-1 flex flex-col m-0">
          <div className="px-4 mb-4">
            <Button
              onClick={onFileUpload}
              variant="default"
              size="sm"
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Dosya Yükle
            </Button>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <Card 
                  key={file.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors border-gray-600 bg-gray-700/50"
                  onClick={() => onFileSelect(file)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-3">
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate mb-1">
                          {file.name}
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">
                            {formatFileSize(file.size)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(file.uploadedAt)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {file.type?.toUpperCase()} belgesi
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredFiles.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Henüz dosya yüklenmemiş</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="flex-1 flex flex-col m-0">
          {/* Category Filter */}
          <div className="px-4 mb-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white"
            >
              <option value="all">Tüm Kategoriler</option>
              <option value="İcra Hukuku">İcra Hukuku</option>
              <option value="İş Hukuku">İş Hukuku</option>
              <option value="Borçlar Hukuku">Borçlar Hukuku</option>
            </select>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors border-gray-600 bg-gray-700/50"
                  onClick={() => onTemplateSelect(template)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-3">
                      <LayoutTemplate className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate mb-1">
                          {template.title}
                        </div>
                        <Badge variant="outline" className="text-xs text-purple-400 border-purple-400 mb-2">
                          {template.category}
                        </Badge>
                        <div className="text-xs text-gray-400 mb-2">
                          {template.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          Son kullanım: {formatDate(template.lastUsed)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Recent Tab */}
        <TabsContent value="recent" className="flex-1 flex flex-col m-0">
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2">
              {RECENT_DOCUMENTS.map((doc) => (
                <Card 
                  key={doc.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors border-gray-600 bg-gray-700/50"
                  onClick={() => onFileSelect(doc)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-3">
                      <Clock className="w-4 h-4 text-blue-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm text-white truncate">
                            {doc.title}
                          </div>
                          {getStatusBadge(doc.status)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(doc.lastModified)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LeftSidebar; 