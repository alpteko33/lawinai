import React from 'react';
import { Scale, Upload, MessageSquare, FileText, Zap, Shield, Globe } from 'lucide-react';

function WelcomeScreen({ onGetStarted, onOpenProject, onUploadFile }) {
  const features = [
    {
      icon: MessageSquare,
      title: 'AI Destekli Sohbet',
      description: 'Hukuki sorularınızı sorun, uzman seviyesinde cevaplar alın'
    },
    {
      icon: FileText,
      title: 'Dilekçe Oluşturma',
      description: 'PDF ve Word dosyalarınızdan otomatik dilekçe hazırlayın'
    },
    {
      icon: Zap,
      title: 'Hızlı Analiz',
      description: 'Dava dosyalarınızı saniyeler içinde analiz edin'
    },
    {
      icon: Shield,
      title: 'Güvenli & Gizli',
      description: 'Verileriniz tamamen gizli ve güvende tutulur'
    },
    {
      icon: Globe,
      title: 'Türk Hukuku',
      description: 'Türk hukuk sistemine özel eğitilmiş AI'
    },
    {
      icon: Scale,
      title: 'Avukat Dostu',
      description: 'Avukatlar için tasarlanmış, profesyonel arayüz'
    }
  ];

  const quickStartSteps = [
    {
      step: 1,
      title: 'Dosyalarınızı Yükleyin',
      description: 'PDF, Word veya metin formatındaki dava dosyalarınızı sisteme yükleyin'
    },
    {
      step: 2,
      title: 'AI ile Sohbet Edin',
      description: 'Hukuki sorularınızı sorun, dosyalarınız hakkında bilgi alın'
    },
    {
      step: 3,
      title: 'Dilekçe Hazırlayın',
      description: 'AI\'dan dilekçe, rapor ve diğer belgelerinizi hazırlamasını isteyin'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800/50 to-gray-900">
      <div className="max-w-7xl mx-auto p-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-8">
            <Scale className="w-20 h-20 text-purple-500 mr-6" />
            <div>
              <h1 className="text-5xl font-bold text-white tracking-tight">LawInAI</h1>
              <p className="text-xl text-purple-400 font-medium">Hukuki AI Asistanınız</p>
            </div>
          </div>
          
          <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-10 leading-relaxed">
            Yapay zeka destekli hukuki asistan ile dava dosyalarınızı analiz edin, 
            dilekçe hazırlayın ve hukuki süreçlerinizi hızlandırın.
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={onGetStarted}
              className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
            >
              Hızlı Başlangıç
            </button>
            <button
              onClick={onOpenProject}
              className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <Scale className="w-5 h-5" />
              <span>Proje Aç</span>
            </button>
            <button
              onClick={onUploadFile}
              className="bg-gray-700 hover:bg-gray-600 text-white text-lg px-8 py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <Upload className="w-5 h-5" />
              <span>Dosya Yükle</span>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-10 text-center tracking-tight">Özellikler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-8 rounded-xl hover:border-purple-500/50 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-center mb-4">
                    <Icon className="w-10 h-10 text-purple-400 mr-4" />
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Nasıl Başlanır?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickStartSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="panel p-6 bg-blue-900/20 border-blue-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Shield className="w-5 h-5 text-blue-400 mr-2" />
              Gizlilik Güvencesi
            </h3>
            <p className="text-gray-300">
              Yüklediğiniz tüm dosyalar ve sohbet geçmişi yalnızca sizin cihazınızda saklanır. 
              Hiçbir veri dış sunucularda tutulmaz.
            </p>
          </div>
          
          <div className="panel p-6 bg-green-900/20 border-green-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Zap className="w-5 h-5 text-green-400 mr-2" />
              Hızlı & Güçlü
            </h3>
            <p className="text-gray-300">
              En gelişmiş AI modellerini kullanarak, saniyeler içinde kapsamlı analizler 
              ve profesyonel belgeler oluşturur.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="panel p-8 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-600">
            <h3 className="text-2xl font-bold text-white mb-4">Hemen Başlayın</h3>
            <p className="text-gray-300 mb-6">
              İlk dava dosyanızı yükleyin ve AI asistanınızın gücünü keşfedin
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={onOpenProject}
                className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <Scale className="w-5 h-5" />
                <span>Proje Aç</span>
              </button>
              <button
                onClick={onUploadFile}
                className="btn-secondary text-lg px-6 py-3 flex items-center space-x-2"
              >
                <Upload className="w-5 h-5" />
                <span>Dosya Yükle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen; 