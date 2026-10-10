/**
 * 옛 판본 결과지의 **첫 화면에 적을 것**을 굳은 기록에서 꺼낸다.
 *
 * **여기서 아무것도 판단하지 않는다.** 꺼내는 값은 결과를 만들 때 이미
 * 굳혀 둔 `report_snapshots.payload.summary` 안에 있고(`v2-report.js` 의
 * `summary(J)` 가 그때 적은 것), 이 파일이 하는 일은 그 가운데 **세 줄을
 * 골라 글자로 돌려주는 것**뿐이다. 다시 계산하면 그때 나간 결과지와 지금
 * 화면이 다른 말을 할 수 있고, 다르다는 것을 아무도 모른다.
 *
 * **왜 첫 화면에 따로 적는가.** 옛 결과지는 A4 열 장을 넘는 문서 한 벌이고,
 * 웹에서 그것을 다 펼치면 읽는 화면이 아니라 내려받기 전의 미리보기가 된다.
 * 그래서 화면은 `무엇을 보던 결과이고 · 가장 큰 공백이 무엇이고 · 지금
 * 무엇을 하면 되는가` 까지만 들고, 전체 상세는 절마다 펼쳐서 본다.
 *
 * **태그를 지우고 글자만 쓴다.** 굳혀 둔 문장에는 `<b>` 가 들어 있다. 그
 * 조각을 화면에 HTML 로 꽂으면 저장된 값이 화면 코드가 되는 길이 생긴다.
 * 강조 하나를 잃는 것이 그 길을 여는 것보다 싸다.
 */

/** 첫 화면 세 줄. 값이 없으면 그 줄을 비운다. **지어내지 않는다** */
export type LegacyBrief = {
  /** 그날 먼저 보라고 적힌 직무. 차례가 없으면 `slot` 이 그 사실을 적는다 */
  roles: { slot: string; name: string }[];
  /** 가장 크게 비어 있던 자리 */
  gap: { family: string; label: string; why: string } | null;
  /** 그때 적힌 다음 한 걸음 */
  next: string | null;
  /** 결과지가 스스로 적어 둔 한계. 빼면 숫자가 더 센 것처럼 읽힌다 */
  note: string | null;
};

/** `<b>` 같은 조각을 걷고 글자만 남긴다 */
function plain(v: unknown): string {
  return typeof v === "string"
    ? v.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
    : "";
}

function str(o: Record<string, unknown> | null, k: string): string {
  return o ? plain(o[k]) : "";
}

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/**
 * 굳은 기록에서 첫 화면 세 줄을 꺼낸다.
 *
 * **옛 줄에 `summary` 가 없을 수 있다.** 그 칸은 나중에 담기 시작했고,
 * 그보다 전에 만든 결과지는 `result` 만 들고 있다. 없으면 `null` 을
 * 돌려주고 화면은 요약 없이 상세만 세운다: 없는 값을 `result` 에서 다시
 * 계산해 채우면 그것은 그때 나간 결과지가 적은 말이 아니다.
 */
export function legacyBrief(payload: unknown): LegacyBrief | null {
  const s = obj(obj(payload)?.summary);
  if (!s) return null;

  const roles = (Array.isArray(s.top_roles) ? s.top_roles : [])
    .map((r) => obj(r))
    .filter((r): r is Record<string, unknown> => Boolean(r))
    .map((r) => ({ slot: plain(r.slot), name: plain(r.name) }))
    .filter((r) => r.name)
    .slice(0, 3);

  const g = obj(s.critical_gap);
  const gap = g && str(g, "label")
    ? { family: str(g, "family"), label: str(g, "label"), why: str(g, "why") }
    : null;

  const next = plain(s.next_action) || null;
  const note = plain(s.confidence_note) || null;
  if (!roles.length && !gap && !next) return null;
  return { roles, gap, next, note };
}
