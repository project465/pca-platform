import type { SiteContent } from "./types";

/**
 * Türkiye 원고.
 *
 * 언어는 터키어(tr)다. 구조는 kr.ts / kz.ts 와 같고 컴포넌트는 손대지 않는다.
 *
 * 확인이 필요한 것 두 가지 —
 * 1) 문장은 현지 검수를 한 번 받는다. 고칠 곳은 이 파일 하나다.
 * 2) **법적 범위.** 한국에서 직업소개에 등록이 필요하듯,
 *    터키도 구인·구직 중개는 İŞKUR 의 özel istihdam bürosu 허가 대상이다.
 *    기업 채널을 열기 전에 확인한다. docs/metri/10_legal_kr.md 의 한국 사례 참고.
 */
export const tr: SiteContent = {
  key: "tr",
  lang: "tr",
  domain: "metri.com.tr",
  brand: "METRI",
  org: "ACADEMIX",
  orgTagline: "Üniversiteler ve kamu kurumları için eğitim programları",
  platformUrl: "https://app.metri.io",

  meta: {
    title: "METRI — bölümünüzden işe giden yol",
    description:
      "Öğrencinin yetkinliklerini gerçek iş ilanlarının aradığı becerilerle karşılaştırır. Hangi pozisyon, hangi sektör, hangi şirket ve önümüzdeki altı ayda ne yapmalı — hepsi tek raporda.",
  },

  nav: {
    items: [
      { label: "METRI", href: "/pca" },
      { label: "Kimler için", href: "/#channels" },
      { label: "Kurulum", href: "/adopt" },
      { label: "Fiyatlandırma", href: "/pricing" },
      { label: "Hakkımızda", href: "/about" },
      { label: "İletişim", href: "/contact" },
    ],
    contact: "Görüşme talep et",
    menu: "Menü",
    floating: "İletişim",
  },

  hero: {
    eyebrow: "METRI · PERSONALIZED CAREER ANALYSIS",
    title: ["«Bu bölümle nereye gideceğim?» sorusuna", "{15–20 sayfalık yanıt}"],
    lead:
      "Bir tip adı söyleyip bitmiyor. Uygun görev alanlarını 100 puanlık ölçekte sıralıyor, altı çalışma tarzını gösteriyor, ardından sektöre, şirkete, eksik beceriye ve önümüzdeki altı ayın planına kadar gidiyor.",
    primary: { label: "Görüşme talep et", href: "/contact" },
    secondary: { label: "Örnek raporu gör", href: "#sample" },
    watermark: "METRI",
  },

  sample: {
    label: "ÖRNEK RAPOR",
    heading: "Açıklamadan önce, öğrencinin eline aldığı belgeye bakın",
    lead:
      "METRI'nin neyi analiz ettiği sonraki konu. Aşağıda 15–20 sayfalık rapordan dört sayfa alınıp tek ekrana taşındı.",
    disclaimer:
      "Bu, raporun biçimini göstermek için hazırlanmış örnek bir ekrandır. Gerçek bir öğrencinin verisi değildir. Görev alanları, altı çalışma tarzı ve bölgesel eşleştirme gerçek rapordaki gibidir.",
    docTag: "METRI bireysel rapor",
    page: "00-1 · 00-2 · 05~06 · 09 alıntı",
    person: {
      name: "Elif K. (örnek)",
      dept: "Makine Mühendisliği, 3. sınıf",
      meta: [
        { l: "Tarih", v: "2026-03-11" },
        { l: "Süre", v: "32 dakika" },
        { l: "Rapor", v: "18 sayfa" },
      ],
    },
    jobsLabel: "00-1 Görev alanı uygunluğu · 100 puanlık ölçek",
    jobsNote:
      "İlk üç alan başvuru stratejisinin temeli olur. Aşağıda kalanların neden aşağıda kaldığı da metinde yazılıdır — öğrenci «ben neden olmuyorum?» diye sormak zorunda kalmaz.",
    jobs: [
      { name: "Üretim ve operasyon", score: 88 },
      { name: "Lojistik ve satın alma", score: 81 },
      { name: "Danışmanlık ve analiz", score: 74 },
      { name: "BT ve veri", score: 69 },
      { name: "Finans ve muhasebe", score: 52 },
    ],
    styleLabel: "00-2 Çalışma tarzı · altı tip",
    styleTypeLabel: "Baskın tarz",
    styleType: "Kaliteye odaklı · İş birlikçi",
    styleVerdict:
      "Hızdan çok doğruluğu seçen, ekip içinde verimi artan bir tarz. Üretim kalitesi ve test alanları bu tarza yakındır.",
    styleAxes: ["Bağımsız", "İş birlikçi", "Cesur", "İstikrarlı", "Hızlı", "Kaliteli"],
    styleScores: [58, 82, 61, 74, 47, 88],
    planLabel: "05–06 Önümüzdeki altı ay",
    planNote: "Her satır eksik bir yetkinlikten çıkar. Tamamlandıkça seviye yükselir ve uygunluk yeniden hesaplanır.",
    plan: [
      { when: "1. ay", what: "Yapısal analiz dersini seç", why: "Programda ANSYS uygulaması var" },
      { when: "2. ay", what: "Bitirme projesini analize yönlendir", why: "Proje en ağır kanıttır" },
      { when: "3. ay", what: "Teknik resim okuma ve sertifika", why: "İlanların yarısından fazlası istiyor" },
      { when: "4. ay", what: "Kış stajına başvur", why: "Sektör yetkinliğine giden tek yol" },
      { when: "5. ay", what: "Portfolyoyu toparla", why: "İkinci alanın koşulu" },
      { when: "6. ay", what: "CV ve mülakat hazırlığı", why: "Gerekçeler zaten bu raporda hazır" },
    ],
    localLabel: "09 Bölgesel bağlantı",
    localNote: "Üniversitenin bulunduğu bölgedeki gerçek şirketler uygunluk düzeyine göre ayrılır.",
    local: [
      { name: "Bölgedeki makine üreticisi", note: "Uygunluk yüksek · açık ilan var" },
      { name: "Otomotiv yan sanayi", note: "Uygunluk yüksek" },
      { name: "Lojistik operatörü", note: "Uygunluk orta" },
    ],
    cta: {
      line: "Öğrencinin eline böyle bir belge geçiyor.",
      sub: "Bölüm ise aynı belgelerin anonim toplamını alıyor.",
      primary: { label: "Kurulum için yazın", href: "/contact" },
      secondary: { label: "Rapor yapısı", href: "/pca" },
    },
  },

  channels: {
    label: "KİMLER İÇİN",
    heading: "Üç kapı, tek motor",
    lead:
      "Öğrenci tek başına girebilir. Bölüm 500 öğrenciyi aynı anda görebilir. Şirket ilan verebilir. Üçü de aynı envanteri ve aynı beceri grafiğini kullanır. Fark, satın alma birimi ve elinize geçen belgede.",
    items: [
      {
        key: "individual",
        tag: "BİREYSEL",
        title: "Kendim yaparım",
        who: "Öğrenciler · iş arayanlar · yeni mezunlar",
        body:
          "Önce 12 soruluk ücretsiz kontrolle yönü görün. Tam raporu tek seferlik satın alın. Üniversite sözleşmesine bağlı değildir.",
        gets: [
          "12 soruluk ücretsiz kontrol — ilk pozisyon tam görünür",
          "Tam rapor — pozisyon, sektör, şirket, eksik beceri",
          "Altı aylık uygulama planı",
          "Mezuniyetten sonra da kalan hesap",
        ],
        unit: "Tek kullanım · rapor başına ödeme",
        cta: { label: "Bireysel fiyatları gör", href: "/pricing" },
      },
      {
        key: "company",
        tag: "İŞVEREN",
        title: "İşe uygun kişiyi arıyorum",
        who: "İK ekipleri · sanayi iş birlikleri · bölgesel şirketler",
        body:
          "İlanınızı yayınlarsınız, o pozisyona uygun öğrencilerin raporunda görünür. Öğrenci size doğrudan başvurur. İlanınızın aradığı becerileri öğrencilerin ne kadar karşıladığını da görürsünüz.",
        gets: [
          "İlanınız uygun öğrencilerin raporunda gösterilir",
          "Aradığınız becerilerin karşılanma oranı (anonim)",
          "Bölgesel işveren paketi",
          "İşveren markası için pozisyon içeriği",
        ],
        unit: "Yıllık yayın ve raporlama aboneliği",
        cta: { label: "İş birliği için yazın", href: "/contact" },
      },
      {
        key: "campus",
        tag: "ÜNİVERSİTE",
        title: "Tüm sınıfı bir arada görürüm",
        who: "Bölümler · kariyer merkezleri · liseler",
        body:
          "Her öğrenci kendi raporunu alır, bölüm ise bunların anonim toplamını alır. Öğrencinin eksiği ile işverenin talebinin kesiştiği yer, müfredatın elden geçmesi gereken yerdir.",
        gets: [
          "Her öğrenciye bireysel rapor",
          "Anonim toplu rapor — pozisyon dağılımı, hedef sektör, eksik beceri",
          "İşveren talebiyle kesişen noktalar otomatik işaretlenir",
          "Kampüsün bulunduğu bölgedeki şirketlerle eşleştirme",
          "Raporlamada kullanılabilecek süreç verisi",
        ],
        unit: "Kişi başı fiyatlı yıllık sözleşme",
        cta: { label: "Kurulum için yazın", href: "/adopt" },
      },
    ],
    note:
      "Bölüm sözleşme yaptığında öğrencileri tam rapora ayrıca ödeme yapmadan ulaşır ve mezun olduktan sonra da hesapları kalır.",
  },

  who: {
    label: "SORUN",
    heading: "Bölüm seçildi. Sonrası?",
    items: [
      { no: "01", title: "Hangi pozisyona hazırlanmalıyım?", body: "Bölüm bir, pozisyon onlarca. Hangisi bana uyar?", tag: "Pozisyon" },
      { no: "02", title: "Hangi proje gerekli?", body: "CV'ye ne yazacağım? Hangi deneyim ağır basar?", tag: "Proje" },
      { no: "03", title: "Hangi sertifika gerekli?", body: "Zaman kısıtlı. Hangisi gerçekten aranıyor?", tag: "Sertifika" },
      { no: "04", title: "Mülakatta ne anlatacağım?", body: "«Neden bu pozisyon?» sorusuna gerekçe lazım.", tag: "Mülakat" },
    ],
  },

  analyze: {
    label: "ÜÇ BOYUT",
    heading: "METRI üç şeyi birlikte analiz eder",
    lead: "Ayrı ayrı değil, birbirine bağlayarak.",
    items: [
      { no: "01", kicker: "POZİSYON", title: "Uygun görev alanları", body: "Her alan 100 puanlık ölçekte sıralanır. Neden yüksek, neden düşük olduğu yazılır." },
      { no: "02", kicker: "TARZ", title: "Altı çalışma tarzı", body: "Bağımsız, iş birlikçi, cesur, istikrarlı, hızlı, kaliteli. Altıgenle gösterilir." },
      { no: "03", kicker: "PLAN", title: "Uygulanabilir plan", body: "Sertifika, proje, portfolyo, CV, mülakat ve bölgedeki şirketler." },
    ],
  },

  why: {
    label: "FARK",
    heading: "Öneriyle biten bir test değil",
    before: {
      tag: "ALIŞILMIŞ TEST",
      title: "Öneriyle biter",
      steps: ["Eğilimi belirle", "Meslek grubu öner", "Gerisini kendin düşün"],
      verdict: "Sonuç belli, ama ne yapılacağı belirsiz.",
    },
    after: {
      tag: "METRI",
      title: "Yol haritasına bağlanır",
      steps: ["Pozisyon uygunluğu", "Sektör ve şirket", "Eksik beceri", "Altı aylık plan"],
      verdict: "Sonuç, altı ayın planına dönüşür.",
    },
    vs: "vs",
  },

  sheet: {
    label: "RAPOR YAPISI",
    heading: "15–20 sayfa, on bölüm",
    lead: [
      "Rapor tek sayfalık bir özet değildir. Her bölüm bir soruyu yanıtlar ve bir sonrakine bağlanır.",
    ],
    tabs: [
      {
        no: "00-1",
        nav: "Pozisyon uygunluğu",
        title: "Görev alanlarının uygunluğu",
        chart: "jobs",
        meta: [
          { label: "Ölçek", value: "100 puan" },
          { label: "Kaynak", value: "Yanıtlar + akademik veri" },
        ],
        chartNote: "İlk üç alan başvuru stratejisinin temeli olur.",
        capTitle: "Neden sıralama",
        capBody: "«Sana bu uyar» deyip tek pozisyon söylemek öğrenciyi seçimden yoksun bırakır. Sıralama bir seçim alanı verir.",
        capArrow: "Sırada — çalışma tarzı",
      },
      {
        no: "00-2",
        nav: "Çalışma tarzı",
        title: "Altı çalışma tarzı",
        chart: "styles",
        meta: [{ label: "Tip", value: "6" }],
        chartNote: "Aynı pozisyon içinde bile tarza göre ayrışan işler vardır.",
        capTitle: "Neden tarz",
        capBody: "Aynı işe iki kişi girer, biri kalır biri ayrılır. Fark çoğu zaman tarzdadır.",
        capArrow: "Sırada — eksik beceri",
      },
      {
        no: "05",
        nav: "Eksik beceri",
        title: "Eksik yetkinlikler",
        blocks: [
          {
            title: "Beş yetkinlik",
            body: ["Aranan düzey ile mevcut düzey karşılaştırılır. Hepsi değil, en kritik beşi verilir."],
            table: {
              head: ["Yetkinlik", "Aranan", "Mevcut", "İlan talebi"],
              rows: [
                ["ANSYS", "4", "2", "%67"],
                ["Sonlu elemanlar yöntemi", "4", "3", "%54"],
                ["Teknik resim (GD&T)", "3", "2", "%53"],
                ["ABAQUS", "3", "1", "%31"],
                ["Python", "3", "3", "%44"],
              ],
            },
            bullets: [
              "Sıralama hocanın görüşüne göre değil, ilanlarda geçme sıklığına göre belirlenir.",
              "Yirmi yetkinlik önermek hiçbir şey önermemekle aynıdır.",
            ],
          },
        ],
        capTitle: "Neden sadece beş",
        capBody: "Yirmi satırlık bir rapor, hiçbir satırı uygulanmayan bir rapordur.",
        capArrow: "Sırada — altı aylık plan",
      },
      {
        no: "09",
        nav: "Bölgesel bağlantı",
        title: "Bölgedeki gerçek şirketler",
        blocks: [
          {
            body: [
              "Üniversitenin bulunduğu bölgedeki şirketler uygunluk düzeyine göre ayrılır. Öğrenci «nereye başvuracağım?» sorusunun yanıtını bu sayfada bulur.",
            ],
            fields: [
              { label: "Uygunluk yüksek", value: "Açık ilanı olan şirketler" },
              { label: "Uygunluk orta", value: "Becerilerin bir kısmı örtüşüyor" },
              { label: "Bölgesel program", value: "Yerel programlara bağlı olanlar" },
            ],
          },
        ],
        capTitle: "Neden bölge",
        capBody: "Yalnızca büyük şehirdeki ilanları göstermek, taşradaki üniversite için başkasının hikâyesidir.",
        capArrow: "Rapor burada biter",
      },
    ],
    more: "Kalan bölümler tam raporda.",
    disclaimer: "Örnek veridir. Gerçek bir öğrencinin materyali değildir.",
    jobAxes: ["Üretim", "Lojistik", "Danışmanlık", "BT ve veri", "Finans", "Pazarlama"],
    styleAxes: ["Bağımsız", "İş birlikçi", "Cesur", "İstikrarlı", "Hızlı", "Kaliteli"],
    jobScores: [88, 81, 74, 69, 52, 48],
    styleScores: [58, 82, 61, 74, 47, 88],
  },

  styles: {
    label: "ÇALIŞMA TARZI",
    heading: "Altı tip",
    chartNote: "Tiplerin «iyisi» yoktur. Hangi ortamda uzun süre çalışabileceğinizi gösterir.",
    items: [
      { name: "Bağımsız", body: "Tek başına odaklandığında verimli." },
      { name: "İş birlikçi", body: "Ekiple tartışınca karar daha hızlı çıkar." },
      { name: "Cesur", body: "Yeni bir yöntemi denemekten çekinmez." },
      { name: "İstikrarlı", body: "Düzeni belli işte güvenlidir." },
      { name: "Hızlı", body: "Süreye uymayı önde tutar." },
      { name: "Kaliteli", body: "Kusursuz teslim etmeyi önde tutar." },
    ],
  },

  evidence: {
    label: "DAYANAK",
    heading: "Veriyle tasarlandı",
    lead: "Envanter tek bir uzmanın görüşünden değil, toplanan veriden çıktı.",
    stats: [
      { label: "Bölüm mezunu", value: "2.346", unit: "kişi" },
      { label: "Anket", value: "2.091", unit: "yanıt" },
      { label: "İlan analizi", value: "428", unit: "ilan" },
      { label: "Görev tanımı", value: "137", unit: "belge" },
      { label: "Sektör uzmanı", value: "48", unit: "kişi" },
    ],
    copyright: {
      title: "Telif tescili",
      rows: [
        { name: "PCA değerlendirme aracı", no: "C-2025-058658" },
        { name: "PCA rapor yapısı", no: "C-2025-059731" },
        { name: "PCA puanlama sistemi", no: "C-2025-059732" },
      ],
      note: "Kore Telif Hakkı Komisyonu'nda tescillidir.",
    },
    standards: {
      title: "Dayanılan sistemler",
      head: ["Sistem", "Ne için"],
      rows: [
        ["O*NET", "Pozisyon ve beceri sınıflandırması"],
        ["ESCO", "Avrupa pozisyon–beceri eşlemesi"],
        ["RIASEC", "İlgi ölçümü"],
        ["OECD", "Beceri politikası çerçevesi"],
        ["AERA/APA/NCME", "Test kalitesi standartları"],
      ],
      note: "Pozisyon kodları O*NET'e bağlıdır. ESCO ile resmî eşleme tablosu bulunduğundan başka ülkeye geçişte yeniden kurulmaz.",
    },
  },

  choose: {
    label: "NEDEN METRI",
    heading: "Dört neden",
    items: [
      { title: "Öneriyle bitmez", body: "Pozisyondan sonra sektör, şirket, eksik beceri ve plan gelir." },
      { title: "Puan açıklanır", body: "«Neden 80 puan?» dendiğinde hesap ekranda açılır." },
      { title: "Bölgeye bağlanır", body: "Merkezdeki değil, kampüsün bulunduğu bölgedeki şirketler gösterilir." },
      { title: "Bölüme toplu görünüm", body: "Bireysel rapor ile anonim toplam aynı anda çıkar." },
    ],
  },

  closing: {
    kicker: "BAŞLANGIÇ",
    heading: ["Tek bir bölümle", "{başlanabilir}"],
    lead: "Önce bir sınıfta pilot uygulamak, sonucu görünce genişletmek en sık seçilen yoldur.",
    primary: { label: "Görüşme talep et", href: "/contact" },
    secondary: { label: "Fiyatları gör", href: "/pricing" },
  },

  about: {
    label: "HAKKIMIZDA",
    heading: "ACADEMIX",
    body:
      "Üniversiteler ve kamu kurumları için eğitim programları tasarlayan ve yürüten bir kuruluş. METRI, bu işten doğan değerlendirme ve kariyer platformudur.",
    highlight: "Bölümden işe giden yol tek bir veride toplanır.",
    brandsLabel: "Markalar",
    brands: [
      { name: "ACADEMIX", note: "Ana alan — üniversite programları" },
      { name: "career peak", note: "STEM kariyer ve istihdam" },
      { name: "JOBINDUSTRY", note: "STEM yüksek lisans ve doktora" },
    ],
    partnersLabel: "Çalışma alanları",
    partners: ["Üniversiteler", "Kariyer merkezleri", "Kamu kurumları", "Bölgesel şirketler"],
    partnersNote: "Kurum adları anlaşma doğrultusunda paylaşılır.",
  },

  program: {
    label: "PROGRAM",
    heading: "Envanterle birlikte yürüyen programlar",
    lead: "Değerlendirme eksiği gösterir. Onu kapatacak programlar da hazırdır.",
    items: [
      { title: "Pozisyon anlatımı", body: "Sektör uzmanları pozisyonun gerçek içeriğini anlatır." },
      { title: "Proje atölyesi", body: "CV'ye yazılacak projeyi birlikte üretir." },
      { title: "CV ve mülakat", body: "Rapordaki gerekçeleri söze döker." },
      { title: "Bölgesel şirket buluşması", body: "Yerel işverenlerle doğrudan temas." },
    ],
  },

  process: {
    label: "KURULUM",
    heading: "Dört adım",
    lead: "Bölümden karmaşık bir hazırlık istenmez.",
    steps: [
      { title: "01 Sözleşme", body: "Kişi sayısı ve dönem belirlenir." },
      { title: "02 Bağlantı", body: "Bölüme özel bağlantı verilir." },
      { title: "03 Uygulama", body: "Öğrenci 30–40 dakikada tamamlar." },
      { title: "04 Rapor", body: "Bireysel rapor ve toplu rapor çıkar." },
    ],
    note: "Sonuçların öğrencilere açılma zamanını bölüm kendisi belirler.",
  },

  faq: {
    label: "SIK SORULAN",
    heading: "Sık sorulan sorular",
    items: [
      { q: "Ne kadar sürer?", a: "30–40 dakika. Ara verip sonra devam edilebilir." },
      { q: "Sonucu kim görür?", a: "Öğrenci kendi raporunu görür. Bölüm yalnızca anonim toplamı görür." },
      { q: "Beş kişiden az grup görünür mü?", a: "Hayır. Beş kişiden az hücre toplu raporda açılmaz." },
      { q: "Yalnızca mühendislik için mi?", a: "Hayır. Ancak mühendislik bölümlerinde beceri grafiği daha derindir." },
      { q: "Türkçe mi?", a: "Evet. Sorular da rapor da Türkçedir." },
    ],
  },

  pricing: {
    label: "FİYATLANDIRMA",
    heading: "İhtiyacınız kadarıyla başlayın",
    lead: "Çoğunlukla tek bölümle başlanır, sonra genişletilir. Bireysel değerlendirme her zaman tek tek alınabilir.",
    planLabel: "İlgilendiğiniz seçenek",
    plans: [
      {
        key: "individual",
        name: "Bireysel",
        who: "Öğrenci · iş arayan · mezun",
        price: null,
        unit: "1 kişi",
        note: "Çevrim içi ödeme hazırlanıyor. Şimdilik talep üzerinden alınıyor.",
        features: [
          "Pozisyon uygunluğu 100 puanlık ölçek",
          "Altı çalışma tarzı",
          "15–20 sayfalık bireysel rapor",
          "Altı aylık plan",
        ],
        cta: { ready: "Başvur", ask: "Bireysel değerlendirme için yazın" },
      },
      {
        key: "company",
        name: "İşveren",
        who: "İK ekipleri · bölgesel şirketler",
        price: null,
        unit: "yıllık",
        note: "Yerel yönetimin birkaç şirketi birleştirerek alması sık görülür.",
        features: [
          "İlanınız uygun öğrencilerin raporunda gösterilir",
          "Aradığınız becerilerin karşılanma oranı",
          "Başvuru doğrudan kendi ilan sayfanıza gider",
          "Kişisel veri paylaşılmaz",
        ],
        cta: { ready: "Erişim talep et", ask: "İş birliği için yazın" },
      },
      {
        key: "department",
        name: "Bölüm",
        who: "Bölüm · kariyer merkezi",
        price: null,
        unit: "kişi başı",
        note: "Kişi sayısına göre birim fiyat değişir.",
        features: [
          "Bireysel değerlendirmenin tamamı",
          "Bölüme özel bağlantı",
          "Anonim toplu rapor",
          "Bölgedeki şirketlerle eşleştirme",
          "Sonuçların açılma zamanını bölüm belirler",
        ],
        cta: { ready: "Kurulum başvurusu", ask: "Kurulum için yazın" },
        featured: true,
      },
    ],
    note: "Kesin fiyat kişi sayısına ve döneme göre sunulur.",
  },

  contact: {
    heading: "Sorun",
    lead: "Tek bölümde pilot da, üniversite geneli de buradan başlar.",
    quickHeading: "Hızlı talep",
    quickNote: "Üç alan yeterli. Gerisini görüşürken netleştiririz.",
    quickSubmit: "Gönder",
    typeLabel: "Talep türü",
    types: [
      { value: "org", label: "Üniversite veya bölüm" },
      { value: "company", label: "İşveren" },
      { value: "individual", label: "Bireysel değerlendirme" },
    ],
    afterLabel: "Gönderdikten sonra",
    after: [
      "İçeriği inceleriz",
      "Bölümünüze uygun öneriyi hazırlayıp yanıtlarız",
      "Takvim ve dönemi birlikte belirleriz",
    ],
    fields: {
      org: "Üniversite · bölüm",
      name: "Ad soyad",
      email: "Yanıt için e-posta",
      size: "Tahmini kişi sayısı",
      sizeHint: "Bireysel değerlendirmede boş bırakabilirsiniz",
      message: "Mesajınız",
      messageHint: "Takvim veya sorularınızı yazın",
    },
    submit: "Gönder",
    sending: "Gönderiliyor…",
    success: "Talebiniz alındı",
    successBody: "Belirttiğiniz e-posta adresinden dönüş yapacağız.",
    error: "Gönderilemedi. Biraz sonra tekrar deneyin.",
  },

  footer: {
    note: "METRI · PCA değerlendirme motoru · ACADEMIX tarafından geliştirildi",
    sitesLabel: "Diğer ülkeler",
    sites: [
      { label: "Global (English)", href: "https://metri.io", ready: true },
      { label: "한국", href: "https://metri.co.kr", ready: true },
      { label: "Қазақстан", href: "https://metri.kz", ready: true },
      { label: "Türkiye", href: "https://metri.com.tr", ready: true },
    ],
    soonLabel: "Hazırlanıyor",
    closing: "Bölümünüz sonuca bağlansın",
  },
};
