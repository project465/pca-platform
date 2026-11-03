/**
 * **운영자용: 실제 사이트를 한 번 읽어 파서가 무엇을 뽑는지 본다.** DB 에 쓰지 않는다.
 *
 *   npm run jobs:probe                 게시판마다 목록 첫 쪽 + 상세 하나, 커리어피크 캘린더 JSON
 *   JOBS_PROBE_WALK=1 npm run jobs:probe   게시판마다 끝 쪽까지 넘겨 카드 수를 센다(487 은 12쪽쯤)
 *
 * 이 저장소의 시험(`jobindustry:feed`)은 2026-11-03 시험 세션이 브라우저로 본 꼴을 흉내 낸 HTML 로 돈다.
 * 개발 컨테이너에서는 잡인더스트리 · 커리어피크 · github.io 가 막혀 있어 실제 화면에 대 본 적이 없다.
 * 사이트에 닿는 곳(운영 컨테이너 Shell · 대표님 PC)에서 이것을 돌려, 칸마다 빈 값이 많거나 틀린 값이
 * 보이면 `src/lib/jobs/jobindustry-parse.ts` · `meta.ts` · `careerpeak.ts` 를 고친다.
 * 부를 때마다 0.8초 쉰다(우리 사이트지만 손님이 보는 사이트다).
 */
import { JI_BOARDS, listCards } from "../src/lib/jobs/jobindustry-parse";
import { get as jiGet, jiBase, jiRow } from "../src/lib/jobs/jobindustry";
import { listUrl, viewUrl } from "../src/lib/jobs/imweb";
import { get as cpGet, cpRows, cpUrl, parseCalendar } from "../src/lib/jobs/careerpeak";
import { isoDate } from "../src/lib/jobs/ingest";
import { isClosed } from "../src/lib/jobs/meta";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const WALK = process.env.JOBS_PROBE_WALK === "1";
const show = (o: Record<string, unknown>) => {
  for (const [k, v] of Object.entries(o)) console.log(`    ${k.padEnd(14)} ${v === null || v === undefined || v === "" ? "(비어 있음)" : typeof v === "object" ? JSON.stringify(v) : String(v)}`);
};

async function board(b: (typeof JI_BOARDS)[number]): Promise<void> {
  const base = jiBase();
  console.log(`\n■ ${b.path} (${b.label} · ${b.kind})`);
  let html: string;
  try { html = await jiGet(listUrl(base, b.path, 1)); } catch (e) { console.log(`  목록을 못 읽음: ${(e as Error).message}`); return; }
  const cards = listCards(html, b.path);
  console.log(`  첫 쪽 카드 ${cards.length}개 (공지 ${cards.filter((c) => c.notice).length}) · post_link_wrap ${/post_link_wrap/.test(html) ? "있음" : "없음"}`);
  for (const c of cards.slice(0, 3)) console.log(`    #${c.idx} ${c.notice ? "[공지] " : ""}${c.title || "(제목 없음)"} ${c.tags.length ? `{${c.tags.join(" | ")}}` : ""}`);
  if (WALK) {
    let prev = cards.map((c) => c.idx), total = cards.length, p = 2;
    for (; p <= 60; p += 1) {
      await sleep(800);
      const ids = listCards(await jiGet(listUrl(base, b.path, p)).catch(() => ""), b.path).map((c) => c.idx);
      if (!ids.length || ids.every((x) => prev.includes(x))) break;
      total += ids.length; prev = ids;
    }
    console.log(`  끝까지: ${p - 1}쪽 · 카드 ${total}개`);
  }
  const pick = cards.find((c) => !c.notice);
  if (!pick) return;
  await sleep(800);
  try {
    const r = jiRow(b, pick.idx, await jiGet(viewUrl(base, b.path, pick.idx)), pick);
    const closes = isoDate(r.closesOn);
    console.log(`  상세 #${pick.idx}`);
    show({
      title: r.title, category: r.meta?.category, field: r.meta?.field, degree_label: r.meta?.degreeLabel,
      degree_min: r.meta?.degreeMin, closes: closes ? `${closes}${isClosed(closes) ? " (지남 → 담지 않음)" : ""}` : "(날짜 없음 · 상시)",
      region: r.meta?.regionLabel ? `${r.meta.regionLabel}${r.meta.abroad ? " (해외)" : ""}` : null, kind: r.meta?.kind,
      employment: r.meta?.employmentType, fields: r.meta?.fields, body_head: r.body.slice(0, 120).replace(/\n/g, " / "),
    });
  } catch (e) { console.log(`  상세를 못 읽음: ${(e as Error).message}`); }
}

async function careerpeak(): Promise<void> {
  console.log(`\n■ 커리어피크 정출연 채용 캘린더 ${cpUrl()}`);
  let text: string;
  try { text = await cpGet(cpUrl()); } catch (e) { console.log(`  못 읽음: ${(e as Error).message}`); return; }
  const cal = parseCalendar(text);
  const age = cal.updatedAt ? (Date.now() - Date.parse(cal.updatedAt)) / 3600_000 : NaN;
  console.log(`  updated_at ${cal.updatedAt ?? "(없음)"}${Number.isFinite(age) ? ` · ${age.toFixed(1)}시간 전${age > 24 ? " (하루 넘음: 운영 기록에 남긴다)" : ""}` : ""} · 공고 ${cal.items.length}건`);
  const top = Object.keys((() => { try { const j = JSON.parse(text); return Array.isArray(j) ? { "(배열)": 1 } : j; } catch { return {}; } })());
  console.log(`  맨 위 칸: ${top.join(", ")}`);
  for (const r of cpRows(cal.items).slice(0, 3)) {
    console.log(`  #${r.sourceRef}`);
    show({ title: r.title, url: r.url, start: r.postedOn, end: r.closesOn, degree_label: r.meta?.degreeLabel, degree_min: r.meta?.degreeMin,
      job_family: r.meta?.jobFamily, employment: r.meta?.employmentType, region: r.meta?.regionLabel });
  }
}

async function main(): Promise<void> {
  console.log(`잡인더스트리 ${jiBase()} · DB 에 쓰지 않는다`);
  for (const b of JI_BOARDS) { await board(b); await sleep(800); }
  await careerpeak();
}
main().catch((e) => { console.error(e); process.exit(1); });
