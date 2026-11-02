import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { settingsOf } from "@/lib/assistant/settings";
import { pendingFileDrafts, UPLOAD_MONTHLY_CAP, usedThisMonth } from "@/lib/assistant/upload";
import { MatFileDrop } from "./drop";
import { aiReady } from "@/lib/assistant/claude";
import { matMemoDraft } from "../actions";

const ERR: Record<string, string> = {
  memo: "열 자 넘게 적어 주세요. 언제 · 무엇을 · 어떻게 했는지 한두 줄이면 돼요.",
  save: "저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
};

export const generateMetadata = () => matTitle("경험 파일");

/**
 * 경험 파일 올리기 · 확인(예상 화면 8 · 9번).
 *
 * - 8번: 파일을 올리면 읽어서 경험 초안으로 옮긴다. **학생이 확인하지 않은 것은 결과지 · 지원서 · 공고 비교에
 *   들어가지 않는다**(초안 상태는 계산에 쓰지 않는다)
 * - 9번: 확인할 초안 목록. 열면 경험 적기 화면에서 칸마다 고치고 저장한다(저장하면 할 일 · 겹치는 공고가 바로 바뀐다)
 * - 새 저장 공간 · DB 변경이 없다: 원본을 두지 않는 지금 방식 그대로다
 */
export default async function MatFiles({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await requireUser();
  const e = (await searchParams).e;
  /* 서비스 쪽에서 파일 읽기가 꺼져 있으면(키가 없다) 고르는 칸 · 동의 칸을 막고 메모 칸을 먼저 세운다 */
  const ready = aiReady();
  const [set, used, pending] = await Promise.all([
    settingsOf(user.id), usedThisMonth(user.id).catch(() => 0), pendingFileDrafts(user.id).catch(() => []),
  ]);
  const memo = (
    <form action={matMemoDraft} className="mt-form" id="memo">
      <label className="mt-field">
        <span>메모로 적기</span>
        <textarea name="note" rows={5} required minLength={10} maxLength={4000}
          placeholder="예: 언제 · 어떤 수업이나 활동에서 · 내가 맡은 일 · 직접 정한 기준 · 남긴 결과물 · 전후 수치(예: 1.2초 → 0.3초)를 적어 주세요" />
      </label>
      <button type="submit" className="mt-btn is-main is-block">경험 초안 만들기</button>
      <p className="mt-note">{ready && set.ai_consent_at ? "AI 분석을 켜 두셔서 Anthropic(미국)의 Claude로 읽어요." : "이 메모는 밖으로 보내지 않고 이 서비스 안에서 옮겨요."} 확인하고 저장한 것만 기록돼요.</p>
    </form>
  );
  return (
    <main>
      <h1 className="mt-h1">경험 파일</h1>
      <p className="mt-lead">{ready ? "파일을 올리면 경험 초안으로 옮겨 드려요. 확인하고 저장한 것만 기록돼요."
        : "지금은 파일 읽기가 열리지 않았어요. 파일에 적힌 내용을 메모로 적어 주시면 경험 초안으로 옮겨 드려요."}</p>
      {e && ERR[e] ? <p className="mt-alert" role="alert">{ERR[e]}</p> : null}
      {ready ? null : memo}
      <MatFileDrop ready={ready} consented={Boolean(set.file_consent_at)} used={used} cap={UPLOAD_MONTHLY_CAP} pending={pending} />
      {ready ? <><h2 className="mt-h2">파일 대신 메모로</h2>{memo}</> : null}
    </main>
  );
}
