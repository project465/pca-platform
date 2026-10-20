#!/usr/bin/env bash
# Common Core 공통 출시 관문 v1 (R40 · 로드맵 단계 0-4).
#
#   bash scripts/shared-core/gate.sh [로그 디렉터리]
#
# **한 명령으로 두 줄을 판정한다.**
#   current  지금 이 작업 트리 그대로
#   landed   지금 작업 트리를 임시 폴더에 베끼고 착지 패치(L1 · L2 · L3)를 **함께** 적용한 사본
#
# 보는 것: 기관 경계(SC-1 B1~B5 · 프로필) · 학교 학생 신원(L2 · SC-2) · 파기(L1 · CC-009) ·
# 비밀번호 찾기(L3) · 보호 묶음(측정 · 화면 · 결과 · 작업공간 동결 · DB 사슬 · 등록부 · 채점).
# DB 검사는 판마다 새 일회용 PostgreSQL(pg-sandbox.sh)에서 돈다. 운영 · Staging DB 에 닿지 않는다.
#
# **실제 `pg` · next-auth · 브라우저가 아니다.** `pg` 는 psql shim 이다(test/shims). 그래서 판정은
# "로직이 그렇게 짜였는가" 까지이고 운영에서의 동작은 NOT VERIFIED 다.
#
# 판정
#   SECOND_TENANT_BLOCKED  current 에 P0 재현이 남아 있다
#   READY_WHEN_LANDED      landed 에서 FIX 전부 통과 · 걸림 0 · 보호 묶음 0 — 승인 · 합치기만 남았다
#   SECOND_TENANT_READY    current 에서 재현 0 · FIX 통과 (= 착지가 운영 쪽에 합쳐진 코드)
#   GATE_BROKEN            검사 자신이 돌지 못했다(재현도 수정도 판정하지 못한다)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
OUT="${1:-$ROOT/docs/shared-core/evidence/R40/gate}"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
PATCHES=(
  "L1:docs/shared-core/proposed/cc009-l1.patch"
  "L2:docs/shared-core/proposed/sc2-p0.patch"
  "L3:docs/shared-core/proposed/l3-forgot-order.patch"
)
SUM="$OUT/summary.tsv"
printf 'line\tcheck\trc\tpass\tfail\ttodo\tskip\n' > "$SUM"

# ── 한 트리에서 테스트 파일 하나 (DB 가 필요하면 새 샌드박스) ───────────────
tst() { # 줄 · 트리 · 이름 · db(yes/no) · 환경 · 파일
  local line="$1" tree="$2" name="$3" db="$4" envs="$5" file="$6"
  local log="$OUT/$line-$name.log" state="${TMPDIR:-/tmp}/sc-pg-sandbox-gate-$line-$$"   # 검사가 소켓 경로에서 `sc-pg-sandbox` 를 확인한다 url=""
  if [ "$db" = yes ]; then
    url="$(SC_PG_STATE="$state" bash "$tree/scripts/shared-core/test/pg-sandbox.sh" up 2>>"$log" | sed -n 's/^DATABASE_URL=//p')"
    [ -n "$url" ] || { printf '%s\t%s\t%s\t\t\t\t\n' "$line" "$name" "sandbox" >> "$SUM"; echo "$line $name 샌드박스를 띄우지 못했다"; return; }
    envs="$envs DATABASE_URL=$url"
  fi
  ( cd "$tree" && env $envs timeout 900 node --no-warnings --experimental-strip-types \
      --import ./scripts/shared-core/test/register.mjs --test --test-concurrency=1 \
      --test-reporter=tap "$file" ) >> "$log" 2>&1
  local rc=$?
  [ "$db" = yes ] && SC_PG_STATE="$state" bash "$tree/scripts/shared-core/test/pg-sandbox.sh" down >/dev/null 2>&1
  local p f t s
  # 테스트 파일이 모듈 단계에서 던지면 TAP 은 파일 이름으로 `not ok` 하나만 남긴다 — 재현도 수정도 판정 못 함
  grep -qE '^not ok [0-9]+ - scripts/shared-core/' "$log" && rc=crash
  p=$(grep -E '^# pass ' "$log" | tail -1 | awk '{print $3}')
  f=$(grep -E '^# fail ' "$log" | tail -1 | awk '{print $3}')
  t=$(grep -E '^# todo ' "$log" | tail -1 | awk '{print $3}')
  s=$(grep -E '^# skipped ' "$log" | tail -1 | awk '{print $3}')
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$line" "$name" "$rc" "${p:-?}" "${f:-?}" "${t:-?}" "${s:-?}" >> "$SUM"
  echo "$line $name rc=$rc pass=${p:-?} fail=${f:-?} todo=${t:-?} skip=${s:-?}"
}

# ── 재현이 아직 서 있는가: REPRO 테스트가 통과(=문제가 재현)한 수 ─────────
repro_ok() { cat "$OUT/$1"-*.log 2>/dev/null | grep -E '^ok [0-9]+ - (P0-REPRO|ER-REPRO-2|L3-REPRO)' | grep -vcE '# (SKIP|TODO)'; }

