import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, Info, ArrowLeft, Sun, Moon, FilePlus, Shield, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

function SettingsPanel({ onBack, darkMode, onToggleTheme }) {
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [activeTab, setActiveTab] = useState('general');
  const [rules, setRules] = useState([]);
  const [rulePolicies, setRulePolicies] = useState({});
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [newRuleDialogOpen, setNewRuleDialogOpen] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({ name: '', description: '', alwaysApply: true, globs: '', regex: '', rule: '' });

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

  useEffect(() => {
    const loadRules = async () => {
      if (!window.electronAPI) return;
      try {
        setIsLoadingRules(true);
        const ws = await window.electronAPI.store.get('currentWorkspace');
        if (!ws?.path) {
          setRules([]);
          setIsLoadingRules(false);
          return;
        }
        await window.electronAPI.rules.ensureDir(ws.path);
        const files = await window.electronAPI.rules.listRuleFiles(ws.path);
        const list = [];
        for (const f of files) {
          const res = await window.electronAPI.rules.read(f);
          list.push({ file: f, content: res?.data || '' });
        }
        setRules(list);
      } catch (e) {
        console.error('Rules load error:', e);
      } finally {
        setIsLoadingRules(false);
      }
    };
    loadRules();
  }, []);



  return (
    <div className="flex-1 flex flex-col h-full">
      <ScrollArea className="flex-1 px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-8 pb-6">
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

        {/* Tabs */}
        <div className="flex items-center space-x-2 mb-4">
          <button onClick={() => setActiveTab('general')} className={`px-3 py-2 rounded ${activeTab==='general'?'bg-primary/20':'hover:bg-muted'}`}>Genel</button>
          <button onClick={() => setActiveTab('rules')} className={`px-3 py-2 rounded ${activeTab==='rules'?'bg-primary/20':'hover:bg-muted'}`}>Kurallar</button>
        </div>

        {activeTab === 'general' && (
        <>
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
        </>
        )}

        {activeTab === 'rules' && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ListChecks className="w-5 h-5" />
                <span className="font-medium">Kurallar</span>
              </div>
              <button
                onClick={() => setNewRuleDialogOpen(true)}
                className="px-3 py-2 bg-primary text-primary-foreground rounded inline-flex items-center space-x-2"
              >
                <FilePlus className="w-4 h-4" />
                <span>Yeni Kural</span>
              </button>
            </div>
            <div className="text-sm text-muted-foreground">Kural politikaları: kapat (off), açık (on), sıkı (strict)</div>
            <div className="space-y-2">
              {isLoadingRules ? (
                <div>Yükleniyor...</div>
              ) : rules.length === 0 ? (
                <div>Henüz kural bulunmuyor.</div>
              ) : (
                rules.map((r, idx) => {
                  const nameMatch = r.content.match(/name:\s*"?([^"\n]+)"?/);
                  const descMatch = r.content.match(/description:\s*"?([^"\n]+)"?/);
                  const name = nameMatch ? nameMatch[1] : r.file.split('/').pop();
                  const desc = descMatch ? descMatch[1] : '';
                  const policy = rulePolicies[name] || 'on';
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <div>
                          <div className="font-medium text-foreground text-sm">{name}</div>
                          {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {['off','on','strict'].map(p => (
                          <button key={p} onClick={() => setRulePolicies(prev => ({...prev, [name]: p}))}
                            className={`px-2 py-1 rounded text-xs ${policy===p?'bg-primary text-primary-foreground':'bg-muted'}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {newRuleDialogOpen && (
              <div className="border rounded p-3 space-y-2">
                <div className="font-medium">Yeni Kural</div>
                <div className="grid grid-cols-2 gap-2">
                  <input className="border rounded px-2 py-1" placeholder="Ad" value={newRuleForm.name} onChange={e=>setNewRuleForm({...newRuleForm,name:e.target.value})} />
                  <input className="border rounded px-2 py-1" placeholder="Açıklama" value={newRuleForm.description} onChange={e=>setNewRuleForm({...newRuleForm,description:e.target.value})} />
                  <input className="border rounded px-2 py-1 col-span-2" placeholder="Globs (virgülle)" value={newRuleForm.globs} onChange={e=>setNewRuleForm({...newRuleForm,globs:e.target.value})} />
                  <input className="border rounded px-2 py-1 col-span-2" placeholder="Regex (virgülle)" value={newRuleForm.regex} onChange={e=>setNewRuleForm({...newRuleForm,regex:e.target.value})} />
                  <label className="flex items-center space-x-2 col-span-2">
                    <input type="checkbox" checked={newRuleForm.alwaysApply} onChange={e=>setNewRuleForm({...newRuleForm,alwaysApply:e.target.checked})} />
                    <span>Her zaman uygula</span>
                  </label>
                  <textarea className="border rounded px-2 py-1 col-span-2" rows={6} placeholder="Kural metni" value={newRuleForm.rule} onChange={e=>setNewRuleForm({...newRuleForm,rule:e.target.value})} />
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-2 bg-primary text-primary-foreground rounded" onClick={async ()=>{
                    try {
                      const ws = await window.electronAPI.store.get('currentWorkspace');
                      if (!ws?.path) return;
                      await window.electronAPI.rules.ensureDir(ws.path);
                      const fileName = `${(newRuleForm.name||'kural').toLowerCase().replace(/\s+/g,'-')}.md`;
                      const fm = [
                        '---',
                        `name: "${newRuleForm.name||''}"`,
                        newRuleForm.description?`description: "${newRuleForm.description}"`:'' ,
                        newRuleForm.globs?`globs: [${newRuleForm.globs.split(',').map(s=>`"${s.trim()}"`).join(', ')}]`:'' ,
                        newRuleForm.regex?`regex: [${newRuleForm.regex.split(',').map(s=>`"${s.trim()}"`).join(', ')}]`:'' ,
                        `alwaysApply: ${newRuleForm.alwaysApply? 'true':'false'}`,
                        '---',
                      ].filter(Boolean).join('\n');
                      const content = `${fm}\n${newRuleForm.rule||''}\n`;
                      await window.electronAPI.rules.write(ws.path, fileName, content);
                      setNewRuleDialogOpen(false);
                      setNewRuleForm({ name:'', description:'', alwaysApply:true, globs:'', regex:'', rule:'' });
                      // reload
                      const files = await window.electronAPI.rules.listRuleFiles(ws.path);
                      const list = [];
                      for (const f of files) {
                        const res = await window.electronAPI.rules.read(f);
                        list.push({ file: f, content: res?.data || '' });
                      }
                      setRules(list);
                    } catch (e) { console.error('Yeni kural kaydı hata', e); }
                  }}>Kaydet</button>
                  <button className="px-3 py-2 bg-muted rounded" onClick={()=>setNewRuleDialogOpen(false)}>İptal</button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default SettingsPanel; 