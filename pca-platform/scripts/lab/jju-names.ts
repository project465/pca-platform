/** 지역 회사 이름에서 사람이 깨졌다고 읽을 모양을 센다 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { loadInputs } from "../../src/lib/me-v3/report-long/data";
import { derive } from "../../src/lib/me-v3/report-long/derive";
import { regionView } from "../../src/lib/me-v3/report-long/region";
const short = (n: string) => n.replace(/\(주\)|주식회사|㈜/g, "").trim();
async function main(): Promise<void> {
  const x = await loadInputs(process.env.ID ?? "1");
  const rv = regionView(x, derive(x).name)!;
  const bad: Record<string, string[]> = {};
  const add = (k: string, n: string) => (bad[k] ??= []).push(n);
  for (const o of rv.all) {
    const s = short(o.name);
    if (/\s{2,}/.test(s)) add("겹친 빈칸", o.name);
    if (/[�?□]/.test(o.name)) add("깨진 글자", o.name);
    if (/&[a-z#0-9]+;/i.test(o.name)) add("HTML 엔티티", o.name);
    if (/농업회사법인|농업법인|영농조합|유한회사|\(유\)|사단법인|재단법인|합자회사|합명회사/.test(s)) add("법인 꼴 남음", o.name);
    if ((s.match(/\(/g) ?? []).length !== (s.match(/\)/g) ?? []).length) add("괄호 짝 안 맞음", o.name);
    if (/^[\s·,.()-]|[\s·,.(-]$/.test(s)) add("앞뒤 부호", o.name);
    if (/[A-Za-z]/.test(s) && /[가-힣]/.test(s) && /[가-힣][A-Za-z]|[A-Za-z][가-힣]/.test(s)) add("한영 붙음", o.name);
  }
  for (const [k, v] of Object.entries(bad)) console.log(`${k} ${v.length}: ${v.slice(0, 8).join(" | ")}`);
  console.log("전체", rv.all.length);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
