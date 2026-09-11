/**
 * 화면에 쓰는 언어.
 *
 * 문항과 직무 이름은 이미 translations 에 세 언어로 들어 있다(설계 원칙 2).
 * 그런데 문항만 번역되고 버튼이 한국어면 외국인 응시자는 검사를 끝내지 못한다.
 * 그래서 껍데기 문구도 같은 세 언어로 둔다.
 *
 * 언어는 쿠키 하나로 기억한다. 사용자 테이블에 붙이지 않는 이유는, 결제 전
 * 둘러보는 사람도 언어를 골라야 하기 때문이다.
 *
 * 이 파일에는 next/headers 를 들이지 않는다. 언어 전환 버튼은 클라이언트
 * 컴포넌트이고, 서버 전용 모듈을 하나라도 끌어오면 빌드가 깨진다.
 * 쿠키를 읽는 쪽은 locale-server.ts 에 따로 있다.
 */
export const LANGS = ["ko", "en", "tr"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_COOKIE = "metri_lang";

export const LANG_LABEL: Record<Lang, string> = {
  ko: "한국어",
  en: "English",
  tr: "Türkçe",
};

export function isLang(v: string | undefined): v is Lang {
  return !!v && (LANGS as readonly string[]).includes(v);
}

type Dict = Record<Lang, string>;
const d = (ko: string, en: string, tr: string): Dict => ({ ko, en, tr });

/**
 * 화면 문구. 여기 없는 문장은 화면에 못 나온다 — 새 문구를 쓸 때 세 언어를
 * 같이 쓰게 만들려는 제약이다.
 */
export const UI = {
  brand: d("METRI", "METRI", "METRI"),

  // 진입
  doorTitle: d(
    "어떤 분이신가요?",
    "Who are you here as?",
    "Hangi sıfatla geldiniz?",
  ),
  doorSub: d(
    "고르시면 필요한 화면으로 바로 갑니다. 계정이 없어도 개인으로 시작할 수 있습니다.",
    "Pick one and we take you straight to the right screen. No account needed to start as an individual.",
    "Birini seçin, doğrudan ilgili ekrana götürelim. Bireysel başlamak için hesaba gerek yok.",
  ),
  doorIndividual: d("개인으로 검사받기", "Take the assessment yourself", "Testi kendim almak istiyorum"),
  doorIndividualNote: d(
    "결제하면 바로 응시할 수 있습니다. 소속이 없어도 됩니다.",
    "Pay and start immediately. No institution required.",
    "Ödeme sonrası hemen başlayın. Kuruma bağlı olmanız gerekmez.",
  ),
  doorStudent: d("학교에서 받은 계정으로", "Sign in with a school account", "Okulumdan aldığım hesapla"),
  doorStudentNote: d(
    "학과가 명단에 올렸다면 아이디와 첫 비밀번호를 받으셨을 겁니다.",
    "If your department enrolled you, you were given an ID and a first password.",
    "Bölümünüz sizi listeye eklediyse bir kullanıcı adı ve ilk şifre aldınız.",
  ),
  doorProfessor: d("학과 교수", "Faculty", "Öğretim üyesi"),
  doorProfessorNote: d(
    "우리 과 학생들의 응시 현황과 단체 리포트를 봅니다.",
    "See your students' progress and the cohort report.",
    "Öğrencilerinizin durumunu ve toplu raporu görün.",
  ),
  doorCenter: d(
    "인재개발원 · 대학일자리플러스",
    "Career center · Talent development",
    "Kariyer merkezi · İnsan kaynakları",
  ),
  doorCenterNote: d(
    "회차를 열고 명단을 올리고 결과 공개를 승인합니다.",
    "Open a round, upload the roster, release results.",
    "Dönem açın, listeyi yükleyin, sonuçları yayınlayın.",
  ),
  doorIntl: d("해외 대학 담당자", "International partner institution", "Yurt dışı kurum yetkilisi"),
  doorIntlNote: d(
    "화면과 문항이 영어·튀르키예어로 나옵니다. 결과지는 같은 자로 비교됩니다.",
    "Screens and items in English or Turkish. Results are on the same scale as everyone else.",
    "Ekranlar ve sorular İngilizce veya Türkçe. Sonuçlar herkesle aynı ölçekte.",
  ),
  doorHasAccount: d("이미 계정이 있으신가요?", "Already have an account?", "Hesabınız var mı?"),
  signIn: d("로그인", "Sign in", "Giriş yap"),

  // 응시
  testTitle: d("기계공학 직무적합 검사", "Mechanical Engineering Career Fit", "Makine Mühendisliği Kariyer Uyumu"),
  testMeta: d("{n}문항 · 약 {m}분", "{n} items · about {m} min", "{n} soru · yaklaşık {m} dk"),
  testBrief1: d(
    "정답이 없습니다. 오래 고민하지 말고 먼저 떠오르는 쪽을 고르세요.",
    "There are no right answers. Go with your first instinct.",
    "Doğru cevap yoktur. İlk aklınıza geleni işaretleyin.",
  ),
  testBrief2: d(
    "한 문항 고를 때마다 저장됩니다. 도중에 닫아도 이어서 볼 수 있습니다.",
    "Every answer is saved as you go. You can close the page and come back.",
    "Her yanıt anında kaydedilir. Sayfayı kapatıp geri dönebilirsiniz.",
  ),
  testBrief3: d(
    "끝까지 답해야 결과지가 나옵니다.",
    "The report is produced once every item is answered.",
    "Rapor, tüm sorular yanıtlandığında oluşturulur.",
  ),
  testStart: d("검사 시작", "Start", "Başla"),
  testResume: d("{n}번부터 이어보기", "Resume from item {n}", "{n}. sorudan devam et"),
  prev: d("이전", "Back", "Geri"),
  next: d("다음", "Next", "İleri"),
  pageOf: d("{a} / {b} 쪽", "Page {a} of {b}", "Sayfa {a} / {b}"),
  finishPage: d(
    "이 쪽을 모두 답해 주세요",
    "Answer every item on this page",
    "Bu sayfadaki tüm soruları yanıtlayın",
  ),
  submit: d("제출하고 결과 보기", "Submit and see results", "Gönder ve sonucu gör"),
  scoring: d("채점 중…", "Scoring…", "Puanlanıyor…"),
  saveFailed: d(
    "저장되지 않았습니다. 다시 눌러 주세요.",
    "Not saved. Please tap again.",
    "Kaydedilmedi. Lütfen tekrar dokunun.",
  ),
  missingItems: d(
    "아직 답하지 않은 문항이 {n}개 있습니다.",
    "{n} items are still unanswered.",
    "{n} soru hâlâ yanıtlanmadı.",
  ),
  noSeatTitle: d("응시할 검사가 없습니다", "No assessment available", "Kullanılabilir test yok"),
  noSeatBody: d(
    "개인으로 오셨다면 결제 후 바로 응시할 수 있고, 학교를 통해 오셨다면 학과에서 명단에 올린 뒤 열립니다.",
    "As an individual, you can start right after payment. Through a school, it opens once your department enrolls you.",
    "Bireysel geldiyseniz ödemeden hemen sonra başlayabilirsiniz. Okul üzerinden geldiyseniz bölümünüz sizi listeye ekleyince açılır.",
  ),
  startAsIndividual: d("개인으로 시작하기", "Start as an individual", "Bireysel olarak başla"),

  // 결과지
  repKicker: d(
    "METRI · 공학 진로 인텔리전스",
    "METRI · Engineering Career Intelligence",
    "METRI · Mühendislik Kariyer Zekâsı",
  ),
  repTitle: d("직무적합 진단 결과지", "Career Fit Report", "Kariyer Uyum Raporu"),
  repSec00: d("종합 요약", "Summary", "Genel özet"),
  repSec01: d("직무분야 10개", "Ten job areas", "On iş alanı"),
  repSec02: d("공학 활동 선호", "Engineering activity preferences", "Mühendislik faaliyet tercihleri"),
  repSec03: d("업무 성향", "Work style", "Çalışma eğilimi"),
  repSec04: d("직무 적합도", "Role fit", "Rol uyumu"),
  repSec05: d("1순위 직무가 요구하는 역량", "What the top role requires", "İlk sıradaki rolün gerektirdikleri"),
  repSec06: d("다음 여섯 달", "The next six months", "Önümüzdeki altı ay"),
  repLead: d(
    "250문항이 재는 것은 무엇을 하고 싶은가입니다. 실력이 아니라 관심의 방향입니다.",
    "The 250 items measure what you want to do — the direction of your interest, not your skill level.",
    "250 soru ne yapmak istediğinizi ölçer — yetkinliğinizi değil, ilginizin yönünü.",
  ),
  repLeadTop: d(
    "가장 높게 나온 직무 분야는 {area}이고, 그 아래 직무로 내려가면 {job}이 1순위입니다.",
    "Your strongest job area is {area}; drilling down, {job} ranks first.",
    "En güçlü iş alanınız {area}; alt kırılımda {job} ilk sırada.",
  ),
  repKpiJob: d("1순위 직무", "Top role", "İlk sıradaki rol"),
  repKpiArea: d("1순위 직무분야", "Top job area", "İlk sıradaki iş alanı"),
  repKpiTrait: d("가장 뚜렷한 업무 성향", "Most pronounced work style", "En belirgin çalışma eğilimi"),
  repQuality: d("응답 신뢰도", "Response reliability", "Yanıt güvenilirliği"),
  repQualityOk: d(
    "응답이 고르게 들어왔습니다. 아래 점수를 그대로 읽으셔도 됩니다.",
    "Responses came in evenly. You can read the scores below at face value.",
    "Yanıtlar dengeli geldi. Aşağıdaki puanları olduğu gibi okuyabilirsiniz.",
  ),
  repQualityCheck: d(
    "같은 보기가 길게 이어지거나 응답이 빨랐습니다. 점수는 그대로 두되 구간을 넓게 잡았습니다.",
    "The same option ran long, or answers came fast. Scores are unchanged; the interval is widened.",
    "Aynı seçenek uzun sürdü ya da yanıtlar hızlıydı. Puanlar aynı; aralık genişletildi.",
  ),
  repQualityInvalid: d(
    "성실도 확인 문항을 모두 놓쳤습니다. 결과를 판단 근거로 쓰기 전에 다시 응시하시기를 권합니다.",
    "Every attention check was missed. We suggest retaking before relying on this result.",
    "Tüm dikkat kontrolleri kaçırıldı. Bu sonuca dayanmadan önce testi tekrarlamanızı öneririz.",
  ),
  repQualityStat: d(
    "성실도 확인 {a}/{b} 통과 · 같은 보기 최대 {r}연속 · 적합도 구간 ±{w}점",
    "Attention checks {a}/{b} passed · longest same-option run {r} · fit interval ±{w}",
    "Dikkat kontrolü {a}/{b} geçildi · en uzun aynı seçenek dizisi {r} · uyum aralığı ±{w}",
  ),
  repNote01: d(
    "문항이 직접 재는 단위입니다. 분야마다 25문항씩 답하셨고, 그 평균을 100점으로 폈습니다. 아래 8축과 직무 순위는 모두 이 열 개에서 나옵니다.",
    "This is what the items measure directly. You answered 25 items per area; the average is stretched to 100. The eight axes and the role ranking below all come from these ten.",
    "Soruların doğrudan ölçtüğü birim budur. Her alan için 25 soru yanıtladınız; ortalama 100 üzerinden ölçeklendi. Aşağıdaki sekiz eksen ve rol sıralaması bu ondan türer.",
  ),
  repNote02: d(
    "직무분야 열 개를 공학 활동 여덟 가지로 옮긴 값입니다. 분야 이름은 나라마다 다르지만 이 여덟 가지는 어디서나 같습니다 — 해외 직무와 비교할 때 쓰는 축입니다.",
    "The ten job areas mapped onto eight engineering activities. Area names differ by country; these eight do not — this is the axis used to compare roles across borders.",
    "On iş alanının sekiz mühendislik faaliyetine aktarılmış hâli. Alan adları ülkeye göre değişir; bu sekizi değişmez — sınır ötesi karşılaştırmada kullanılan eksen budur.",
  ),
  repNote03: d(
    "250문항 중 120문항에 성향이 심어져 있습니다. 여섯 가지의 절대 높이보다 서로의 높낮이가 정보입니다. 가장 높은 쪽이 {hi}, 가장 낮은 쪽이 {lo}입니다.",
    "120 of the 250 items carry a work-style signal. What matters is the relative height of the six, not their absolute level. Highest is {hi}; lowest is {lo}.",
    "250 sorunun 120'si çalışma eğilimi taşır. Önemli olan altısının mutlak yüksekliği değil, birbirine göre konumudur. En yüksek {hi}; en düşük {lo}.",
  ),
  repNote04: d(
    "활동 선호 75% + 업무 성향 25%로 계산했습니다. 가는 막대는 신뢰구간입니다 — 구간이 겹치는 직무끼리는 순위 차이를 크게 읽지 마십시오.",
    "Computed as 75% activity preference + 25% work style. The thin bar is the confidence interval — where intervals overlap, do not read much into the rank gap.",
    "Hesaplama: %75 faaliyet tercihi + %25 çalışma eğilimi. İnce çubuk güven aralığıdır — aralıklar çakışıyorsa sıralama farkına fazla anlam yüklemeyin.",
  ),
  repNote05: d(
    "1순위로 나온 {job}이 요구하는 역량을 중요도 순으로 놓았습니다.",
    "What {job}, your top-ranked role, requires — ordered by importance.",
    "İlk sıradaki rol olan {job} için gerekenler — önem sırasına göre.",
  ),
  repNoEvidence: d(
    "보유 수준은 아직 비어 있습니다. 이 검사는 관심의 방향을 재는 것이고, 역량 보유 수준은 들은 과목·자격증·프로젝트에서만 나옵니다. 추정해서 채우지 않았습니다.",
    "Your held level is still empty. This assessment measures the direction of interest; held competency comes only from coursework, certificates and projects. We did not estimate it.",
    "Sahip olunan seviye hâlâ boş. Bu test ilginin yönünü ölçer; yetkinlik seviyesi yalnızca dersler, sertifikalar ve projelerden gelir. Tahmin ederek doldurmadık.",
  ),
  repLegendReq: d("요구 수준", "Required", "Gerekli"),
  repLegendHeld: d("보유 수준", "Held", "Sahip olunan"),
  repLegendGap: d("채워야 할 구간", "Gap to close", "Kapatılacak fark"),
  repMust: d("필수", "Must", "Zorunlu"),
  repPlan1: d(
    "{job} 요구 역량 중 필수로 표시된 것부터 관련 과목을 확인합니다. 이미 들은 과목이 있다면 증거로 올려 보유 수준을 채웁니다.",
    "Start from the items marked Must for {job} and find the matching courses. If you have already taken some, upload them as evidence to fill in your held level.",
    "{job} için Zorunlu işaretli maddelerden başlayıp ilgili dersleri bulun. Aldıklarınız varsa kanıt olarak yükleyip seviyenizi doldurun.",
  ),
  repPlan2: d(
    "{area} 쪽 프로젝트를 하나 끝냅니다. 결과물보다 과정 기록이 증거가 됩니다.",
    "Finish one project on the {area} side. The record of the process counts as evidence more than the artifact does.",
    "{area} tarafında bir proje bitirin. Kanıt olarak ürün değil, sürecin kaydı sayılır.",
  ),
  repPlan3: d(
    "2순위였던 {job}과 비교해 다시 봅니다. 구간이 겹쳤다면 해 본 경험이 순위를 가릅니다.",
    "Revisit this against {job}, which ranked second. Where the intervals overlapped, experience is what separates them.",
    "İkinci sıradaki {job} ile yeniden karşılaştırın. Aralıklar çakıştıysa ayrımı deneyim yapar.",
  ),
  repPlanM1: d("1–2개월", "Months 1–2", "1–2. ay"),
  repPlanM2: d("3–4개월", "Months 3–4", "3–4. ay"),
  repPlanM3: d("5–6개월", "Months 5–6", "5–6. ay"),
  repRetest: d(
    "재검사는 여섯 달 뒤를 권합니다. 그전에는 값이 거의 움직이지 않습니다.",
    "We suggest retaking in six months. Before that the numbers barely move.",
    "Altı ay sonra tekrar almanızı öneririz. Öncesinde değerler neredeyse değişmez.",
  ),
  repBack: d("내 검사로 돌아가기", "Back to my assessments", "Testlerime dön"),
  repFootNote: d(
    "응시 번호 {id} · 점수는 산식이 계산했고 문장은 이 결과지의 해설입니다",
    "Attempt {id} · the scores come from the formula; the sentences explain them",
    "Deneme {id} · puanlar formülden gelir; cümleler onları açıklar",
  ),

  repPendingTitle: d(
    "결과지는 학과 승인 후 열립니다",
    "Your report opens once the department releases it",
    "Raporunuz bölüm yayınladığında açılır",
  ),
  repPendingBody: d(
    "채점은 끝났습니다. 학과 담당자가 회차 전체를 확인한 뒤 공개하면 바로 보실 수 있습니다.",
    "Scoring is done. Your coordinator reviews the whole round first; the report appears as soon as they release it.",
    "Puanlama tamamlandı. Koordinatörünüz önce tüm dönemi inceler; yayınladığı anda rapor görünür.",
  ),

  // 증거 입력
  evTitle: d("역량 증거", "Competency evidence", "Yetkinlik kanıtı"),
  evLead: d(
    "보유 수준은 고르는 것이 아니라 쌓이는 것입니다. 들은 과목, 딴 자격증, 끝낸 프로젝트를 적으면 배점과 신뢰도를 곱해 레벨이 계산됩니다.",
    "Held level is not something you pick; it accumulates. Add the courses you passed, the certificates you hold and the projects you finished — each carries its own weight and reliability, and the level follows.",
    "Sahip olunan seviye seçilmez, birikir. Geçtiğiniz dersleri, aldığınız sertifikaları ve bitirdiğiniz projeleri ekleyin — her biri kendi ağırlığını ve güvenilirliğini taşır, seviye buradan çıkar.",
  ),
  evWhyNotAsk: d(
    "“ANSYS 몇 레벨입니까” 를 묻지 않는 이유는 그렇게 물으면 거의 모두가 3이라고 답하기 때문입니다.",
    "We do not ask “what level is your ANSYS?” because almost everyone answers three.",
    "“ANSYS seviyeniz nedir?” diye sormuyoruz, çünkü neredeyse herkes üç diyor.",
  ),
  evRequired: d("1순위 직무가 요구하는 역량", "What your top role requires", "İlk sıradaki rolün gerektirdikleri"),
  evOthers: d("그 밖의 역량", "Other competencies", "Diğer yetkinlikler"),
  evHeld: d("보유", "Held", "Sahip"),
  evNone: d("증거 없음", "No evidence", "Kanıt yok"),
  evAdd: d("증거 추가", "Add evidence", "Kanıt ekle"),
  evSave: d("추가", "Add", "Ekle"),
  evCancel: d("닫기", "Close", "Kapat"),
  evDelete: d("지우기", "Remove", "Kaldır"),
  evSource: d("무엇으로 채웠나요", "What kind of evidence", "Ne tür kanıt"),
  evLabel: d("이름", "Name", "Ad"),
  evLabelHint: d(
    "예: 전산구조해석 (ME412)",
    "e.g. Computational Structural Analysis (ME412)",
    "ör. Hesaplamalı Yapısal Analiz (ME412)",
  ),
  evGrade: d("성적", "Grade", "Not"),
  evGradeBlank: d("적지 않음", "Not stated", "Belirtilmedi"),
  evGradeNote: d(
    "성적을 비우면 가장 낮은 계수로 잡습니다. 비워서 이득을 보지는 않습니다.",
    "Left blank, the lowest coefficient applies. Blank is never an advantage.",
    "Boş bırakılırsa en düşük katsayı uygulanır. Boş bırakmak avantaj sağlamaz.",
  ),
  evNeedsProof: d("증빙 필요", "Proof required", "Kanıt belgesi gerekli"),
  evPoints: d("점", "pts", "puan"),
  evSum: d("증거 합 {raw} → 레벨 {lv}", "Evidence {raw} → level {lv}", "Kanıt {raw} → seviye {lv}"),
  evCount: d("역량 {n}개에 증거가 있습니다", "Evidence on {n} competencies", "{n} yetkinlikte kanıt var"),
  evBackToReport: d("결과지로 돌아가기", "Back to the report", "Rapora dön"),
  evOpen: d("보유 수준 채우기", "Fill in your held levels", "Seviyelerinizi doldurun"),
  evSourceName: d("출처", "Source", "Kaynak"),
  evEmpty: d(
    "아직 아무것도 없습니다. 이번 학기에 들은 전공 과목 하나부터 넣어 보세요.",
    "Nothing yet. Start with one major course you took this term.",
    "Henüz bir şey yok. Bu dönem aldığınız bir bölüm dersiyle başlayın.",
  ),

  // 가입과 결제
  suTitle: d("가입하고 시작하기", "Create an account", "Hesap oluşturun"),
  suLead: d(
    "이메일과 비밀번호만 있으면 됩니다.",
    "An email and a password are all you need.",
    "Bir e-posta ve şifre yeterli.",
  ),
  suLeadPaid: d(
    "{item} · {price}. 가입하면 바로 결제 화면으로 넘어갑니다.",
    "{item} · {price}. You go straight to payment after signing up.",
    "{item} · {price}. Kaydolduktan sonra doğrudan ödemeye geçersiniz.",
  ),
  suName: d("이름", "Name", "Ad"),
  suEmail: d("이메일", "Email", "E-posta"),
  suEmailHint: d(
    "결과지를 다시 열 때 쓰는 아이디입니다.",
    "This is the ID you use to reopen your report.",
    "Raporunuzu yeniden açarken kullanacağınız kimliktir.",
  ),
  suPassword: d("비밀번호", "Password", "Şifre"),
  suSubmit: d("가입하고 계속", "Create account and continue", "Hesap oluştur ve devam et"),
  suWorking: d("만드는 중…", "Creating…", "Oluşturuluyor…"),
  suHaveAccount: d("이미 계정이 있으신가요?", "Already have an account?", "Hesabınız var mı?"),
  suFromSchool: d(
    "학교에서 아이디를 받으셨다면 가입하지 마시고 로그인하세요.",
    "If your school gave you an ID, sign in instead of signing up.",
    "Okulunuz size bir kimlik verdiyse kaydolmayın, giriş yapın.",
  ),

  payTitle: d("결제", "Payment", "Ödeme"),
  payNote1: d(
    "결제하면 응시권 1개가 발급됩니다.",
    "Payment issues one assessment credit.",
    "Ödeme bir değerlendirme hakkı verir.",
  ),
  payNote2: d(
    "응시를 시작하기 전에는 전액 환불됩니다.",
    "Full refund any time before you start the assessment.",
    "Değerlendirmeye başlamadan önce tam iade yapılır.",
  ),
  payNote3: d(
    "결과지는 응시를 마치면 바로 열립니다.",
    "The report opens as soon as you finish.",
    "Rapor, testi bitirir bitirmez açılır.",
  ),
  payDomestic: d("국내 카드", "Korean card", "Kore kartı"),
  payDomesticNote: d(
    "국내에서 발급된 신용·체크카드",
    "Credit or debit card issued in Korea",
    "Kore'de verilmiş kredi veya banka kartı",
  ),
  payGlobal: d("해외 카드 · Visa · Mastercard", "International card · Visa · Mastercard", "Yurt dışı kart · Visa · Mastercard"),
  payGlobalNote: d(
    "해외 발급 카드로 결제합니다",
    "Pay with a card issued outside Korea",
    "Kore dışında verilmiş bir kartla ödeyin",
  ),
  payGlobalOff: d("채널 연동 준비 중입니다", "This channel is not connected yet", "Bu kanal henüz bağlı değil"),
  payMethodLabel: d("결제 수단", "Payment method", "Ödeme yöntemi"),
  payGo: d("결제하기", "Pay", "Öde"),
  payOpening: d("결제창 여는 중…", "Opening payment…", "Ödeme açılıyor…"),
  payTestMode: d("테스트 모드", "Test mode", "Test modu"),
  payTestBody: d(
    "실제로 결제되지 않습니다.",
    "No real charge is made.",
    "Gerçek bir tahsilat yapılmaz.",
  ),
  payDoneTitle: d("결제가 끝났습니다", "Payment complete", "Ödeme tamamlandı"),
  payDoneBody: d(
    "응시권이 발급됐습니다. 지금 바로 시작하실 수 있습니다.",
    "Your assessment credit is ready. You can start right now.",
    "Değerlendirme hakkınız hazır. Hemen başlayabilirsiniz.",
  ),
  payFailTitle: d("결제가 완료되지 않았습니다", "Payment did not go through", "Ödeme tamamlanmadı"),
  payGoTest: d("검사 시작하기", "Start the assessment", "Değerlendirmeye başla"),
  payNotSold: d("판매하지 않는 상품입니다", "This product is not on sale", "Bu ürün satışta değil"),

  // 탈퇴·파기
  erTitle: d("회원 탈퇴", "Close your account", "Hesabınızı kapatın"),
  erLead: d(
    "탈퇴하면 이름·이메일·아이디를 지워 누구였는지 알 수 없게 만듭니다. 되돌릴 수 없습니다.",
    "Closing your account erases your name, email and ID so you can no longer be identified. This cannot be undone.",
    "Hesabı kapatmak adınızı, e-postanızı ve kimliğinizi siler; artık tanınamazsınız. Geri alınamaz.",
  ),
  erWhyKeep: d(
    "결제 기록은 법이 5년간 보관하도록 정하고 있어 남습니다. 다만 그 기록에서 사람을 알아볼 수는 없습니다.",
    "Payment records stay because the law requires keeping them for five years. They no longer identify you.",
    "Ödeme kayıtları yasa gereği beş yıl saklanır. Bu kayıtlardan kimliğiniz anlaşılmaz.",
  ),
  erRemoveTitle: d("지우는 것", "What is erased", "Silinenler"),
  erKeepTitle: d("남는 것", "What is kept", "Saklananlar"),
  erConfirmLabel: d(
    "확인을 위해 아래 칸에 {word} 라고 적어 주세요.",
    "Type {word} below to confirm.",
    "Onaylamak için aşağıya {word} yazın.",
  ),
  erConfirmWord: d("탈퇴", "DELETE", "SİL"),
  erSubmit: d("탈퇴하기", "Close account", "Hesabı kapat"),
  erWorking: d("처리 중…", "Working…", "İşleniyor…"),
  erMismatch: d("적으신 말이 다릅니다.", "That does not match.", "Yazdığınız eşleşmiyor."),
  erDone: d("탈퇴가 끝났습니다.", "Your account is closed.", "Hesabınız kapatıldı."),
  erAccount: d("계정", "Account", "Hesap"),

  // 상품 이름. 주문서에 찍히는 이름이라 결제 화면과 같은 말이어야 한다.
  prodREPORT_UNIV: d(
    "METRI 진로 결과지 (대학)",
    "METRI Career Report (university)",
    "METRI Kariyer Raporu (üniversite)",
  ),
  prodREPORT_HS: d(
    "METRI 진로 결과지 (고교)",
    "METRI Career Report (high school)",
    "METRI Kariyer Raporu (lise)",
  ),
} as const;

/** 상품 코드로 이름을 찾는다. 없는 코드면 브랜드만 돌려준다. */
export function productName(code: string, lang: Lang): string {
  const key = `prod${code}` as UiKey;
  return key in UI ? t(key, lang) : t("brand", lang);
}

export type UiKey = keyof typeof UI;

/** t("pageOf", lang, { a: 3, b: 26 }) */
export function t(key: UiKey, lang: Lang, vars: Record<string, string | number> = {}): string {
  let s: string = UI[key][lang];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
