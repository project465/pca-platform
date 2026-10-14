import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import "../../../surface.css";
import "../../campus.css";
import {
  coreOf, findLeaf, specializationName, statusOf, university,
} from "@/lib/campus/registry";
import { campusStudentContext } from "@/lib/campus/students";
import { currentUser } from "@/lib/session";
import { CmHead } from "../../../me/shell";
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
  const code = u.university_code.toLowerCase();
  /* **개인 로그인으로 보내지 않는다.** `requireUser()` 는 `/login` 으로
     보내는데, 그 쪽에는 소셜 단추와 `회원가입` 링크가 있어 학교 계약
     학생이 계약과 무관한 개인 계정을 만들게 된다 */
  const user = await currentUser();
  if (!user) redirect(`/campus/${code}/login`);

  const mine = await campusStudentContext(user.id);

  /* 학교 발급 계정이 아니거나 그 학교가 아니면 개인 쪽으로 보낸다.
     **막다른 길로 두지 않는다**: 개인으로 가입해 들어온 사람이 이 주소를
     눌렀을 수 있고, 그 사람에게는 학과 목록이 맞는 자리다 */
  if (!mine || mine.row.university_code !== u.university_code) {
    redirect(`/campus/${code}/majors`);
  }

  const found = findLeaf(u, mine.row.department_code);
  /* `campusStudentContext` 가 이미 등록부로 맞춰 봤으므로 여기서 비면
     그 사이에 등록부가 바뀐 것이다 */
  if (!found) {
    return <Blocked u={u} why="등록부에서 학과를 찾지 못했습니다" />;
  }
  const ready = statusOf(u, found) === "READY";
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
      <CmHead
        kicker={`${u.university_name} · ${found.college.name}`}
        title={found.leaf.name}
        meta={core
          ? `CareerMatri ${core.name_ko}${spec ? ` · ${spec}` : ""} 검사로 이어집니다`
          : undefined}
        lead={ready
          ? "학교에 등록된 학과입니다. 이 학과로 검사를 시작합니다."
          : "이 학과는 아직 검사를 시작할 수 없습니다."}
      />

      {/* **새 class 이름을 짓지 않는다.** 이 저장소에서 CSS 에 규칙이 없는
          이름을 쓴 탈이 일곱 번 났다(`.btn` · `--sf-r` · `.lg` · `empty` ·
          `industries` · `OC*` · `qs-steps`). CSS 는 모르는 이름을 조용히
          넘기고, 그러면 쪽은 200 으로 멀쩡히 뜨고 생김새만 없다 */}
      <ul className="cm-rows" style={{ marginTop: 4 }}>
        <li>학번 {mine.row.student_id}</li>
        <li>이름 {user.name ?? "-"}</li>
        <li>학과 {found.leaf.name}</li>
      </ul>

      {ready ? (
        <>
          <form action={startFromCampus} className="cm-acts" style={{ marginTop: 20 }}>
            <input type="hidden" name="u" value={u.university_code} />
            <input type="hidden" name="d" value={found.leaf.code} />
            <button type="submit" className="cm-btn is-primary">검사 시작</button>
          </form>
          <p className="cm-note" style={{ marginTop: 16 }}>
            문항마다 저장되어 창을 닫아도 보던 자리에서 이어집니다.
          </p>
        </>
      ) : (
        <>
          <p className="cm-note" style={{ marginTop: 16 }}>
            학과 담당자에게 알려 주시면 학교와 함께 확인해 드립니다.
          </p>
          <div className="cm-acts" style={{ marginTop: 18 }}>
            <Link className="cm-btn" href={`/campus/${code}`}>처음으로</Link>
          </div>
        </>
      )}
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
  return (
    <CampusShell u={u}>
      <CmHead
        kicker={`${u.university_name} · CareerMatri`}
        title="학과 확인이 필요합니다"
        lead="등록된 학과를 확인하지 못해 검사를 시작할 수 없습니다."
      />
      <p className="cm-note" style={{ marginTop: 16 }}>
        학과 담당자에게 알려 주시면 학교와 함께 확인해 드립니다.
      </p>
      <p className="cm-note" style={{ marginTop: 8 }}>{why}</p>
    </CampusShell>
  );
}
