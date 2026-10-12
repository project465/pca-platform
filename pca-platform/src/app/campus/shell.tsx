import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/sf/brand-mark";
import type { CampusUniversity } from "@/lib/campus/registry";

/**
 * 학교 전용 진입의 껍데기.
 *
 * **작업공간의 껍데기(`CmShell`)를 쓰지 않는다.** 저쪽은 로그인한 사람의
 * 메뉴 아홉 줄을 세우는데, 이 쪽을 보는 사람은 아직 로그인하지 않았을 수
 * 있다. 세우면 들어갈 수 없는 줄이 메뉴에 서고, 그것은 안내가 아니라
 * 막다른 길이다.
 *
 * **학교 로고를 그려 넣지 않는다**(규격 §4). 저장소에 정식 asset 이 있고
 * 출처와 권한이 분명할 때만 쓴다. 지금 서는 것은 공식 CareerMatri 상표
 * 하나와 학교 이름 글자다: `CareerMatri + 배재대학교` 로 충분하다.
 */
export function CampusShell({
  u, wide, children,
}: {
  u: CampusUniversity;
  /** 고르고 훑는 자리인가. 학과 목록이 그 폭을 쓴다 */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="cm cm-cmp">
      <div className="cm-cmp-top">
        {/* **상표는 파일 하나를 읽는다**(규격 §4). 임시 아이콘을 두면
            같은 제품의 상표가 두 벌이 되고 둘은 어느 날 갈린다 */}
        <Link className="cm-cmp-brand" href={`/campus/${u.university_code.toLowerCase()}`}>
          <BrandMark size={26} />CareerMatri
        </Link>
        <span className="cm-cmp-school">{u.university_name}</span>
      </div>

      <main className="cm-main">
        <div className="cm-canvas">
          <div className={`cm-in${wide ? "" : " is-read"}`}>{children}</div>
        </div>
      </main>
    </div>
  );
}
