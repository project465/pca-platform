"use client";

import { useActionState, useState } from "react";
import {
  acceptAction,
  closeSlotAction,
  declineAction,
  openSlotAction,
  saveAccountAction,
  saveProfileAction,
  type MentorState,
} from "./actions";
import {
  CAREER_PATH_LABEL,
  COMPANY_SCALE_LABEL,
  DEGREE_LABEL,
  FIELD_TRACK_LABEL,
} from "@/lib/anon";

const initial: MentorState = {};

export type JobOption = { id: string; label: string };

export type ProfileValues = {
  alias: string;
  years: number;
  degree: string;
  fieldTrack: string;
  careerPath: string;
  companyScale: string;
  region: string;
  headline: string;
  bio: string;
  sessionMinutes: number;
  jobIds: string[];
};

export function ProfileForm({
  values,
  jobs,
}: {
  values: ProfileValues | null;
  jobs: JobOption[];
}) {
  const [state, action, pending] = useActionState(saveProfileAction, initial);
  const [alias, setAlias] = useState(values?.alias ?? "");
  const err = state.errors ?? {};

  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="alias">별명 (익명)</label>
        <input
          id="alias"
          name="alias"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          maxLength={30}
          placeholder="반도체 공정 8년차"
          required
          aria-invalid={err.alias ? true : undefined}
        />
        <span className="help" style={err.alias ? { color: "var(--gap)" } : undefined}>
          {err.alias ??
            "실명과 회사명은 넣지 마세요. 신청자에게는 이 별명과 아래 속성만 보입니다."}
        </span>
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="degree">내 최종 학위</label>
          <select id="degree" name="degree" defaultValue={values?.degree ?? "phd"}>
            {Object.entries(DEGREE_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <span className="help">석·박사 과정을 지나온 사람만 멘토가 됩니다.</span>
        </div>
        <div className="field">
          <label htmlFor="careerPath">지금 있는 진로 경로</label>
          <select
            id="careerPath"
            name="careerPath"
            defaultValue={values?.careerPath ?? "industry_rnd"}
          >
            {Object.entries(CAREER_PATH_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <span className="help">신청자가 멘토를 고르는 첫 번째 기준입니다.</span>
        </div>
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="fieldTrack">전공 계열</label>
          <select id="fieldTrack" name="fieldTrack" defaultValue={values?.fieldTrack ?? "stem"}>
            {Object.entries(FIELD_TRACK_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="years">현직 연차</label>
          <input
            id="years"
            name="years"
            type="number"
            min={0}
            max={50}
            defaultValue={values?.years ?? 5}
            required
          />
          <span className="help" style={err.years ? { color: "var(--gap)" } : undefined}>
            {err.years ?? "학위 취득 후 일한 기간입니다."}
          </span>
        </div>
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="companyScale">소속 규모</label>
          <select
            id="companyScale"
            name="companyScale"
            defaultValue={values?.companyScale ?? "large"}
          >
            {Object.entries(COMPANY_SCALE_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="region">근무 지역 (선택)</label>
          <input
            id="region"
            name="region"
            defaultValue={values?.region ?? ""}
            maxLength={20}
            placeholder="대전"
          />
          <span className="help">시도 단위까지만 씁니다. 지역 연계 검색에 쓰입니다.</span>
        </div>
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="sessionMinutes">한 번에</label>
          <select
            id="sessionMinutes"
            name="sessionMinutes"
            defaultValue={String(values?.sessionMinutes ?? 30)}
          >
            {[20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m}분
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="headline">한 줄 소개</label>
        <input
          id="headline"
          name="headline"
          defaultValue={values?.headline ?? ""}
          maxLength={80}
          placeholder="박사 졸업 후 산업계 R&D로 갈 때 실제로 보는 것"
          required
          aria-invalid={err.headline ? true : undefined}
        />
        <span className="help" style={err.headline ? { color: "var(--gap)" } : undefined}>
          {err.headline ?? "카드에 이 문장이 그대로 뜹니다."}
        </span>
      </div>

      <div className="field">
        <label htmlFor="bio">소개 (선택)</label>
        <textarea
          id="bio"
          name="bio"
          rows={5}
          maxLength={1500}
          defaultValue={values?.bio ?? ""}
          placeholder={
            "연구 분야와 지금 하는 일, 어떤 질문에 답할 수 있는지 적어 주면 신청이 정확해집니다.\n예: 졸업 시점 조율, 포닥 대신 산업계, 논문 실적을 이력서로 옮기는 법"
          }
        />
      </div>

      <div className="field">
        <label>다룰 수 있는 직무 영역</label>
        <div className="checks">
          {jobs.length === 0 ? (
            <span className="help">
              직무 영역 데이터(job_clusters)가 없습니다. 매핑 데이터를 먼저 넣어야 합니다.
            </span>
          ) : (
            jobs.map((j) => (
              <label key={j.id} className="check">
                <input
                  type="checkbox"
                  name="jobIds"
                  value={j.id}
                  defaultChecked={values?.jobIds.includes(j.id)}
                />
                {j.label}
              </label>
            ))
          )}
        </div>
        {err.jobIds ? <span className="help" style={{ color: "var(--gap)" }}>{err.jobIds}</span> : null}
      </div>

      {state.message ? <div className="notice error">{state.message}</div> : null}
      {state.ok ? <div className="notice ok">{state.ok}</div> : null}

      <button className="act solid" type="submit" disabled={pending}>
        {pending ? "저장 중…" : values ? "저장" : "프로필 만들기"}
      </button>
      <span className="help">
        연차나 소속 규모를 바꾸면 현직 인증을 다시 받습니다. 그동안 갤러리에서 내려갑니다.
      </span>
    </form>
  );
}

export function SlotOpener() {
  const [state, action, pending] = useActionState(openSlotAction, initial);
  return (
    <form action={action} className="inline-form">
      <input type="datetime-local" name="startsAt" required />
      <button className="act" type="submit" disabled={pending}>
        {pending ? "여는 중…" : "시간대 열기"}
      </button>
      {state.message ? <span className="inline-err">{state.message}</span> : null}
      {state.errors?.startsAt ? <span className="inline-err">{state.errors.startsAt}</span> : null}
      {state.ok ? <span className="inline-ok">{state.ok}</span> : null}
    </form>
  );
}

export function SlotCloser({ slotId }: { slotId: string }) {
  const [state, action, pending] = useActionState(closeSlotAction, initial);
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="slotId" value={slotId} />
      <button className="linkish" type="submit" disabled={pending}>
        닫기
      </button>
      {state.message ? <span className="inline-err">{state.message}</span> : null}
    </form>
  );
}

/**
 * 승낙·거절. 승낙 버튼 하나가 줌 생성과 안내 발송까지 끌고 간다.
 * 그래서 버튼에 무슨 일이 일어나는지 그대로 적어둔다.
 */
export function DecideForm({ requestId }: { requestId: string }) {
  const [accepted, acceptFn, acceptPending] = useActionState(acceptAction, initial);
  const [declined, declineFn, declinePending] = useActionState(declineAction, initial);
  const [showDecline, setShowDecline] = useState(false);

  if (accepted.ok) return <div className="notice ok">{accepted.ok}</div>;
  if (declined.ok) return <div className="notice">{declined.ok}</div>;

  return (
    <div className="decide">
      <form action={acceptFn} className="inline-form">
        <input type="hidden" name="requestId" value={requestId} />
        <button className="act solid" type="submit" disabled={acceptPending || declinePending}>
          {acceptPending ? "줌 회의 만드는 중…" : "승낙하고 줌 만들기"}
        </button>
      </form>

      {showDecline ? (
        <form action={declineFn} className="inline-form">
          <input type="hidden" name="requestId" value={requestId} />
          <input name="reason" maxLength={300} placeholder="거절 이유 (선택, 신청자에게 전달)" />
          <button className="act" type="submit" disabled={declinePending}>
            {declinePending ? "처리 중…" : "거절"}
          </button>
        </form>
      ) : (
        <button className="linkish" type="button" onClick={() => setShowDecline(true)}>
          거절하기
        </button>
      )}

      {accepted.message ? <div className="notice error">{accepted.message}</div> : null}
      {declined.message ? <div className="notice error">{declined.message}</div> : null}
    </div>
  );
}

/**
 * 지급 계좌. 이미 넣은 주민등록번호는 다시 타이핑하게 하지 않는다 —
 * 빈칸으로 두면 있던 값이 그대로 남는다.
 */
export function AccountForm({
  banks,
  account,
  rrnSupported,
}: {
  banks: string[];
  account: {
    bank: string;
    account_no: string;
    holder: string;
    rrn_tail: string | null;
    has_rrn: boolean;
    updated_at: string;
  } | null;
  rrnSupported: boolean;
}) {
  const [state, action, pending] = useActionState(saveAccountAction, initial);

  return (
    <form action={action} className="form" style={{ maxWidth: 460 }}>
      <div className="field">
        <label htmlFor="bank">은행</label>
        <select id="bank" name="bank" defaultValue={account?.bank ?? ""} required>
          <option value="" disabled>
            고르세요
          </option>
          {banks.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="accountNo">계좌번호</label>
        <input
          id="accountNo"
          name="accountNo"
          inputMode="numeric"
          defaultValue={account?.account_no ?? ""}
          placeholder="숫자와 하이픈만"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="holder">예금주</label>
        <input id="holder" name="holder" defaultValue={account?.holder ?? ""} required />
        <span className="help">본인 명의가 아니어도 됩니다. 실제 계좌의 예금주를 적어주세요.</span>
      </div>

      <div className="field">
        <label htmlFor="rrn">주민등록번호</label>
        <input
          id="rrn"
          name="rrn"
          inputMode="numeric"
          autoComplete="off"
          placeholder={account?.has_rrn ? "저장돼 있습니다. 바꿀 때만 적으세요" : "13자리"}
          disabled={!rrnSupported}
        />
        <span className="help">
          {!rrnSupported
            ? "지금은 받을 수 없습니다. 운영사가 보관 준비를 마친 뒤 열립니다."
            : account?.has_rrn
              ? `저장돼 있습니다 (끝자리 ${account.rrn_tail}). 암호화해서 보관하며, 원천징수 신고에만 씁니다.`
              : "소득세법상 원천징수 신고에 필요합니다. 암호화해서 보관하고 화면에는 끝자리만 보입니다."}
        </span>
      </div>

      <button className="act solid" type="submit" disabled={pending}>
        {pending ? "저장 중…" : account ? "계좌 수정" : "계좌 등록"}
      </button>
      {state.ok ? <div className="notice ok">{state.ok}</div> : null}
      {state.message ? <div className="notice error">{state.message}</div> : null}
      {account ? <span className="help">마지막 수정 {account.updated_at}</span> : null}
    </form>
  );
}
