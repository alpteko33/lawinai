import React, { useState, useEffect } from 'react';
import { Key, Save, Eye, EyeOff, CheckCircle, AlertCircle, Info, Trash2, ArrowLeft } from 'lucide-react';

function SettingsPanel({ apiKey, onApiKeySave, onBack }) {
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
          <div className="flex items-center space-x-3 mb-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
          </div>
          <p className="text-gray-400">
            LawInAI uygulaması ayarlarını yönetin
          </p>
        </div>

        {/* API Key Section */}
        <div className="panel">
          <div className="panel-header">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-blue-400" />
              <span>OpenAI API Anahtarı</span>
            </div>
          </div>
          <div className="panel-content space-y-4">
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-100">
                  <p className="font-medium mb-1">API Anahtarı Gerekli</p>
                  <p>
                    LawInAI'ın çalışması için OpenAI API anahtarına ihtiyaç duyar. 
                    Anahtarınız güvenli şekilde yalnızca cihazınızda saklanır.
                  </p>
                  <p className="mt-2">
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:text-blue-200 underline"
                    >
                      OpenAI API anahtarı almak için tıklayın →
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                API Anahtarı
              </label>
              
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={currentApiKey}
                  onChange={(e) => setCurrentApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="input-primary w-full pr-20"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showApiKey ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Validation feedback */}
              {currentApiKey && !isValidApiKeyFormat(currentApiKey) && (
                <p className="text-sm text-yellow-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>API anahtarı formatı geçersiz olabilir</span>
                </p>
              )}

              {currentApiKey && isValidApiKeyFormat(currentApiKey) && (
                <p className="text-sm text-green-400 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>API anahtarı formatı geçerli görünüyor</span>
                </p>
              )}

              {/* Save status */}
              {saveStatus === 'success' && (
                <p className="text-sm text-green-400 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>API anahtarı başarıyla kaydedildi</span>
                </p>
              )}

              {saveStatus === 'error' && (
                <p className="text-sm text-red-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>API anahtarı kaydedilemedi</span>
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSaveApiKey}
                disabled={!currentApiKey.trim() || isSaving}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</span>
              </button>

              {currentApiKey && (
                <button
                  onClick={handleClearApiKey}
                  className="btn-danger flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Temizle</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* App Information */}
        <div className="panel">
          <div className="panel-header">
            <span>Uygulama Bilgileri</span>
          </div>
          <div className="panel-content">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Sürüm:</span>
                <span className="text-white ml-2">{appVersion}</span>
              </div>
              <div>
                <span className="text-gray-400">Platform:</span>
                <span className="text-white ml-2">
                  {window.platform?.isWindows ? 'Windows' : 
                   window.platform?.isMac ? 'macOS' : 
                   window.platform?.isLinux ? 'Linux' : 'Bilinmeyen'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Electron:</span>
                <span className="text-white ml-2">✓ Aktif</span>
              </div>
              <div>
                <span className="text-gray-400">AI Model:</span>
                <span className="text-white ml-2">
                  {currentApiKey ? 'GPT-4' : 'Yapılandırılmadı'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Information */}
        <div className="panel bg-green-900/20 border-green-700">
          <div className="panel-header bg-green-800/50">
            <span>Gizlilik & Güvenlik</span>
          </div>
          <div className="panel-content">
            <div className="space-y-3 text-sm text-green-100">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Yerel Veri Depolama</p>
                  <p className="text-green-200">
                    Tüm dosyalarınız ve sohbet geçmişi sadece cihazınızda saklanır
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Şifrelenmiş API Anahtarı</p>
                  <p className="text-green-200">
                    API anahtarınız güvenli şekilde şifrelenir
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">İnternet Bağlantısı</p>
                  <p className="text-green-200">
                    Sadece OpenAI API'ye bağlanır, başka hiçbir yere veri gönderilmez
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help & Support */}
        <div className="panel">
          <div className="panel-header">
            <span>Yardım & Destek</span>
          </div>
          <div className="panel-content">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-300 mb-2">
                  LawInAI kullanırken sorun yaşıyorsanız:
                </p>
                <ul className="space-y-1 text-gray-400">
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