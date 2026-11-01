"use client";

import { useEffect, useState } from "react";

/**
 * 새로 낸 아이디와 임시 비밀번호(2026-11-01 세종일자리 시험: 담당자가 비밀번호를 적기 전에
 * 새로 고쳐 카드가 사라졌고, 참여자가 로그인하지 못해 다시 발급했다).
 *
 * - **DB 에는 해시만 있다.** 이 카드가 사라지면 다시 볼 길이 없어서, 사라지기 전에 붙잡는다:
 *   `복사` · `안내문 인쇄` 단추, 그리고 `적어 두었습니다` 를 누르기 전에는 새로 고치거나 창을
 *   닫으려 하면 브라우저가 한 번 묻는다
 * - **누를 때만 클립보드에 쓴다.** 화면이 저절로 쓰지 않는다
 * - 안내문은 새 창에서 인쇄한다. 한 사람에 한 칸(로그인 주소 · 아이디 · 임시 비밀번호 ·
 *   처음 로그인하면 비밀번호를 바꾸라는 한 줄). 창은 이 브라우저 안에서만 열리고 어디로도
 *   보내지 않는다
 */
export default function IssuedCard({ issued, title = "새로 낸 아이디와 임시 비밀번호" }: {
  issued: { login_id: string; password: string }[];
  title?: string;
}) {
  const [kept, setKept] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (kept) return;
    const stop = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, [kept]);

  const text = issued.map((x) => `${x.login_id}\t${x.password}`).join("\n");

  const copy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(`아이디\t임시 비밀번호\n${text}`); ok = true; }
    } catch { ok = false; }
    setCopied(ok);
  };

  const print = () => {
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const login = `${window.location.origin}/login`;
    const slips = issued.map((x) => `
      <section>
        <h2>CareerMatri 로그인 안내</h2>
        <p class="url">${esc(login)}</p>
        <table><tr><th>아이디</th><td>${esc(x.login_id)}</td></tr>
        <tr><th>임시 비밀번호</th><td>${esc(x.password)}</td></tr></table>
        <p>처음 로그인하면 비밀번호를 새로 정하는 화면이 나옵니다. 이 종이는 본인만 보관하세요.</p>
      </section>`).join("");
    w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>로그인 안내문</title>
      <style>
        body{font-family:Pretendard,system-ui,sans-serif;color:#111827;margin:24px}
        section{border:1.5px dashed #9ca3af;border-radius:10px;padding:18px 20px;margin:0 0 14px;page-break-inside:avoid}
        h2{margin:0 0 6px;font-size:18px}.url{margin:0 0 10px;color:#1f4fd1;font-weight:600}
        table{border-collapse:collapse;margin:0 0 10px}th{text-align:left;padding:4px 16px 4px 0;color:#374151;font-weight:600}
        td{font-family:ui-monospace,Menlo,monospace;font-size:18px;font-weight:700}p{margin:0;font-size:14px;color:#374151}
      </style></head><body>${slips}<script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="sf-issued" role="status">
      <b>{title}</b>
      <p>
        이 카드는 지금 한 번만 보입니다. 비밀번호는 암호로 바꿔 저장하므로 다시 꺼낼 수 없습니다.
        새로 고치거나 다른 화면으로 가기 전에 복사하거나 인쇄해 두세요.
      </p>
      <table className="sf-table">
        <thead><tr><th scope="col">아이디</th><th scope="col">임시 비밀번호</th></tr></thead>
        <tbody>
          {issued.map((x) => (
            <tr key={x.login_id}><td className="mono">{x.login_id}</td><td><code>{x.password}</code></td></tr>
          ))}
        </tbody>
      </table>
      <div className="sf-acts" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button type="button" className="sf-btn" onClick={copy}>{copied ? "복사했습니다" : "모두 복사"}</button>
        <button type="button" className="sf-btn ghost" onClick={print}>로그인 안내문 인쇄</button>
        <button type="button" className="sf-btn ghost" onClick={() => setKept(true)} disabled={kept}>
          {kept ? "적어 두었습니다 ✓" : "적어 두었습니다"}
        </button>
      </div>
    </div>
  );
}
