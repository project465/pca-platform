import { MODE_KO, MODE_NOTE, type TrackMode } from "@/lib/jju/program";

/**
 * 시연 서버라는 표시. **운영에서는 서지 않는다**(부르는 쪽이 `demoServer()`
 * 로 가린다).
 *
 * 시연 화면은 운영 화면과 똑같이 생겨서, 눌러 본 사람이 합성 데이터의 수를
 * 실제 학생 수로 읽는다. 쪽마다 맨 위에 적는다.
 */
export function DemoRibbon() {
  return (
    <p className="jju-ribbon" role="note">
      <b>시연 환경</b>
      트랙과 기수는 공식 교육과정 확인 전 가안이고, 학생과 응시는 합성 데모
      데이터입니다.
    </p>
  );
}

/** 트랙이 지금 어떻게 열리는가. **색만으로 말하지 않는다**: 글자가 먼저다 */
export function ModeChip({ mode }: { mode: TrackMode }) {
  return (
    <span className={`jju-mode is-${mode.toLowerCase()}`} title={MODE_NOTE[mode]}>
      {MODE_KO[mode]}
    </span>
  );
}
