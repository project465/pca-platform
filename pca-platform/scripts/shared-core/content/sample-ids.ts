/**
 * R38 OUTPUT_CONTENT_QA 의 개선 문단이 인용하는 근거 ID · 스냅샷 값을 실제 엔진에서 뽑는다.
 * 문서에 적힌 ID 를 손으로 지어내지 않으려고 둔다.
 */
import { load, score } from "../../../src/lib/me-v3/scoring/engine";
import { expand } from "../../../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../../../src/lib/me-v3/result/build";
import { casesFor } from "../bench/cases";
import { confirmedKeys, submittedKeys } from "../bench/keys";
import { BIZ_CASE } from "../fixtures/evidence";
import { evId } from "./three-way";

function show(core: string, kind: string, fx = casesFor(core).find((s) => s.kind.startsWith(kind))!.fixture) {
  const loaded = load(core);
  const sub = expand(fx, core);
  const s = score(sub, loaded);
  const m = buildResult(s, loaded);
  const conf = new Set(confirmedKeys(s));
  const sk = submittedKeys(sub);
  console.log(`== ${core} ${kind} · 고유 ${sk.length} · 확인 ${conf.size} · 후보 ${sk.length - conf.size}`);
  console.log("  confirmed:", [...conf].slice(0, 4).map((k) => `${evId(k).id}=${evId(k).text}`).join(" | "));
  console.log("  candidate:", sk.filter((k) => !conf.has(k)).slice(0, 4).map((k) => `${evId(k).id}=${evId(k).text}`).join(" | "));
  console.log("  gaps:", m.gaps.map((g) => `${g.id}:${g.domain}.${g.axis}:${g.kind}:${g.axis ? s.domains.find((d) => d.code === g.domain)!.axes[g.axis].missing : "-"}`).join(" "));
  const d1 = fx.deep[0];
  const dd = s.domains.find((d) => d.code === d1)!;
  console.log(`  ${d1} confirmed=${dd.confirmed.join("+")} empty=${dd.empty.join("+")} missing=${Object.values(dd.axes).map((a) => `${a.axis}:${a.missing}`).join(",")}`);
}
show("BIZ_CORE_V1", "C07");
show("ME_CORE_V3", "C07");
show("ME_CORE_V3", "C04");
show("BIZ_CORE_V1", "BIZ_CASE", BIZ_CASE);
