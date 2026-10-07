/**
 * 찍은 PDF 가 **재배포를 넘기는가.**
 *
 * 결과지 PDF 는 디스크에 남는다. 그 자리가 이미지 안쪽이면 다음 배포에
 * 이미지와 함께 새로 만들어지고, **돈을 낸 사람의 결과지가 그 자리에서
 * 전부 사라진다.** 화면은 멀쩡하고 `/my` 의 내려받기 단추만 404 가 된다.
 * 전자상거래법이 요구하는 5년 보존도 같이 깨진다.
 *
 * 그래서 묻는 것이 셋이다.
 *
 *   1. 어디에 쌓는지 정해져 있는가   `REPORT_PDF_DIR`
 *   2. 거기에 쓸 수 있는가           실제로 써 본다
 *   3. **재배포를 넘기는가**          `/proc/mounts` 에 제 줄로 서 있는가
 *
 * **한 구현을 두 곳이 읽는다**(설계 원칙 10): `/admin/launch` 와
 * `npm run ops:check` 가 같은 함수를 부른다. 따로 재면 어느 날 화면만
 * 초록이 된다.
 *
 * **배포본 밖에서는 3번에 답할 수 없다.** 개발 PC 의 폴더가 마운트가 아닌
 * 것은 당연하고, 그것으로 "운영에서 PDF 가 사라진다" 고 적으면 거짓이다.
 * 그 자리는 `unknown` 이고, 거짓과 섞지 않는다.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

export type PdfVolume = {
  dir: string | null;
  /** `null` 은 **아직 모른다**는 뜻이다. 거짓과 섞지 않는다 */
  persistent: boolean | null;
  writable: boolean | null;
  detail: string;
  /** 모르는 자리를 답으로 바꾸는 방법. 모를 때만 찬다 */
  how: string | null;
};

/**
 * 이 프로세스가 **그 배포본 안에 있는가.**
 *
 * Railway 는 컨테이너에 `RAILWAY_*` 를 꽂아 주고, 우리 이미지는 뿌리에
 * `server.js` 를 둔다. 둘 중 하나라도 있으면 배포본 안이다.
 */
export function inDeployment(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_SERVICE_NAME
    || existsSync("/app/server.js"),
  );
}

