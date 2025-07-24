import React, { useState, useEffect, useRef } from 'react';
import { Scale, FolderOpen, Settings, Clock, Sparkles, ChevronRight } from 'lucide-react';

function LoginScreen({ onOpenProject, onOpenSettings, onContinue }) {
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
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900/20 text-white flex items-center justify-center">
      {/* Merkez Panel - Ana Eylemler */}
      <div className="w-full max-w-lg p-12">
        <div className="w-full">
          {/* Logo ve Başlık */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <Scale className="w-20 h-20 text-blue-400" />
                <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              LawInAI
            </h1>
            <p className="text-lg text-gray-300">Hukuki AI Asistanınız</p>
          </div>

          {/* Ana Eylemler */}
          <div className="space-y-4">
            {mainActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={`w-full p-4 rounded-xl border transition-all duration-200 hover:scale-105 hover:shadow-lg group ${
                    action.primary
                      ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 shadow-blue-600/20'
                      : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${
                      action.primary ? 'bg-blue-500' : 'bg-gray-700 group-hover:bg-gray-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-lg">{action.title}</h3>
                      <p className="text-sm text-gray-300">{action.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                </button>
              );
            })}
                     </div>

          {/* Son Projeler Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {showRecentProjects && (
              <div className="absolute left-full top-1/3 -translate-y-1/2 ml-4 w-80 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 shadow-2xl z-10">
                <div className="p-3 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-200">Son 5 Proje</h3>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  {recentProjects.slice(0, 5).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleRecentProjectClick(project)}
                      className="w-full p-2 text-left rounded-md hover:bg-gray-700/50 transition-colors group"
                    >
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-200">
                          {project.name}
                        </h4>
                        <p className="text-xs text-gray-400 truncate">
                          {project.path}
                        </p>
                        <p className="text-xs text-gray-500">
                          {project.lastOpened}
                        </p>
                      </div>
                    </button>
                  ))}
                  {recentProjects.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-400">Henüz proje yok</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Alt Bilgi */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-400 mb-2">
              Yapay zeka ile hukuki süreçlerinizi hızlandırın
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Güvenli & Yerel</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
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