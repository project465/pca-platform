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

  const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
  global.__pcaPool = pool;
  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params);
  return res.rows;
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
