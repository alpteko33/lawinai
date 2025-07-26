import React, { useState } from 'react';
import { 
  Upload, 
  Folder, 
  Search,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PromptDialog, ConfirmDialog, AlertDialog, Notification } from './CustomDialogs';

// Material-UI components
import {
  Box,
  Typography,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Paper,
  Fade,
  Menu,
  MenuItem,
  Divider,
  ClickAwayListener
} from '@mui/material';

// Material-UI icons
import {
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  CloudUpload as UploadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  CreateNewFolder as NewFolderIcon,
  NoteAdd as NewFileIcon,
  CloudUpload as AddFileIcon,
  ContentPaste as PasteIcon
} from '@mui/icons-material';



function LeftSidebar({ 
  files = [], 
  onFileUpload, 
  onFileSelect,
  onNewDocument,
  currentDocument,
  onViewFile,
  onFileRemove,
  onFileRename,
  onCreateFolder,
  onCreateFile,
  onPasteFile // New prop for paste functionality
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuType, setContextMenuType] = useState(null); // 'file' or 'area'
  const [contextMenuFile, setContextMenuFile] = useState(null);
  const [copiedFile, setCopiedFile] = useState(null); // Store copied file for paste operation

  // Dialog states
  const [promptDialog, setPromptDialog] = useState({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info' });
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [notification, setNotification] = useState({ isVisible: false, message: '', type: 'success' });
  


  // MUI icon selector based on file type
  const getFileIcon = (fileType) => {
    const type = fileType?.toLowerCase();
    const iconStyle = { fontSize: 20 };
    
    switch (type) {
      case 'udf':
        return <DocIcon sx={{ ...iconStyle, color: '#2e7d32' }} />; // Green for UDF
      case 'pdf':
        return <PdfIcon sx={{ ...iconStyle, color: '#d32f2f' }} />;
      case 'doc':
      case 'docx':
        return <DocIcon sx={{ ...iconStyle, color: '#1976d2' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon sx={{ ...iconStyle, color: '#388e3c' }} />;
      default:
        return <FileIcon sx={{ ...iconStyle, color: '#757575' }} />;
    }
  };



  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Context menu handlers
  const handleFileContextMenu = (event, file) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    });
    setContextMenuType('file');
    setContextMenuFile(file);
  };

  const handleAreaContextMenu = (event) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    });
    setContextMenuType('area');
    setContextMenuFile(null);
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
    setContextMenuType(null);
    setContextMenuFile(null);
  };

  const handleFileAction = (action, file) => {
    handleContextMenuClose();
    
    switch (action) {
      case 'view':
        if (onViewFile) {
          onViewFile(file);
        }
        break;
        
      case 'delete':
        // Dosyayı kaldır
        setConfirmDialog({
          isOpen: true,
          title: 'Dosyayı Kaldır',
          message: `"${file.name}" dosyasını listeden kaldırmak istediğinizden emin misiniz?`,
          type: 'danger',
          onConfirm: () => {
            if (onFileRemove) {
              onFileRemove(file.id);
            }
            setConfirmDialog({ ...confirmDialog, isOpen: false });
            setNotification({ isVisible: true, message: 'Dosya başarıyla kaldırıldı', type: 'success' });
          }
        });
        break;
        
      case 'info':
        // Dosya bilgilerini göster
        const fileSize = file.size ? formatFileSize(file.size) : 'Bilinmiyor';
        const uploadDate = file.uploadedAt ? new Date(file.uploadedAt).toLocaleString('tr-TR') : 'Bilinmiyor';
        const fileType = file.type || file.name.split('.').pop()?.toUpperCase() || 'Bilinmiyor';
        
        setAlertDialog({
          isOpen: true,
          title: '📁 Dosya Bilgileri',
          message: `📄 Adı: ${file.name}\n📊 Boyutu: ${fileSize}\n🏷️ Türü: ${fileType}\n📅 Yüklenme Tarihi: ${uploadDate}\n🆔 ID: ${file.id}`,
          type: 'info'
        });
        break;
        
      case 'rename':
        // Dosya adını değiştir
        setPromptDialog({
          isOpen: true,
          title: 'Dosya Adını Değiştir',
          message: 'Yeni dosya adını girin:',
          defaultValue: file.name,
          onConfirm: (newName) => {
            if (newName && newName.trim() && newName !== file.name) {
              if (onFileRename) {
                onFileRename(file.id, newName.trim());
              }
              setNotification({ isVisible: true, message: 'Dosya adı başarıyla değiştirildi', type: 'success' });
            }
            setPromptDialog({ ...promptDialog, isOpen: false });
          }
        });
        break;
        
      case 'copy':
        // Dosyayı kopyala (dosyanın kendisini, yolunu değil)
        setCopiedFile(file);
        setNotification({ isVisible: true, message: `📋 "${file.name}" dosyası kopyalandı!`, type: 'success' });
        break;
        
      case 'share':
        // Paylaşım seçenekleri
        const shareText = `Dosya: ${file.name}`;
        if (navigator.share) {
          // Web Share API (mobile/modern browsers)
          navigator.share({
            title: 'Dosya Paylaşımı',
            text: shareText,
            url: file.path || ''
          }).catch(console.error);
        } else {
          // Fallback - show share dialog
          setAlertDialog({
            isOpen: true,
            title: '📤 Dosya Paylaşımı',
            message: `${shareText}\n\nPaylaşım seçenekleri:\n\n📧 E-posta: mailto bağlantısı açılacak\n📱 WhatsApp: WhatsApp Web açılacak\n🔗 Link: Dosya yolu kopyalanacak\n\n(Electron'da bu özellikler sınırlıdır)`,
            type: 'info'
          });
          
          // Auto actions for Electron
          setTimeout(() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(file.path || file.name);
              setNotification({ isVisible: true, message: '🔗 Dosya yolu panoya kopyalandı', type: 'info' });
            }
          }, 1000);
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleAreaAction = (action) => {
    handleContextMenuClose();
    
    switch (action) {
      case 'newFolder':
        // Yeni klasör oluştur
        setPromptDialog({
          isOpen: true,
          title: 'Yeni Klasör Oluştur',
          message: 'Yeni klasör adını girin:',
          defaultValue: '',
          onConfirm: (folderName) => {
            if (folderName && folderName.trim()) {
              if (onCreateFolder) {
                onCreateFolder(folderName.trim());
                setNotification({ isVisible: true, message: `📁 "${folderName}" klasörü oluşturuldu`, type: 'success' });
              } else {
                setAlertDialog({
                  isOpen: true,
                  title: 'Bilgi',
                  message: `📁 "${folderName}" klasörü oluşturulacak.\n\n(Bu özellik henüz tam olarak implementlenmemiş)`,
                  type: 'info'
                });
              }
            }
            setPromptDialog({ ...promptDialog, isOpen: false });
          }
        });
        break;
        
      case 'newFile':
        // Yeni dosya oluştur
        setPromptDialog({
          isOpen: true,
          title: 'Yeni Dosya Oluştur',
          message: 'Yeni dosya adını girin (uzantısıyla birlikte):',
          defaultValue: 'yeni-dosya.txt',
          onConfirm: (fileName) => {
            if (fileName && fileName.trim()) {
              if (onCreateFile) {
                onCreateFile(fileName.trim());
                setNotification({ isVisible: true, message: `📄 "${fileName}" dosyası oluşturuldu`, type: 'success' });
              } else {
                setAlertDialog({
                  isOpen: true,
                  title: 'Bilgi',
                  message: `📄 "${fileName}" dosyası oluşturulacak.\n\n(Bu özellik henüz tam olarak implementlenmemiş)`,
                  type: 'info'
                });
              }
            }
            setPromptDialog({ ...promptDialog, isOpen: false });
          }
        });
        break;
        
      case 'uploadFile':
        // Dosya yükleme dialogunu aç
        if (onFileUpload) {
          onFileUpload();
        }
        break;

      case 'paste':
        // Kopyalanan dosyayı yapıştır
        if (copiedFile && onPasteFile) {
          const newFile = {
            ...copiedFile,
            id: Date.now() + Math.random(), // Yeni ID
            name: `${copiedFile.name.split('.').slice(0, -1).join('.')} - Kopya.${copiedFile.name.split('.').pop()}`, // "dosya - Kopya.ext" formatı
            uploadedAt: new Date().toISOString()
          };
          
          // Parent component'e dosyayı eklemesi için bildir
          onPasteFile(newFile);
          setNotification({ isVisible: true, message: `📄 "${newFile.name}" dosyası yapıştırıldı`, type: 'success' });
        } else {
          setNotification({ isVisible: true, message: 'Yapıştırılacak dosya bulunamadı', type: 'warning' });
        }
        break;
        
      default:
        console.log('Unknown area action:', action);
    }
  };

  // Helper function for file size formatting
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Header */}
              <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
        <div className="flex items-center space-x-2 flex-1">
          <Folder className="w-5 h-5 text-primary" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">İncelenecek Dosyalar</span>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Dosya, şablon ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Files Section */}
      <div className="flex-1 flex flex-col">
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
          <div 
            className="space-y-1" 
            onContextMenu={(e) => {
              // Only trigger area context menu if clicking on empty space
              if (e.target === e.currentTarget || e.target.closest('.space-y-1') === e.currentTarget) {
                handleAreaContextMenu(e);
              }
            }}
            style={{ minHeight: '200px' }}
          >

            
            {filteredFiles.map((file) => {
              const isSelected = selectedFileId === file.id;
              const shouldTruncate = file.name.length > 25;
              const displayName = shouldTruncate && !isSelected 
                ? `${file.name.substring(0, 25)}...` 
                : file.name;
              
              return (
                <Tooltip
                  key={file.id}
                  title={shouldTruncate && !isSelected ? file.name : ''}
                  placement="right"
                  arrow
                  TransitionComponent={Fade}
                  TransitionProps={{ timeout: 200 }}
                  disableHoverListener={!shouldTruncate || isSelected}
                >
                  <Paper
                    elevation={isSelected ? 1 : 0}
                    sx={{
                      cursor: 'pointer',
                      mb: 0.5,
                      p: 1,
                      minHeight: 36,
                      transition: 'all 0.2s ease-in-out',
                      backgroundColor: isSelected 
                        ? 'primary.main' 
                        : 'background.paper',
                      border: 1,
                      borderColor: isSelected 
                        ? 'primary.main' 
                        : 'grey.300',
                      '&:hover': {
                        backgroundColor: isSelected 
                          ? 'primary.dark' 
                          : 'grey.100',
                        borderColor: isSelected 
                          ? 'primary.dark' 
                          : 'grey.400',
                        transform: 'translateY(-1px)',
                        boxShadow: 1
                      },
                      // Dark mode styles
                      '@media (prefers-color-scheme: dark)': {
                        backgroundColor: isSelected 
                          ? 'primary.main' 
                          : 'grey.900',
                        borderColor: isSelected 
                          ? 'primary.main' 
                          : 'grey.700',
                        '&:hover': {
                          backgroundColor: isSelected 
                            ? 'primary.dark' 
                            : 'grey.800',
                          borderColor: isSelected 
                            ? 'primary.dark' 
                            : 'grey.600',
                        }
                      }
                    }}
                    onClick={(e) => {
                      // Normal click - only if not right click
                      if (e.button !== 2) {
                        setSelectedFileId(file.id);
                        onFileSelect(file);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFileContextMenu(e, file);
                    }}
                  >
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      {getFileIcon(file.type)}
                      
                                             <Typography
                         variant="body2"
                         sx={{
                           fontSize: '0.7rem',
                           fontWeight: isSelected ? 600 : 400,
                           color: isSelected ? 'common.white' : 'text.primary',
                           flexGrow: 1,
                           overflow: isSelected ? 'auto' : 'hidden',
                           whiteSpace: isSelected ? 'nowrap' : 'normal',
                           lineHeight: 1.2,
                           wordBreak: 'break-word',
                           // Dark mode text color
                           '@media (prefers-color-scheme: dark)': {
                             color: isSelected ? 'common.white' : 'grey.100'
                           }
                         }}
                       >
                        {displayName}
                      </Typography>
                      
                                             {isSelected && (
                         <Chip
                           label="Seçili"
                           size="small"
                           variant="filled"
                           sx={{ 
                             fontSize: '0.55rem',
                             height: 16,
                             backgroundColor: 'common.white',
                             color: 'primary.main',
                             '& .MuiChip-label': {
                               px: 0.5,
                               fontWeight: 600
                             },
                             '@media (prefers-color-scheme: dark)': {
                               backgroundColor: 'grey.800',
                               color: 'common.white'
                             }
                           }}
                         />
                       )}
                    </Box>
                  </Paper>
                </Tooltip>
              );
            })}
            
            {filteredFiles.length === 0 && !searchQuery && (
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  py: 4,
                  color: 'text.secondary',
                  '@media (prefers-color-scheme: dark)': {
                    color: 'grey.400'
                  }
                }}
              >
                <UploadIcon sx={{ 
                  fontSize: 48, 
                  opacity: 0.5, 
                  mb: 2,
                  color: 'grey.900', // Black in light mode
                  '@media (prefers-color-scheme: dark)': {
                    color: 'grey.600'
                  }
                }} />
                <Typography variant="body2" sx={{ 
                  fontSize: '0.75rem', 
                  mb: 1,
                  color: 'grey.900', // Black in light mode
                  '@media (prefers-color-scheme: dark)': {
                    color: 'grey.400'
                  }
                }}>
                  Henüz dosya yüklenmemiş
                </Typography>
                <Typography variant="caption" sx={{ 
                  fontSize: '0.7rem',
                  color: 'grey.900', // Black in light mode
                  '@media (prefers-color-scheme: dark)': {
                    color: 'grey.500'
                  }
                }}>
                  Dosya yüklemek için yukarıdaki butonu kullanın
                </Typography>
              </Box>
            )}
            
            {filteredFiles.length === 0 && searchQuery && (
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  py: 4,
                  color: 'text.secondary',
                  '@media (prefers-color-scheme: dark)': {
                    color: 'grey.400'
                  }
                }}
              >
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <Typography variant="body2" sx={{ 
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  '@media (prefers-color-scheme: dark)': {
                    color: 'grey.400'
                  }
                }}>
                  "{searchQuery}" araması için sonuç bulunamadı
                </Typography>
              </Box>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Context Menus */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: {
            minWidth: 180,
            boxShadow: 3,
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'grey.300',
            '@media (prefers-color-scheme: dark)': {
              backgroundColor: 'grey.800',
              borderColor: 'grey.600'
            }
          },
        }}
      >
        {contextMenuType === 'file' && contextMenuFile && [
          <MenuItem
            key="view"
            onClick={() => handleFileAction('view', contextMenuFile)}
            sx={{ 
              fontSize: '0.8rem', 
              py: 1,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'grey.100'
              },
              '@media (prefers-color-scheme: dark)': {
                color: 'grey.100',
                '&:hover': {
                  backgroundColor: 'grey.700'
                }
              }
            }}
          >
            <ViewIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Görüntüle
          </MenuItem>,
          <MenuItem
            key="rename"
            onClick={() => handleFileAction('rename', contextMenuFile)}
            sx={{ 
              fontSize: '0.8rem', 
              py: 1,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'grey.100'
              },
              '@media (prefers-color-scheme: dark)': {
                color: 'grey.100',
                '&:hover': {
                  backgroundColor: 'grey.700'
                }
              }
            }}
          >
            <EditIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Adını Değiştir
          </MenuItem>,
          <MenuItem
            key="copy"
            onClick={() => handleFileAction('copy', contextMenuFile)}
            sx={{ 
              fontSize: '0.8rem', 
              py: 1,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'grey.100'
              },
              '@media (prefers-color-scheme: dark)': {
                color: 'grey.100',
                '&:hover': {
                  backgroundColor: 'grey.700'
                }
              }
            }}
          >
            <CopyIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Kopyala
          </MenuItem>,
          <MenuItem
            key="share"
            onClick={() => handleFileAction('share', contextMenuFile)}
            sx={{ 
              fontSize: '0.8rem', 
              py: 1,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'grey.100'
              },
              '@media (prefers-color-scheme: dark)': {
                color: 'grey.100',
                '&:hover': {
                  backgroundColor: 'grey.700'
                }
              }
            }}
          >
            <ShareIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Paylaş
          </MenuItem>,
          <MenuItem
            key="info"
            onClick={() => handleFileAction('info', contextMenuFile)}
            sx={{ 
              fontSize: '0.8rem', 
              py: 1,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'grey.100'
              },
              '@media (prefers-color-scheme: dark)': {
                color: 'grey.100',
                '&:hover': {
                  backgroundColor: 'grey.700'
                }
              }
            }}
          >
            <InfoIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Bilgi Ver
          </MenuItem>,
          <Divider key="divider" />,
          <MenuItem
            key="delete"
            onClick={() => handleFileAction('delete', contextMenuFile)}
            sx={{ 
              fontSize: '0.8rem', 
              py: 1,
              color: 'error.main',
              '&:hover': {
                backgroundColor: 'error.light',
                color: 'error.contrastText'
              },
              '@media (prefers-color-scheme: dark)': {
                color: 'error.light',
                '&:hover': {
                  backgroundColor: 'error.dark',
                  color: 'error.contrastText'
                }
              }
            }}
          >
            <DeleteIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Kaldır
          </MenuItem>
        ]}
        
        {contextMenuType === 'area' && [
          <MenuItem
            key="newFolder"
            onClick={() => handleAreaAction('newFolder')}
            sx={{ 
              fontSize: '0.8rem', 
              py: 1,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'grey.100'
              },
              '@media (prefers-color-scheme: dark)': {
                color: 'grey.100',
                '&:hover': {
                  backgroundColor: 'grey.700'
                }
              }
            }}
          >
            <NewFolderIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Yeni Klasör
          </MenuItem>,
          <MenuItem
            key="newFile"
            onClick={() => handleAreaAction('newFile')}
            sx={{ 
              fontSize: '0.8rem', 
              py: 1,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'grey.100'
              },
              '@media (prefers-color-scheme: dark)': {
                color: 'grey.100',
                '&:hover': {
                  backgroundColor: 'grey.700'
                }
              }
            }}
          >
            <NewFileIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Yeni Dosya
          </MenuItem>,
          <MenuItem
            key="paste"
            onClick={() => handleAreaAction('paste')}
            disabled={!copiedFile}
            sx={{ 
              fontSize: '0.8rem', 
              py: 1,
              color: copiedFile ? 'text.primary' : 'text.disabled',
              '&:hover': {
                backgroundColor: copiedFile ? 'grey.100' : 'transparent'
              },
              '@media (prefers-color-scheme: dark)': {
                color: copiedFile ? 'grey.100' : 'grey.500',
                '&:hover': {
                  backgroundColor: copiedFile ? 'grey.700' : 'transparent'
                }
              }
            }}
          >
            <PasteIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Yapıştır {copiedFile && `(${copiedFile.name})`}
          </MenuItem>,
          <Divider key="divider" sx={{
            borderColor: 'grey.300',
            '@media (prefers-color-scheme: dark)': {
              borderColor: 'grey.600'
            }
          }} />,
          <MenuItem
            key="uploadFile"
            onClick={() => handleAreaAction('uploadFile')}
            sx={{ 
              fontSize: '0.8rem', 
              py: 1,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'grey.100'
              },
              '@media (prefers-color-scheme: dark)': {
                color: 'grey.100',
                '&:hover': {
                  backgroundColor: 'grey.700'
                }
              }
            }}
          >
            <AddFileIcon sx={{ mr: 1.5, fontSize: 16 }} />
            Dosya Ekle
          </MenuItem>
        ]}
      </Menu>

      {/* Custom Dialogs */}
      <PromptDialog
        isOpen={promptDialog.isOpen}
        title={promptDialog.title}
        message={promptDialog.message}
        defaultValue={promptDialog.defaultValue}
        onConfirm={promptDialog.onConfirm}
        onCancel={() => setPromptDialog({ ...promptDialog, isOpen: false })}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
      />

      {/* Notification */}
      {notification.isVisible && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, isVisible: false })}
        />
      )}
    </div>
  );
}

export default LeftSidebar; 