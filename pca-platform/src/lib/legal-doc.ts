import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * 법정 문서 본문을 파일에서 읽는다.
 *
 * **본문은 표에 담지 않는다.** 담으면 고칠 때 두 곳을 고치게 되고, 둘이
 * 갈리면 어느 쪽에 동의한 것인지 알 수 없다. 표가 들고 있는 것은 어느
 * 판이 언제부터 유효하고 본문이 어디 있는지까지다.
 *
 * **그래서 읽는 자리가 운영에서 깨지면 약관이 통째로 사라진다.** 실제로
 * 그랬다: 운영 이미지에 `sites/careermetri/legal/` 이 안 들어가 있어서
 * `/legal/terms` · `/legal/privacy` · `/legal/refund` 셋이 전부 "본문을
 * 아직 올리지 못했습니다" 로 섰다. 화면은 멀쩡해 보이고 가게는 약관이
 * 없는 상태였다.
 *
 * 고친 것 둘이다. ① `Dockerfile` 이 그 폴더를 넣는다. ② 여기서 **기준
 * 자리를 못 박는다**: 상대 경로를 그냥 넘기면 `process.cwd()` 를 따르는데,
 * standalone 서버의 cwd 는 빌드한 자리와 다르다.
 */
const ROOT = process.cwd();

/**
 * 못 읽은 까닭을 삼키지 않는다.
 *
 * 전에는 `.catch(() => null)` 이라 **파일이 없는 것과 권한이 없는 것과
 * 경로가 틀린 것**이 화면에서 똑같이 생겼다. 셋은 고치는 사람이 다르다.
 */
export type LegalBody =
  | { ok: true; text: string }
  | { ok: false; why: "missing" | "outside" | "unreadable"; detail: string };

export async function readLegalBody(rel: string): Promise<LegalBody> {
  const file = path.resolve(ROOT, rel);
  /* 올려 둔 자리 밖으로 나가지 못한다. 이 값은 DB 의 `body_path` 에서도
     오므로, 한 줄만 새면 저장소 전체가 열린다 */
  if (!file.startsWith(ROOT + path.sep)) {
    return { ok: false, why: "outside", detail: rel };
  }
  try {
    const text = await readFile(file, "utf8");
    return { ok: true, text };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return {
      ok: false,
      why: code === "ENOENT" ? "missing" : "unreadable",
      detail: `${rel} (${code ?? "unknown"})`,
    };
  }
}

/** 운영에서 본문이 서는지 한 번에 본다. `launch:check` 가 이것을 쓴다 */
export const LEGAL_FILES = [
  "sites/careermetri/legal/01-terms.md",
  "sites/careermetri/legal/02-privacy.md",
  "sites/careermetri/legal/03-refund.md",
] as const;
