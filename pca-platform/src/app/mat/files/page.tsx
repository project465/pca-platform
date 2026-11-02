import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { settingsOf } from "@/lib/assistant/settings";
import { pendingFileDrafts, UPLOAD_MONTHLY_CAP, usedThisMonth } from "@/lib/assistant/upload";
import { MatFileDrop } from "./drop";

export const generateMetadata = () => matTitle("경험 파일");

/**
 * 경험 파일 올리기 · 확인(예상 화면 8 · 9번).
 *
 * - 8번: 파일을 올리면 읽어서 경험 초안으로 옮긴다. **학생이 확인하지 않은 것은 결과지 · 지원서 · 공고 비교에
 *   들어가지 않는다**(초안 상태는 계산에 쓰지 않는다)
 * - 9번: 확인할 초안 목록. 열면 경험 적기 화면에서 칸마다 고치고 저장한다(저장하면 할 일 · 겹치는 공고가 바로 바뀐다)
 * - 새 저장 공간 · DB 변경이 없다: 원본을 두지 않는 지금 방식 그대로다
 */
export default async function MatFiles() {
  const user = await requireUser();
  const [set, used, pending] = await Promise.all([
    settingsOf(user.id), usedThisMonth(user.id).catch(() => 0), pendingFileDrafts(user.id).catch(() => []),
  ]);
  return (
    <main>
      <h1 className="mt-h1">경험 파일</h1>
      <p className="mt-lead">파일을 올리면 경험 초안으로 옮겨 드려요. 확인하고 저장한 것만 기록돼요.</p>
      <MatFileDrop consented={Boolean(set.file_consent_at)} used={used} cap={UPLOAD_MONTHLY_CAP} pending={pending} />
    </main>
  );
}
