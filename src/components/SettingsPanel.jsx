import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, Info, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SettingsPanel({ onBack, darkMode, onToggleTheme }) {
  const [appVersion, setAppVersion] = useState('1.0.0');

  // Load app version
  useEffect(() => {
    const loadAppInfo = async () => {
      if (window.electronAPI) {
        try {
          const version = await window.electronAPI.app.getVersion();
          setAppVersion(version);
        } catch (error) {
          console.error('Failed to load app version:', error);
        }
      }
    };
    loadAppInfo();
  }, []);



  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              {onBack && (
                <Button
                  onClick={onBack}
                  variant="ghost"
                  size="sm"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <h1 className="text-2xl font-bold text-foreground">Ayarlar</h1>
            </div>
            <Button 
              onClick={onToggleTheme}
              variant="ghost" 
              size="sm"
              title={darkMode ? 'Açık tema' : 'Koyu tema'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-muted-foreground">
            LawInAI uygulaması ayarlarını ve Gemini AI bilgilerini görüntüleyin
          </p>
        </div>

        {/* AI Engine Information */}
        <div className="bg-card border border-border rounded-lg">
          <div className="bg-muted/50 px-4 py-3 border-b border-border font-medium">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-primary" />
              <span>AI Motoru</span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-foreground">
                  <p className="font-medium mb-1">Google Gemini AI</p>
                  <p className="text-muted-foreground">
                    LawInAI, Google'ın en gelişmiş yapay zeka teknolojisi Gemini ile çalışır. 
                    Türk hukuk sistemine özel eğitilmiş ve lisanslı kullanıma hazırdır.
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Türk Hukukuna Özel</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Lisanslı ve Güvenli</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">API Key Gerektirmez</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* App Information */}
        <div className="bg-card border border-border rounded-lg">
          <div className="bg-muted/50 px-4 py-3 border-b border-border font-medium">
            <span>Uygulama Bilgileri</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Sürüm:</span>
                <span className="text-foreground ml-2">{appVersion}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Platform:</span>
                <span className="text-foreground ml-2">
                  {window.platform?.isWindows ? 'Windows' : 
                   window.platform?.isMac ? 'macOS' : 
                   window.platform?.isLinux ? 'Linux' : 'Bilinmeyen'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Electron:</span>
                <span className="text-foreground ml-2">✓ Aktif</span>
              </div>
              <div>
                <span className="text-muted-foreground">AI Model:</span>
                <span className="text-foreground ml-2">Google Gemini Pro</span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Information */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="bg-green-500/20 px-4 py-3 border-b border-green-500/20 font-medium">
            <span>Gizlilik & Güvenlik</span>
          </div>
          <div className="p-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Yerel Veri Depolama</p>
                  <p className="text-muted-foreground">
                    Tüm dosyalarınız ve sohbet geçmişi sadece cihazınızda saklanır
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Şifrelenmiş API Anahtarı</p>
                  <p className="text-muted-foreground">
                    API anahtarınız güvenli şekilde şifrelenir
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">İnternet Bağlantısı</p>
                  <p className="text-muted-foreground">
                    Sadece OpenAI API'ye bağlanır, başka hiçbir yere veri gönderilmez
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help & Support */}
        <div className="bg-card border border-border rounded-lg">
          <div className="bg-muted/50 px-4 py-3 border-b border-border font-medium">
            <span>Yardım & Destek</span>
          </div>
          <div className="p-4">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-foreground mb-2">
                  LawInAI kullanırken sorun yaşıyorsanız:
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• API anahtarınızın doğru olduğundan emin olun</li>
                  <li>• İnternet bağlantınızı kontrol edin</li>
                  <li>• Uygulamayı yeniden başlatmayı deneyin</li>
                  <li>• Dosya formatlarının desteklendiğinden emin olun (PDF, DOC, TXT)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel; 