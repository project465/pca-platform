import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/sf/brand-mark";
import LogoutButton from "@/components/logout-button";
import { currentUser } from "@/lib/session";
import { campusSay, type CampusUniversity } from "@/lib/campus/registry";

/**
 * 배재대학교 전용 CareerMatri Portal 의 껍데기.
 *
 * **작업공간의 껍데기(`CmShell`)를 쓰지 않는다.** 저쪽은 로그인한 사람의
 * 메뉴 아홉 줄을 세우는데, 이 쪽을 보는 사람은 아직 로그인하지 않았을 수
 * 있다. 세우면 들어갈 수 없는 줄이 메뉴에 서고, 그것은 안내가 아니라
 * 막다른 길이다.
 *
 * **맨 위에 학교의 자리를 세운다**(규격 §3). 학교 이름이 먼저 서고 그
 * 다음이 무엇으로 보는가다: 학생이 가장 먼저 확인하는 것이 `우리 학교가
 * 맞는가` 이기 때문이다. 띠는 쪽을 옮겨도 그대로 서서, 검사를 시작하기
 * 전까지 **어느 학교로 들어왔는지가 한 번도 끊기지 않는다.**
 *
 * **학교 로고를 그려 넣지 않는다**(규격 §4). 저장소에 정식 asset 이 없고,
 * 학교 상표를 우리가 다시 그리면 그 학교가 승인한 적 없는 상표가 학생
 * 화면에 선다. 서는 것은 학교 이름 글자와 공식 CareerMatri 상표 하나다.
 */
export async function CampusShell({
  u, wide, children,
}: {
  u: CampusUniversity;
  /** 고르고 훑는 자리인가. 첫 화면과 학과 목록이 그 폭을 쓴다 */
  wide?: boolean;
  children: ReactNode;
}) {
  const home = `/campus/${u.university_code.toLowerCase()}`;
  const t = campusSay(u);
  /* 로그인한 사람에게만 나가는 단추를 세운다. 나간 뒤에는 이 학교의
     로그인으로 돌아와 다음 사람이 같은 문으로 들어온다 */
  const who = await currentUser();
  return (
    <div className="cm cm-cmp">
      <header className="cm-cmp-band">
        <div className="cm-cmp-band-in">
          <Link className="cm-cmp-id" href={home}>{u.university_name}</Link>
          <span className="cm-cmp-sep" aria-hidden="true" />
          {/* **상표는 파일 하나를 읽는다**(규격 §4). 임시 아이콘을 두면
              같은 제품의 상표가 두 벌이 되고 둘은 어느 날 갈린다 */}
          <Link className="cm-cmp-brand" href={home}>
            <BrandMark size={22} />CareerMatri
          </Link>
          <span className="cm-cmp-tag">{t("학생")} 진로 분석 포털</span>
          {who ? (
            <LogoutButton className="cm-cmp-out" redirectTo={`${home}/login`} />
          ) : null}
        </div>
      </header>

      <main className="cm-cmp-main">
        <div className={`cm-cmp-wrap${wide ? "" : " is-read"}`}>{children}</div>
      </main>

      {/* **담당자가 무엇을 보는지 학생에게 먼저 적는다.** 학교가 주는
          검사라 `내 답을 교수님이 보나` 가 가장 먼저 걸리는 물음이고,
          적지 않으면 그 물음을 들고 답하게 된다. 적은 그대로다: 집계는
          다섯 명 미만이면 숫자를 내지 않고, 개별 결과를 여는 권한은 어느
          역할에도 없다 */}
      <footer className="cm-cmp-foot">
        <p>
          {u.university_name} × CareerMatri · {t("응시 현황은 학과 단위 집계로만 전달되고"
            + " 개별 응답과 결과는 담당자에게 공개되지 않습니다.")}
        </p>
      </footer>
    </div>
  );
}
