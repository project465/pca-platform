/**
 * **떠 둔 실제 출력을 상용 기준으로 센다.** 문장을 고치기 전에 먼저 잰다.
 *
 * 읽는 것은 `v3:content-qa` 가 떠 둔 자리다(`var/content-qa*`). 모델의
 * JSON 을 보지 않고 **그려진 글자**를 보는 까닭은, 같은 모델이 웹에서는
 * 접혀 있고 종이에서는 펴지며 쪽이 갈리기 때문이다.
 *
 *   OUT=var/content-qa-before npx tsx scripts/v3-content-audit.ts
 *
 * 세는 것이 일곱이다.
 *
 *   §8  첫 화면 네 칸이 서고 빈 칸이 없다
 *   §10 한 결과지 안에서 같은 문장과 같은 까닭이 되풀이되지 않는다
 *   §11 종이 첫 쪽이 브랜드·학교·학과·응답일·확인된 것·할 일을 든다
 *   §12 본문 차례가 결과 먼저고 주의가 뒤다
 *   §13 쪽 채움과 끝쪽과 잘린 카드
 *   §16 Core 사이에 전공명만 바꾼 결과가 없고 남의 Core 말이 새지 않는다
 *   §17 광고 말투와 재지 않은 단정이 없다
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { coreFile, hasCoreFile, registry } from "../src/lib/me-v3/core-registry";
import { industryChoices, roleChoices } from "../src/lib/me-v3/runtime/session";
import { allLeaves, university } from "../src/lib/campus/registry";

const DIR = process.env.OUT ?? "var/content-qa-before";
const PEOPLE = ["A", "B", "C"];

const REG = registry() as unknown as { cores: { code: string; status: string }[] };
const CORES = REG.cores
  .filter((c) => c.status === "building" && hasCoreFile(c.code, "items"))
  .map((c) => c.code);

type Doc = { core: string; person: string; web: string; pdf: string[]; fill: number[] };

/** 그 Core 를 가리키는 학교 자리의 학과 이름. 없으면 일반 응시다 */
function leafName(core: string): string | null {
  const u = university("PCU");
  if (!u) return null;
  const row = allLeaves(u).find((r) => r.leaf.core_code === core);
  return row ? row.leaf.name : null;
}

/**
 * 조사를 떼어 낸 말.
 *
 * `단계를` 과 `단계` 는 같은 말이다. 떼지 않으면 조사가 붙은 꼴이 한
 * Core 전용으로 세어져, 공통 어휘가 남의 말로 걸린다.
 */
function bare(w: string): string {
  return w.replace(/(를|을|와|과|이|가|은|는|의|로|도|만|에|에서|까지|부터)$/, "");
}

function read(f: string): string {
  try { return readFileSync(f, "utf8"); } catch { return ""; }
}

/**
 * 한도를 0 으로 둔 말. **자연스러운 자리가 없는 것만 적는다.**
 *
 * `적성` 과 `순위` 는 결과지가 **그것을 내지 않는다고 적는 자리**에 쓰므로
 * 부정문을 지나간다. 저장소의 `writing:check` 과 같은 규칙이다: 막는 것은
 * 결론이고 그 결론을 막는 문장이 아니다.
 */
