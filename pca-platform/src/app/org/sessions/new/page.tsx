import { query } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { contractsOf, myOrgIds, orgNameOf } from "@/lib/org";
import OrgShell from "@/components/org-shell";
import SessionForm, { type Option } from "./session-form";

export const metadata = { title: "회차 만들기 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

export default async function NewSessionPage() {
  const user = await requireRole(["org_admin"]);
  const orgIds = myOrgIds(user);

  const [contracts, instruments, orgName] = await Promise.all([
    contractsOf(orgIds),
    query<{ id: string; version: string; major_id: string; major_code: string }>(
      `SELECT i.id, i.version, i.major_id, m.code AS major_code
         FROM instruments i
         JOIN majors m ON m.id = i.major_id
        WHERE i.status = 'published'
        ORDER BY i.published_at DESC`,
    ),
    orgIds[0] ? orgNameOf(orgIds[0], user.locale) : Promise.resolve(null),
  ]);

  const majorNames = await namesOf(
    "majors",
    instruments.map((i) => i.major_id),
    user.locale,
  );

  const contractOptions: Option[] = contracts
    .filter((c) => !c.expired)
    .map((c) => ({
      id: c.id,
      label: `${c.title} — 응시권 ${c.free_seats}개 남음 (~${c.ends_on})`,
    }));

  const instrumentOptions: Option[] = instruments.map((i) => ({
    id: i.id,
    label: `${majorNames.get(i.major_id) ?? i.major_code} ${i.version}`,
  }));

  return (
    <OrgShell user={user} orgName={orgName}>
      <div className="page-head">
        <h1>회차 만들기</h1>
      </div>
      <div className="panel form-panel">
        <SessionForm contracts={contractOptions} instruments={instrumentOptions} />
      </div>
    </OrgShell>
  );
}
