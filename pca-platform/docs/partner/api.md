# CareerMatri MAT 연동 API (제휴사 개발 담당자용) · 초안 v0.2 (2026-11-02)

제휴 사이트(잡인더스트리 · 커리어피크)의 **MAT 단추**를 누른 회원이 다시 가입하거나 다시 입력하지 않고
CareerMatri MAT(AI 취업비서)으로 넘어오게 하는 연동입니다. 제휴사 서버가 CareerMatri 서버를 한 번 부르고,
돌려받은 **한 번 쓰는 링크**로 회원을 보내면 됩니다.

> 실제 키 값은 이 문서와 메일 · 메신저에 적지 않습니다. 키는 CareerMatri 운영자 화면에서 한 번만 보이며,
> 정한 안전한 경로(예: 비밀번호를 건 파일, 대면 전달)로만 전합니다.

## 1. 흐름

```
회원 ──(MAT 단추 클릭)──▶ 제휴사 서버
제휴사 서버 ──POST /api/partner/{partner}/session (API 키)──▶ CareerMatri
CareerMatri ──201 { url, expires_at }──▶ 제휴사 서버
제휴사 서버 ──302 Location: url──▶ 회원 브라우저 ──▶ CareerMatri 동의 화면 ──▶ MAT
```

1. 회원이 MAT 단추를 누르면 **제휴사 서버가** 아래 API 를 부릅니다(브라우저에서 부르지 않습니다).
2. 응답의 `url` 로 회원을 보냅니다(302 리디렉션 또는 새 창).
3. 처음 온 회원은 CareerMatri 화면에서 **넘겨받은 항목을 확인하고 약관에 동의**합니다. 이미 연결된 회원은 `계속` 한 번이면 됩니다.
4. 회원이 보던 공고(`posting_id`)가 있으면 그 공고와 내 경험이 얼마나 맞는지부터 보여 줍니다.

## 2. API

`POST https://app.careermatri.com/api/partner/{partner}/session`

`{partner}` 는 제휴마다 정해진 이름입니다: 잡인더스트리 `jobindustry` · 커리어피크 `careerpeak`.

### 머리글(헤더)

| 이름 | 값 | 비고 |
|---|---|---|
| `Authorization` | `Bearer cmk_{test|live}_{12자}_{비밀}` | 제휴사 서버에만 둡니다. 브라우저 · 주소 · 로그에 넣지 않습니다 |
| `Content-Type` | `application/json` | |
| `X-CM-Timestamp` | 지금 유닉스 시각(초) | CareerMatri 서버 시각과 **±300초** 안이어야 합니다 |
| `X-CM-Nonce` | 영문 · 숫자 · `-` · `_` 16~64자 | **요청마다 새 값.** 같은 값을 두 번 보내면 `409 replay` |

### 본문(JSON)

```json
{
  "member_id": "제휴사 회원 고유번호",
  "posting_id": "회원이 보고 있던 공고 번호(게시판 idx). 없으면 생략",
  "profile": {
    "display_name": "이름 또는 별명",
    "interest_jobs": ["품질관리"],
    "interest_regions": ["대전"],
    "education": [{ "school": "학교", "major": "전공", "grad_year": "2025" }],
    "certificates": [{ "name": "자격증 이름", "acquired": "2024-06" }],
    "career_summary": [{ "period": "2024.01~2024.06", "role": "직무" }]
  }
}
```

- `member_id` (필수): 영문 · 숫자 · `._:@-` 1~120자. **바뀌지 않는 회원 번호**를 보내 주세요(이메일 · 이름이 아닌 값). 같은 번호는 늘 같은 CareerMatri 계정으로 이어집니다.
- `profile` (선택): **회원이 동의한 항목만** 보내 주세요. 위 여섯 칸 밖의 값(연락처 · 주소 · 사진 · 생년월일 · 회사 이름 등)은 받아도 버립니다.
- 넘겨받은 요약은 회원 동의 화면에 그대로 보이고, 연결이 끝나면 지웁니다. 쓰지 않은 링크의 요약은 만료 뒤 지웁니다.

### 응답

`201 Created`

```json
{ "url": "https://app.careermatri.com/from/{partner}/enter?t=…", "expires_at": "…", "expires_in": 300 }
```

- `url` 은 **5분 동안 한 번만** 쓸 수 있습니다. 미리 만들어 두지 말고 단추를 누른 순간 받아 주세요.
- 링크를 여는 것만으로는 로그인되지 않습니다(링크 미리보기 안전). 회원이 화면의 단추를 눌러야 쓰입니다.

### 오류

