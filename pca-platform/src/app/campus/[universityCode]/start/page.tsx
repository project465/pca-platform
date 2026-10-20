import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import "../../../surface.css";
import "../../campus.css";
import {
  campusSay,
  coreOf, findLeaf, pickRequired, specializationName, statusOf, university,
} from "@/lib/campus/registry";
import { campusStudentOf } from "@/lib/campus/students";
import { currentUser } from "@/lib/session";
import { CampusShell } from "../../shell";
import { startFromCampus } from "../../actions";

type Params = { params: Promise<{ universityCode: string }> };

export async function generateMetadata({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  return { title: u ? `${u.university_name} CareerMatri` : "CareerMatri" };
}

/**
 * 학교 발급 계정으로 들어온 뒤의 자리.
 *
 * **학과를 다시 고르게 하지 않는다**(규격 §7). 학교가 명단으로 적어 준
 * 학과가 이미 있으므로, 여기서 하는 일은 그것을 **확인시키고 시작하는**
 * 것뿐이다. 다시 고르게 하면 학생이 자기 학과와 다른 자리를 고를 수 있고,
 * 그 응시는 담당자 화면에서 남의 학과 줄에 선다.
 *
 * **등록된 학과가 없거나 등록부와 맞지 않으면 막는다.** 비슷한 학과로
 * 짐작해 넣지 않는다: 한 번 그렇게 들어간 응시는 그 학생의 결과가 남의
 * 학과 집계에 들어간 상태이고, 되돌리려면 그 응시를 지워야 한다.
 */
export default async function CampusStart({ params }: Params) {
  const { universityCode } = await params;
  const u = university(universityCode);
  if (!u) notFound();
  const t = campusSay(u);
  const code = u.university_code.toLowerCase();
  /* **개인 로그인으로 보내지 않는다.** `requireUser()` 는 `/login` 으로
     보내는데, 그 쪽에는 소셜 단추와 `회원가입` 링크가 있어 학교 계약
     학생이 계약과 무관한 개인 계정을 만들게 된다 */
  const user = await currentUser();
  if (!user) redirect(`/campus/${code}/login`);

  const mine = await campusStudentOf(user.id, u.university_code);

  /* 학교 발급 계정이 아니거나 그 학교가 아니면 학교 로그인으로 보낸다.
     **막다른 길로 두지 않는다**: 앞사람의 세션이 남아 있는 자리에서 학교
     계정으로 바꿀 자리가 거기다. 개인으로 가입해 들어온 사람은 그 쪽에서
     개인 홈으로 나갈 수 있다 */
  if (!mine) {
    redirect(`/campus/${code}/login?next=${
      encodeURIComponent(`/campus/${code}/start`)}`);
  }

  const found = findLeaf(u, mine.row.department_code);
  /* `campusStudentContext` 가 이미 등록부로 맞춰 봤으므로 여기서 비면
     그 사이에 등록부가 바뀐 것이다 */
  if (!found) {
    return <Blocked u={u} why="등록부에서 학과를 찾지 못했습니다" />;
  }
  /**
   * **전공을 고르는 자리의 학생은 여기서 시작하지 않는다**(규격 §32·§33).
   *
   * 자율전공학부는 준비 중인 자리가 아니라 **학생이 전공을 고르는
   * 자리**다. 그래서 `준비 중` 으로 적지 않고, `당신은 이 전공입니다` 로
   * 정해 주지도 않는다. 하는 일은 전공 목록으로 보내는 것 하나다.
   */
  const picking = pickRequired(mine.ctx);
  const ready = !picking && statusOf(u, found) === "READY";
  const core = coreOf(found.leaf);
  const spec = specializationName(found.leaf);

  /**
   * **여기서 쿠키를 적지 않는다.** 서버 컴포넌트에서 쓰면 Next 가
   * `Cookies can only be modified in a Server Action or Route Handler` 로
   * 거절하고, 그 쪽이 통째로 오류 화면이 된다(한 번 그렇게 섰다: 학과
   * 이름도 학번도 시작 단추도 없이 `화면을 불러오지 못했습니다` 였다).
   *
   * 맥락을 적는 자리는 아래 폼이 부르는 `startFromCampus` 하나다. 그
   * 액션이 학교와 학과를 받아 등록부로 다시 맞춰 보고 쿠키를 적는다.
   */

  return (
    <CampusShell u={u}>
      <section className="cm-cmp-hero">
        <p className="cm-cmp-eyebrow">{u.university_name} · {found.college.name}</p>
        <h1 className="cm-cmp-title">{found.leaf.name}</h1>
        <p className="cm-cmp-lead">
          {t(picking
            ? "관심 있는 전공을 고르면 그 전공 기준으로 검사를 시작합니다."
            : ready
              ? "학교에 등록된 학과입니다. 이 학과 기준으로 검사를 시작합니다."
              : "이 학과는 아직 검사를 시작할 수 없습니다.")}
        </p>
        {picking ? (
          <div className="cm-cmp-cta-row">
            <Link className="cm-cmp-cta" href={`/campus/${code}/majors?pick=1`}>
              전공 고르기<span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : ready ? (
          <form action={startFromCampus} className="cm-cmp-cta-row">
            <input type="hidden" name="u" value={u.university_code} />
            <input type="hidden" name="d" value={found.leaf.code} />
            <button type="submit" className="cm-cmp-cta">
              검사 시작하기<span aria-hidden="true">→</span>
            </button>
          </form>
        ) : (
          <div className="cm-cmp-cta-row">
            <Link className="cm-cmp-cta" href={`/campus/${code}`}>
              처음으로<span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </section>

      {/* **학과를 다시 고르게 하지 않는다**(규격 §7). 학교가 적어 준 것을
          확인시키는 자리라, 서는 것은 고르는 칸이 아니라 읽는 줄 셋이다 */}
      <dl className="cm-cmp-facts">
        <div><dt>{t("학번")}</dt><dd>{mine.row.student_id}</dd></div>
        <div><dt>이름</dt><dd>{user.name ?? "-"}</dd></div>
        <div><dt>{t("학과")}</dt><dd>{found.leaf.name}</dd></div>
        {picking ? (
          <div>
            <dt>검사</dt>
            <dd>고른 전공이 정합니다</dd>
          </div>
        ) : core ? (
          <div>
            <dt>검사</dt>
            <dd>CareerMatri {core.name_ko}{spec ? ` · ${spec}` : ""}</dd>
          </div>
        ) : null}
      </dl>

      <p className="cm-cmp-note">
        {t(picking
          ? "고른 전공은 이 응시에만 적용되고 학과 소속은 그대로 남습니다."
          : ready
            ? "문항마다 저장되어 창을 닫아도 보던 자리에서 이어집니다."
            : "학과 담당자에게 알려 주시면 학교와 함께 확인해 드립니다.")}
      </p>
    </CampusShell>
  );
}

/**
 * 막는 자리. **안쪽 사정을 적지 않는다.**
 *
 * 학생이 할 수 있는 일은 담당자에게 알리는 것 하나이고, 코드와 표 이름을
 * 적어 두면 읽는 사람이 자기가 무엇을 잘못한 줄 안다.
 */
function Blocked({ u, why }: { u: ReturnType<typeof university> & {}; why: string }) {
  const t = campusSay(u);
  return (
    <CampusShell u={u}>
      <section className="cm-cmp-hero">
        <p className="cm-cmp-eyebrow">{u.university_name} · CareerMatri</p>
        <h1 className="cm-cmp-title">{t("학과 확인이 필요합니다")}</h1>
        <p className="cm-cmp-lead">
          {t("등록된 학과를 확인하지 못해 검사를 시작할 수 없습니다. 학과 담당자에게"
            + " 알려 주시면 학교와 함께 확인해 드립니다.")}
        </p>
      </section>
      <p className="cm-cmp-note">{t(why)}</p>
    </CampusShell>
  );
}
