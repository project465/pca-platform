"use client";

/**
 * 켜고 끄는 단추 하나. **동의 문구는 켜는 순간의 창에서만 보인다**(2026-11-03 대표 "이거도 AI느낌난다":
 * 화면에는 제목 · 상태 · 단추만). 법적 고지라 문구 내용은 그대로이고, 확인을 누르지 않으면 켜지지 않는다.
 * 끌 때는 묻지 않는다.
 */
export default function ConsentButton({
  action, on, label, notice,
}: {
  action: (form: FormData) => Promise<void>;
  /** 지금 켜져 있는가 */
  on: boolean;
  label: string;
  /** 켤 때 창에 띄우는 동의 문구. 없으면 묻지 않는다 */
  notice?: string;
}) {
  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <button type="submit" className="mt-link mt-linkbtn"
        onClick={(e) => {
          if (!on && notice && !window.confirm(notice)) e.preventDefault();
        }}>
        {label}
      </button>
    </form>
  );
}
