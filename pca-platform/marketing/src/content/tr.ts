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
    title: "METRI — mühendislik bölümleri, işe alan rollere göre okunur",
    description:
      "Makine, elektrik-elektronik ve bilgisayar mühendisliğinde 24 görev kümesi ve 138 yetkinlik, gerçek ilanlarla karşılaştırılır. Kişilik tipi değil: ANSYS 4 üzerinden 2, GD&T karşılanmadı, 132 ilanın 89'unda isteniyor.",
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
    eyebrow: "METRI · ENGINEERING CAREER INTELLIGENCE",
    title: ["Mühendisliği seçtiler.", "{Hangi mühendisliği, kimse söylemedi.}"],
    lead:
      "Makine, elektrik-elektronik ve bilgisayar mühendisliği — 24 görev kümesi ve 138 yetkinlik, gerçek ilanlarla karşılaştırılıyor. “İş birlikçisiniz” değil; “Simülasyon ve CAE 80, ANSYS 4 üzerinden 2, bu rolün 132 ilanının 89'unda isteniyor”. 250 sorunun tamamı Türkçe olarak hazır.",
    primary: { label: "Görüşme talep et", href: "/contact" },
    secondary: { label: "Örnek raporu gör", href: "#sample" },
    watermark: "METRI",
    proof: [
      { value: "250", label: "soru, Türkçe olarak hazır" },
      { value: "24", label: "mühendislik görev kümesi" },
      { value: "138", label: "yetkinlik haritası" },
      { value: "3", label: "telif tescili" },
    ],
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
      { name: "Tasarım ve Geliştirme", score: 92 },
      { name: "Otomotiv ve Havacılık", score: 88 },
      { name: "Araştırma ve Eğitim", score: 79 },
      { name: "İmalat ve Üretim", score: 74 },
      { name: "Robotik ve Otomasyon", score: 70 },
      { name: "BT Entegrasyonu ve Veri Analizi", score: 66 },
      { name: "Enerji ve Tesis", score: 61 },
      { name: "İnşaat ve Tesis Yönetimi", score: 48 },
      { name: "Biyomedikal ve Sağlık Hizmetleri", score: 45 },
      { name: "Kamu Kurumları ve Diğer Alanlar", score: 41 },
    ],
    styleLabel: "00-2 Çalışma tarzı · altı tip",
    styleTypeLabel: "Baskın tarz",
    styleType: "Kaliteye odaklı · İş birlikçi",
    styleVerdict:
      "Hızdan çok doğruluğu seçen, ekip içinde verimi artan bir tarz. Üretim kalitesi ve test alanları bu tarza yakındır.",
    styleAxes: ["Bağımsız", "İş birlikçi", "Meydan okuyan", "İstikrarlı", "Hız odaklı", "Kalite odaklı"],
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
    heading: "İki kapı, tek motor",
    lead:
      "Öğrenci tek başına girebilir. Bölüm 500 öğrenciyi aynı anda görebilir. İkisi de aynı envanteri ve aynı beceri grafiğini kullanır. Fark, satın alma birimi ve elinize geçen belgede.",
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
    label: "KİMLER İÇİN",
    heading: "METRI'yi Türkiye'ye kim getirir",
    items: [
      {
        no: "01",
        title: "Mühendislik fakülteleri ve bölümleri",
        body: "“Kariyer merkezi bir kişilik tipi veriyor. Makine mühendisliği öğrencisi hâlâ tasarımı, CAE'yi ve süreç mühendisliğini birbirinden ayıramıyor.”",
        tag: "Güven aralığıyla birlikte görev kümesi uyumu",
      },
      {
        no: "02",
        title: "Bakanlıklar ve konsorsiyumlar",
        body: "“Kaç kişinin katıldığını raporlayabiliyoruz. Sınıfın hangi yetkinlikte eksik olduğunu raporlayamıyoruz.”",
        tag: "Bütçe kalemine yazılabilecek sınıf açıkları",
      },
      {
        no: "03",
        title: "Yerel iş ortakları",
        body: "“Üniversite ilişkilerimiz var. Satmaya değer bir mühendislik ölçüm aracımız yok.”",
        tag: "Kendi markanızla işletin",
      },
    ],
  },

  analyze: {
    label: "NE OKUR",
    heading: "Üç katman — ve yalnızca ilki bir ankettir",
    lead:
      "İlgi ölçülür. Yetkinlik sorulmaz; alınan dersler, sertifikalar ve projelerden hesaplanır. İkisini ayrı tutmak işin özüdür: CAE yapmak istemek ile CAE yapabilmek farklı olgulardır, ikisini karıştıran bir rapor uygulanamaz.",
    items: [
      {
        no: "01",
        kicker: "ÖLÇÜLÜR",
        title: "On mühendislik iş alanı, sekiz faaliyet ekseni",
        body:
          "250 soru, iş alanı başına 25. Tasarım, imalat, enerji ve tesis, otomotiv ve havacılık, robotik, BT entegrasyonu, inşaat, araştırma, biyomedikal, kamu. Bu on alan sekiz faaliyet eksenine katlanır — analiz, tasarım, üretim ve test, programlama, saha ve tesis, iyileştirme, araştırma, koordinasyon — ve bu sekizi Seul'de de Ankara'da da aynı şeyi ifade eder.",
      },
      {
        no: "02",
        kicker: "ÖLÇÜLÜR",
        title: "Altı çalışma tarzı, aynı soruların içinde",
        body:
          "250 sorunun 120'si, adını anmadan bir çalışma tarzı sinyali taşır. Bağımsız, iş birlikçi, meydan okuyan, istikrarlı, hız odaklı, kalite odaklı. Önemli olan mutlak yükseklik değil, hangisinin hangisinin üstünde olduğudur — aynı öğrenci süreç kalitesinde bir kazanç, sprint ekibinde bir yüktür.",
      },
      {
        no: "03",
        kicker: "HESAPLANIR",
        title: "Sahip olunan yetkinlik, yalnızca kanıttan",
        body:
          "Geçilen bir ders, alınan bir sertifika, tamamlanan bir proje — her biri kendi ağırlığını ve güvenilirliğini taşır; toplam 0–5 arası bir seviyeye dönüşür. Öğrenciye kendi ANSYS'ini sorarsanız herkes üç der. Kanıt yoksa rapor tahmin etmez, “yok” yazar.",
      },
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
    jobAxes: [
      "Simülasyon ve CAE",
      "Makine tasarımı",
      "Süreç mühendisliği",
      "Kalite ve güvenilirlik",
      "Robotik ve otomasyon",
      "Yarı iletken ekipmanı",
    ],
    styleAxes: ["Bağımsız", "İş birlikçi", "Meydan okuyan", "İstikrarlı", "Hız odaklı", "Kalite odaklı"],
    jobScores: [80, 73, 60, 65, 67, 61],
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

  gap: {
    label: "DEĞERLENDİRMEDEN SONRA",
    heading: "Değerlendirme giriştir. Pahalı sorun onun arkasında durur.",
    lead:
      "Bir bölüm eğitim bütçesini harcarken en az bildiği şey, kime hangi eğitimin gerektiğidir. Rafa 300 kurs koyarsanız koordinatör sezgiyle seçer. METRI o hücreyi bir sayıyla adlandırır.",
    funnel: [
      { value: "487", label: "bir makine mühendisliği bölümünün öğrencisi" },
      { value: "%31", label: "GD&T gerekli seviyesini karşılıyor" },
      { value: "%67", label: "1.240 bölgesel ilanın GD&T istediği oran" },
      { value: "372", label: "kesişim — bu eğitime ihtiyacı olan öğrenciler" },
    ],
    funnelNote:
      "Son sayı teklifin kendisidir. Bölüm, çözümü seçmeden önce sorunu zaten kabul etmiştir; bu, soğuk bir teklifle aynı şey değildir. Yukarıdaki sayılar hesabın nasıl işlediğini gösterir, gerçek bir bölümün verisi değildir.",
    matrix: {
      head: ["Araç türü", "Sahip olduğu", "Eksik olanı"],
      rows: [
        ["İşgücü piyasası uyum analitiği", "Müfredatın bölgesel talebe göre ölçülmesi", "Bireysel öğrenci yok"],
        ["Bireysel beceri eşleştirme hizmetleri", "Kişisel becerilerin ilanlarla eşleşmesi", "Bölüm düzeyinde toplam yok"],
        ["Ulusal yetkinlik çerçeveleri", "Standart rol ve beceri sözlüğü", "Öğrenci değerlendirmesi yok"],
        ["Ücretsiz kamu kariyer testleri", "Ücretsiz, herkese açık", "Ne mühendislik odağı ne de sınıf görünümü var"],
        ["Mesleki eğitim platformları", "Yüzlerce kurs ve üniversite kanalı", "Teşhis yok — kime satacağını bilmiyor"],
        ["METRI", "Bireysel değerlendirme → bölüm toplamı → adlandırılmış eğitim talebi", "Eğitimi iş ortaklarıyla veriyoruz"],
      ],
      note:
        "Şirket adı yerine araç türlerini yazdık. Her biri kendi işini iyi yapıyor; boş olan, bu beşinin buluştuğu hücre.",
    },
  },
  choose: {
    label: "NEDEN METRI",
    heading: "Kurumlar genel bir kariyer testi yerine neden bunu seçiyor",
    items: [
      {
        title: "Mühendisliğe özgü, mühendisliğe komşu değil",
        body:
          "Genel kariyer testleri “teknik alan” deyip biter. METRI makine tasarımını yapısal analizden, süreç mühendisliğinden ve ekipman mühendisliğinden ayırır; çünkü bu dördü farklı işe alır, farklı öder ve farklı yazılım ister.",
      },
      {
        title: "Yeniden hesaplayabileceğiniz puanlar",
        body:
          "Her ağırlık kodda değil, bir tabloda durur. Bölüme formülü verirsiniz, aynı 82'ye varır. Kimsenin yeniden üretemediği bir puan satın alma incelemesinden geçmez.",
      },
      {
        title: "Sahte kesinlik değil, aralık",
        body:
          "Aynı şıkkın üst üste işaretlenmesi, aceleye gelen yanıtlar ve kaçırılan dikkat kontrolleri puanı sessizce düşürmez; güven aralığını genişletir. İki rol çakışıyorsa rapor bunu söyler, sıralama uydurmaz.",
      },
      {
        title: "Türkçesi hazır",
        body:
          "250 sorunun tamamı Türkçe olarak mevcut; Korece ve İngilizce sürümlerle birebir aynı sorulardır. Sekiz faaliyet ekseni tasarımı gereği ülkeden bağımsızdır. Yerelleştirilen ölçüm aracı değil, işgücü piyasası katmanıdır — ilanlar, işverenler, belgeler.",
      },
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
