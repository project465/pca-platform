/**
 * 명단의 타입과 상수.
 *
 * 이 파일에는 서버 전용 모듈(pg 등)을 들이지 않는다. 발급 화면이 클라이언트
 * 컴포넌트라서 여기를 불러오는데, lib/roster.ts 를 직접 부르면 데이터베이스
 * 드라이버가 브라우저 번들까지 따라 들어온다.
 */

/**
 * 한 번에 발급하는 인원.
 * 비밀번호 해싱이 1건당 0.4초쯤 걸려(bcryptjs 12라운드) 10명이면 4초 안팎이다.
 * 이보다 크게 잡으면 한 요청이 길어지고, 작게 잡으면 왕복이 잦아진다.
 */
export const CHUNK_SIZE = 10;

export type RosterEntry = {
  /** 파일에서의 줄 번호. 오류를 그 줄로 되돌려 말해주기 위한 것 */
  line: number;
  loginId: string;
  name: string;
  email: string | null;
};

export type RosterParse = {
  entries: RosterEntry[];
  errors: string[];
  /** 머리글을 알아본 결과. 화면에서 "이 열을 학번으로 읽었습니다"를 보여준다 */
  columns: { loginId: number; name: number; email: number | null };
};

export type IssueResult = {
  loginId: string;
  name: string;
  /** 새로 만든 계정만 임시 비밀번호가 있다. 이미 있던 계정은 건드리지 않는다 */
  tempPassword: string | null;
  status: "created" | "reused";
};
