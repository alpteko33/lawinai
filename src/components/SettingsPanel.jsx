import React, { useState, useEffect } from 'react';
import { Key, Save, Eye, EyeOff, CheckCircle, AlertCircle, Info, Trash2, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SettingsPanel({ apiKey, onApiKeySave, onBack, darkMode, onToggleTheme }) {
  const [currentApiKey, setCurrentApiKey] = useState(apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
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

  // Update local state when prop changes
  useEffect(() => {
    setCurrentApiKey(apiKey || '');
  }, [apiKey]);

  // Handle API key save
  const handleSaveApiKey = async () => {
    if (!currentApiKey.trim()) {
      setSaveStatus('error');
      return;
    }

    setIsSaving(true);
    try {
      await onApiKeySave(currentApiKey.trim());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save API key:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle API key clear
  const handleClearApiKey = async () => {
    if (window.confirm('API anahtarını silmek istediğinizden emin misiniz?')) {
      setCurrentApiKey('');
      await onApiKeySave('');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Test API key format (basic validation)
  const isValidApiKeyFormat = (key) => {
    return key.startsWith('sk-') && key.length > 20;
  };

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
            LawInAI uygulaması ayarlarını yönetin
          </p>
        </div>

        {/* API Key Section */}
        <div className="bg-card border border-border rounded-lg">
          <div className="bg-muted/50 px-4 py-3 border-b border-border font-medium">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-primary" />
              <span>OpenAI API Anahtarı</span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-foreground">
                  <p className="font-medium mb-1">API Anahtarı Gerekli</p>
                  <p className="text-muted-foreground">
                    LawInAI'ın çalışması için OpenAI API anahtarına ihtiyaç duyar. 
                    Anahtarınız güvenli şekilde yalnızca cihazınızda saklanır.
                  </p>
                  <p className="mt-2">
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      OpenAI API anahtarı almak için tıklayın →
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                API Anahtarı
              </label>
              
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={currentApiKey}
                  onChange={(e) => setCurrentApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-20"
                />
                <Button
                  onClick={() => setShowApiKey(!showApiKey)}
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Validation feedback */}
              {currentApiKey && !isValidApiKeyFormat(currentApiKey) && (
                <p className="text-sm text-yellow-500 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>API anahtarı formatı geçersiz olabilir</span>
                </p>
              )}

              {currentApiKey && isValidApiKeyFormat(currentApiKey) && (
                <p className="text-sm text-green-500 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>API anahtarı formatı geçerli görünüyor</span>
                </p>
              )}

              {/* Save status */}
              {saveStatus === 'success' && (
                <p className="text-sm text-green-500 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>API anahtarı başarıyla kaydedildi</span>
                </p>
              )}

              {saveStatus === 'error' && (
                <p className="text-sm text-red-500 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>API anahtarı kaydedilemedi</span>
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleSaveApiKey}
                disabled={!currentApiKey.trim() || isSaving}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</span>
              </Button>

              {currentApiKey && (
                <Button
                  onClick={handleClearApiKey}
                  variant="destructive"
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Temizle</span>
                </Button>
              )}
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
                <span className="text-foreground ml-2">
                  {currentApiKey ? 'GPT-4' : 'Yapılandırılmadı'}
                </span>
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