run_line() { # 줄 · 트리 · 기대(SC_EXPECT_FIX)
  local line="$1" tree="$2" fix="$3"
  local fx="${fix:+SC_EXPECT_FIX=$fix}"
  tst "$line" "$tree" sc1-profile  no  ""  scripts/shared-core/tenant-profile.test.ts
  tst "$line" "$tree" sc1-boundary no  ""  scripts/shared-core/tenant-boundary.test.ts
  tst "$line" "$tree" l2-identity  yes "SC_SHIMS=1 $fx V3_CAMPUS_FIXTURE=$tree/scripts/fixtures/campus-zztest.json" \
      scripts/shared-core/p0-login-collision.test.ts
  tst "$line" "$tree" l1-erasure   yes "SC_SHIMS=1 SC_SHIM_TX=autocommit $fx" scripts/shared-core/p0-erasure.test.ts
  tst "$line" "$tree" l3-forgot    yes "SC_SHIMS=1 $fx" scripts/shared-core/p0-forgot-order.test.ts
  # 보호 묶음은 자기 샌드박스를 기본 자리에서 쓴다 → 띄우고 내린다
  local st="/tmp/sc-pg-sandbox"   # protect.sh 의 DB 주소가 이 자리를 가리킨다
  SC_PG_STATE="$st" bash "$tree/scripts/shared-core/test/pg-sandbox.sh" down >/dev/null 2>&1
  SC_PG_STATE="$st" bash "$tree/scripts/shared-core/test/pg-sandbox.sh" up >/dev/null 2>&1
  bash "$tree/scripts/shared-core/test/protect.sh" "$tree" "$OUT/$line-protect" > "$OUT/$line-protect.log" 2>&1
  SC_PG_STATE="$st" bash "$tree/scripts/shared-core/test/pg-sandbox.sh" down >/dev/null 2>&1
  local bad; bad=$(awk -F'\t' '$2 != 0' "$OUT/$line-protect/summary.tsv" 2>/dev/null | wc -l)
  local n; n=$(wc -l < "$OUT/$line-protect/summary.tsv" 2>/dev/null || echo 0)
  printf '%s\tprotect\t%s\t%s\t%s\t\t\n' "$line" "$([ "$bad" = 0 ] && [ "$n" -gt 0 ] && echo 0 || echo 1)" "$((n-bad))" "$bad" >> "$SUM"
  echo "$line protect $((n-bad))/$n"
}

# ── current ──────────────────────────────────────────────────────────────
echo "== current ($ROOT)"
run_line current "$ROOT" ""

# ── landed: 지금 트리를 베끼고 패치를 함께 붓는다 ─────────────────────────
COPY="$(mktemp -d "${TMPDIR:-/tmp}/sc-gate-landed.XXXXXX")"
( cd "$ROOT" && git ls-files -co --exclude-standard -z \
    | grep -zv -E '^(docs/metri/shots|docs/metri/review|var|node_modules|\.next)/' \
    | xargs -0 cp --parents -t "$COPY" ) 2>/dev/null
FIXES=""
: > "$OUT/landed-apply.log"
for p in "${PATCHES[@]}"; do
  key="${p%%:*}"; file="${p#*:}"
  if patch -p2 -d "$COPY" --dry-run -s < "$ROOT/$file" >> "$OUT/landed-apply.log" 2>&1 \
     && patch -p2 -d "$COPY" -s < "$ROOT/$file" >> "$OUT/landed-apply.log" 2>&1; then
    FIXES="${FIXES:+$FIXES,}$key"; echo "적용 $key $file" >> "$OUT/landed-apply.log"
  else
    echo "적용 실패 $key $file" >> "$OUT/landed-apply.log"
  fi
done
echo "== landed ($COPY · 적용:${FIXES:- 없음})"
run_line landed "$COPY" "$FIXES"
rm -rf "$COPY"

# ── 판정 ────────────────────────────────────────────────────────────────
broken=$(awk -F'\t' 'NR>1 && ($3=="sandbox" || $3=="crash" || $4=="?")' "$SUM" | wc -l)
cur_repro=$(repro_ok current)
landed_fail=$(awk -F'\t' 'NR>1 && $1=="landed" && $2!="protect" {s+=$5} END{print s+0}' "$SUM")
landed_prot=$(awk -F'\t' '$1=="landed" && $2=="protect" {print $3}' "$SUM")
cur_fail=$(awk -F'\t' 'NR>1 && $1=="current" && $2!="protect" {s+=$5} END{print s+0}' "$SUM")
napplied=$(echo "$FIXES" | tr ',' ' ' | wc -w)
if [ "$broken" -gt 0 ]; then V=GATE_BROKEN
elif [ "$cur_repro" -eq 0 ] && [ "$cur_fail" -eq 0 ]; then V=SECOND_TENANT_READY
elif [ "$napplied" -eq "${#PATCHES[@]}" ] && [ "$landed_fail" -eq 0 ] && [ "$landed_prot" = 0 ]; then V=READY_WHEN_LANDED
else V=SECOND_TENANT_BLOCKED; fi
{
  echo "verdict	$V"
  echo "current_repro_standing	$cur_repro"
  echo "current_fail	$cur_fail"
  echo "landed_patches	$FIXES"
  echo "landed_fail	$landed_fail"
  echo "landed_protect_rc	$landed_prot"
  echo "git	$(cd "$ROOT" && git rev-parse --short HEAD)$(cd "$ROOT" && git diff --quiet || echo '+dirty')"
  echo "note	pg=psql shim · next-auth/browser/운영 NOT VERIFIED"
} > "$OUT/verdict.tsv"
echo "== 판정 $V (current 재현 $cur_repro · landed 걸림 $landed_fail · landed 보호 rc ${landed_prot:-?})"
# 관문의 종료코드: 판정을 내렸으면 0, 검사 자신이 못 돌았으면 2
[ "$V" = GATE_BROKEN ] && exit 2 || exit 0
