/**
 * 런칭 준비 상태.
 *
 * `commercial.ts` 가 "팔 수 있는 상태인가" 를 보는 자리였고, 여기는
 * **"오늘 켤 수 있는가"** 를 본다. 둘을 가른 까닭은 묻는 것이 다르기
 * 때문이다: 가격과 약관은 상용화 준비이고, 백업과 복구 시험과 지원
 * 경로는 **켠 다음 날**에 필요한 것이다.
 *
 * **세 상태로만 말한다**(규격 §25).
 *
 *   READY     지금 켤 수 있다
 *   WARNING   켤 수는 있는데 켜고 나서 물어볼 사람이 생긴다
 *   BLOCKED   켜면 사고가 난다
 *
 * **시장마다 따로 본다.** 한국은 켤 수 있고 글로벌은 아닌 상태가 정상인
 * 순서다(규격 §1). 한 줄로 합치면 한국 런칭이 글로벌 블로커에 막힌다.
 *
 * **한 구현을 두 곳이 읽는다**: `/admin/launch` 와 `npm run launch:check`
 * 가 같은 함수를 부른다(`commercial.ts` 와 같은 규칙).
 */
import { query, queryOne } from "./db";
import { priceState } from "./catalog";
import { marketReadiness } from "./payments";
import { mailReady } from "./outbox";
import { supportConfig } from "./support";
import { businessInfo } from "./business";
import { localizationReport } from "./localization";
import { tiersDistinct } from "./tiers";

export type Status = "READY" | "WARNING" | "BLOCKED";

export type LaunchRow = {
  key: string;
  label: string;
  status: Status;
  /** 왜 그 상태인가. 실행할 수 있는 말로 적는다 */
  detail: string;
  /** 우리가 못 끝내는 것이면 누가 정하는가. 끝낼 수 있으면 null */
  who: string | null;
};

export type MarketLaunch = {
  market: "KR" | "GLOBAL";
  domain: string | null;
  rows: LaunchRow[];
  status: Status;
};

export type LaunchReport = {
  markets: MarketLaunch[];
  /** 가장 나쁜 상태. 한 시장이라도 켤 수 있으면 그 시장이 답이다 */
  anyReady: boolean;
  checkedAt: string;
};

const worst = (xs: Status[]): Status =>
  xs.includes("BLOCKED") ? "BLOCKED" : xs.includes("WARNING") ? "WARNING" : "READY";

const row = (
  key: string, label: string, status: Status, detail: string, who: string | null = null,
): LaunchRow => ({ key, label, status, detail, who });

/** 복구 시험을 한 날. **백업은 복구해 보기 전까지 완료가 아니다**(규격 §13) */
function backupRow(): LaunchRow {
  const at = (process.env.DB_BACKUP_VERIFIED_AT ?? "").trim();
  if (!at) {
    return row("backup", "DB 백업", "BLOCKED",
      "복구 시험을 한 기록이 없습니다. `deploy/backup.sh` 로 받고 " +
      "`docs/metri/44_production_infra.md` 의 복구 절차를 한 번 돌린 뒤 " +
      "DB_BACKUP_VERIFIED_AT 에 그 날짜를 적습니다.",
      "운영 담당");
  }
  const days = (Date.now() - new Date(at).getTime()) / 86_400_000;
  if (!Number.isFinite(days)) {
    return row("backup", "DB 백업", "BLOCKED",
      `DB_BACKUP_VERIFIED_AT 을 날짜로 읽을 수 없습니다 (${at}).`, "운영 담당");
  }
  /* **묶어 두고 잊는 것을 막는다.** 복구는 한 번 해 보고 끝나는 일이
     아니고, 스키마가 바뀌면 복구 절차도 같이 바뀐다 */
  if (days > 90) {
    return row("backup", "DB 백업", "WARNING",
      `복구 시험이 ${Math.round(days)}일 전입니다. 90일 안에 다시 해 봅니다.`);
  }
  return row("backup", "DB 백업", "READY",
    `복구 시험 ${at.slice(0, 10)}. 일일 백업은 ${process.env.DB_BACKUP_CRON ?? "설정된 일정"}.`);
}

