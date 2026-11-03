"use client";

/**
 * 작업공간 **바로가기 찾기**.
 *
 * 목표 화면의 머리 오른쪽에 검색칸이 선다. **없는 기능을 그려 넣지
 * 않는다**는 규칙은 그대로이므로, 이 칸은 장식이 아니라 실제로 도는
 * 칸이다. 찾는 것은 둘뿐이다: 작업공간의 메뉴 열하나와 **지금 내가
 * 설명할 수 있는 기술영역 이름**. 둘 다 이 쪽이 이미 들고 있는 값이라
 * 서버를 한 번도 더 부르지 않는다.
 *
 * **전역 검색이 아니다.** 경험 본문이나 결과지 글을 뒤지지 않는다. 그
 * 쪽은 `경험` 과 `결과 기록` 이 제 목록으로 들고 있고, 여기서 또 뒤지면
 * 같은 일을 두 곳에서 하게 된다.
 */
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/sf/icon";

export type FindItem = { label: string; sub?: string; href: string };

export function CmFind({ items, lang = "ko" }: { items: FindItem[]; lang?: "ko" | "en" }) {
  const en = lang === "en";
  const [q, setQ] = useState("");
  const [on, setOn] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  /* 밖을 누르면 닫는다. **열어 둔 채로 쪽을 가리지 않는다** */
  useEffect(() => {
    if (!on) return undefined;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOn(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [on]);

  const key = q.trim().toLowerCase();
  const hit = key
    ? items.filter((it) =>
      it.label.toLowerCase().includes(key)
      || (it.sub ?? "").toLowerCase().includes(key)).slice(0, 6)
    : [];

  return (
    <div className="cm-find" ref={box}>
      <Icon name="search" size={15} />
      <input
        type="search"
        value={q}
        placeholder={en ? "Search menus and areas" : "메뉴·기술영역 찾기"}
        aria-label={en ? "Search your workspace" : "작업공간에서 찾기"}
        aria-expanded={on && key.length > 0}
        aria-controls={listId}
        onChange={(e) => { setQ(e.target.value); setOn(true); }}
        onFocus={() => setOn(true)}
        onKeyDown={(e) => { if (e.key === "Escape") { setQ(""); setOn(false); } }}
      />
      {on && key ? (
        <div className="cm-find-pop" id={listId} role="listbox">
          {hit.length ? hit.map((it) => (
            <Link key={it.href + it.label} href={it.href} role="option"
              aria-selected={false}
              onClick={() => { setQ(""); setOn(false); }}>
              <b>{it.label}</b>
              {it.sub ? <span>{it.sub}</span> : null}
            </Link>
          )) : (
            /* **빈 결과를 조용히 두지 않는다.** 무엇으로 찾는지를
               적는다 */
            <p className="cm-find-none">
              {en ? "No matching menu. You can also search by technical area."
                : "일치하는 메뉴가 없습니다. 기술영역 이름으로도 찾습니다."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
