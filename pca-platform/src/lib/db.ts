import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * pg 풀은 개발 중 HMR로 모듈이 다시 평가돼도 하나만 유지한다.
 * BIGINT(OID 20)는 드라이버 기본값대로 문자열로 받는다. 자바스크립트 number로
 * 바꾸면 큰 id에서 정밀도가 깨지므로, 애플리케이션에서도 id는 문자열로 다룬다.
 */
declare global {
  // eslint-disable-next-line no-var
  var __pcaPool: Pool | undefined;
}

/**
 * 풀은 첫 질의 때 만든다. 모듈을 불러오는 시점에 만들면 스크립트에서
 * .env 를 읽기 전에 접속 문자열이 굳어버린다.
 */
function getPool(): Pool {
  if (global.__pcaPool) return global.__pcaPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL 이 설정되지 않았습니다. .env.local 을 확인하세요.");
  }

  /**
   * 바깥 프록시로 붙을 때만 TLS 를 켠다.
   *
   * 관리형 DB 는 같은 사설망 안에서는 평문으로 받고(`*.internal`),
   * 바깥 주소로 붙을 때는 TLS 를 요구한다. 그 인증서가 사설 CA 라
   * 기본 검증으로는 거절되므로 `DATABASE_SSL=require` 일 때만 느슨하게
   * 연다. **기본은 꺼 둔다**: 켜 두면 사설망 접속까지 느려진다.
   */
  const ssl = (process.env.DATABASE_SSL ?? "").toLowerCase() === "require"
    || /[?&]sslmode=require/.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined;

  const pool = new Pool({
    connectionString,
    ssl,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    /* 처음 붙는 데 걸리는 한도. 관리형 DB 가 아직 깨어나는 중이면
       여기서 기다렸다가 아래 재시도가 한 번 더 본다 */
    connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 10_000),
  });

  /**
   * **쉬고 있는 연결이 끊겼다고 프로세스를 죽이지 않는다.**
   *
   * 관리형 DB 는 점검이나 재배포로 연결을 끊는데, `pg` 는 그것을 풀의
   * `error` 로 올린다. 받아 주는 자리가 없으면 Node 가 통째로 죽고,
   * 그러면 **DB 가 1초 끊긴 일이 앱이 재시작하는 일**이 된다.
   */
  pool.on("error", (err) => {
    console.error("[db] 쉬고 있던 연결이 끊겼습니다:", err.message);
  });

  global.__pcaPool = pool;
  return pool;
}

/** 다시 해 볼 만한 실패인가. **질의가 틀린 것은 다시 해도 틀린다** */
function transient(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code ?? "";
  const msg = String((e as { message?: string } | null)?.message ?? "");
  return ["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "EPIPE", "57P01", "57P03", "08006", "08003"]
    .includes(code)
    || /terminat|starting up|shutting down|Connection terminated/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 질의 한 번. **못 붙은 것과 틀린 것을 가른다.**
 *
 * 배포 직후나 DB 재시작 직후에는 몇 초 동안 접속이 거절된다. 그때
 * 첫 손님에게 오류를 돌려주는 대신 두 번 더 해 본다(0.3초 · 1.2초).
 * **문법이 틀린 질의는 다시 하지 않는다**: 다시 해도 틀리고, 그 사이
 * 손님은 세 배로 기다린다.
 */
export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await getPool().query<T>(text, params);
      return res.rows;
    } catch (e) {
      last = e;
      if (!transient(e) || i === 2) break;
      /* 끊긴 풀은 버린다. 다음 질의가 새로 만든다 */
      try { await global.__pcaPool?.end(); } catch { /* 이미 닫혔다 */ }
      global.__pcaPool = undefined;
      await sleep(i === 0 ? 300 : 1_200);
    }
  }
  throw last;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** 여러 문장을 한 트랜잭션으로 묶는다. 예외가 나면 통째로 되돌린다. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