| 상태 | `error` | 뜻 · 할 일 |
|---|---|---|
| 400 | `bad_member_id` · `bad_nonce` · `bad_json` | 값의 꼴을 확인 |
| 401 | `bad_key` | 키가 틀렸거나 폐기됨 |
| 403 | `partner_off` | 연동이 아직 꺼져 있음(CareerMatri 가 켭니다) |
| 403 | `live_key_in_test` | 시험 단계에서는 시험 키만 받습니다 |
| 403 | `ip_not_allowed` | 허용 IP 목록 밖에서 보냄 |
| 404 | `unknown_partner` | 주소의 제휴 이름이 틀림 |
| 409 | `replay` | 같은 nonce 를 다시 보냄. 새 nonce 로 다시 |
| 415 | `json_only` | `Content-Type: application/json` 필요 |
| 422 | `stale_timestamp` | 서버 시각을 맞춰 주세요(NTP) |

## 3. 예시

### curl

```bash
curl -X POST https://app.careermatri.com/api/partner/jobindustry/session \
  -H "Authorization: Bearer $CM_KEY" \
  -H "Content-Type: application/json" \
  -H "X-CM-Timestamp: $(date +%s)" \
  -H "X-CM-Nonce: $(openssl rand -hex 16)" \
  -d '{"member_id":"12345","posting_id":"5678"}'
```

### PHP

```php
$ch = curl_init('https://app.careermatri.com/api/partner/jobindustry/session');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . getenv('CM_KEY'),
    'Content-Type: application/json',
    'X-CM-Timestamp: ' . time(),
    'X-CM-Nonce: ' . bin2hex(random_bytes(16)),
  ],
  CURLOPT_POSTFIELDS => json_encode(['member_id' => $memberId, 'posting_id' => $postingIdx]),
  CURLOPT_TIMEOUT => 10,
]);
$res = json_decode(curl_exec($ch), true);
if (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 201) { header('Location: ' . $res['url'], true, 302); exit; }
```

### Node.js

```js
const r = await fetch("https://app.careermatri.com/api/partner/jobindustry/session", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.CM_KEY}`,
    "Content-Type": "application/json",
    "X-CM-Timestamp": String(Math.floor(Date.now() / 1000)),
    "X-CM-Nonce": crypto.randomUUID().replace(/-/g, ""),
  },
  body: JSON.stringify({ member_id: memberId, posting_id: postingIdx }),
});
if (r.status === 201) res.redirect(302, (await r.json()).url);
```

## 4. 시험 키와 운영 전환

1. CareerMatri 운영자가 **시험 키**를 만들어 전달합니다. 이때 연동 상태를 `시험`으로 켭니다(시험 키만 받음).
2. 제휴사는 시험 서버에서 위 흐름을 확인합니다. 허용 IP 를 쓰려면 제휴사 서버의 고정 IP 를 알려 주세요.
3. 확인이 끝나면 운영 키를 받고, CareerMatri 대표 승인 뒤 상태를 `운영`으로 바꿉니다.
4. 키는 언제든 교체할 수 있습니다: 새 키 발급 → CareerMatri 가 옛 키를 **24시간 뒤 폐기**로 돌림(그동안 두 키 모두 받음) → 제휴사가 새 키로 바꿈.
5. 허용 IP: 처음에는 비워 두고(제한 없이 받되 호출마다 IP 를 기록), 제휴사가 서버 고정 IP 를 주면 그때 켭니다.
6. 실패한 호출도 까닭 코드(`bad_key` · `stale` · `replay` · `ip` …)와 함께 기록합니다. 본문 · 키는 기록하지 않습니다.

## 5. 돌아가는 링크

MAT 의 공고 카드에서 `공고 원문 보기`를 누르면 원문 공고 화면(잡인더스트리)으로 갑니다. 주소에
`utm_source=careermatri&utm_medium=mat` 이 붙습니다(사람을 가리키는 값은 없습니다). 유입 통계에 써 주세요.

## 6. 정해진 것 · 정할 것

- 결제는 CareerMatri 에서 받습니다(개인 이용권 30일 ₩9,900 · 90일 ₩24,900). 어느 길로 와도 같은 이용권 기록을 씁니다.
- 정산: 잡인더스트리 · 커리어피크 모두 유입 회원 결제액의 20%(계약서로 확정). 월별 정산 내역은 2단계에서 드립니다.
- 넘겨받는 이력서 항목은 위 여섯 칸으로 한정합니다(두 제휴 같음).
- 공고 수집용 잡인더스트리 API 문서 · 키를 받으면 지금의 공개 화면 수집을 그쪽으로 바꿉니다.
- 사이트별 단추 · 붙일 자리: `jobindustry.md` · `careerpeak.md`. 단추 모양: `button.html`.
- 문의: CareerMatri 운영(hari_info@hari.re.kr)
