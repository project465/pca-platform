# Track E · Gold Master 를 운영에서 돌리려면 이미지에 들어가야 하는 파일

`scripts/lab/gm-student.ts` 가 읽는 파일 전부다. **이 회차는 `Dockerfile` · `deploy/runtime-needs.json` 을 고치지 않았다**:
배포 변경은 총괄 PM 승인 사항이다(Core 요청 3). 아래 표는 승인 뒤에 그대로 옮길 목록이다.

| 파일 | 바이트 | sha256(앞 16) | 지금 이미지에 | 어디에 있나 |
|---|---|---|---|---|
| `data/report-gm/biz-pro-toc.v1.json` | 37,671 | `4ad7ba335723dca8` | **없음** | 저장소 |
| `data/report-gm/biz-role-guide.json` | 52,553 | `da0316a0284b3789` | **없음** | 저장소 |
| `data/report-gm/biz-company-guide.json` | 40,125 | `2366f854142afa38` | **없음** | 저장소 |
| `data/region/dart-checks.v1.json` | 20,066 | `b952c6d712484c63` | **없음** | 저장소 |
| `data/region/dart-overview.v1.json` | 17,739 | `d9a4286da31fab62` | **없음** | 저장소 |
| `data/region/kr-chungcheong-orgs.v2.json` | 58,079 | `eccba07c16ee6dcc` | **없음** | 저장소 |
| `var/pdf-gm/fonts/pretendard/LICENSE.txt` | 4,419 | `b04538c9abec39a3` | **없음** | **저장소 밖** (gitignore) |
| `var/pdf-gm/fonts/pretendard/Pretendard-Bold.woff2` | 791,156 | `4609c3356e536faf` | **없음** | **저장소 밖** (gitignore) |
| `var/pdf-gm/fonts/pretendard/Pretendard-ExtraBold.woff2` | 793,540 | `dd7c1e156f508eb9` | **없음** | **저장소 밖** (gitignore) |
| `var/pdf-gm/fonts/pretendard/Pretendard-Medium.woff2` | 778,432 | `d03481330eeba065` | **없음** | **저장소 밖** (gitignore) |
| `var/pdf-gm/fonts/pretendard/Pretendard-Regular.woff2` | 765,892 | `fad853f7f47c6c8b` | **없음** | **저장소 밖** (gitignore) |
| `var/pdf-gm/fonts/pretendard/Pretendard-SemiBold.woff2` | 785,856 | `c863f76a7de5c1dd` | **없음** | **저장소 밖** (gitignore) |

- 글꼴: Pretendard 1.3.9 (SIL OFL 1.1). woff2 만 있으면 된다(otf 는 쓰지 않는다). 저장소에 넣을지 · 이미지 빌드 때 받을지는 결정이 필요하다.
- 굳힌 입력(`var/gm-inputs/`)과 결과(`var/gm-out/`)는 **볼륨이어야 한다**: 이미지 안쪽이면 재배포마다 사라져 재현성이 깨진다. 운영 PDF 볼륨(`/app/var/reports`)과 섞지 않는다.
- 파기(`src/lib/erasure.ts`)가 `var/gm-inputs/<응시>.json` 과 `var/gm-out/<응시>/` 를 지워야 한다. **아직 지우지 않는다**(공통 코드 · 승인 사항). 그 전에는 운영에서 굳힌 입력을 만들지 않는다.
