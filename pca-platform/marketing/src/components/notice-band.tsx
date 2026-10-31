"use client";

import { useEffect, useState } from "react";

/**
 * 개인정보처리방침 개정 공지(2026-10-31 배포 · 11월 7일 시행). 한국어판 머리 위 한 줄.
 *
 * **날짜가 지나면 저절로 사라진다.** 이 사이트는 미리 구워 두므로(서버가 그때그때
 * 그리지 않는다) 날짜를 브라우저에서 본다. 처음에는 숨겨 두고 날짜 안이면 그때 보인다:
 * 지난 공지가 한 번 깜박였다 사라지는 것보다 늦게 나타나는 편이 낫다.
 */
const UNTIL = Date.parse("2026-11-08T00:00:00+09:00");

export default function NoticeBand({ href }: { href: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(Date.now() < UNTIL); }, []);
  if (!on) return null;
  return (
    <div className="notice-band" role="note">
      <p>
        11월 7일부터 개인정보처리방침이 바뀝니다: 커리어피크 상담 연결(신청하실 때만, 따로 동의) · 회사 메일함 위탁.{" "}
        <a href={href}>자세히</a>
      </p>
    </div>
  );
}
