/**
 * 첫 화면 hero 의 그림.
 *
 * **장식이 아니라 hero 의 한 축이다.** 왼쪽에 큰 글이 서고 오른쪽에 이
 * 그림이 서서, 결과지의 첫 화면이 판정을 발표하는 자리가 아니라 학생이
 * 쓰는 화면으로 읽히게 한다.
 *
 * 세 가지를 지킨다.
 *
 * - **값을 그리지 않는다.** 이 그림에는 눈금도 수치도 축도 없다. 응답에
 *   따라 모양이 바뀌지도 않는다. 결과를 말하는 것은 글과 아래 그래프이고,
 *   여기서 무언가를 가리키면 읽는 사람이 그림에서 자기 점수를 읽으려 한다
 *   (종이 표지에서 레이더를 걷은 것과 같은 까닭이다).
 * - **내려받지 않는다.** 바깥 그림 파일도 글꼴도 쓰지 않는 inline SVG 라,
 *   종이를 그리는 머리 없는 브라우저에서도 그대로 선다.
 * - **색은 `--r-*` 토큰을 따르지 않고 여기서 못 박는다.** 이 그림의 파랑과
 *   mint 와 lilac 은 면의 색이지 상태의 색이 아니다. 토큰을 쓰면 나중에
 *   강조색을 바꾸는 날 그림의 사람 옷 색이 같이 바뀐다.
 *
 * 보조기기에는 읽히지 않는다(`aria-hidden`). 그림이 말하는 것이 바로
 * 옆 글과 같아서, 읽어 주면 같은 말을 두 번 듣는다.
 */
export function StudyArt() {
  return (
    <svg viewBox="0 0 320 250" role="presentation" focusable="false">
      {/* 뒤에 깔리는 면 둘. 담긴 것이 없는 색면이라 아주 옅다 */}
      <circle cx="176" cy="104" r="92" fill="#e9f1fd" />
      <path
        d="M58 186c0-34 26-58 60-58s56 20 62 44c4 16-10 26-32 26H82c-16 0-24-4-24-12z"
        fill="#e7f6f1"
      />

      {/* 작은 손그림 느낌의 보조 표시 셋. 전구 · 그래프 · 문서 */}
      <g stroke="#f2b23c" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M62 44c0-7 6-12 13-12s13 5 13 12c0 5-3 8-5 11h-16c-2-3-5-6-5-11z" fill="#fdf0d6" />
        <path d="M70 61h10M72 67h6" />
      </g>
      <g fill="#0f7f6c">
        <rect x="246" y="48" width="44" height="34" rx="9" fill="#dff2ec" />
        <rect x="254" y="66" width="6" height="10" rx="3" />
        <rect x="264" y="58" width="6" height="18" rx="3" />
        <rect x="274" y="62" width="6" height="14" rx="3" />
      </g>
      <g>
        <rect x="252" y="140" width="38" height="46" rx="10" fill="#eeebf9" />
        <g stroke="#6f63a6" strokeWidth="2.6" strokeLinecap="round">
          <path d="M262 156h18M262 164h18M262 172h11" />
        </g>
      </g>

      {/* 책상 */}
      <rect x="78" y="186" width="168" height="9" rx="4.5" fill="#cfd9ea" />
      <rect x="96" y="195" width="8" height="30" rx="4" fill="#dde4f0" />
      <rect x="220" y="195" width="8" height="30" rx="4" fill="#dde4f0" />

      {/* 사람. 앉아서 화면을 보고 뭔가 적는 자리다 */}
      <g>
        {/* 머리와 머리카락 */}
        <path d="M138 70c0-14 11-24 25-24s25 10 25 24v6c0 14-11 24-25 24s-25-10-25-24z" fill="#f2cdae" />
        <path d="M136 72c-1-18 12-30 27-30s28 11 27 29c-5-9-14-13-27-13s-22 5-27 14z" fill="#2c3548" />
        {/* 목과 몸 */}
        <path d="M156 96h16v12h-16z" fill="#e8bd9b" />
        <path
          d="M128 186c0-30 16-50 36-50s36 20 36 50z"
          fill="#2563c9"
        />
        {/* 팔 하나가 책상으로 간다 */}
        <path
          d="M196 150c12 4 20 14 22 26 1 6-3 10-9 10h-14v-14l-8-10z"
          fill="#1f54ad"
        />
        <circle cx="206" cy="182" r="8" fill="#f2cdae" />
      </g>

      {/* 노트북 */}
      <g>
        <path d="M118 182l10-40h66l10 40z" fill="#f4f7fc" />
        <path d="M124 176l8-28h58l8 28z" fill="#ffffff" />
        <g stroke="#9db4d8" strokeWidth="2.4" strokeLinecap="round">
          <path d="M138 158h38M138 166h26" />
        </g>
        <rect x="112" y="180" width="96" height="8" rx="4" fill="#dde6f4" />
      </g>

      {/* 다 한 것에 붙는 확인 하나. 눈금이 아니라 표시다 */}
      <g>
        <circle cx="226" cy="124" r="15" fill="#0f7f6c" />
        <path
          d="M219 124l5 5 10-10"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
