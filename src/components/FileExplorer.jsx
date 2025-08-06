import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  FileText,
  Image,
  Upload,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// File type icons - Enhanced with hover animations (no text color changes)
const getFileIcon = (fileType, size = 18) => {
  const type = fileType?.toLowerCase();
  const props = { size, className: "flex-shrink-0 transition-transform duration-200 hover:scale-110" };
  
  switch (type) {
    case 'udf':
      return <FileText {...props} className={`${props.className} text-emerald-500`} />;
    case 'pdf':
      return <FileText {...props} className={`${props.className} text-red-500`} />;
    case 'doc':
    case 'docx':
      return <FileText {...props} className={`${props.className} text-blue-500`} />;
    case 'txt':
      return <FileText {...props} className={`${props.className} text-slate-500`} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'tiff':
    case 'tif':
      return <Image {...props} className={`${props.className} text-violet-500`} />;
    default:
      return <File {...props} className={`${props.className} text-gray-400`} />;
  }
};

// File tree item component - FIXED ALIGNMENT
const FileTreeItem = ({ item, level = 0, onFileSelect, onViewFile, selectedFile }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSelected = selectedFile?.id === item.id;
  
  const handleClick = () => {
    if (item.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect?.(item);
    }
  };
  
  const handleDoubleClick = () => {
    if (item.type !== 'folder') {
      onViewFile?.(item);
    }
  };
  
  return (
    <div>
      <div
        className={`
          flex items-center gap-2 py-1.5 cursor-pointer rounded-md
          transition-all duration-200 ease-in-out
          shadow-sm hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-[1.02]
          ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30 shadow-md border border-blue-200 dark:border-blue-700' : 'border border-transparent'}
        `}
        style={{ 
          paddingLeft: `${level * 16}px`,
          paddingRight: '8px'
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {item.type === 'folder' ? (
          <>
            {item.children?.length > 0 ? (
              isExpanded ? (
                <ChevronDown size={16} className="text-gray-400 transition-transform duration-200" />
              ) : (
                <ChevronRight size={16} className="text-gray-400 transition-transform duration-200" />
              )
            ) : (
              <div className="w-4" />
            )}
            {isExpanded ? (
              <FolderOpen size={18} className="text-blue-500 transition-transform duration-200 hover:scale-110" />
            ) : (
              <Folder size={18} className="text-blue-500 transition-transform duration-200 hover:scale-110" />
            )}
          </>
        ) : (
          <>
            <div className="w-4" />
            {getFileIcon(item.type)}
          </>
        )}
        
        <span className="text-sm font-medium truncate flex-1 min-w-0" title={item.name}>
          {item.name}
        </span>
        
        {item.size && (
          <span className="text-xs text-gray-400 ml-1">
            {formatFileSize(item.size)}
          </span>
        )}
      </div>
      
      {item.type === 'folder' && isExpanded && item.children?.map(child => (
        <FileTreeItem
          key={child.id || child.path}
          item={child}
          level={level + 1}
          onFileSelect={onFileSelect}
          onViewFile={onViewFile}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  );
};

// Format file size helper
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

function FileExplorer({ 
  files = [], 
  onFileUpload, 
  onFileSelect,
  onViewFile,
  currentWorkspace,
  selectedFile
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Build file tree structure
  const fileTree = useMemo(() => {
    if (!files.length) return [];
    
    const tree = [];
    const folderMap = new Map();
    
    // Workspace dosyalarını klasör yapısına göre organize et
    const workspaceFiles = files.filter(f => f.isWorkspaceFile);
    const otherFiles = files.filter(f => !f.isWorkspaceFile);
    
    if (workspaceFiles.length > 0) {
      workspaceFiles.forEach(file => {
        if (!file.relativePath) {
          tree.push({ ...file, id: file.id || file.path });
          return;
        }
        
        const pathParts = file.relativePath.split(/[\/\\]/);
        let currentLevel = tree;
        let currentPath = '';
        
        // Her path parçası için klasör oluştur
        pathParts.forEach((part, index) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (index === pathParts.length - 1) {
            // Bu bir dosya
            currentLevel.push({ ...file, id: file.id || file.path });
          } else {
            // Bu bir klasör
            let folder = currentLevel.find(item => item.name === part && item.type === 'folder');
            if (!folder) {
              folder = {
                id: `folder-${currentPath}`,
                name: part,
                type: 'folder',
                path: currentPath,
                children: []
              };
              currentLevel.push(folder);
            }
            currentLevel = folder.children;
          }
        });
      });
    }
    
    // Workspace dışındaki dosyalar
    if (otherFiles.length > 0) {
      if (workspaceFiles.length > 0) {
        tree.push({
          id: 'uploaded-files',
          name: 'Yüklenen Dosyalar',
          type: 'folder',
          children: otherFiles.map(f => ({ ...f, id: f.id || f.path }))
        });
      } else {
        otherFiles.forEach(file => {
          tree.push({ ...file, id: file.id || file.path });
        });
      }
    }
    
    return tree;
  }, [files]);
  
  // Filter files based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return fileTree;
    
    const filterTree = (items) => {
      return items.filter(item => {
        if (item.type === 'folder') {
          const filteredChildren = filterTree(item.children || []);
          if (filteredChildren.length > 0) {
            return { ...item, children: filteredChildren };
          }
          return item.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return item.name.toLowerCase().includes(searchQuery.toLowerCase());
      }).map(item => {
        if (item.type === 'folder') {
          const filteredChildren = filterTree(item.children || []);
          return { ...item, children: filteredChildren };
        }
        return item;
      });
    };
    
    return filterTree(fileTree);
  }, [fileTree, searchQuery]);

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onFileUpload) {
      handleDropFiles(files);
    }
  };

  const handleDropFiles = async (droppedFiles) => {
    if (!currentWorkspace || !window.electronAPI) {
      console.log('No workspace or Electron API available for dropped files');
      if (onFileUpload) {
        onFileUpload();
      }
      return;
    }

    try {
      const filePaths = [];
      
      for (const file of droppedFiles) {
        if (file.path) {
          filePaths.push(file.path);
        } else {
          const copyResult = await window.electronAPI.copyToWorkspace(
            file.name,
            currentWorkspace.path,
            file.name
          );
          
          if (copyResult.success) {
            console.log('Dropped file copied to workspace:', copyResult.targetPath);
          }
        }
      }
      
      if (filePaths.length > 0) {
        const result = await window.electronAPI.handleDroppedFiles(filePaths, currentWorkspace.path);
        if (result.success) {
          console.log(`Successfully processed ${result.results.length} dropped files`);
        }
      }
    } catch (error) {
      console.error('Error handling dropped files:', error);
    }
  };

  return (
    <div 
      className={`h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 relative shadow-lg ${
        isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header - CONSISTENT PADDING */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {currentWorkspace ? (currentWorkspace.name || 'Workspace') : 'Dosyalar'}
          </h2>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onFileUpload}
              className="h-7 w-7 p-0"
              title="Dosya Yükle"
            >
              <Upload size={14} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              title="Daha Fazla"
            >
              <MoreHorizontal size={14} />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Dosya ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      
      {/* File List - MATCHING PADDING */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <File size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'Dosya bulunamadı' : 'Henüz dosya yok'}
              </p>
              {!searchQuery && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onFileUpload}
                  className="mt-2"
                >
                  <Upload size={14} className="mr-1" />
                  Dosya Yükle
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map(item => (
                <FileTreeItem
                  key={item.id}
                  item={item}
                  onFileSelect={onFileSelect}
                  onViewFile={onViewFile}
                  selectedFile={selectedFile}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 flex items-center justify-center z-50">
          <div className="text-center">
            <Upload size={32} className="mx-auto text-blue-500 mb-2" />
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Dosyaları buraya bırakın
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {currentWorkspace ? `${currentWorkspace.name} klasörüne eklenecek` : 'Yüklenecek'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileExplorer;