import React, { useState, useEffect, useRef } from 'react';
import { Scale, FolderOpen, Settings, Clock, Sparkles, ChevronRight, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

function LoginScreen({ onOpenProject, onOpenSettings, onContinue, darkMode, onToggleTheme }) {
  const [showRecentProjects, setShowRecentProjects] = useState(false);
  const dropdownRef = useRef(null);
  const [recentProjects] = useState([
    {
      id: 1,
      name: 'Boşanma Davası - Ahmet Yılmaz',
      path: '~/Desktop/Davalar/Boşanma-2024',
      lastOpened: '2 saat önce',
      type: 'folder'
    },
    {
      id: 2,
      name: 'İcra Takibi Dilekçesi',
      path: '~/Documents/İcra-Takibi.docx',
      lastOpened: '1 gün önce',
      type: 'document'
    },
    {
      id: 3,
      name: 'Tazminat Davası Analizi',
      path: '~/Desktop/Tazminat-Analiz',
      lastOpened: '3 gün önce',
      type: 'folder'
    },
    {
      id: 4,
      name: 'Sözleşme İncelemesi',
      path: '~/Documents/Sözleşme-2024.pdf',
      lastOpened: '1 hafta önce',
      type: 'document'
    }
  ]);

  const mainActions = [
    {
      id: 'open-project',
      icon: FolderOpen,
      title: 'Proje Aç',
      description: 'Mevcut bir dava klasörünü açın',
      onClick: onOpenProject,
      primary: true
    },
    {
      id: 'recent-projects',
      icon: Clock,
      title: 'Son Projeler',
      description: 'Son çalıştığınız 5 projeyi görüntüleyin',
      onClick: () => setShowRecentProjects(!showRecentProjects),
      primary: false
    },
    {
      id: 'settings',
      icon: Settings,
      title: 'Ayarlar',
      description: 'AI API anahtarını yapılandırın',
      onClick: onOpenSettings,
      primary: false
    }
  ];

  const handleRecentProjectClick = (project) => {
    console.log('Opening recent project:', project);
    setShowRecentProjects(false);
    if (onContinue) {
      onContinue();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowRecentProjects(false);
      }
    };

    if (showRecentProjects) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRecentProjects]);

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-primary/10 text-foreground flex items-center justify-center">
      {/* Theme Toggle Button - Top Right */}
      <div className="absolute top-4 right-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onToggleTheme}
          title={darkMode ? 'Açık tema' : 'Koyu tema'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      {/* Merkez Panel - Ana Eylemler */}
      <div className="w-full max-w-lg p-12">
        <div className="w-full">
          {/* Logo ve Başlık */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <Scale className="w-20 h-20 text-primary" />
                <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              LawInAI
            </h1>
            <p className="text-lg text-muted-foreground">Hukuki AI Asistanınız</p>
          </div>

          {/* Ana Eylemler */}
          <div className="space-y-4">
            {mainActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  onClick={action.onClick}
                  variant={action.primary ? "default" : "outline"}
                  className={`w-full p-6 h-auto transition-all duration-200 hover:scale-105 hover:shadow-lg group ${
                    action.primary
                      ? 'shadow-primary/20'
                      : ''
                  }`}
                >
                  <div className="flex items-center space-x-4 w-full">
                    <div className={`p-3 rounded-lg ${
                      action.primary ? 'bg-primary-foreground/20' : 'bg-muted group-hover:bg-muted/80'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-lg">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Son Projeler Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {showRecentProjects && (
              <div className="absolute left-full top-1/3 -translate-y-1/2 ml-4 w-80 bg-card/90 backdrop-blur-sm rounded-lg border border-border shadow-2xl z-10">
                <div className="p-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Son 5 Proje</h3>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  {recentProjects.slice(0, 5).map((project) => (
                    <Button
                      key={project.id}
                      onClick={() => handleRecentProjectClick(project)}
                      variant="ghost"
                      className="w-full p-2 h-auto text-left justify-start hover:bg-muted/50 transition-colors group"
                    >
                      <div className="space-y-0.5 w-full">
                        <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                          {project.name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.path}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.lastOpened}
                        </p>
                      </div>
                    </Button>
                  ))}
                  {recentProjects.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">Henüz proje yok</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Alt Bilgi */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Yapay zeka ile hukuki süreçlerinizi hızlandırın
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Güvenli & Yerel</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Türk Hukukuna Özel</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen; 