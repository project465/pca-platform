import Link from "next/link";
import { activeTrack } from "@/lib/track";
import { settingsOf } from "@/lib/assistant/settings";
import { UPLOAD_MONTHLY_CAP, usedThisMonth } from "@/lib/assistant/upload";
import { appUser } from "../user";
import { AppHead, Empty } from "../ui";
import { Capture } from "./capture";

export const metadata = { title: "사진으로 옮기기 · CareerMatri" };

/**
 * 수료증 · 성적증명서 · 상장을 찍어 경험 초안으로 옮긴다. 앱에서만 되는
 * 일로 내세울 자리다(스토어 심사의 `최소 기능`, `APP_OPTIONS.md` 4절).
 *
 * **읽는 일은 웹과 같은 함수다**(`uploadForDraft`). 찍은 원본은 읽은 뒤
 * 버리고 저장하지 않는다. 동의 없이 보내지 않는다.
 */
export default async function CapturePage() {
  const user = await appUser();
  const track = await activeTrack(user.id);
  if (!track.on) {
    return (
      <>
        <AppHead title="사진으로 옮기기" back="/m/experience" />
        <div className="ma-body">
          <Empty title="MAT를 쓰는 동안 열려요" cta={{ href: "/m/mat", label: "MAT 보기" }}>
            찍은 서류에서 경험으로 적을 만한 것을 골라 초안으로 옮기는 일은 MAT 이용 중에 쓸 수 있습니다.
            지금은 경험을 직접 적을 수 있어요.
          </Empty>
          <Link className="ma-btn is-block" href="/me/experience/new">직접 적기</Link>
        </div>
      </>
    );
  }
  const [settings, used] = await Promise.all([settingsOf(user.id), usedThisMonth(user.id)]);
  return (
    <>
      <AppHead title="사진으로 옮기기" back="/m/experience" />
      <div className="ma-body">
        <Capture consented={Boolean(settings.file_consent_at)}
          left={Math.max(0, UPLOAD_MONTHLY_CAP - used)} cap={UPLOAD_MONTHLY_CAP} />
      </div>
    </>
  );
}
