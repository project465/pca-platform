# English edition: expert review sheet (ME · EE · CS)

Status: **pre-review**. The English content in `sites/pca-platform/content/en/` was translated and then
edited by a second reviewer against the Korean source (2026-10-24). It has not yet been checked by
native-speaking engineers. Until that check is done, the English edition must not be sold as a
verified edition (see `GLOBAL_EN_PLAN.md`, principle 5).

This sheet asks one native-speaking engineering educator per major (mechanical, electrical and
electronic, computer science and software) to confirm two things:

1. **The terms** in section 3 of each core: is our choice the standard word that students and
   employers in English-speaking countries actually use?
2. **The 30 sample items** in section 4 of each core: does the English read naturally, and does it
   ask exactly what the Korean asks?

## 1. How to review

**Time:** about 60 to 90 minutes per major.

**Who answers these items:** university engineering students and recent graduates (undergraduate,
master's, PhD and postdoc). Many are not native speakers of English. Each item asks about something
the person has done, and the person answers with one of four fixed options:

| Option | Meaning |
|---|---|
| Never done it | Has not done this kind of work |
| Followed set conditions or reused someone else's result | Did it, but someone else set the conditions, or used results someone else produced |
| Did it myself | Did the work themselves |
| I decided it, and the next work followed that decision | Set the criteria themselves, and the work actually went ahead on that decision |

Guidance shown to students: "If you did it the way someone else set up, choose the second option.
Choose the fourth only when you set the criteria yourself and the work actually went ahead based on
that decision."

**For each sample item, please check:**

- **Clarity.** Would a second-year student in your field understand it on the first reading? Is any
  word unusual, regional or ambiguous?
- **Answerability.** Can it be answered sensibly with each of the four options above? Questions that
  say "yourself" do so on purpose (the Korean says the same); flag them only if the wording makes the
  lower options feel contradictory.
- **Meaning.** If you read Korean, compare with the Korean column: no condition added or dropped,
  "and" not turned into "or", same person doing the action, same level of judgment ("checked" is not
  "decided"). If you do not read Korean, judge the English on its own and say what you think it asks.
- **Field terms.** Is the technical term the one used in courses and industry?
- **Length.** Items are read on phones. Long items (over about 130 characters) are acceptable only when
  every part carries a condition.

**How to answer:** copy the item table, add two columns, `Verdict` (`OK`, `Minor`, `Change`,
`Unclear`) and `Suggested wording / comment`, and send it back. For the term tables, mark the term you
would use and say why.

**Please do not** rewrite items so that they ask about a different skill or a different level of
responsibility, and do not change the four options. Item ids, axes and options are shared with the
Korean edition and the scoring engine; only wording can change.

## 2. Conventions we applied (please flag any you disagree with)

| Field | Convention |
|---|---|
| Item questions | End with "?". Mostly "Have you ...?" (Korean `~해 본 적이 있다` / `~봤나요`). "Did you ...?" after a time clause ("When X happened, did you ...?") and in a few mechanical items where the Korean uses a different ending on purpose. |
| Instructions | End with ".". Imperative ("Choose ...", "In one or two lines, describe ..."). |
| Stage versions | One item is shown in four versions by study stage. The opening phrase changes: undergraduate (for example "In a course project or capstone"), master's ("In a research lab project" / "In your graduate research or a project"), PhD ("In your PhD research"), postdoc ("In your own research project"). |
| "yourself" | Used only where the Korean says `내가` or `직접` (I myself / personally). |
| Domain names, industry and role pack names | Title Case ("Thermal and Fluid Systems"). No "&". |
| Everything else (axis names, levels, artifacts, checklist items, job titles, subareas) | Sentence case. |
| Checklist items | Past tense without a subject ("Calculated the tolerance stack-up ..."). |
| Style | No contractions, no em or en dashes, numbers as digits in options ("1 to 3 years ago"). |

Shared labels (identical in all three majors):

| Korean | English |
|---|---|
| 문제 정의 · 요구사항 해석 · 직접 기술 판단 · 방법·도구 | Problem definition · Requirements interpretation · Technical decisions · Methods and tools |
| 산출물 · 비교·검증 · 실패·수정 · 조직 활용 | Deliverables · Comparison and verification · Failure and correction · Organizational use |
| 없다 / 접했다 / 수행했다 / 소유했다 | None / Exposed / Performed / Owned |
| 해 보고 싶다 · 해 본 적이 있다 · 지금 배우고 싶다 (grid) | Would you like to try it? · Have you done it? · Do you want to learn it now? |

Cross-major questions for all reviewers:

| Korean | Chosen English | Alternatives | Why we are unsure |
|---|---|---|---|
| 맡은 연구(나 협력) 과제에서 (postdoc stage) | In your own research (or a joint project) | In research you lead; in a research project you are responsible for | "you lead" claims leadership the Korean does not; "your own" may read as "self-initiated". |
| 학위 연구에서 (PhD stage) | In your PhD research | In your doctoral research; in your thesis research | Regional preference; length on mobile. |
| 연구실 과제에서 (master's stage) | In a research lab project | In a lab project; in your graduate research | "Lab project" alone can mean a teaching lab. |
| 남이 정한 대로 하거나 남이 한 것을 받아 썼다 | Followed set conditions or reused someone else's result | Did it as someone else set it up, or used someone else's result | Fixed by the owner; please only comment if it is misread. |
| 결과물 | deliverable / output / piece of work | work product | Axis J5 is "Deliverables"; items use "output" or "piece of work" where "deliverable" sounds too corporate for students. |
| 이 산업의 입구에 가깝습니다 (industry summary line) | ... puts you close to the entry point of this industry. | ... is a good way into this industry | Korean "close to the entrance"; we avoided "closest". |

## ME: Mechanical Engineering (`ME_CORE_V3`, 369 items, 12 domains)

### 3. Terms needing confirmation

| Korean | Chosen English | Alternatives | Why unsure |
|---|---|---|---|
| 대책 | countermeasure | fix, corrective measure, remedy | "Countermeasure" is common in East Asian industry English (NVH, quality); US and UK courses may say "fix" or "corrective action". Used in vibration and quality items. |
| 발생과 유출 (불량) | occurrence and escape | occurrence and detection (FMEA terms), creation and outflow | We follow 8D and automotive quality usage ("escapes"). Please confirm students will understand "escape". |
| 캡스톤 | capstone | senior design project, final-year project | US "capstone/senior design", UK and Asia "final-year project". |
| 시작품 / 시제품 | prototype | test piece, mock-up | Should be safe; listed because the Korean distinguishes two words. |
| 끼워 맞춤 · 공차 | fit · tolerance | clearance/interference fit · allowable variation | Item `TD01_J3_2` glosses tolerance in brackets; is the gloss needed? |
| 작업 표준 · 공정도 | work standard · process chart | standard work instruction, SOP · process flow chart | Plant vocabulary differs by country and company. |
| 성적서 | test report | test certificate, test record | Korean term implies a formal pass/fail record. |
| 치공구 | tooling · jigs and fixtures | fixturing | We use both depending on context. |
| 조건창 | process window | operating window | |
| 택트 | takt time | cycle time | Takt time and cycle time are different concepts; we kept takt where the Korean says 택트. |
| 가진 | excitation | forcing, shaker input | Vibration testing term. |
| 반복 정지 정확도 | repeat positioning accuracy | repeatability, positioning repeatability | Robotics usually says "repeatability". |
| 가감속 선도 | motion profile | acceleration/deceleration profile, velocity profile | |
| 선급 | classification society | class society, ship classification | Shipbuilding pack. |
| 의장 설계 | outfitting design | outfit design | Shipbuilding pack. |
| 출연연·국책연구 | government-funded research institute | national laboratory, public research institute | Korea-specific category generalized. Is the generalization acceptable? |
| 산학 과제 | industry-sponsored project | industry-collaborative project, industry partnership | |
| 현장실습 | internship | co-op, work placement, industrial placement | Regional. |
| 학부 연구생 | undergraduate research | undergraduate research assistant, URA | |
| 방산·항공 | Defense and Aerospace | Defence and Aerospace (UK spelling) | We use US spelling throughout. |

### 4. Sample items (30)

Chosen to cover every axis (J1 to J8), most domains, all four study stages, the interest grid, cross-domain items, industry and role items, and one instruction. "Stage shown" is the version a student at that stage sees.

| # | Item | Domain / axis | Stage shown | Korean | English |
|---|---|---|---|---|---|
| 1 | `G_TD01_INT` | Mechanical and Product Design / interest | all | 부품의 모양과 치수와 재료를 정해 도면으로 그리는 일, 해 보고 싶다 | Would you like to try deciding a part's shape, dimensions and material and drawing it up? |
| 2 | `G_TD01_EXP` | Mechanical and Product Design / exposure | all | 부품의 모양과 치수와 재료를 정해 도면으로 그리는 일, 해 본 적이 있다 | Have you ever decided a part's shape, dimensions and material and drawn it up? |
| 3 | `G_TD01_LEA` | Mechanical and Product Design / learning_intent | all | 부품의 모양과 치수와 재료를 정해 도면으로 그리는 일, 지금 배우고 싶다 | Would you like to start learning how to decide a part's shape, dimensions and material and draw it up? |
| 4 | `CJ_SCOPE` | (all domains) / J1 | undergraduate | 수업 과제나 캡스톤에서 다룰 범위를 이유를 들어 내가 줄여 본 적이 있다 | In a course project or capstone, have you narrowed down the scope yourself and given your reasons? |
| 5 | `CJ_REQUIRE` | (all domains) / J2 | master's | 대학원 연구나 과제에서 말로 받은 요구를 숫자로 바꿔 적어 본 적이 있다 | In your graduate research or a project, have you taken a requirement given to you in words and turned it into numbers? |
| 6 | `TD01_J1_1` | Mechanical and Product Design / J1 | PhD | 학위 연구나 참여한 과제에서 받은 사양을 보고 이번에 설계할 범위를 적어 본 적이 있다 | In your PhD research or a project you joined, have you looked at a specification you were given and written down what this design would cover? |
| 7 | `TD04_J2_1` | Dynamics, Vibration and Noise / J2 | postdoc | 맡은 연구나 협력 과제에서 허용할 진동이나 소음 크기를 잴 위치와 운전 조건으로 옮겨 본 적이 있다 | In your own research or a joint project, have you turned vibration or noise limits into measurement points and operating conditions? |
| 8 | `TD07_J3_1` | Testing and Measurement / J3 | undergraduate | 수업 과제나 캡스톤에서 무엇을 어떻게 잴지 측정 항목과 방법을 직접 정해 본 적이 있다 | In a course project or capstone, have you decided yourself which items to measure and how to measure them? |
| 9 | `TD10_J4_1` | Quality and Reliability / J4 | master's | 대학원 연구나 과제에서 시간에 따른 품질 값을 그래프(관리도)로 그려 본 적이 있다 | In your graduate research or a project, did you ever plot quality values over time on a chart (a control chart)? |
| 10 | `TD01_J5_1` | Mechanical and Product Design / J5 | PhD | 학위 연구나 참여한 과제에서 제작에 쓸 도면이나 부품 사양을 내가 그려 낸 적이 있다 | In your PhD research or a project you joined, have you drawn up a fabrication drawing or part specification yourself? |
| 11 | `TD03_J6_1` | Thermal and Fluid Systems / J6 | postdoc | 맡은 연구나 협력 과제에서 계산한 온도를 문헌에 나온 값과 비교해 본 일이 있다 | In your own research or a joint project, did you ever compare calculated temperatures with values from the literature? |
| 12 | `TD06_J7_1` | Materials, Strength and Failure / J7 | undergraduate | 실험이나 과제에서 같은 곳이 또 깨져 재료나 모양을 바꿔 본 적이 있다 | In a lab experiment or project, when the same spot broke again, have you changed the material or shape? |
| 13 | `TD09_J8_1` | Equipment and Facility Operation / J8 | master's | 대학원 연구나 과제에서 장비 쓰는 법을 다른 사람에게 알려 준 적이 있다 | In your graduate research or a project, have you shown other people how to use a piece of equipment? |
| 14 | `TD06_J1_1` | Materials, Strength and Failure / J1 | PhD | 학위 연구나 참여한 과제에서 부품이 망가진 모습을 보고 피로 파손인지 부식인지 같은 손상 종류를 가려낸 적이 있다 | In your PhD research or a project you joined, have you examined how a part failed and identified the type of damage, such as fatigue or corrosion? |
| 15 | `TD09_J2_1` | Equipment and Facility Operation / J2 | postdoc | 맡은 연구나 협력 과제에서 요구 정밀도를 점검 항목과 허용 범위로 옮겨 본 적이 있다 | In your own research or a joint project, have you turned a required accuracy into inspection items and tolerances? |
| 16 | `TD12_J3_1` | Task Automation and Data / J3 | undergraduate | 수업 과제나 캡스톤에서 처리 순서와 어디까지 자동으로 할지 내가 정했던 적이 있다 | In a course project or capstone, have you decided yourself on the processing order and how much to automate? |
| 17 | `TD02_J4_1` | Structural and Durability Analysis / J4 | master's | 대학원 연구나 과제에서 해석 프로그램으로 모델을 만들어 계산을 돌려 본 적이 있다 | In your graduate research or a project, have you built a model in analysis software and run the calculation? |
| 18 | `TD05_J5_1` | Actuation, Transmission and Motion Design / J5 | PhD | 학위 연구나 참여한 과제에서 움직이는 기구나 장치를 직접 만들어 본 적이 있다 | In your PhD research or a project you joined, have you built a moving mechanism or device yourself? |
| 19 | `TD08_J6_1` | Production and Process Engineering / J6 | postdoc | 맡은 연구나 협력 과제에서 조건을 바꾸기 전과 후의 불량률을 비교해 본 일이 있다 | In your own research or a joint project, did you ever compare defect rates before and after changing the conditions? |
| 20 | `TD11_J7_1` | Requirements, Constraints and Schedule / J7 | undergraduate | 실험이나 과제에서 요구가 바뀌어 할 일을 다시 나눠 본 적이 있다 | In a lab experiment or project, when requirements changed, have you divided up the tasks again? |
| 21 | `TD01_J8_1` | Mechanical and Product Design / J8 | master's | 대학원 연구나 과제를 하며 내가 그린 설계안을 검토 회의에서 설명한 적이 있다 | During your graduate research or a project, have you explained a design you drew up at a review meeting? |
| 22 | `UG_SCOPE` | (all domains) / J1 | all | 캡스톤이나 설계 과제에서 이번에 할 범위를 직접 정해 둔 적이 있다 | In a capstone or design project, have you set the scope of the work yourself? |
| 23 | `UG_USED` | (all domains) / J8 | all | 내가 만든 것을 팀이 다음 작업에 그대로 쓴 적이 있다 | Has your team taken something you made and used it as it was in the next stage of work? |
| 24 | `INDUSTRY_SEMICON_V2_I1` | Mechanical and Product Design / J3 | all | 진공이나 고온처럼 특별한 환경을 조건으로 두고 모양과 재료를 정한 경험이 있다 | Have you decided a part's shape and material for a special environment, such as vacuum or high heat? |
| 25 | `INDUSTRY_DEFENSE_V2_I4` | Materials, Strength and Failure / J3 | all | 쓸 재료 값을 규격값과 시험값 가운데서 직접 고른 경험이 있다 | For material data, have you chosen yourself between values from a standard and test values? |
| 26 | `INDUSTRY_MOBILITY_V2_I7` | Mechanical and Product Design / J6 | all | 많이 만들 때 생기는 치수 차이를 미리 계산해 둔 적이 있다 | Have you calculated in advance the dimensional variation that comes with high-volume production? |
| 27 | `ROLE_DESIGN_V2_R1` | Mechanical and Product Design / J3 | all | 치수나 허용 오차를 바꿀지 내가 결정한 적이 있다 | Have you decided yourself whether to change a dimension or tolerance? |
| 28 | `ROLE_RND_V2_R4` | Actuation, Transmission and Motion Design / J1 | all | 요구 가운데 포기할 것을 정해 개발 범위를 줄인 적이 있다 | Have you decided which requirements to give up and cut the development scope? |
| 29 | `ROLE_MFG_V2_R7` | Production and Process Engineering / J8 | all | 내가 정리한 조건을 생산 라인 사람에게 넘겨준 적이 있다 | Have you handed conditions you worked out to the people on the production line? |
| 30 | `TR_T2` | (all domains) / J2 | PhD | 왜 문제였는지 가장 가까운 것을 골라주세요. 덧붙일 말이 있으면 한 줄로 적어주세요 | Choose the option closest to why it was a problem. If you want to add something, write it in one line. |

## EE: Electrical and Electronic Engineering (`EE_CORE_V1`, 369 items, 12 domains)

### 3. Terms needing confirmation

| Korean | Chosen English | Alternatives | Why unsure |
|---|---|---|---|
| 처리 주기 (임베디드) | loop period | task period, processing cycle, execution period | Superloop vs RTOS vocabulary. Used in embedded items and job descriptions. |
| 신호처리 과제 | DSP project | signal processing project | "DSP" is short but may not be clear to every student. |
| 반도체 공정 실습 | semiconductor fabrication lab | cleanroom lab, microfabrication lab, process lab | Plain "fabrication lab" was dropped because it reads as a maker "fab lab". |
| 공정 조건표 | process recipe sheet | recipe, process condition table | |
| 단선도 | single-line diagram | one-line diagram (US) | |
| 보호 협조 | protection coordination | relay coordination, selectivity (IEC) | |
| 전기설비 규정 | electrical code | wiring regulations, NEC / IEC 60364 / BS 7671 | Country-specific in Korean; generalized. |
| 수배전 설비 | power distribution equipment | switchgear and distribution equipment | |
| 연계 기준 | grid connection requirements | grid code, interconnection requirements | |
| 역송 | export (to the grid) | reverse power flow, back-feed | Item wording uses "export limits"; vocabulary list uses "reverse power flow". |
| 정재파비 | VSWR | return loss | Item gives the Korean plain-language paraphrase "reflection (VSWR)". |
| 표본화 주파수 | sampling rate | sampling frequency | |
| 전자파 적합성 / 양립성 | EMC (electromagnetic compatibility) | EMI/EMC | Two Korean words, one English term. |
| 미약 신호 | very small signals | low-level signals, weak signals, biosignals | Medical pack. |
| 전기전자 전공자 | EE graduates | EE students, electrical and electronic engineers | Industry scenes say "EE graduates"; ME says "mechanical engineers". |
| 이득 | gain | amplification | Fine as a term; see the note in section 5 about the on-screen glossary. |

### 4. Sample items (30)

Chosen to cover every axis (J1 to J8), most domains, all four study stages, the interest grid, cross-domain items, industry and role items, and one instruction. "Stage shown" is the version a student at that stage sees.

| # | Item | Domain / axis | Stage shown | Korean | English |
|---|---|---|---|---|---|
| 1 | `G_TD01_INT` | Analog Circuit Design / interest | all | 증폭기·필터·전원 회로의 부품 값을 계산해 정하는 일, 해 보고 싶다 | Would you like to try calculating and choosing component values for amplifier, filter and power circuits? |
| 2 | `G_TD01_EXP` | Analog Circuit Design / exposure | all | 증폭기·필터·전원 회로의 부품 값을 계산해 정하는 일, 해 본 적이 있다 | Have you ever calculated and chosen component values for amplifier, filter and power circuits? |
| 3 | `G_TD01_LEA` | Analog Circuit Design / learning_intent | all | 증폭기·필터·전원 회로의 부품 값을 계산해 정하는 일, 지금 배우고 싶다 | Would you like to start learning how to calculate and choose component values for amplifier, filter and power circuits? |
| 4 | `CJ_SCOPE` | (all domains) / J1 | undergraduate | 팀 과제에서 이번에 다룰 범위를 어디까지로 할지 직접 정해 봤나요? | In a team project, have you decided yourself how far the work would go this time? |
| 5 | `CJ_REQUIRE` | (all domains) / J2 | master's | 연구실 과제에서 말로만 주어진 목표를 숫자로 확인할 수 있게 바꿔 적어 본 적이 있나요? | In a research lab project, have you rewritten a goal given only in words so it could be checked with numbers? |
| 6 | `TD01_J1_1` | Analog Circuit Design / J1 | PhD | 학위 연구에서 받은 사양을 보고 이번 회로가 맡을 기능의 범위를 적어 봤나요? | In your PhD research, have you read the spec you were given and written down what this circuit would cover? |
| 7 | `TD04_J2_1` | Signal Processing / J2 | postdoc | 맡은 연구 과제에서 필요한 표본화 주파수와 허용 지연을 숫자로 정해 적어 둔 적이 있나요? | In your own research project, have you set the required sampling rate and allowed latency as numbers and written them down? |
| 8 | `TD07_J3_1` | Semiconductor Devices and Processing / J3 | undergraduate | 반도체 공정 실습에서 목표 특성이 나오게 공정 온도나 시간 같은 조건값을 정해 봤나요? | In a semiconductor fabrication lab, have you set process parameters such as temperature or time to hit target characteristics? |
| 9 | `TD10_J4_1` | Energy and Renewable Systems / J4 | master's | 연구실 과제에서 발전량 예측 프로그램으로 1년 발전량을 구해 봤나요? | Have you estimated a year's generation with yield forecasting software in a research lab project? |
| 10 | `TD01_J5_1` | Analog Circuit Design / J5 | PhD | 학위 연구에서 회로도와 부품 선정표를 팀원이 보고 바로 이해하도록 정리해 봤나요? | In your PhD research, have you organized a schematic and component selection table so teammates could follow them at a glance? |
| 11 | `TD04_J6_1` | Signal Processing / J6 | postdoc | 맡은 연구 과제에서 이론으로 예상한 응답과 실제 처리 결과를 비교해 봤나요? | In your own research project, have you compared the response predicted by theory with the actual processing result? |
| 12 | `TD07_J7_1` | Semiconductor Devices and Processing / J7 | undergraduate | 반도체 공정 실습에서 특성이 목표를 벗어났을 때 어느 공정 단계가 문제였는지 따져 봤나요? | In a semiconductor fabrication lab, when characteristics missed the target, did you work out which process step was at fault? |
| 13 | `TD10_J8_1` | Energy and Renewable Systems / J8 | master's | 연구실 과제에서 운영 점검 때 발전 실적 보고서를 근거로 설명해 봤나요? | In a research lab project, have you used a generation performance report to support your explanation in an operations check? |
| 14 | `TD06_J1_1` | Electromagnetics and RF / J1 | PhD | 학위 연구에서 신호를 보낼 방향과 이번에 다루지 않을 방향을 나눠 정리해 봤나요? | In your PhD research, have you set out which directions to radiate in and which to leave out this time? |
| 15 | `TD09_J2_1` | Electric Machines and Power Systems / J2 | postdoc | 맡은 연구 과제에서 필요한 설비 용량과 허용 전압 변동 폭을 계산해 숫자로 적어 봤나요? | In your own research project, have you calculated and written down the required rating and allowed voltage variation? |
| 16 | `TD12_J3_1` | Measurement, Testing and EMC / J3 | undergraduate | 측정 실습에서 규격을 보고 측정 조건과 합격 기준을 직접 정해 봤나요? | In a measurement lab, have you read a standard and set the measurement conditions and pass criteria yourself? |
| 17 | `TD03_J4_1` | Embedded Systems and Firmware / J4 | master's | 연구실 과제에서 디버거와 출력 로그로 펌웨어 동작을 한 줄씩 따라가 봤나요? | In a research lab project, have you stepped through firmware behavior line by line with a debugger and output logs? |
| 18 | `TD06_J5_1` | Electromagnetics and RF / J5 | PhD | 학위 연구에서 해석 모델과 조건을 적어 두어 다른 사람이 같은 해석을 다시 돌릴 수 있게 했나요? | In your PhD research, have you recorded the simulation model and settings so someone else could rerun it? |
| 19 | `TD09_J6_1` | Electric Machines and Power Systems / J6 | postdoc | 맡은 연구 과제에서 계통 해석 결과와 실제로 잰 값을 같은 조건으로 비교해 봤나요? | In your own research project, have you compared power system analysis results with measurements under the same conditions? |
| 20 | `TD12_J7_1` | Measurement, Testing and EMC / J7 | undergraduate | 측정 실습에서 측정값이 흔들릴 때 시료가 문제인지 장비가 문제인지 나눠 따져 봤나요? | In a measurement lab, when readings were unstable, did you work out whether the sample or the equipment was at fault? |
| 21 | `TD03_J8_1` | Embedded Systems and Firmware / J8 | master's | 연구실 과제에서 코드 리뷰 때 내 펌웨어 구조를 팀원에게 설명해 봤나요? | In a research lab project, have you explained your firmware structure to teammates in a code review? |
| 22 | `UG_SCOPE` | (all domains) / J1 | all | 캡스톤이나 설계 과제에서 시간이 모자라 다룰 범위를 줄여 본 적이 있나요? | In a capstone or design project, have you cut back the scope because time was running out? |
| 23 | `UG_USED` | (all domains) / J8 | all | 수업 밖 활동(동아리, 대회, 인턴 등)에서 내가 만든 보드나 코드를 다른 사람이 그대로 가져다 쓴 적이 있나요? | Outside class (in clubs, competitions, internships and so on), has someone used a board or code you made as it was? |
| 24 | `INDUSTRY_SEMI_V1_I1` | Analog Circuit Design / J3 | all | 반도체 장비처럼 잡음이 많은 곳에서 작은 신호를 읽으려고 증폭 조건을 정해 봤나요? | In a noisy setting such as semiconductor equipment, have you set amplifier conditions to read a small signal? |
| 25 | `INDUSTRY_AUTOEV_V1_I4` | Measurement, Testing and EMC / J6 | all | 장치끼리 전자파로 서로 방해하는지 측정해 봤나요? | Have you measured whether devices interfere with each other electromagnetically? |
| 26 | `INDUSTRY_NETWORK_V1_I7` | Power Electronics / J3 | all | 24시간 켜져 있는 장비의 전원 효율과 열을 함께 따져 설계해 봤나요? | For equipment that runs 24 hours a day, have you designed for power efficiency and heat together? |
| 27 | `ROLE_DESIGN_V1_R1` | Analog Circuit Design / J3 | all | 이미 만든 회로의 부품 값을 고쳐야 할 때 새 값을 내가 정해 봤나요? | When component values in an existing circuit had to change, have you decided the new values yourself? |
| 28 | `ROLE_TEST_V1_R4` | Communications and Networking / J4 | all | 교정 기록을 보고 시험에 쓸 측정 장비를 골라 봤나요? | Have you chosen measurement equipment for a test after checking its calibration records? |
| 29 | `ROLE_MAINT_V1_R7` | Electric Machines and Power Systems / J8 | all | 내 점검 의견을 보고 설비를 바꾸기로 한 적이 있나요? | Has a decision to replace equipment been made based on your inspection findings? |
| 30 | `TR_T2` | (all domains) / J2 | PhD | 그 학위 연구에서 왜 그것이 문제였는지 가까운 것을 고르고 한 줄로 적어주세요 | Choose the closest reason this was a problem in that PhD research, and explain in one line. |

## CS: Computer Science and Software Engineering (`CS_CORE_V1`, 344 items, 11 domains)

### 3. Terms needing confirmation

| Korean | Chosen English | Alternatives | Why unsure |
|---|---|---|---|
| 과제 | assignment | project, coursework | CS items say "assignment"; ME and EE items say "project". Is "assignment" right for multi-week team work? |
| 졸업 작품 | final-year project | senior project, capstone | Regional. |
| 규약 (응답 규약, 인터페이스 규약) | contract (response contract, interface contract) | API specification, interface specification, protocol | "Contract" is precise for API design but may be unfamiliar to students. |
| 이관 | migration | handover | The Korean glossary defines 이관 as handing code or operations over to someone else, but the content uses it for data migration. The English gloss covers both. |
| 기획 담당 | product planner / game designer | product manager, PM | Korean "기획" roles do not map one to one. |
| 정확도와 재현율 | accuracy or recall | precision or recall | The usual pair is precision and recall; the Korean says accuracy. Kept as written; please confirm whether the item should pair precision with recall. |
| 공공 정보화 감리 | public-sector IT auditor | IT project assurance, independent verification and validation (IV&V) | Korea-specific role. |
| 서비스 안정성 담당 | site reliability engineer | reliability engineer, operations engineer | |
| 배포·개발환경 담당 | DevOps and build engineer | release engineer, platform engineer | |
| 외부 인터넷이 막힌 망 | a network cut off from the internet | air-gapped network, isolated network | Korea's public-sector network separation policy. |
| 고시나 규정 | official regulations | regulations and official notices | |
| 해커톤 · 알고리즘 스터디 | hackathon · algorithm study group | coding competition, competitive programming club | Student scene list. |
| 화면 쪽 / 화면 | client / UI / screen | front end | Varies by item; please flag if "screen" sounds odd. |

### 4. Sample items (30)

Chosen to cover every axis (J1 to J8), most domains, all four study stages, the interest grid, cross-domain items, industry and role items, and one instruction. "Stage shown" is the version a student at that stage sees.

| # | Item | Domain / axis | Stage shown | Korean | English |
|---|---|---|---|---|---|
| 1 | `G_TD01_INT` | Software Design and Architecture / interest | all | 무엇을 만들지 정하고 프로그램을 기능별로 나누는 일, 해 보고 싶다 | Would you like to try deciding what to build and splitting a program into features? |
| 2 | `G_TD01_EXP` | Software Design and Architecture / exposure | all | 무엇을 만들지 정하고 프로그램을 기능별로 나누는 일, 해 본 적이 있다 | Have you ever decided what to build and split a program into features? |
| 3 | `G_TD01_LEA` | Software Design and Architecture / learning_intent | all | 무엇을 만들지 정하고 프로그램을 기능별로 나누는 일, 지금 배우고 싶다 | Would you like to start learning how to decide what to build and split a program into features? |
| 4 | `CJ_SCOPE` | (all domains) / J1 | undergraduate | 팀 과제에서 우리 팀이 맡을 범위를 어디까지로 할지 정해 봤나요? | On a team assignment, have you decided how far your team's scope would go? |
| 5 | `CJ_REQUIRE` | (all domains) / J2 | master's | 연구실 과제에서 '빠르게', '편하게'처럼 말로만 주어진 요구를 숫자로 확인할 수 있게 바꿔 적어 본 적이 있나요? | In a research lab project, have you turned a vague requirement like "fast" or "easy to use" into a measurable target? |
| 6 | `TD01_J1_1` | Software Design and Architecture / J1 | PhD | 학위 연구에서 이번에 만들지 않을 기능을 미리 정해 적어 둔 적이 있나요? | In your PhD research, have you written down in advance which features you would not build this time? |
| 7 | `TD04_J2_1` | Data Storage and Query Design / J2 | postdoc | 맡은 연구 과제에서 자료가 하루에 얼마나 쌓일지 숫자로 어림해 적어 봤나요? | In your own research project, have you made a numerical estimate of how much data would pile up each day? |
| 8 | `TD07_J3_1` | Networks and Distributed Systems / J3 | undergraduate | 네트워크 과제에서 응답을 몇 초까지 기다리고 몇 번까지 다시 보낼지 직접 정했나요? | In a networking assignment, have you decided yourself how many seconds to wait for a response and how many retries to allow? |
| 9 | `TD10_J4_1` | Testing, Quality and Release Operations / J4 | master's | 연구실 과제에서 자동 배포 도구로 배포 과정을 직접 설정해 봤나요? | In a research lab project, have you configured the deployment process yourself using an automated deployment tool? |
| 10 | `TD02_J5_1` | Data Structures and Algorithms / J5 | PhD | 학위 연구에서 직접 짠 코드를 다른 사람이 가져다 쓸 수 있게 정리해 두었나요? | In your PhD research, have you tidied up code you wrote yourself so others could reuse it? |
| 11 | `TD05_J6_1` | User Interface Development / J6 | postdoc | 맡은 연구 과제에서 접근성 검사 도구를 돌려 글자 대비 같은 기준에 맞는지 점검해 봤나요? | In your own research project, have you run an accessibility checker to see whether the UI meets standards like text contrast? |
| 12 | `TD08_J7_1` | Information Security / J7 | undergraduate | 보안 과제에서 공격이 막히지 않은 경로가 왜 열려 있었는지 원인을 찾아봤나요? | When an attack got through in a security assignment, did you find out why that path was open? |
| 13 | `TD11_J8_1` | Real-Time Graphics and Game Development / J8 | master's | 연구실 과제에서 화질과 속도 가운데 무엇을 양보할지 기획 담당과 함께 정해 봤나요? | In a research lab project, have you decided with the designer whether to sacrifice image quality or speed? |
| 14 | `TD06_J1_1` | Systems and Concurrent Programming / J1 | PhD | 학위 연구에서 동시에 돌릴 작업과 따로 돌릴 작업을 나눠 적어 봤나요? | In your PhD research, have you written down which tasks run at the same time and which run separately? |
| 15 | `TD09_J2_1` | Machine Learning and Data Analysis / J2 | postdoc | 맡은 연구 과제에서 어느 정도 오차까지 괜찮은지와 쓸 수 있는 자료 범위를 적어 봤나요? | In your own research project, have you written down how much error is acceptable and what range of data you can use? |
| 16 | `TD01_J3_1` | Software Design and Architecture / J3 | undergraduate | 팀 과제에서 프로그램을 어떤 기능 단위로 나눌지 직접 정해 봤나요? | On a team assignment, have you decided yourself how to split the program into functional units? |
| 17 | `TD04_J4_1` | Data Storage and Query Design / J4 | master's | 연구실 과제에서 같은 내용이 여러 표에 겹치지 않게 표를 나눠 정리해 봤나요? | In a research lab project, have you split tables so the same information is not stored in several places? |
| 18 | `TD07_J5_1` | Networks and Distributed Systems / J5 | PhD | 학위 연구에서 통신 설정값을 표로 정리해 다른 사람이 그대로 따라 쓰게 해 봤나요? | In your PhD research, have you put network settings in a table so others could reuse them as is? |
| 19 | `TD10_J6_1` | Testing, Quality and Release Operations / J6 | postdoc | 맡은 연구 과제에서 시험 결과가 미리 정한 통과 기준을 넘었는지 확인해 봤나요? | In your own research project, have you checked whether test results met the pass criteria set in advance? |
| 20 | `TD02_J7_1` | Data Structures and Algorithms / J7 | undergraduate | 과제에서 프로그램이 느릴 때 시간을 재서 오래 걸리는 부분을 찾아봤나요? | When a program for an assignment ran slowly, did you time it to find the part that took longest? |
| 21 | `TD05_J8_1` | User Interface Development / J8 | master's | 연구실 과제에서 화면 시안을 사용자나 기획 담당과 함께 보며 고칠 점을 정해 봤나요? | In a research lab project, have you gone over UI mockups with users or a product planner and agreed on what to fix? |
| 22 | `UG_SCOPE` | (all domains) / J1 | all | 졸업 작품이나 팀 과제에서 시간이 모자라 만들 기능을 줄여 본 적이 있나요? | In a final-year project or team assignment, have you cut planned features because time ran short? |
| 23 | `UG_USED` | (all domains) / J8 | all | 동아리나 인턴처럼 수업 밖에서 내가 짠 코드를 다른 사람이 이어받아 다음 기능을 만든 적이 있나요? | Outside class, for example in a club or internship, has someone taken over code you wrote and built the next feature on it? |
| 24 | `INDUSTRY_PLATFORM_V1_I1` | Server and API Development / J3 | all | 접속이 한꺼번에 몰릴 때를 대비해 요청을 처리하는 순서를 정해 봤나요? | To prepare for sudden traffic spikes, have you decided the order in which requests are processed? |
| 25 | `INDUSTRY_FINTECH_V1_I4` | Networks and Distributed Systems / J3 | all | 돈 계산에서 정확한 결과와 빠른 응답 중 어느 쪽을 우선할지 결정해 봤나요? | In money calculations, have you decided whether exact results or fast responses come first? |
| 26 | `INDUSTRY_GAME_V1_I7` | Testing, Quality and Release Operations / J3 | all | 서비스 중인 게임에 새 내용을 넣을 때 되돌릴 방법을 남겨 둔 적이 있나요? | When adding new content to a live game, have you kept a way to roll it back? |
| 27 | `ROLE_DEV_V1_R1` | Software Design and Architecture / J3 | all | 기존 코드의 모듈 경계가 맞지 않아 다시 나누는 일을 맡아 해 봤나요? | Have you taken on the job of re-splitting existing code whose module boundaries did not fit? |
| 28 | `ROLE_QA_V1_R4` | Server and API Development / J5 | all | 내가 만든 시험 모음을 다른 사람이 받아 그대로 돌려 본 적이 있나요? | Has someone else taken a test suite you built and run it as is? |
| 29 | `ROLE_SRE_V1_R7` | Networks and Distributed Systems / J8 | all | 운영하며 모은 기록으로 서버 구조를 바꾸자고 제안해 받아들여진 적이 있나요? | Have you used records gathered in operations to propose a change to the server architecture, and had it accepted? |
| 30 | `TR_T2` | (all domains) / J2 | PhD | 그 학위 연구에서 왜 그것이 문제였는지 가까운 것을 고르고 한 줄로 적어주세요 | Choose the closest reason why that was a problem in your PhD research, and explain in one line. |

## 5. Notes for the product team (not for reviewers)

- On-screen glossary lines (`terms` in `shared-<CORE>.json`) are matched by plain substring in
  `src/lib/me-v3/runtime/terms.ts`. In English this produces false hits: `gain` matches "again" and
  "against", `lock` matches "block" and "clock", `index` matches "indexes" (harmless). Word-boundary
  matching for non-Korean languages would fix it; the content cannot.
- The axis labels in `src/lib/me-v3/runtime/copy.en.ts` (`axisLabel`: "Own decisions", "Outputs",
  "Real-world use") differ from the taxonomy names used in content ("Technical decisions",
  "Deliverables", "Organizational use").
- The Korean pack files keep `name_en` values with "&" ("Defense & Aerospace"); the English
  `name_ko` values now use "and". `name_en` is a non-text field shared with the Korean file and was
  left unchanged.
- Rationale, change-reason and note fields were translated earlier but are not student-facing; they
  were not reviewed line by line.
