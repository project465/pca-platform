/**
 * 중요한 일이 **왜 안 됐는지**를 남기는 한 자리.
 *
 * 이 파일이 생긴 까닭. 운영에서 `pdf failed` 를 본 사람이 로그를 뒤져도
 * 아무 줄이 없었다. 부르는 쪽이 `catch {}` 로 받아 까닭을 버렸기
 * 때문이다. 그래서 브라우저가 안 뜬 것과 결과 쪽이 500 인 것과 시간
 * 초과가 **밖에서 전부 같은 상태로 보였다.** 셋은 고치는 사람이 다르다.
 *
 * 그 뒤로 자리마다 `console.error` 를 손으로 적었는데, 적는 모양이
 * 제각각이라 **찾아 읽을 수가 없다.** 한 줄로 모은다.
 *
 * ## 남기는 것 다섯
 *
 *   operation   무엇을 하다 틀어졌는가      `consent.record`
 *   ref         누구의/어느 것의 일인가     **비식별 식별자만**
 *   step        그 안의 어느 걸음인가       `insert`
 *   category    어떤 종류의 실패인가        `db` · `upstream` · `config`
 *   at          언제                        ISO 8601
 *
 * ## 남기지 않는 것
 *
 * **이메일 · 이름 · 비밀번호 · 토큰 · 자유입력을 적지 않는다.** 로그는
 * 파기 대상이 아닌 자리에 오래 남고, 거기 개인정보가 들어가면 그 로그가
 * 개인정보가 된다. `ref` 에 넣는 것은 숫자 번호(`user#182` ·
 * `attempt#1394`)까지이고, 그 번호만으로는 사람을 알 수 없다.
 *
 * 그래서 `ref()` 가 **들어온 값을 검사한다**: `@` 가 있거나 너무 길면
 * 그 자리에서 잘라 낸다. 적는 사람이 실수해도 로그에는 안 들어간다.
 */

export type ErrorCategory =
  /** DB 가 거절했거나 닿지 않는다 */
  | "db"
  /** 남의 서비스(결제·메일·공급자)가 거절했다 */
  | "upstream"
  /** 꽂혀 있어야 하는 값이 없다 */
  | "config"
  /** 들어온 값이 규칙에 안 맞는다 */
  | "input"
  /** 있어야 하는 것이 없다 */
  | "missing"
  /** 위 어디에도 안 들어간다 */
  | "unknown";

/**
 * 로그에 실을 수 있는 모양으로 줄인다.
 *
 * **이메일과 긴 글자를 통과시키지 않는다.** 적는 사람이 실수로 주소를
 * 넘겨도 여기서 걸러진다.
 */
export function ref(kind: string, id: string | number | null | undefined): string {
  const raw = String(id ?? "").trim();
  if (!raw) return `${kind}#?`;
  /* 숫자 번호와 짧은 코드만 그대로 둔다. 그 밖은 길이만 적는다 */
  if (/^[0-9]{1,12}$/.test(raw)) return `${kind}#${raw}`;
  if (/^[A-Za-z0-9_-]{1,24}$/.test(raw) && !raw.includes("@")) return `${kind}#${raw}`;
  return `${kind}#<${raw.length}자>`;
}

/** 던져진 것에서 **한 줄만** 꺼낸다. stack 은 적지 않는다 */
export function why(e: unknown, max = 300): string {
  const m = e instanceof Error ? e.message : String(e ?? "");
  return m.split("\n")[0].slice(0, max);
}

export type OpFail = {
  operation: string;
  ref?: string;
  step?: string;
  category?: ErrorCategory;
  /** 더 적을 것. **사람이 쓴 글과 개인정보를 넣지 않는다** */
  detail?: string;
};

/**
 * 한 줄로 적는다.
 *
 * **사용자 화면에 이 줄을 그대로 내보내지 않는다.** 화면에는 무엇을 할
 * 수 있는지를 적고, 여기 적힌 것은 고치는 사람이 읽는다.
 */
export function opFail(f: OpFail, e?: unknown): void {
  const parts = [
    `[op] ${f.operation}`,
    f.ref ? `ref=${f.ref}` : "",
    `step=${f.step ?? "-"}`,
    `cat=${f.category ?? "unknown"}`,
    `at=${new Date().toISOString()}`,
    f.detail ? `detail=${f.detail.slice(0, 200)}` : "",
    e === undefined ? "" : `:: ${why(e)}`,
  ].filter(Boolean);
  console.error(parts.join(" "));
}

/**
 * 삼켜도 되지만 **남기고 넘어가야 하는** 자리.
 *
 * 쓰는 모양이 `await x().catch(swallow({...}))` 다. 돌려주는 값이
 * `undefined` 라, 부르는 쪽은 전과 같이 흘러간다. 다른 것은 로그 한
 * 줄이 남는다는 것뿐이다.
 *
 * **MUST FAIL 자리에 쓰지 않는다.** 데이터 정합성이 걸린 자리는 삼키면
 * 안 되고, 거기서는 부르는 쪽이 실패를 돌려줘야 한다.
 */
export function swallow(f: OpFail): (e: unknown) => undefined {
  return (e: unknown) => { opFail(f, e); return undefined; };
}
