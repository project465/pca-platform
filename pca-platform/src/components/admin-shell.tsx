/**
 * 운영 화면의 껍데기.
 *
 * **세 제품 화면이 같은 껍데기를 쓴다**(`src/components/sf/shell.tsx`).
 * 예전에는 `/admin` 만 그 왼쪽 띠를 쓰고 나머지 열 쪽이 여기 있던 위쪽
 * 띠를 썼다. 메뉴가 열다섯 줄로 늘면서 그 띠가 두 줄로 접혔고, 지금
 * 어디인지가 접힌 줄 아래로 밀려 내려갔다. **쪽마다 메뉴가 다르게
 * 보이면 운영자는 쪽마다 길을 다시 찾는다.**
 *
 * 그래서 이 파일은 더 이상 메뉴를 들지 않는다. 목록은
 * `NAV_ADMIN` 한 곳이고, 여기 남은 일은 옛 호출부(`user` · `current`)를
 * 그 껍데기에 넘기는 것뿐이다. 쪽 열 개를 한꺼번에 고치지 않으려고
 * 이름과 인자를 그대로 뒀다.
 *
 * 메뉴를 숨기는 것은 안내이고 막는 것은 서버다: 여기 없는 주소도 손으로
 * 치면 각 쪽의 `requireRole()` 이 다시 본다.
 */
import { ROLE_LABEL } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";
import { BRAND } from "@/lib/surface-text";
import { Shell } from "@/components/sf/shell";
import { NAV_ADMIN } from "@/components/sf/nav";

export default function AdminShell({
  user,
  current,
  children,
}: {
  user: SessionUser;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <Shell
      surface="admin"
      /* 운영 화면은 한국어로 돈다. 쪽마다 `?lang=` 을 받지 않으므로
         껍데기가 언어를 지어내지 않고 기본값을 쓴다 */
      lang="ko"
      nav={NAV_ADMIN}
      active={current}
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={BRAND.admin}
    >
      {children}
    </Shell>
  );
}
