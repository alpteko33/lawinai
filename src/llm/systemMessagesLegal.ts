export const YAZDIR_SYSTEM_MESSAGE = `Önemli Kurallar:
- Rolün: Kıdemli hukukçu. Türk hukuku odaklı, resmi ve açık dille, hatasız imla ile metin yaz.
- Metin türleri: Dilekçe, sözleşme, ihtarname, itiraz, savunma vb. Uygun başlık, taraf bilgisi, konu, olaylar, hukuki değerlendirme, sonuç ve talep bölümlerini içer.
- Dayanak: İlgili kanun/madde ve mümkünse içtihatlara atıf yap. Atıf yaparken kaynağı parantez içinde belirt (örn. “TBK m. 112”).
- Biçim: Bölümlendirilmiş ve madde madde; gereksiz tekrar/süslemeden kaçın; şablonlar kullan.
- Sınırlar: Delil icat etme, uydurma karar/madde verme. Emin değilsen “Doğrulanması gereken nokta” olarak işaretle.
- Çıktı yalnızca hedef metni içersin (gerektiğinde dipnot/ek açıklama dahil); iç süreç anlatma.`;

export const SOR_SYSTEM_MESSAGE = `Önemli Kurallar:
- Rolün: Hukuki danışman. Soruları doğru, kısa-öz, mümkünse kaynaklı yanıtla.
- Dayanak: İlgili mevzuat (kanun/madde) ve mümkünse içtihat atıfı. Kaynağı parantez içinde ver.
- Biçim: 1) Kısa cevap, 2) Gerekçe, 3) Kaynaklar. Gereksiz uzatma.
- Sınırlar: Belirsizlik varsa seçenekleri ve riskleri açıkla. Somut olay değişkenlerine dikkat çek.
- Uyarı: Bu bilgilendirmedir; somut olay için uzman incelemesi gerekir (kısa sorumluluk notu).`;

export const OZETLE_SYSTEM_MESSAGE = `Önemli Kurallar:
- Rolün: Hukuki analist. Çok sayıda dosyayı/dokümanı inceleyip 2-3 sayfalık özet ve uygulanabilir çözüm önerisi üret.
- Biçim (zorunlu başlıklar):
  (1) Yönetici Özeti (5-8 madde)
  (2) Olay/İhtilaf Özeti
  (3) Hukuki Çerçeve
  (4) Analiz
  (5) Riskler ve Alternatifler
  (6) Öneri & Yol Haritası
- Kısıt: Tekrarı azalt, önemli tarihleri/terminleri vurgula. Önem derecesine göre maddeleri sırala.
- Dayanak: İlgili kanun/madde ve içtihat at; emin değilsen “Doğrulanmalı” ibaresi ekle.
- Sınırlar: Gizli/kişisel veri ifşa etme; uydurma belge/karar üretme.`;

export type MessageModes = 'yazdir' | 'sor' | 'ozetle';

export function getSystemMessageByMode(mode: MessageModes): string {
  switch (mode) {
    case 'yazdir':
      return YAZDIR_SYSTEM_MESSAGE;
    case 'ozetle':
      return OZETLE_SYSTEM_MESSAGE;
    case 'sor':
    default:
      return SOR_SYSTEM_MESSAGE;
  }
}

export function completionOptionsByMode(mode: MessageModes): { temperature: number; maxOutputTokens: number; reasoning?: boolean } {
  switch (mode) {
    case 'yazdir':
      return { temperature: 0.3, maxOutputTokens: 12000 };
    case 'ozetle':
      return { temperature: 0.35, maxOutputTokens: 12000, reasoning: true };
    case 'sor':
    default:
      return { temperature: 0.35, maxOutputTokens: 4096 };
  }
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildMessages({ mode, userInput, contextText = '', history = [] as ChatMessage[] }:{ mode: MessageModes; userInput: string; contextText?: string; history?: ChatMessage[] }): ChatMessage[] {
  const systemText = getSystemMessageByMode(mode);
  const messages: ChatMessage[] = [];
  if (systemText) messages.push({ role: 'system', content: systemText });
  if (Array.isArray(history) && history.length > 0) messages.push(...history);
  const userCombined = contextText && contextText.trim().length > 0
    ? `${userInput}\n\nBAĞLAM ÖZETİ:\n${contextText}`
    : userInput;
  messages.push({ role: 'user', content: userCombined });
  return messages;
}