const CLAIM: { bad: RegExp; why: string; negOk?: boolean }[] = [
  { bad: /종합적(으로)? (분석|판단|평가)/, why: "무엇을 보고 그렇게 읽었는지가 사라진다" },
  { bad: /기반으로 (분석|판단)/, why: "분석했다고 적지 않고 확인된 것을 적는다" },
  { bad: /귀하|응답자님/, why: "사람을 부르는 말이 광고 문면이다" },
  /* `적합성` 은 그 전공의 말이다(전자파 적합성 · 기준 적합성). 사람에게
     `적합하다` 고 말하는 꼴만 센다 */
  { bad: /적합(하다|합니다|한 편|도가|도를)/, why: "적합을 말하려면 규준이 있어야 한다", negOk: true },
  /* `최적점` 과 `최적 조건` 은 실험과 공정의 말이다. 사람이나 진로를
     최적이라고 적는 꼴만 센다 */
  { bad: /최적의|최적 진로|최적 직무|최적화된 결과/, why: "비교 대상이 없는 말이다" },
  { bad: /잠재력/, why: "재지 않은 것을 단정한다" },
  { bad: /다양한 가능성|여러 가능성이 열려/, why: "아무것도 말하지 않는다" },
  { bad: /역량이 (우수|뛰어)/, why: "역량 보유를 단정한다" },
  { bad: /성장 (가능성|잠재)/, why: "재지 않은 것을 단정한다" },
  { bad: /맞춤형/, why: "광고 말투다" },
  { bad: /추천(합니다|해 드립니다|드립니다)/, why: "직업정보제공사업은 추천을 하지 않는다" },
  { bad: /도움이 될 것입니다|기대됩니다|기대할 수 있습니다/, why: "확인되지 않은 약속이다" },
  { bad: /가능성이 높|확률이 높/, why: "이 검사가 계산하지 않는 값이다", negOk: true },
  { bad: /우수(합니다|한 편)/, why: "사람을 평가한다" },
  { bad: /상위 \d|백분위|퍼센타일/, why: "규준이 없다" },
];
const NEG = /(않|없|못|아닙|아니)/;

/** 사람에게 보이는 문장으로 자른다 */
function sentences(t: string): string[] {
  return t.split(/\n+/).map((x) => x.trim())
    .flatMap((x) => x.split(/(?<=[.!?])\s+/))
    .map((x) => x.trim())
    .filter((x) => x.length >= 12);
}

/**
 * **되풀이를 셀 때는 줄글만 센다.**
 *
 * 표의 칸 이름과 단추 글자는 되풀이되는 것이 맞다: `산출물` 은 영역마다
 * 서는 축 이름이고 `확인된 경험 전부 보기` 는 접는 단추다. 그것을 세면
 * 멀쩡한 표를 지우라고 요구하게 된다. 세는 것은 **문장으로 끝나는 말**
 * 이고, 그것이 두 번 서면 읽는 사람이 같은 데를 또 도는 줄 안다.
 */
function prose(t: string): string[] {
  return sentences(t).filter((x) => x.length >= 18 && /(다|요)\.?$/.test(x));
}

