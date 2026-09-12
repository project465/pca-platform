import { query } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { applicantLabel, applicantStageLabel } from "@/lib/anon";
import { formatSlot } from "@/lib/notify";
import { mentorForUser, mentorStats, requestsByMentor } from "@/lib/mentoring";
import { noShowStates } from "@/lib/noshow";
import NoShowForm from "@/components/no-show-form";
import { payoutsOfMentor } from "@/lib/payout";
import { zoomConfigured, zoomDryRun } from "@/lib/zoom";
import MentoringShell from "@/components/mentoring-shell";
import {
  DecideForm,
  ProfileForm,
  SlotCloser,
  SlotOpener,
  type JobOption,
} from "./mentor-forms";

export const metadata = { title: "멘토 콘솔 — 현멘" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  requested: "응답 대기",
  accepted: "확정",
  declined: "거절",
  cancelled: "취소",
  expired: "기한 초과",
  completed: "완료",
  no_show: "노쇼 확인 중",
};

export default async function MentorConsolePage() {
  const user = await requireUser();
  const mentor = await mentorForUser(user.id);

  const clusters = await query<{ id: string; code: string }>(
    `SELECT id, code FROM job_clusters ORDER BY sort_no, code`,
  );
  const jobNames = await namesOf("job_clusters", clusters.map((c) => c.id), user.locale);
  const jobs: JobOption[] = clusters.map((c) => ({
    id: c.id,
    label: jobNames.get(c.id) ?? c.code,
  }));

  if (!mentor) {
    return (
      <MentoringShell user={user} current="/mentoring/mentor" isMentor={false}>
        <div className="page-head">
          <h1>멘토로 참여하기</h1>
        </div>
        <p className="lede">
          석·박사 과정을 지나 지금 그 경로에 있는 분만 멘토가 됩니다.
          프로필을 만들면 운영사가 현직 여부를 확인한 뒤 갤러리에 올립니다. 확인 근거가
          기록되지 않은 프로필은 갤러리에 올라가지 않습니다. 신청자에게는 별명과 속성만 보이고,
          실명·회사명·이메일은 어느 화면에도 나오지 않습니다.
        </p>
        <div className="panel form-panel">
          <ProfileForm values={null} jobs={jobs} />
        </div>
      </MentoringShell>
    );
  }

  const [rows, stats, slots, mineJobs, payouts] = await Promise.all([
    requestsByMentor(mentor.id),
    mentorStats(mentor.id),
    query<{ id: string; starts_at: string; status: string }>(
      `SELECT id, starts_at::text, status
         FROM mentor_slots
        WHERE mentor_id = $1 AND starts_at > now()
        ORDER BY starts_at`,
      [mentor.id],
    ),
    query<{ job_id: string }>(
      `SELECT job_id FROM mentor_job_clusters WHERE mentor_id = $1`,
      [mentor.id],
    ),
    payoutsOfMentor(mentor.id),
  ]);
  const pendingNet = payouts
    .filter((p) => p.status === "pending")
    .reduce((a, p) => a + p.net, 0);

  const pending = rows.filter((r) => r.status === "requested");
  const noShow = await noShowStates(rows.map((r) => r.id));
  const zoomReady = zoomConfigured() || zoomDryRun();

  return (
    <MentoringShell user={user} current="/mentoring/mentor" isMentor>
      <div className="page-head">
        <h1>멘토 콘솔</h1>
        <span className="count mono">{mentor.handle}</span>
        <div className="right">
          <span className={`tag ${mentor.status === "active" ? "active" : ""}`}>
            {mentor.status === "active"
              ? "승인 완료"
              : mentor.status === "pending"
                ? "승인 대기"
                : "중지"}
          </span>
        </div>
      </div>

      {mentor.status !== "active" ? (
        <div className="notice" style={{ marginBottom: 18 }}>
          승인 대기 중입니다. 승인되면 갤러리에 표시되고 신청을 받을 수 있습니다.
        </div>
      ) : null}

      {!zoomReady ? (
        <div className="notice error" style={{ marginBottom: 18 }}>
          줌 연동이 설정돼 있지 않아 지금은 승낙이 실패합니다. 운영사에 알려 주세요.
          (ZOOM_ACCOUNT_ID·ZOOM_CLIENT_ID·ZOOM_CLIENT_SECRET)
        </div>
      ) : null}

      <div className="stat-row">
        <div>
          <dt>받은 신청</dt>
          <dd>{rows.length}건</dd>
        </div>
        <div>
          <dt>응답 대기</dt>
          <dd className={pending.length > 0 ? "warn" : ""}>{pending.length}건</dd>
        </div>
        <div>
          <dt>완료</dt>
          <dd>{stats?.done_count ?? 0}회</dd>
        </div>
        <div>
          <dt>만족도</dt>
          <dd>{stats?.rating_avg ? `★ ${stats.rating_avg}` : "—"}</dd>
        </div>
      </div>

      <h2 className="sec-h first">받은 신청</h2>
      {rows.length === 0 ? (
        <div className="empty">
          <b>받은 신청이 없습니다</b>
          아래에서 시간대를 열어두면 신청이 들어옵니다.
        </div>
      ) : (
        <ul className="req-list">
          {rows.map((r) => (
            <li key={r.id} className="req">
              <div className="req-head">
                <b>{formatSlot(new Date(r.starts_at))}</b>
                <span className={`state ${r.status === "requested" ? "wait" : ""}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <span className="muted">
                  {applicantLabel(r.applicant_name)} 님 · {applicantStageLabel(r.applicant_stage)}
                </span>
              </div>
              {r.status === "requested" ? (
                <div className="req-meta">
                  응답 기한 {formatSlot(new Date(r.respond_by))} — 넘기면 자동으로 닫히고 시간대가 풀립니다
                </div>
              ) : null}

              <p className="req-q">{r.question}</p>

              {r.status === "requested" ? <DecideForm requestId={r.id} /> : null}

              {r.status === "accepted" && r.host_url ? (
                <div className="join">
                  <a className="act solid" href={r.host_url} target="_blank" rel="noreferrer">
                    호스트로 시작
                  </a>
                  <span className="help">
                    이 링크는 호스트 권한이 있습니다. 전달하지 마세요.
                  </span>
                </div>
              ) : null}

              {noShow.get(r.id)?.canReport ? (
                <NoShowForm requestId={r.id} who="신청자" until={noShow.get(r.id)?.until ?? null} />
              ) : null}
              {noShow.get(r.id)?.reported ? (
                <div className="notice" style={{ marginTop: 10 }}>
                  노쇼 신고가 접수된 세션입니다. 운영사 판정 전까지 정산이 멈춰 있습니다.
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {payouts.length > 0 ? (
        <>
          <h2 className="sec-h">정산</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>세션</th>
                  <th style={{ textAlign: "right" }}>받은 돈</th>
                  <th style={{ textAlign: "right" }}>수수료</th>
                  <th style={{ textAlign: "right" }}>원천징수</th>
                  <th style={{ textAlign: "right" }}>지급액</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">
                      {p.starts_at}
                      {p.req_status === "cancelled" ? (
                        <span className="sub">신청자가 늦게 취소한 건</span>
                      ) : null}
                    </td>
                    <td className="num">{p.gross.toLocaleString("ko-KR")}원</td>
                    <td className="num">{p.fee.toLocaleString("ko-KR")}원</td>
                    <td className="num">{p.withholding.toLocaleString("ko-KR")}원</td>
                    <td className="num">
                      <b>{p.net.toLocaleString("ko-KR")}원</b>
                    </td>
                    <td>
                      {p.status === "paid" ? (
                        <>
                          <span className="tag active">지급됨</span>
                          <span className="sub mono">{p.paid_at}</span>
                        </>
                      ) : (
                        <span className="tag">지급 대기</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pendingNet > 0 ? (
            <p className="help" style={{ marginTop: 8 }}>
              지급 대기 {pendingNet.toLocaleString("ko-KR")}원. 운영사가 확인 후 보냅니다.
            </p>
          ) : null}
        </>
      ) : null}

      <h2 className="sec-h">내 시간대</h2>
      <div className="panel">
        <SlotOpener />
        <p className="help" style={{ marginTop: 8 }}>
          한국 시간 기준입니다. 신청은 시작 1시간 전까지만 받습니다.
        </p>
        {slots.length === 0 ? (
          <p className="help" style={{ marginTop: 14 }}>
            열어둔 시간대가 없습니다.
          </p>
        ) : (
          <ul className="slot-list">
            {slots.map((s) => (
              <li key={s.id}>
                <span>{formatSlot(new Date(s.starts_at))}</span>
                <span className="tag">
                  {s.status === "open"
                    ? "열림"
                    : s.status === "held"
                      ? "신청 들어옴"
                      : s.status === "booked"
                        ? "확정"
                        : "닫힘"}
                </span>
                {s.status === "open" ? <SlotCloser slotId={s.id} /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="sec-h">프로필</h2>
      <div className="panel form-panel">
        <ProfileForm
          values={{
            alias: mentor.alias,
            years: mentor.years,
            degree: mentor.degree,
            fieldTrack: mentor.field_track,
            careerPath: mentor.career_path,
            companyScale: mentor.company_scale,
            region: mentor.region ?? "",
            headline: mentor.headline,
            bio: mentor.bio ?? "",
            sessionMinutes: mentor.session_minutes,
            jobIds: mineJobs.map((j) => j.job_id),
          }}
          jobs={jobs}
        />
      </div>
    </MentoringShell>
  );
}
