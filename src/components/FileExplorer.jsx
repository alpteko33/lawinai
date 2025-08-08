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
  const getFileIcon = (fileType, size = 16) => {
  const type = fileType?.toLowerCase();
  const props = { size, className: "flex-shrink-0 transition-colors duration-200" };
  
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
  
  // Üst seviye dosyaları (folder olmayan ve level 0) başlıkla hizalamak için
  const marginAdjustment = (item.type !== 'folder' && level === 0) ? -3 : 0; // 16(icon)+8(gap)

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 py-1 cursor-pointer rounded-lg
          transition-all duration-200 ease-in-out
          hover:bg-gray-50 dark:hover:bg-gray-800/50
          ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50' : 'border border-transparent'}
        `}
        style={{ 
          paddingLeft: `${level * 16}px`,
          paddingRight: '8px',
          marginLeft: marginAdjustment
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
            ) : null}
                              {isExpanded ? (
                    <FolderOpen size={16} className="text-blue-600 dark:text-blue-400 transition-colors duration-200" />
                  ) : (
                    <Folder size={16} className="text-blue-600 dark:text-blue-400 transition-colors duration-200" />
                  )}
          </>
        ) : (
          <>
            {getFileIcon(item.type)}
          </>
        )}
        
                      <span className="text-xs font-medium truncate flex-1 min-w-0 text-gray-700 dark:text-gray-200" title={item.name}>
          {item.name}
        </span>
        
                 {item.size && (
           <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-normal">
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
      className={`h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 relative ${
        isDragOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header - CONSISTENT PADDING */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-900/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            {currentWorkspace ? (currentWorkspace.name || 'Workspace') : 'Dosyalar'}
          </h2>
          <div className="flex items-center gap-1">
                         <Button 
               variant="ghost" 
               size="sm" 
               onClick={onFileUpload}
               className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
               title="Dosya Yükle"
             >
               <Upload size={15} className="text-gray-600 dark:text-gray-300" />
             </Button>
             <Button 
               variant="ghost" 
               size="sm" 
               className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
               title="Daha Fazla"
             >
               <MoreHorizontal size={15} className="text-gray-600 dark:text-gray-300" />
             </Button>
          </div>
        </div>
        
                 {/* Search */}
         <div className="relative">
           <Search size={15} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
           <input
             type="text"
             placeholder="Dosya ara..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
           />
         </div>
      </div>
      
             {/* File List - MATCHING PADDING */}
       <ScrollArea className="flex-1">
         <div className="px-4 py-3">
          {filteredFiles.length === 0 ? (
                         <div className="text-center py-12 text-gray-500 dark:text-gray-400">
               <File size={40} className="mx-auto mb-3 opacity-40" />
               <p className="text-sm font-medium">
                 {searchQuery ? 'Dosya bulunamadı' : 'Henüz dosya yok'}
               </p>
              {!searchQuery && (
                                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={onFileUpload}
                   className="mt-3 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                 >
                   <Upload size={14} className="mr-2" />
                   Dosya Yükle
                 </Button>
              )}
            </div>
          ) : (
                         <div className="space-y-1">
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
         <div className="absolute inset-0 bg-blue-500/5 border-2 border-dashed border-blue-400/50 rounded-lg flex items-center justify-center z-50 backdrop-blur-sm">
           <div className="text-center bg-white/80 dark:bg-gray-900/80 p-6 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
             <Upload size={36} className="mx-auto text-blue-500 mb-3" />
             <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
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