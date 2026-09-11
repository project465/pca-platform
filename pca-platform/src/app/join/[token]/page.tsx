import { nameOf } from "@/lib/i18n";
import { readLink, LINK_MESSAGE } from "@/lib/join";
import { isValidMask, maskExample, rulesNotice } from "@/lib/join-rules";
import JoinForm from "./join-form";

export const metadata = { title: "응시자 등록 — 단체 PCA" };
export const dynamic = "force-dynamic";

/**
 * 단체 전용 링크로 들어오는 자리.
 *
 * 학생은 계정을 미리 받지 않는다. 담당자가 뿌린 이 링크가 자격이고,
 * 그 단체가 산 응시권이 남아 있는 동안만 열린다.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await readLink(token);

  if (!link.ok) {
    const m = LINK_MESSAGE[link.reason];
    return (
      <main className="auth">
        <div className="card">
          <h1>{m.title}</h1>
          <p className="help">{m.body}</p>
        </div>
      </main>
    );
  }

  const orgName = await nameOf("organizations", link.orgId, "ko");
  const notice = rulesNotice(link.loginIdMask, link.emailDomains);
  const hint =
    link.loginIdMask && isValidMask(link.loginIdMask)
      ? `${maskExample(link.loginIdMask)} 형태로 적어 주세요.`
      : null;

  return (
    <main className="auth">
      <div className="card">
        <h1>{orgName ?? "PCA"} 응시자 등록</h1>
        <p className="help">
          {link.label}
          {link.remaining !== null
            ? ` · 남은 자리 ${link.remaining.toLocaleString("ko-KR")}`
            : ""}
        </p>
        {notice ? (
          <p className="notice" style={{ marginBottom: 16 }}>{notice}</p>
        ) : null}
        <JoinForm
          token={token}
          askEmail={link.emailDomains.length > 0}
          loginIdHint={hint}
        />
      </div>
    </main>
  );
}