export function pdfVolume(): PdfVolume {
  const dir = (process.env.REPORT_PDF_DIR ?? "").trim();
  if (!dir) {
    return {
      dir: null, persistent: false, writable: null,
      detail: "REPORT_PDF_DIR 이 비어 있어 결과지 PDF 가 어디에 쌓이는지 정해져 " +
        "있지 않습니다. 이미지 안쪽 임시 자리에 떨어지고 재배포에 사라집니다.",
      how: null,
    };
  }
  if (!existsSync(dir)) {
    return inDeployment()
      ? { dir, persistent: false, writable: false,
        detail: `${dir} 가 없습니다. 첫 PDF 에서 쓰기가 실패합니다.`, how: null }
      : { dir, persistent: null, writable: null,
        detail: `REPORT_PDF_DIR=${dir} 인데 이 자리에 그 폴더가 없습니다. 배포본이 아닙니다.`,
        how: "운영 컨테이너에서 돌립니다." };
  }

  /**
   * **써 보고 읽어 본다. 그리고 쓴 것만 지운다.**
   *
   * 빈 파일을 만들었다 지우는 것으로는 모자랐다: 결과지 PDF 는 1MB 쯤이고,
   * 용량이 찬 볼륨은 0바이트는 받아 주면서 1MB 에서 실패한다. 그래서
   * **PDF 한 장 크기**를 쓰고 되읽어 바이트가 같은지까지 본다.
   *
   * 이름에 `.probe-` 와 프로세스 번호를 넣는다. 손님의 PDF 는 `<응시번호>-
   * <시각>.pdf` 꼴이라 겹칠 수 없고, **지우는 것은 이 파일 하나뿐이다.**
   * 다른 파일은 열어 보지도 않는다.
   */
  let writable = false;
  let wrote = 0;
  try {
    const probe = path.join(dir, `.probe-${process.pid}.pdf`);
    /* 앞머리를 PDF 로 둔다. 남아 버린 파일을 본 사람이 무엇인지 알게 */
    const body = Buffer.concat([
      Buffer.from("%PDF-1.4\n% CareerMatri ops:check 쓰기 시험용. 지워도 됩니다.\n"),
      Buffer.alloc(1_000_000, 0x20),
    ]);
    writeFileSync(probe, body);
    const back = readFileSync(probe);
    wrote = back.length;
    const same = back.length === body.length && back.subarray(0, 5).toString() === "%PDF-";
    unlinkSync(probe);
    writable = same;
  } catch { /* 못 쓰는 것도 답이다 */ }
  if (!writable) {
    return { dir, persistent: null, writable: false,
      detail: `${dir} 에 쓸 수 없습니다. 결제를 마친 손님이 내려받기를 누른 ` +
        `자리에서 멈춥니다. 붙여 준 디스크의 주인이 root 면 ` +
        `deploy/entrypoint.sh 가 고쳐 줍니다.`,
      how: null };
  }

  if (!inDeployment()) {
    return { dir, persistent: null, writable: true,
      detail: `${dir} 에 쓸 수 있습니다. 붙여 준 디스크인지는 배포본 안에서만 봅니다.`,
      how: `Railway → 서비스 → Settings → Volumes 에 Mount path 가 ${dir} 인 ` +
        `볼륨이 있는지 봅니다. 없으면 지금 만듭니다.` };
  }

  let mounts = "";
  try { mounts = readFileSync("/proc/mounts", "utf8"); } catch { /* 리눅스가 아니다 */ }
  if (!mounts) {
    return { dir, persistent: null, writable: true,
      detail: `${dir} 에 쓸 수 있습니다. /proc/mounts 를 못 읽어 붙여 준 디스크인지 모릅니다.`,
      how: `Railway → 서비스 → Settings → Volumes 의 Mount path 가 ${dir} 인지 봅니다.` };
  }

  /* 그 자리이거나 그 위 어느 자리가 제 줄로 서 있으면 붙여 준 디스크다.
     뿌리(`/`)는 이미지 자신이므로 세지 않는다 */
  const resolved = path.resolve(dir);
  const mounted = mounts.split("\n").some((l) => {
    const at = l.split(/\s+/)[1];
    if (!at || at === "/") return false;
    return at === resolved || resolved.startsWith(at + "/");
  });
  /* **이미 쌓인 것이 몇 장이고 아직 읽히는가.** 쓸 수 있다는 것과 어제
     찍은 것이 아직 있다는 것은 다른 질문이다. 읽기만 하고 고치지 않는다 */
  let kept = 0;
  let readable: string | null = null;
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith(".pdf") && !f.startsWith(".probe-"));
    kept = files.length;
    if (files.length) {
      const one = readFileSync(path.join(dir, files[0]));
      readable = one.subarray(0, 5).toString() === "%PDF-" ? "읽힙니다" : "앞머리가 PDF 가 아닙니다";
    }
  } catch { /* 못 세도 아래 판정은 선다 */ }
  const held = kept
    ? ` 이미 ${kept}장이 쌓여 있고 그 중 한 장이 ${readable}.`
    : " 아직 쌓인 것은 없습니다.";

  return mounted
    ? { dir, persistent: true, writable: true,
      detail: `${dir} 가 붙여 준 디스크이고 ${(wrote / 1000) | 0}KB 를 쓰고 ` +
        `되읽었습니다. 재배포를 넘깁니다.${held}`,
      how: null }
    : { dir, persistent: false, writable: true,
      detail: `${dir} 가 이미지 안쪽입니다. **다음 재배포에 구매자의 PDF 가 ` +
        `전부 사라집니다.**${held} Railway → 서비스 → Settings → Volumes 에서 ` +
        `${dir} 에 볼륨을 걸어야 합니다.`,
      how: null };
}