function main(): void {
  const docs: Doc[] = [];
  const have = new Set(readdirSync(DIR));
  for (const core of CORES) {
    for (const p of PEOPLE) {
      if (!have.has(`${core}-${p}.web.txt`)) continue;
      const pdf = read(`${DIR}/${core}-${p}.txt`).split("\n\f\n");
      docs.push({ core, person: p, web: read(`${DIR}/${core}-${p}.web.txt`), pdf, fill: [] });
    }
  }
  const judg = JSON.parse(read(`${DIR}/judgment.json`) || "[]") as
    { core: string; person: string; pageFill: number[]; pages: number }[];
  for (const d of docs) {
    d.fill = judg.find((j) => j.core === d.core && j.person === d.person)?.pageFill ?? [];
  }

  const out: string[] = [];
  /**
   * 걸림과 보고를 가른다.
   *
   * 자동으로 가릴 수 없는 자리를 걸림으로 적으면 그 다음부터 아무도 이
   * 검사를 보지 않는다. 남의 Core 말 후보가 그 자리다: `감염관리` 가
   * 간호 Core 의 영역 이름이면서 보건행정의 결과지에 서는 것은 **새어
   * 나간 것이 아니라 두 전공이 같이 쓰는 말**일 수 있고, 어느 쪽인지는
   * 그 전공을 아는 사람이 정한다.
   */
  const notes: string[] = [];
  const say = (sec: string, line: string) => out.push(`${sec}\t${line}`);
  const note = (sec: string, line: string) => notes.push(`${sec}\t${line}`);

  /* ── §17 광고 말투와 재지 않은 단정 ── */
  for (const d of docs) {
    for (const where of ["web", "pdf"] as const) {
      const t = where === "web" ? d.web : d.pdf.join("\n");
      for (const c of CLAIM) {
        for (const s of sentences(t)) {
          const m = c.bad.exec(s);
          if (!m) continue;
          if (c.negOk && NEG.test(s)) continue;
          say("§17", `${d.core} ${d.person} ${where} — ${m[0]} · ${s.slice(0, 60)}`);
          break;
        }
      }
    }
  }

  /* ── §8 첫 화면 네 칸 ── */
  for (const d of docs) {
    const head = d.web.split("자세한 내용")[0] ?? "";
    const want = ["지금 확인된 것", "산업·직무 연결"];
    for (const w of want) {
      if (!head.includes(w)) say("§8", `${d.core} ${d.person} — 첫 화면에 \`${w}\` 가 없다`);
    }
    /* 할 일 칸의 제목 여섯 가운데 하나는 서야 한다 */
    const move = ["지금 할 일", "가장 먼저 채울 것", "지금 해볼 것", "정리할 것",
      "먼저 정할 것", "다음에 할 일"].some((x) => head.includes(x));
    if (!move) say("§8", `${d.core} ${d.person} — 첫 화면에 할 일 칸이 없다`);
    if (/적을 자리가 없습니다|적지 못했습니다/.test(head)) {
      say("§8", `${d.core} ${d.person} — 첫 화면의 칸이 비었다`);
    }
    if (head.replace(/\s/g, "").length > 700) {
      say("§8", `${d.core} ${d.person} — 첫 화면 글자가 ${head.replace(/\s/g, "").length}자다`);
    }
  }

  /* ── §10 되풀이 ── */
  for (const d of docs) {
    for (const where of ["web", "pdf"] as const) {
      const t = where === "web" ? d.web : d.pdf.join("\n");
      const ss = prose(t);
      const n = new Map<string, number>();
      for (const s of ss) n.set(s, (n.get(s) ?? 0) + 1);
      /**
       * **두 번까지는 보고고 세 번부터 걸림이다.**
       *
       * 결과지에는 한 문장이 두 자리에 서는 것이 설계인 자리가 있다:
       * 그것을 설명하는 본문 절과, 사람이 담아 가는 `다음에 할 일` 목록이다.
       * 둘 가운데 하나를 지우면 **절이 약속한 것을 지키지 않거나**(비어
       * 있는 자리만 적고 할 일을 적지 않는다) **담아 갈 목록이 없어진다.**
       * 세 번째부터는 그런 까닭이 없다: 산업 절과 직무 절이 같은 줄로 닫던
       * 자리가 그랬다.
       */
      for (const [s, k] of n) {
        const line = `${d.core} ${d.person} ${where} — 같은 문장 ${k}번 · ${s.slice(0, 50)}`;
        if (k >= 3) say("§10", line);
        else if (k === 2) note("§10", line);
      }
      /* 전공 이름만 바꾼 틀. 영역 이름을 지우고 같은 틀을 센다 */
      const names = (coreFile<{ domains: { name: string }[] }>(d.core, "domains")
        .domains ?? []).map((x) => x.name);
      const tmpl = new Map<string, number>();
      for (const s of ss) {
        let k = s;
        for (const nm of names) k = k.split(nm).join("<영역>");
        if (!k.includes("<영역>")) continue;
        tmpl.set(k, (tmpl.get(k) ?? 0) + 1);
      }
      for (const [k, c] of tmpl) {
        if (c >= 3) say("§10", `${d.core} ${d.person} ${where} — 영역만 바뀐 틀 ${c}번 · ${k.slice(0, 50)}`);
      }
      for (const w of ["적지 않으셨습니다", "확인되었습니다", "확인됐습니다"]) {
        const c = t.split(w).length - 1;
        if (c >= 3) say("§10", `${d.core} ${d.person} ${where} — \`${w}\` ${c}번`);
      }
    }
  }

  /* ── §11 종이 첫 쪽 ── */
  for (const d of docs) {
    if (!d.pdf.length || !d.pdf[0]) { say("§11", `${d.core} ${d.person} — 종이가 없다`); continue; }
    const p1 = d.pdf[0];
    /* **학교 자리가 없는 Core 는 학교와 학과를 적지 않는 것이 맞다.**
       개인 B2C 응시라 적을 학교가 없다. 세면 멀쩡한 종이가 걸린다 */
    const leaf = leafName(d.core);
    const want: [string, RegExp][] = [
      ["브랜드", /CareerMatri|커리어메트리/],
      ...(leaf ? [
        ["학교", /배재/] as [string, RegExp],
        /* 학과 이름을 글자로 적지 않는다. `유아교육과` 처럼 `학과` 가
           들어 있지 않은 이름이 있어서, 그 목록을 등록부에서 읽는다 */
        ["학과", new RegExp(leaf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))] as [string, RegExp],
      ] : []),
      ["응답일", /\d{4}-\d{2}-\d{2}/],
      ["지금 확인된 것", /확인된/],
      ["먼저 할 일", /할 일|해볼|채울/],
    ];
    for (const [name, re] of want) {
      if (!re.test(p1)) say("§11", `${d.core} ${d.person} — 첫 쪽에 ${name} 이 없다`);
    }
  }

  /* ── §12 본문 차례 ── */
  for (const d of docs) {
    /* **첫 쪽의 요약 칸을 본문 차례로 세지 않는다.** 요약은 네 칸을
       한 줄에 놓는 자리라 `비어 있는 것` 이 거기 서는 것이 맞다. 세는
       것은 본문 절의 머리뿐이다 */
    const t = d.pdf.join("\n");
    /* **절 머리는 줄 하나다.** 글 가운데 적힌 `아래 ‘다음에 할 일’부터
       보세요` 를 절 머리로 읽으면 차례가 뒤집힌 것으로 보인다 */
    const at = (needle: string) => {
      const m = new RegExp(`^\\s*${needle}\\s*$`, "m").exec(t);
      return m ? (m.index as number) : -1;
    };
    const order: [string, string][] = [
      ["먼저 볼 영역", "지금 확인된 것"],
      ["지원서에 연결할 수 있는 경험", "실제로 해 본 일"],
      ["앞으로 채울 것", "아직 모자란 근거"],
      ["다음에 할 일", "다음 행동"],
      ["결과 읽는 기준", "읽는 기준과 주의"],
    ];
    const seen = order.map(([h, label]) => ({ h, label, at: at(h) })).filter((x) => x.at >= 0);
    for (let i = 1; i < seen.length; i += 1) {
      if (seen[i].at < seen[i - 1].at) {
        say("§12", `${d.core} ${d.person} — ${seen[i].label} 이 ${seen[i - 1].label} 보다 먼저 선다`);
      }
    }
  }

  /* ── §13 쪽 채움 ── */
  for (const d of docs) {
    if (!d.fill.length) continue;
    const last = d.fill[d.fill.length - 1];
    d.fill.forEach((f, i) => {
      const isLast = i === d.fill.length - 1;
      if (f < 20) say("§13", `${d.core} ${d.person} — ${i + 1}쪽이 ${f}%만 찼다`);
      else if (!isLast && f < 30) say("§13", `${d.core} ${d.person} — ${i + 1}쪽이 ${f}%만 찼다`);
    });
    /**
     * **마지막 쪽은 목표와 하한을 가른다**(저장소가 전부터 쓰던 선).
     *
     * 본문 쪽이 92~100% 로 차 있는 문서에서 마지막 쪽에 남는 것은
     * **나머지**다. 그 양은 문서 길이가 쪽 경계에 어디쯤 떨어지는가로
     * 정해지고, 공통 규칙으로는 고를 수 없다(이 회차에 변형 셋을 더
     * 재어 봤고 전부 다른 자리를 깨뜨렸다). 45% 를 걸림으로 두면 영원히
     * 빨간 줄이 남아 그 다음부터 아무도 이 검사를 보지 않는다. 그래서
     * 목표는 보고로 적고, **20% 아래만 걸림**이다: 그 아래는 받은 사람에게
     * 덜 만든 종이로 읽힌다.
     */
    if (d.fill.length > 1 && last < 20) {
      say("§13", `${d.core} ${d.person} — 마지막 쪽이 ${last}%만 찼다 (하한 20%)`);
    } else if (d.fill.length > 1 && last < 45) {
      note("§13", `${d.core} ${d.person} — 마지막 쪽이 ${last}%만 찼다 (목표 45%)`);
    }
    /* 제목만 남고 내용이 다음 쪽으로 넘어간 자리 */
    d.pdf.forEach((t, i) => {
      const lines = t.split("\n").map((x) => x.trim()).filter(Boolean);
      const tail = lines.slice(-1)[0] ?? "";
      if (tail && tail.length <= 14 && /것|영역|연결|근거|경험|자리$/.test(tail)
        && i < d.pdf.length - 1) {
        say("§13", `${d.core} ${d.person} — ${i + 1}쪽 끝에 제목만 남았다 · ${tail}`);
      }
      if (/선택 없음|해당 없음\s*$/.test(t)) {
        say("§13", `${d.core} ${d.person} — ${i + 1}쪽에 빈 표가 있다`);
      }
    });
  }

  /* ── §16 Core 사이 차별성 ── */
  /**
   * **그 Core 가 쓰는 말.** 영역과 산출물과 검증 대상과 팩 이름과 문항
   * 문면 전부에서 읽는다.
   *
   * 전에는 영역 파일만 읽어서 `반도체` 가 EE 전용으로 보였다. 기계공학
   * 에도 반도체 산업팩이 있으므로 그것은 **남의 말이 아니다.** 그리고
   * 낱말을 토막내지 않는다: `읽는` 과 `보는` 과 `남은` 같은 활용형이
   * 어느 Core 의 산출물 목록에 한 번 들어 있었다는 까닭으로 남의 말이
   * 되면, 이 검사는 거짓 경보만 쏟아 낸다.
   */
  const vocab = new Map<string, Set<string>>();
  for (const core of CORES) {
    const s = new Set<string>();
    const add = (w: string) => {
      for (const t of w.split(/[^가-힣]+/)) if (t.length >= 3) s.add(bare(t));
    };
    const dom = coreFile<{ domains: { name: string; artifacts?: string[];
      verify_targets?: string[] }[] }>(core, "domains");
    for (const d of dom.domains ?? []) {
      for (const w of [d.name, ...(d.artifacts ?? []), ...(d.verify_targets ?? [])]) add(w);
    }
    /* 팩 이름은 `industryChoices` 가 고른 이름을 쓴다. 팩 파일마다 이름
       칸이 달라서 날것으로 읽으면 어떤 Core 의 팩 이름이 통째로 빠진다 */
    for (const x of [...industryChoices(core), ...roleChoices(core)]) add(x.name);
    try {
      const bank = coreFile<{ items: { wording: string | null }[] }>(core, "items");
      for (const it of bank.items ?? []) if (it.wording) add(it.wording);
    } catch { /* 은행이 아직 없는 Core */ }
    vocab.set(core, s);
  }
  /**
   * **임자 말만 임자를 가린다.**
   *
   * 누가 그 말의 주인인가는 영역 이름과 산출물과 검증 대상과 팩 이름에서만
   * 읽는다. 문항 문면까지 임자로 세면 `생기지` 와 `좁히지` 같은 활용형이
   * 한 Core 전용이 되어, 어느 결과지에서나 남의 말이 샌 것으로 보인다.
   * 문면은 **그 Core 가 쓰는 말**(위 `vocab`)로만 쓰고, 여기서는 쓰지 않는다.
   */
  const terms = new Map<string, Set<string>>();
  for (const core of CORES) {
    const s = new Set<string>();
    const add = (w: string) => {
      for (const t of w.split(/[^가-힣]+/)) {
        /* 활용형은 임자 말이 아니다 */
        if (t.length >= 3 && !/(지|고|서|며|자|야|데|면|나|의)$/.test(t)) s.add(bare(t));
      }
    };
    const dom = coreFile<{ domains: { name: string; artifacts?: string[];
      verify_targets?: string[] }[] }>(core, "domains");
    for (const d of dom.domains ?? []) {
      for (const w of [d.name, ...(d.artifacts ?? []), ...(d.verify_targets ?? [])]) add(w);
    }
    for (const x of [...industryChoices(core), ...roleChoices(core)]) add(x.name);
    terms.set(core, s);
  }
  const owner = new Map<string, Set<string>>();
  for (const [core, s] of terms) {
    for (const w of s) owner.set(w, new Set([...(owner.get(w) ?? []), core]));
  }
  /**
   * **여러 Core 의 결과지에 다 서는 말은 남의 말이 아니다.**
   *
   * `산출물` 과 `결과물` 은 축 이름과 공통 문장이 쓰는 말인데, 어느 Core 의
   * 산출물 목록에 그 낱말이 한 번 들어 있으면 임자가 하나로 세어진다. 그
   * 상태로는 **모든 Core 의 결과지가 남의 말을 쓴 것으로** 걸린다. 그래서
   * 세 Core 이상의 결과지에 서는 말은 공통 어휘로 본다.
   */
  const spread = new Map<string, Set<string>>();
  for (const d of docs) {
    for (const w of new Set((d.web.match(/[가-힣]{3,}/g) ?? []).map(bare))) {
      spread.set(w, new Set([...(spread.get(w) ?? []), d.core]));
    }
  }
  for (const d of docs) {
    const mine = vocab.get(d.core) ?? new Set();
    const leak = new Set<string>();
    for (const w0 of d.web.match(/[가-힣]{3,}/g) ?? []) {
      const w = bare(w0);
      const own = owner.get(w);
      if (!own || own.size !== 1 || own.has(d.core) || mine.has(w)) continue;
      if ((spread.get(w)?.size ?? 0) >= 3) continue;
      leak.add(`${w}(${[...own][0].replace(/_CORE_V\d/, "")})`);
    }
    if (leak.size) {
      note("§16", `${d.core} ${d.person} — 남의 Core 말 후보 ${[...leak].slice(0, 6).join(" ")}`);
    }
  }
  /**
   * **전공명만 바꾼 결과인가.**
   *
   * 쪽의 글자를 통째로 견주면 안 된다. 결과지의 절 제목과 안내문과 읽는
   * 기준은 **스무 Core 가 같이 쓰는 틀**이고, 경험이 없는 응시자의 결과는
   * 그 틀이 글자 수의 대부분이다. 그 상태로 재면 어느 두 Core 든 0.9 가
   * 나오고, 그것은 제품이 아니라 자의 탈이다.
   *
   * 그래서 **열다섯 Core 이상에 같이 서는 줄은 틀로 보고 걷어 낸다.**
   * 남는 것이 그 전공의 내용이다. 영역 이름도 지운다: §16 이 묻는 것은
   * 이름을 바꾼 것 말고 무엇이 다른가이기 때문이다.
   */
  const chrome = new Map<string, number>();
  for (const d of docs) {
    for (const l of new Set(sentences(d.web))) chrome.set(l, (chrome.get(l) ?? 0) + 1);
  }
  const FRAME = Math.ceil(CORES.length * 0.75);
  const flat = (core: string, t: string) => {
    const names = (coreFile<{ domains: { name: string }[] }>(core, "domains").domains ?? [])
      .map((x) => x.name);
    const body = sentences(t).filter((l) => (chrome.get(l) ?? 0) < FRAME);
    let k = body.join("\n");
    for (const nm of names) k = k.split(nm).join("<영역>");
    return new Set((k.match(/[가-힣]{3,}/g) ?? []).map(bare));
  };
  const sets = new Map(docs.map((d) => [`${d.core}-${d.person}`, flat(d.core, d.web)]));
  let top = { jac: 0, pair: "" };
  for (const p of PEOPLE) {
    const list = docs.filter((d) => d.person === p);
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = sets.get(`${list[i].core}-${p}`) as Set<string>;
        const b = sets.get(`${list[j].core}-${p}`) as Set<string>;
        if (!a.size || !b.size) continue;
        const inter = [...a].filter((x) => b.has(x)).length;
        const jac = inter / (a.size + b.size - inter);
        if (jac > top.jac) top = { jac, pair: `${list[i].core} · ${list[j].core} ${p}` };
        if (jac > 0.75) {
          say("§16", `${list[i].core} · ${list[j].core} ${p} — 결과 글자 겹침 ${jac.toFixed(2)}`);
        }
      }
    }
  }

  const bySec = new Map<string, string[]>();
  for (const line of out) {
    const [sec, rest] = line.split("\t");
    bySec.set(sec, [...(bySec.get(sec) ?? []), rest]);
  }
  console.log(`상용 콘텐츠 감사 — ${DIR} · 결과지 ${docs.length}벌`);
  for (const sec of ["§8", "§10", "§11", "§12", "§13", "§16", "§17"]) {
    const list = bySec.get(sec) ?? [];
    console.log(`\n  ${sec} — ${list.length}`);
    for (const l of list.slice(0, 10)) console.log(`    ${l}`);
    if (list.length > 10) console.log(`    … 그 밖에 ${list.length - 10}가지`);
  }
  writeFileSync(`${DIR}/audit.txt`, `${out.join("\n")}\n`);
  /**
   * **보고는 걸림과 따로 적는다.** 모아 두고 내놓지 않으면 아무도 읽지
   * 않고, 걸림에 섞으면 고치는 쪽이 걸림을 한도로 읽는다. §10 의 2번
   * 되풀이와 §13 의 마지막 쪽 목표(45%)가 여기로 온다.
   */
  {
    const byNote = new Map<string, string[]>();
    for (const line of notes) {
      const [sec, rest] = line.split("\t");
      byNote.set(sec, [...(byNote.get(sec) ?? []), rest]);
    }
    if (notes.length) {
      console.log(`\n  보고 ${notes.length} (걸림이 아니다)`);
      for (const sec of ["§10", "§13", "§16"]) {
        const list = byNote.get(sec) ?? [];
        if (!list.length) continue;
        console.log(`    ${sec} — ${list.length}`);
        for (const l of list.slice(0, 5)) console.log(`      ${l}`);
        if (list.length > 5) console.log(`      … 그 밖에 ${list.length - 5}가지`);
      }
      writeFileSync(`${DIR}/notes.txt`, `${notes.join("\n")}\n`);
    }
  }
  {
    /* **본문 쪽이 얼마나 차 있는가.** 마지막 쪽의 수를 읽을 때 같이 봐야
       하는 값이다: 본문이 92% 이상 차 있으면 마지막 쪽에 남는 것은 나머지다 */
    const body = docs.flatMap((d) => d.fill.slice(0, -1));
    const lo = Math.min(...body), hi = Math.max(...body);
    const avg = Math.round(body.reduce((a, b) => a + b, 0) / (body.length || 1));
    console.log(`\n  §13 본문 쪽 채움 — ${body.length}쪽 · ${lo}~${hi}% · 평균 ${avg}%`);
  }
  console.log(`\n  §16 가장 많이 겹친 짝 — ${top.pair} ${top.jac.toFixed(2)} (한도 0.75)`);
  console.log(`\n걸림 ${out.length} · ${DIR}/audit.txt`);
  if (out.length) process.exitCode = 1;
}

main();