export async function launchReport(): Promise<LaunchReport> {
  const sites = await query<{ site_id: string; domain: string; payment_market: string }>(
    `SELECT site_id, domain, payment_market FROM site_configs WHERE active`,
  ).catch(() => []);

  const products = await query<{
    code: string; market: string | null; tier: string | null;
    amount: number; price_status: string; active: boolean;
  }>(
    `SELECT code, market, tier, amount, price_status, active
       FROM products WHERE assessment_version = 'ME_V2'`,
  ).catch(() => []);

  const consent = await query<{ kind: string; locale: string; translation_status: string }>(
    `SELECT kind, locale, translation_status FROM consent_documents
      WHERE retired_at IS NULL AND required`,
  ).catch(() => []);

  /* 결과지와 PDF 가 **실제로 나간 적이 있는가.** 코드가 있다는 것과 돈
     낸 사람 손에 들어간 적이 있다는 것은 다르다 */
  const made = await queryOne<{ snaps: number; pdfs: number }>(
    `SELECT count(*)::int AS snaps,
            count(*) FILTER (WHERE pdf_path IS NOT NULL)::int AS pdfs
       FROM report_snapshots`,
  ).catch(() => null);

  const fails = await query<{ kind: string; n: number }>(
    `SELECT kind, count(*)::int AS n FROM job_failures
      WHERE resolved_at IS NULL GROUP BY kind`,
  ).catch(() => []);
  const failOf = (k: string) => fails.find((f) => f.kind === k)?.n ?? 0;

  const pilots = await queryOne<{ n: number }>(
    `SELECT count(DISTINCT attempt_id)::int AS n FROM pilot_feedback`,
  ).catch(() => null);

  const loc = localizationReport();
  const biz = businessInfo();
  const sup = supportConfig();
  const backup = backupRow();
  const mail = mailReady();
  const mailFrom = (process.env.MAIL_FROM ?? "").trim();

  const markets = (["KR", "GLOBAL"] as const).map((market): MarketLaunch => {
    const site = sites.find((s) => s.payment_market === market) ?? null;
    const mine = products.filter((p) => p.market === market);
    const approved = mine.filter(
      (p) => priceState({ amount: p.amount, price_status: p.price_status as never })
        === "PRICE_APPROVED",
    );
    const pay = marketReadiness(market);
    const locale = market === "KR" ? "ko" : "en";
    const docs = consent.filter((c) => c.locale === locale);
    const pending = docs.filter((c) => c.translation_status === "pending");
    const rows: LaunchRow[] = [];

    rows.push(row("market", "시장", "READY",
      market === "KR" ? "한국 B2C 를 먼저 켭니다." : "글로벌 영어는 한국 다음입니다."));

    rows.push(site
      ? row("domain", "도메인", "BLOCKED",
        `${site.domain} 를 아직 사지 않았습니다. HTTPS·정규 주소·리다이렉트는 ` +
        `도메인이 생긴 뒤에 확인합니다.`, "도메인 구매")
      : row("domain", "도메인", "BLOCKED",
        `${market} 시장의 사이트 설정이 없습니다.`, "운영 담당"));

    rows.push(approved.length
      ? row("price", "가격", "READY", `${approved.length}개 등급의 값이 승인됐습니다.`)
      : row("price", "가격", "BLOCKED",
        `${mine.length}개 등급의 값이 승인되지 않았습니다. 0원으로 팔지 않습니다.`,
        "사업 결정"));

    /* **가짜 결제를 READY 로 적지 않는다.** `marketReadiness` 는 개발에서
       mock 을 열어 둔다(흐름을 끝까지 돌려 봐야 하므로 그게 맞다). 그런데
       이 화면이 묻는 것은 "오늘 켤 수 있는가" 이고, 가짜로는 못 켠다.
       READY 로 찍히면 아침에 보는 사람이 그 줄을 넘긴다 */
    rows.push(pay.provider === "mock"
      ? row("payment", "결제", "BLOCKED",
        "가짜 결제입니다. 운영에서는 서버가 뜨지 않습니다. 심사가 끝나면 " +
        "LAUNCH.md 의 다섯 줄을 .env 에 넣습니다.", "결제 대행사·심사")
      : pay.ready
        ? row("payment", "결제", "READY", `${pay.provider} 로 받습니다.`)
        : row("payment", "결제", "BLOCKED", pay.blocker ?? "결제를 받을 수 없습니다.",
          "결제 대행사·심사"));

    /* 보내는 주소가 우리 도메인인가(규격 §14). 다른 도메인에서 나가면
       스팸으로 떨어지고, 떨어진 메일은 아무도 못 센다 */
    const fromDomain = mailFrom.split("@")[1] ?? "";
    const siteDomain = site?.domain ?? "";
    rows.push(!mail
      ? row("email", "거래 메일", "BLOCKED",
        "MAIL_HOST · MAIL_FROM 이 비어 있어 한 통도 나가지 않습니다.", "운영 담당")
      : fromDomain && siteDomain && !siteDomain.endsWith(fromDomain)
        ? row("email", "거래 메일", "WARNING",
          `보내는 주소가 ${mailFrom} 인데 사이트는 ${siteDomain} 입니다. ` +
          `다른 도메인에서 나가면 스팸으로 떨어집니다.`)
        : row("email", "거래 메일", "READY", `${mailFrom} 로 나갑니다.`));

    rows.push(!biz.complete
      ? row("legal", "법적 표시", "BLOCKED",
        `전자상거래법 제10조 표시가 ${biz.missing.length}칸 비어 있습니다 ` +
        `(${biz.missing.join(" · ")}). 지어내지 않았습니다.`, "사업자 등록")
      : pending.length
        ? row("legal", "법적 표시", "BLOCKED",
          `${locale} 약관 ${pending.length}개의 본문이 없습니다. 기계로 번역해 ` +
          `두지 않았습니다.`, "법률 검토·번역")
        : row("legal", "법적 표시", "READY",
          `사업자 표시 일곱 칸과 필수 동의 ${docs.length}개가 있습니다.`));

    /* 지역화는 글로벌에서만 런칭을 막는다. 한국판은 사전을 거치지 않고
       그대로 나가므로 영어 공백이 한국 런칭을 막을 일이 없다 */
    rows.push(market === "KR"
      ? row("localization", "지역화", "READY", "한국어는 사전을 거치지 않습니다.")
      : loc.ok
        ? row("localization", "지역화", "READY",
          `사전 ${loc.dictEntries.toLocaleString()}가지 · 어휘 ` +
          `${loc.glossaryTerms.toLocaleString()}가지가 다 덮였습니다.`)
        : row("localization", "지역화", "BLOCKED",
          "영어가 비어 있는 자리가 있습니다. `npm run i18n:coverage` 를 봅니다.",
          null));

    rows.push(backup);

    rows.push(failOf("result") > 0
      ? row("engine", "결과지 엔진", "WARNING",
        `결과지 만들기가 ${failOf("result")}번 막혀 있습니다. /admin/incidents 를 봅니다.`)
      : (made?.snaps ?? 0) > 0
        ? row("engine", "결과지 엔진", "READY", `결과지 ${made!.snaps}장이 나갔습니다.`)
        : row("engine", "결과지 엔진", "WARNING",
          "아직 한 장도 나간 적이 없습니다. 연막 시험을 한 번 돌립니다."));

    rows.push(failOf("pdf") > 0
      ? row("pdf", "PDF", "WARNING",
        `PDF 만들기가 ${failOf("pdf")}번 막혀 있습니다. 웹 결과지는 그대로 열립니다.`)
      : (made?.pdfs ?? 0) > 0
        ? row("pdf", "PDF", "READY", `PDF ${made!.pdfs}장이 나갔습니다.`)
        : row("pdf", "PDF", "WARNING", "아직 한 장도 나간 적이 없습니다."));

    rows.push(sup.ready
      ? row("support", "지원 경로", "READY", `${sup.email} 로 받습니다.`)
      : row("support", "지원 경로", "BLOCKED",
        sup.blocker ?? "지원 주소가 없습니다.", "사업 결정"));

    /* 파일럿은 켜는 것을 막지 않는다. 다만 20명을 보기 전에 광고를
       돌리지 않는다(규격 §27 마지막 줄) */
    const n = pilots?.n ?? 0;
    rows.push(n >= 20
      ? row("pilot", "파일럿", "READY", `${n}명이 끝까지 돌았습니다.`)
      : row("pilot", "파일럿", "WARNING",
        `${n}명입니다. 스물 명을 보기 전에 유료 광고를 돌리지 않습니다.`));

    /* 등급이 서로 구별되는가(규격 §24). 이것이 흐려지면 가격표를 다시
       써야 하고, 그것은 코드가 아니라 원고 일이다 */
    const d = tiersDistinct(locale === "en" ? "en" : "ko");
    rows.push(d.ok
      ? row("tiers", "등급 구별", "READY", "세 등급이 받는 것으로 갈립니다.")
      : row("tiers", "등급 구별", "WARNING", d.why.join(" ")));

    return {
      market, domain: site?.domain ?? null, rows,
      status: worst(rows.map((r) => r.status)),
    };
  });

  return {
    markets,
    anyReady: markets.some((m) => m.status !== "BLOCKED"),
    checkedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
  };
}
