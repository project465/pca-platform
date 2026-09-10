# 3개 전공 Skill Tree (자동 생성)

> 이 파일은 `scripts/eci/build.mjs` 가 만든다. 고칠 곳은 `data/eci/*.json` 이다.

전공 3개 · 역량 148개 · 직무군 24개

필수도 표기 — ★★★ 필수 / ★★ 중요 / ★ 보조. 요구 수준은 1~5.

## 기계공학 (ME)

### 계층별 역량

**L1 · 기초과학** (3)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `ME.MATH` | 공학수학·미적분 | theory | 미분방정식, 선형대수, Calculus |
| `ME.PHYS` | 일반물리 | theory | 역학, 전자기 |
| `ME.STAT` | 확률·통계 | theory | 통계학, DOE |

**L2 · 전공 핵심** (19)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `ME.THERMO` | 열역학 | theory | Thermodynamics |
| `ME.FLUID` | 유체역학 | theory | 유체, Fluid |
| `ME.SOLID` | 고체역학 | theory | 재료역학, Mechanics of Materials |
| `ME.DYN` | 동역학 | theory | Dynamics |
| `ME.HEAT` | 열전달 | theory | Heat Transfer |
| `ME.VIB` | 기계진동 | theory | Vibration, NVH |
| `ME.DESIGN` | 기계설계 | theory | 기계요소설계 |
| `ME.ELEM` | 기계요소 | theory | 베어링, 기어, 체결 |
| `ME.MATL` | 기계재료 | theory | 재료공학, 열처리 |
| `ME.MFG` | 생산가공 | theory | 절삭, 소성가공, 주조 |
| `ME.CTRL` | 자동제어 | theory | 제어공학, PID |
| `ME.FEM` | 유한요소법 | theory | FEM, FEA 이론 |
| `ME.CFDT` | 전산유체 이론 | theory | 수치해석, 난류모델 |
| `ME.GDT` | 공차·GD&T | theory | 기하공차, 치수공차, Tolerance |
| `ME.HYD` | 유공압 | theory | 유압, 공압 |
| `ME.COMB` | 연소·내연기관 | theory | 엔진, Combustion |
| `ME.ROBOT` | 로봇공학 | theory | 기구학, Kinematics |
| `ME.MECHA` | 메카트로닉스 | theory | 센서·액추에이터 |
| `ME.RELIAB` | 신뢰성공학 | theory | 수명예측, FMEA |

**L3 · 도구·소프트웨어** (17)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `SW.SOLIDWORKS` | SolidWorks | software | 솔리드웍스, SW |
| `SW.CATIA` | CATIA | software | 카티아 |
| `SW.NX` | Siemens NX | software | UG, 유지그래픽스 |
| `SW.CREO` | Creo | software | Pro/E |
| `SW.AUTOCAD` | AutoCAD | software | 오토캐드, 2D 도면 |
| `SW.ANSYS_MECH` | ANSYS Mechanical | software | 앤시스, 구조해석 |
| `SW.ABAQUS` | ABAQUS | software | 아바쿠스, 비선형해석 |
| `SW.FLUENT` | ANSYS Fluent | software | CFX, StarCCM+, 유동해석 |
| `SW.MATLAB` | MATLAB | software | 매트랩 |
| `SW.SIMULINK` | Simulink | software | 모델기반설계, MBD |
| `SW.PYTHON` | Python | software | 파이썬 |
| `SW.CAM` | CAM·NC 프로그래밍 | software | MasterCAM, G코드 |
| `SW.PLC` | PLC 프로그래밍 | software | 래더, 지멘스, 미쓰비시 |
| `SW.MINITAB` | Minitab·통계도구 | software | JMP, 6시그마 도구 |
| `SW.PDM` | PDM·형상관리 | software | Teamcenter, Windchill |
| `SW.3DPRINT` | 3D 프린팅·시작품 | tool | 적층제조, 쾌속조형 |
| `SW.MEASURE` | 계측·시험 장비 | tool | 3차원측정기, 만능시험기, 데이터로거 |

**L4 · 응용 도메인** (6)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `DM.AUTO_PT` | 자동차 파워트레인·전동화 | domain | 구동계, 감속기, e-Axle |
| `DM.BATTPACK` | 배터리 팩·열관리 | domain | BTMS, 팩 구조 |
| `DM.AEROSTR` | 항공 구조·기체 | domain | 복합재 구조, 피로해석 |
| `DM.SEMI_EQ` | 반도체·디스플레이 장비 | domain | 진공챔버, 이송장치 |
| `DM.PLANT` | 플랜트·설비·HVAC | domain | 배관, 공조, 열교환기 |
| `DM.MOLD` | 금형·사출 | domain | 프레스금형, 사출성형 |

**L5 · 공통 역량** (4)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `CM.DOC` | 기술문서 작성 | soft | 보고서, 사양서 |
| `CM.STD` | 규격·안전 준수 | soft | ISO, KS, 산업안전 |
| `CM.ENG` | 영문 기술 커뮤니케이션 | soft | 영어, TOEIC, 해외대응 |
| `CM.COLLAB` | 협업·형상관리 | soft | Git, Jira, 협업도구 |

### 직무군과 요구 역량

#### 기계설계 — `ME.MECH_DESIGN`

O*NET `17-2141.00` · 산업 MACH, AUTO, SEMI, ROBOT · 트랙 UNIV_LOW, UNIV_HIGH, GRAD

활동 지표 가중치 — DESIGN 0.34 · ANALYZE 0.2 · BUILD 0.16 · OPTIMIZE 0.12 · FIELD 0.1 · ORCHESTRATE 0.08

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| SolidWorks `SW.SOLIDWORKS` | 4 | ★★★ |
| 기계설계 `ME.DESIGN` | 4 | ★★★ |
| 공차·GD&T `ME.GDT` | 4 | ★★★ |
| 기계요소 `ME.ELEM` | 4 | ★★★ |
| 고체역학 `ME.SOLID` | 3 | ★★★ |
| 기계재료 `ME.MATL` | 3 | ★★ |
| CATIA `SW.CATIA` | 3 | ★★ |
| 생산가공 `ME.MFG` | 3 | ★★ |
| PDM·형상관리 `SW.PDM` | 2 | ★★ |
| ANSYS Mechanical `SW.ANSYS_MECH` | 2 | ★ |
| 기술문서 작성 `CM.DOC` | 3 | ★★ |
| 규격·안전 준수 `CM.STD` | 2 | ★ |

#### 구조·유동 해석 (CAE) — `ME.CAE`

O*NET `17-2141.00` · 산업 AUTO, AERO, BATT, MACH · 트랙 UNIV_HIGH, GRAD

활동 지표 가중치 — ANALYZE 0.4 · RESEARCH 0.2 · DESIGN 0.14 · CODE 0.12 · OPTIMIZE 0.1 · BUILD 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 유한요소법 `ME.FEM` | 4 | ★★★ |
| ANSYS Mechanical `SW.ANSYS_MECH` | 4 | ★★★ |
| 고체역학 `ME.SOLID` | 4 | ★★★ |
| 공학수학·미적분 `ME.MATH` | 4 | ★★★ |
| ABAQUS `SW.ABAQUS` | 3 | ★★ |
| 유체역학 `ME.FLUID` | 3 | ★★ |
| ANSYS Fluent `SW.FLUENT` | 3 | ★★ |
| 전산유체 이론 `ME.CFDT` | 3 | ★★ |
| Python `SW.PYTHON` | 3 | ★★ |
| MATLAB `SW.MATLAB` | 3 | ★★ |
| 기계진동 `ME.VIB` | 2 | ★ |
| 기술문서 작성 `CM.DOC` | 3 | ★★ |

#### 생산기술·제조엔지니어링 — `ME.MFG_ENG`

O*NET `17-2112.00` · 산업 AUTO, SEMI, BATT, MACH · 트랙 HS, UNIV_LOW, UNIV_HIGH

활동 지표 가중치 — FIELD 0.3 · OPTIMIZE 0.26 · BUILD 0.16 · ORCHESTRATE 0.14 · ANALYZE 0.1 · DESIGN 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 생산가공 `ME.MFG` | 4 | ★★★ |
| PLC 프로그래밍 `SW.PLC` | 3 | ★★★ |
| 공차·GD&T `ME.GDT` | 3 | ★★ |
| Minitab·통계도구 `SW.MINITAB` | 3 | ★★ |
| 확률·통계 `ME.STAT` | 3 | ★★ |
| AutoCAD `SW.AUTOCAD` | 3 | ★★ |
| 유공압 `ME.HYD` | 3 | ★★ |
| CAM·NC 프로그래밍 `SW.CAM` | 2 | ★★ |
| 기계재료 `ME.MATL` | 2 | ★★ |
| 규격·안전 준수 `CM.STD` | 3 | ★★ |
| 협업·형상관리 `CM.COLLAB` | 3 | ★★ |
| 계측·시험 장비 `SW.MEASURE` | 3 | ★★ |

#### 품질·신뢰성 — `ME.QUALITY`

O*NET `17-2112.00` · 산업 AUTO, SEMI, MED, MACH · 트랙 HS, UNIV_LOW, UNIV_HIGH

활동 지표 가중치 — OPTIMIZE 0.28 · ANALYZE 0.24 · FIELD 0.2 · ORCHESTRATE 0.14 · BUILD 0.1 · DESIGN 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 신뢰성공학 `ME.RELIAB` | 4 | ★★★ |
| 확률·통계 `ME.STAT` | 4 | ★★★ |
| Minitab·통계도구 `SW.MINITAB` | 4 | ★★★ |
| 계측·시험 장비 `SW.MEASURE` | 4 | ★★★ |
| 공차·GD&T `ME.GDT` | 3 | ★★★ |
| 규격·안전 준수 `CM.STD` | 4 | ★★★ |
| 기계재료 `ME.MATL` | 3 | ★★ |
| 기술문서 작성 `CM.DOC` | 3 | ★★ |
| Python `SW.PYTHON` | 2 | ★ |
| 생산가공 `ME.MFG` | 3 | ★★ |

#### 자동차·전동화 R&D — `ME.AUTO_RD`

O*NET `17-2141.00` · 산업 AUTO, BATT · 트랙 UNIV_HIGH, GRAD

활동 지표 가중치 — ANALYZE 0.26 · DESIGN 0.24 · BUILD 0.18 · RESEARCH 0.14 · OPTIMIZE 0.12 · CODE 0.06

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 자동차 파워트레인·전동화 `DM.AUTO_PT` | 4 | ★★★ |
| 동역학 `ME.DYN` | 4 | ★★★ |
| 기계진동 `ME.VIB` | 3 | ★★★ |
| CATIA `SW.CATIA` | 3 | ★★ |
| Simulink `SW.SIMULINK` | 3 | ★★ |
| 자동제어 `ME.CTRL` | 3 | ★★ |
| 배터리 팩·열관리 `DM.BATTPACK` | 3 | ★★ |
| 열전달 `ME.HEAT` | 3 | ★★ |
| MATLAB `SW.MATLAB` | 3 | ★★ |
| 연소·내연기관 `ME.COMB` | 2 | ★ |
| 영문 기술 커뮤니케이션 `CM.ENG` | 3 | ★★ |

#### 항공우주·방산 R&D — `ME.AEROSPACE`

O*NET `17-2011.00` · 산업 AERO, DEF · 트랙 UNIV_HIGH, GRAD

활동 지표 가중치 — RESEARCH 0.28 · ANALYZE 0.28 · DESIGN 0.2 · BUILD 0.12 · OPTIMIZE 0.08 · ORCHESTRATE 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 항공 구조·기체 `DM.AEROSTR` | 4 | ★★★ |
| 유한요소법 `ME.FEM` | 4 | ★★★ |
| 고체역학 `ME.SOLID` | 4 | ★★★ |
| 유체역학 `ME.FLUID` | 4 | ★★★ |
| 기계재료 `ME.MATL` | 3 | ★★★ |
| ABAQUS `SW.ABAQUS` | 3 | ★★ |
| CATIA `SW.CATIA` | 3 | ★★ |
| 기계진동 `ME.VIB` | 3 | ★★ |
| 공학수학·미적분 `ME.MATH` | 4 | ★★ |
| 규격·안전 준수 `CM.STD` | 3 | ★★ |
| 영문 기술 커뮤니케이션 `CM.ENG` | 3 | ★★ |
| MATLAB `SW.MATLAB` | 3 | ★★ |

#### 로봇·자동화 엔지니어 — `ME.ROBOT_AUTO`

O*NET `17-2199.08` · 산업 ROBOT, SEMI, AUTO, MACH · 트랙 UNIV_LOW, UNIV_HIGH, GRAD

활동 지표 가중치 — BUILD 0.26 · CODE 0.22 · DESIGN 0.2 · ANALYZE 0.16 · FIELD 0.12 · OPTIMIZE 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 로봇공학 `ME.ROBOT` | 4 | ★★★ |
| 메카트로닉스 `ME.MECHA` | 4 | ★★★ |
| 자동제어 `ME.CTRL` | 4 | ★★★ |
| Python `SW.PYTHON` | 3 | ★★★ |
| MATLAB `SW.MATLAB` | 3 | ★★ |
| Simulink `SW.SIMULINK` | 3 | ★★ |
| 동역학 `ME.DYN` | 3 | ★★ |
| SolidWorks `SW.SOLIDWORKS` | 3 | ★★ |
| PLC 프로그래밍 `SW.PLC` | 3 | ★★ |
| 3D 프린팅·시작품 `SW.3DPRINT` | 2 | ★ |
| 협업·형상관리 `CM.COLLAB` | 3 | ★★ |

#### 반도체·디스플레이 장비 — `ME.SEMI_EQ`

O*NET `17-2199.00` · 산업 SEMI · 트랙 HS, UNIV_LOW, UNIV_HIGH

활동 지표 가중치 — FIELD 0.28 · DESIGN 0.22 · ANALYZE 0.18 · BUILD 0.16 · OPTIMIZE 0.12 · ORCHESTRATE 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 반도체·디스플레이 장비 `DM.SEMI_EQ` | 4 | ★★★ |
| 기계설계 `ME.DESIGN` | 3 | ★★★ |
| 유공압 `ME.HYD` | 3 | ★★★ |
| SolidWorks `SW.SOLIDWORKS` | 3 | ★★ |
| 메카트로닉스 `ME.MECHA` | 3 | ★★ |
| 열전달 `ME.HEAT` | 3 | ★★ |
| PLC 프로그래밍 `SW.PLC` | 3 | ★★ |
| 계측·시험 장비 `SW.MEASURE` | 3 | ★★ |
| 규격·안전 준수 `CM.STD` | 3 | ★★ |
| 공차·GD&T `ME.GDT` | 3 | ★★ |
| 영문 기술 커뮤니케이션 `CM.ENG` | 2 | ★ |

## 전기·전자공학 (EE)

### 계층별 역량

**L1 · 기초과학** (3)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `EE.MATH` | 공학수학·변환 | theory | 푸리에, 라플라스, 복소해석 |
| `EE.PHYS` | 물리전자 | theory | 고체물리, 양자 |
| `EE.PROB` | 확률과 랜덤변수 | theory | 확률변수, 잡음이론 |

**L2 · 전공 핵심** (20)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `EE.CIRCUIT` | 회로이론 | theory | 회로해석, RLC |
| `EE.ANALOG` | 전자회로·아날로그 | theory | OP-AMP, 증폭기 |
| `EE.DIGITAL` | 디지털논리회로 | theory | 논리회로, FSM |
| `EE.EM` | 전자기학 | theory | Maxwell, 전자파 |
| `EE.SIGSYS` | 신호 및 시스템 | theory | 시스템해석 |
| `EE.DSP` | 디지털신호처리 | theory | DSP, FFT, 필터설계 |
| `EE.SEMI` | 반도체 소자 | theory | MOSFET, 소자물리 |
| `EE.PROCESS` | 반도체 공정 | theory | 포토, 식각, 증착, 8대공정 |
| `EE.VLSI` | VLSI·집적회로 설계 | theory | ASIC, SoC, 물리설계 |
| `EE.POWERELEC` | 전력전자 | theory | 컨버터, 인버터, PWM |
| `EE.POWERSYS` | 전력시스템 | theory | 송배전, 계통해석 |
| `EE.MOTOR` | 전기기기·모터제어 | theory | BLDC, 인버터제어 |
| `EE.CTRL` | 자동제어 | theory | 제어공학, 상태공간 |
| `EE.COMM` | 통신이론 | theory | 변복조, 채널코딩 |
| `EE.RF` | RF·안테나 | theory | 고주파, 임피던스 정합 |
| `EE.MCU` | 마이크로프로세서 | theory | MCU, ARM, 인터럽트 |
| `EE.EMBED` | 임베디드 시스템 | theory | 펌웨어, RTOS |
| `EE.INSTR` | 계측·센서 | theory | 센서회로, 신호조절 |
| `EE.OPTO` | 광전자·디스플레이 | theory | OLED, LED, 광소자 |
| `EE.EMC` | EMC·신호무결성 | theory | EMI, SI/PI |

**L3 · 도구·소프트웨어** (17)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `SW.SPICE` | SPICE 시뮬레이션 | software | LTspice, PSpice, HSPICE |
| `SW.CADENCE` | Cadence Virtuoso | software | 케이던스, 레이아웃 |
| `SW.SYNOPSYS` | Synopsys 합성·검증 | software | Design Compiler, VCS, PrimeTime |
| `SW.VERILOG` | Verilog·SystemVerilog | software | RTL, SV, UVM |
| `SW.VHDL` | VHDL | software | — |
| `SW.FPGA` | FPGA 툴체인 | software | Vivado, Quartus, Xilinx |
| `SW.PCB` | PCB 설계 | software | Altium, OrCAD, KiCad, 아트웍 |
| `SW.HFSS` | 전자계 해석 (HFSS·ADS) | software | ADS, CST, 전자파해석 |
| `SW.TCAD` | TCAD | software | Sentaurus, 소자 시뮬레이션 |
| `SW.MATLAB` | MATLAB | software | 매트랩 |
| `SW.SIMULINK` | Simulink | software | MBD, PLECS |
| `SW.C_EMB` | 임베디드 C | software | C언어, C++ |
| `SW.PYTHON` | Python | software | 파이썬, 자동화 스크립트 |
| `SW.RTOS` | RTOS | software | FreeRTOS, Zephyr |
| `SW.LABVIEW` | LabVIEW·자동계측 | software | 자동시험 |
| `SW.SCOPE` | 오실로스코프·계측장비 | tool | 스펙트럼분석기, 네트워크분석기, JTAG |
| `SW.GIT` | 형상관리 (Git) | software | 깃, 버전관리 |

**L4 · 응용 도메인** (6)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `DM.FOUNDRY` | 파운드리·수율 | domain | 수율분석, 불량분석, FA |
| `DM.MEMORY` | 메모리 (DRAM·NAND) | domain | DRAM, 낸드 |
| `DM.AUTO_E` | 자동차 전장·ADAS | domain | ECU, CAN, AUTOSAR |
| `DM.BMS` | 배터리 BMS | domain | 셀밸런싱, SOC 추정 |
| `DM.GRID` | 전력망·신재생 연계 | domain | ESS, 태양광 인버터 |
| `DM.MODEM` | 무선 모뎀·5G | domain | 5G, LTE, 베이스밴드 |

**L5 · 공통 역량** (4)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `CM.STD_EE` | 규격·인증 | soft | IEC, AEC-Q100, KC인증, 기능안전 |
| `CM.DOC` | 기술문서 작성 | soft | 사양서, 시험성적서 |
| `CM.ENG` | 영문 기술 커뮤니케이션 | soft | 영어, 해외 협업 |
| `CM.COLLAB` | 협업·이슈관리 | soft | Jira, 코드리뷰 |

### 직무군과 요구 역량

#### 반도체 소자·공정 — `EE.SEMI_DEV`

O*NET `17-2072.00` · 산업 SEMI · 트랙 UNIV_HIGH, GRAD

활동 지표 가중치 — RESEARCH 0.28 · ANALYZE 0.26 · FIELD 0.18 · BUILD 0.14 · OPTIMIZE 0.1 · DESIGN 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 반도체 소자 `EE.SEMI` | 4 | ★★★ |
| 반도체 공정 `EE.PROCESS` | 4 | ★★★ |
| 물리전자 `EE.PHYS` | 4 | ★★★ |
| 파운드리·수율 `DM.FOUNDRY` | 3 | ★★★ |
| TCAD `SW.TCAD` | 3 | ★★ |
| 계측·센서 `EE.INSTR` | 3 | ★★ |
| Python `SW.PYTHON` | 3 | ★★ |
| 메모리 (DRAM·NAND) `DM.MEMORY` | 3 | ★★ |
| 확률과 랜덤변수 `EE.PROB` | 3 | ★★ |
| 기술문서 작성 `CM.DOC` | 3 | ★★ |
| 영문 기술 커뮤니케이션 `CM.ENG` | 3 | ★★ |

#### 아날로그·RF 회로 설계 — `EE.ANALOG_RF`

O*NET `17-2072.00` · 산업 SEMI, TELCO, MED · 트랙 UNIV_HIGH, GRAD

활동 지표 가중치 — ANALYZE 0.32 · DESIGN 0.28 · RESEARCH 0.18 · BUILD 0.14 · CODE 0.04 · OPTIMIZE 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 전자회로·아날로그 `EE.ANALOG` | 5 | ★★★ |
| 회로이론 `EE.CIRCUIT` | 4 | ★★★ |
| SPICE 시뮬레이션 `SW.SPICE` | 4 | ★★★ |
| Cadence Virtuoso `SW.CADENCE` | 4 | ★★★ |
| 반도체 소자 `EE.SEMI` | 4 | ★★★ |
| 전자기학 `EE.EM` | 3 | ★★ |
| RF·안테나 `EE.RF` | 3 | ★★ |
| 전자계 해석 (HFSS·ADS) `SW.HFSS` | 3 | ★★ |
| 오실로스코프·계측장비 `SW.SCOPE` | 3 | ★★ |
| EMC·신호무결성 `EE.EMC` | 3 | ★★ |
| 영문 기술 커뮤니케이션 `CM.ENG` | 3 | ★★ |

#### 디지털 IC·SoC 설계 — `EE.DIGITAL_SOC`

O*NET `17-2061.00` · 산업 SEMI, AI, TELCO · 트랙 UNIV_HIGH, GRAD

활동 지표 가중치 — CODE 0.28 · DESIGN 0.26 · ANALYZE 0.22 · RESEARCH 0.12 · OPTIMIZE 0.08 · BUILD 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| Verilog·SystemVerilog `SW.VERILOG` | 5 | ★★★ |
| 디지털논리회로 `EE.DIGITAL` | 4 | ★★★ |
| VLSI·집적회로 설계 `EE.VLSI` | 4 | ★★★ |
| Synopsys 합성·검증 `SW.SYNOPSYS` | 4 | ★★★ |
| FPGA 툴체인 `SW.FPGA` | 3 | ★★ |
| 마이크로프로세서 `EE.MCU` | 3 | ★★ |
| Python `SW.PYTHON` | 3 | ★★ |
| 형상관리 (Git) `SW.GIT` | 3 | ★★ |
| 신호 및 시스템 `EE.SIGSYS` | 3 | ★★ |
| EMC·신호무결성 `EE.EMC` | 2 | ★ |
| 영문 기술 커뮤니케이션 `CM.ENG` | 3 | ★★ |

#### 임베디드 SW·펌웨어 — `EE.EMBEDDED`

O*NET `17-2061.00` · 산업 AUTO, ROBOT, MED, MACH · 트랙 HS, UNIV_LOW, UNIV_HIGH, GRAD

활동 지표 가중치 — CODE 0.36 · BUILD 0.22 · DESIGN 0.16 · ANALYZE 0.14 · OPTIMIZE 0.08 · FIELD 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 임베디드 C `SW.C_EMB` | 5 | ★★★ |
| 임베디드 시스템 `EE.EMBED` | 4 | ★★★ |
| 마이크로프로세서 `EE.MCU` | 4 | ★★★ |
| RTOS `SW.RTOS` | 3 | ★★★ |
| 디지털논리회로 `EE.DIGITAL` | 3 | ★★ |
| 형상관리 (Git) `SW.GIT` | 3 | ★★ |
| 오실로스코프·계측장비 `SW.SCOPE` | 3 | ★★ |
| 계측·센서 `EE.INSTR` | 3 | ★★ |
| Python `SW.PYTHON` | 3 | ★★ |
| 자동차 전장·ADAS `DM.AUTO_E` | 2 | ★ |
| 협업·이슈관리 `CM.COLLAB` | 3 | ★★ |

#### 전력전자·전력시스템 — `EE.POWER`

O*NET `17-2071.00` · 산업 POWER, BATT, AUTO · 트랙 HS, UNIV_LOW, UNIV_HIGH

활동 지표 가중치 — ANALYZE 0.28 · DESIGN 0.22 · BUILD 0.18 · FIELD 0.18 · OPTIMIZE 0.1 · RESEARCH 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 전력전자 `EE.POWERELEC` | 4 | ★★★ |
| 전기기기·모터제어 `EE.MOTOR` | 4 | ★★★ |
| 회로이론 `EE.CIRCUIT` | 4 | ★★★ |
| 자동제어 `EE.CTRL` | 3 | ★★★ |
| Simulink `SW.SIMULINK` | 3 | ★★ |
| 전력시스템 `EE.POWERSYS` | 3 | ★★ |
| 전력망·신재생 연계 `DM.GRID` | 3 | ★★ |
| PCB 설계 `SW.PCB` | 3 | ★★ |
| 오실로스코프·계측장비 `SW.SCOPE` | 3 | ★★ |
| 규격·인증 `CM.STD_EE` | 3 | ★★ |
| 배터리 BMS `DM.BMS` | 2 | ★ |

#### 자동차 전장·ADAS — `EE.AUTO_ELEC`

O*NET `17-2072.00` · 산업 AUTO · 트랙 UNIV_LOW, UNIV_HIGH, GRAD

활동 지표 가중치 — DESIGN 0.24 · CODE 0.22 · ANALYZE 0.2 · BUILD 0.18 · OPTIMIZE 0.1 · FIELD 0.06

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 자동차 전장·ADAS `DM.AUTO_E` | 4 | ★★★ |
| 임베디드 시스템 `EE.EMBED` | 4 | ★★★ |
| 임베디드 C `SW.C_EMB` | 4 | ★★★ |
| 규격·인증 `CM.STD_EE` | 4 | ★★★ |
| PCB 설계 `SW.PCB` | 3 | ★★ |
| EMC·신호무결성 `EE.EMC` | 3 | ★★ |
| 계측·센서 `EE.INSTR` | 3 | ★★ |
| Simulink `SW.SIMULINK` | 3 | ★★ |
| 자동제어 `EE.CTRL` | 3 | ★★ |
| 형상관리 (Git) `SW.GIT` | 3 | ★★ |
| 영문 기술 커뮤니케이션 `CM.ENG` | 3 | ★★ |

#### 통신·네트워크 시스템 — `EE.COMM_SYS`

O*NET `17-2072.00` · 산업 TELCO, DEF, AERO · 트랙 UNIV_HIGH, GRAD

활동 지표 가중치 — ANALYZE 0.3 · CODE 0.22 · RESEARCH 0.2 · DESIGN 0.14 · BUILD 0.1 · FIELD 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 통신이론 `EE.COMM` | 4 | ★★★ |
| 디지털신호처리 `EE.DSP` | 4 | ★★★ |
| 신호 및 시스템 `EE.SIGSYS` | 4 | ★★★ |
| 확률과 랜덤변수 `EE.PROB` | 4 | ★★★ |
| MATLAB `SW.MATLAB` | 4 | ★★★ |
| 무선 모뎀·5G `DM.MODEM` | 3 | ★★ |
| RF·안테나 `EE.RF` | 3 | ★★ |
| Python `SW.PYTHON` | 3 | ★★ |
| FPGA 툴체인 `SW.FPGA` | 2 | ★ |
| 영문 기술 커뮤니케이션 `CM.ENG` | 3 | ★★ |

#### 하드웨어 시험·신뢰성 — `EE.HW_TEST`

O*NET `17-3023.00` · 산업 SEMI, AUTO, MED, TELCO · 트랙 HS, UNIV_LOW, UNIV_HIGH

활동 지표 가중치 — BUILD 0.28 · OPTIMIZE 0.22 · ANALYZE 0.2 · FIELD 0.18 · ORCHESTRATE 0.08 · CODE 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 오실로스코프·계측장비 `SW.SCOPE` | 4 | ★★★ |
| 계측·센서 `EE.INSTR` | 4 | ★★★ |
| 규격·인증 `CM.STD_EE` | 4 | ★★★ |
| EMC·신호무결성 `EE.EMC` | 3 | ★★★ |
| LabVIEW·자동계측 `SW.LABVIEW` | 3 | ★★ |
| 회로이론 `EE.CIRCUIT` | 3 | ★★ |
| Python `SW.PYTHON` | 3 | ★★ |
| 기술문서 작성 `CM.DOC` | 3 | ★★ |
| 확률과 랜덤변수 `EE.PROB` | 3 | ★★ |
| PCB 설계 `SW.PCB` | 2 | ★ |

## 컴퓨터공학 (CE)

### 계층별 역량

**L1 · 기초과학** (2)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `CE.MATH` | 이산수학·선형대수 | theory | 이산구조, 행렬 |
| `CE.PROB` | 확률·통계 | theory | 통계학 |

**L2 · 전공 핵심** (16)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `CE.DS` | 자료구조 | theory | 트리, 그래프, 해시 |
| `CE.ALGO` | 알고리즘 | theory | 복잡도, 동적계획법, 코딩테스트 |
| `CE.OS` | 운영체제 | theory | 프로세스, 스케줄링, 동시성 |
| `CE.ARCH` | 컴퓨터구조 | theory | 파이프라인, 캐시 |
| `CE.NET` | 컴퓨터 네트워크 | theory | TCP/IP, HTTP, 소켓 |
| `CE.DB` | 데이터베이스 | theory | 정규화, 트랜잭션, 인덱스 |
| `CE.SE` | 소프트웨어공학 | theory | 설계패턴, 테스트, 요구공학 |
| `CE.COMP` | 컴파일러·언어이론 | theory | 파서, 형식언어 |
| `CE.DIST` | 분산·병렬 시스템 | theory | 합의, 샤딩, 병렬처리 |
| `CE.SEC` | 정보보안 | theory | 암호학, 취약점, 인증 |
| `CE.AI` | 인공지능 | theory | 탐색, 추론 |
| `CE.ML` | 기계학습 | theory | 회귀, 분류, 모델평가 |
| `CE.DL` | 딥러닝 | theory | CNN, Transformer, LLM |
| `CE.CG` | 컴퓨터그래픽스 | theory | 렌더링, 셰이더 |
| `CE.HCI` | HCI·UX | theory | 사용성, 인터랙션 |
| `CE.EMBEDSW` | 시스템·임베디드 SW | theory | 커널, 드라이버, 펌웨어 |

**L3 · 도구·소프트웨어** (22)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `SW.PYTHON` | Python | software | 파이썬 |
| `SW.JAVA` | Java | software | 자바, Kotlin |
| `SW.CPP` | C·C++ | software | 씨, 씨쁠쁠 |
| `SW.JS` | JavaScript·TypeScript | software | JS, TS |
| `SW.GO` | Go·Rust | software | 고랭, 러스트 |
| `SW.SQL` | SQL | software | 쿼리, PostgreSQL, MySQL |
| `SW.SPRING` | Spring | software | 스프링, Spring Boot |
| `SW.NODE` | Node.js | software | Express, NestJS |
| `SW.DJANGO` | Django·FastAPI | software | 파이썬 웹 |
| `SW.REACT` | React·Next.js | software | 리액트, Vue, 프론트엔드 프레임워크 |
| `SW.PYTORCH` | PyTorch | software | TensorFlow, 딥러닝 프레임워크 |
| `SW.PANDAS` | Pandas·NumPy | software | 데이터 분석 라이브러리 |
| `SW.SPARK` | Spark·Kafka | software | 대용량 처리, 스트리밍 |
| `SW.AIRFLOW` | Airflow·dbt | software | 워크플로, ELT |
| `SW.DOCKER` | Docker | software | 컨테이너 |
| `SW.K8S` | Kubernetes | software | 쿠버네티스, K8s |
| `SW.CLOUD` | AWS·GCP·Azure | software | 클라우드, EC2, S3 |
| `SW.CICD` | CI/CD | software | GitHub Actions, Jenkins, 배포 자동화 |
| `SW.LINUX` | Linux·셸 | software | 리눅스, bash, 서버운영 |
| `SW.GIT` | Git | software | 깃, 형상관리, 코드리뷰 |
| `SW.TEST` | 테스트 자동화 | software | 단위테스트, JUnit, pytest, E2E |
| `SW.MONITOR` | 모니터링·관측 | software | Prometheus, Grafana, 로그 |

**L4 · 응용 도메인** (5)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `DM.BACKEND` | 백엔드 아키텍처 | domain | API 설계, MSA, 캐시 전략 |
| `DM.DATAENG` | 데이터 파이프라인 | domain | ETL, 데이터 웨어하우스 |
| `DM.MLOPS` | MLOps·모델 서빙 | domain | 모델 배포, 피처스토어 |
| `DM.SECOPS` | 보안 운영·모의해킹 | domain | 침해대응, 펜테스트, SOC |
| `DM.MOBILE` | 모바일 앱 | domain | Android, iOS, Flutter |

**L5 · 공통 역량** (4)

| 코드 | 이름 | 종류 | 동의어 (스킬 추출 사전) |
|---|---|---|---|
| `CM.DOC` | 기술문서 작성 | soft | 설계문서, README |
| `CM.AGILE` | 애자일 협업 | soft | 스크럼, Jira, 스프린트 |
| `CM.ENG` | 영문 기술 커뮤니케이션 | soft | 영어, 원문 문서 독해 |
| `CM.PRODUCT` | 제품·도메인 이해 | soft | 요구사항 분석, 기획 협업 |

### 직무군과 요구 역량

#### 백엔드 개발 — `CE.BACKEND`

O*NET `15-1252.00` · 산업 SW, AI, TELCO · 트랙 HS, UNIV_LOW, UNIV_HIGH, GRAD

활동 지표 가중치 — CODE 0.38 · DESIGN 0.22 · ANALYZE 0.16 · OPTIMIZE 0.14 · ORCHESTRATE 0.06 · BUILD 0.04

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| Java `SW.JAVA` | 4 | ★★★ |
| 백엔드 아키텍처 `DM.BACKEND` | 4 | ★★★ |
| 데이터베이스 `CE.DB` | 4 | ★★★ |
| SQL `SW.SQL` | 4 | ★★★ |
| 컴퓨터 네트워크 `CE.NET` | 3 | ★★★ |
| Spring `SW.SPRING` | 4 | ★★★ |
| 운영체제 `CE.OS` | 3 | ★★ |
| Git `SW.GIT` | 4 | ★★★ |
| Docker `SW.DOCKER` | 3 | ★★ |
| 테스트 자동화 `SW.TEST` | 3 | ★★ |
| 알고리즘 `CE.ALGO` | 3 | ★★ |
| 애자일 협업 `CM.AGILE` | 3 | ★★ |

#### 프론트엔드·웹 개발 — `CE.FRONTEND`

O*NET `15-1254.00` · 산업 SW, AI · 트랙 HS, UNIV_LOW, UNIV_HIGH

활동 지표 가중치 — CODE 0.36 · DESIGN 0.26 · OPTIMIZE 0.14 · ANALYZE 0.1 · ORCHESTRATE 0.08 · BUILD 0.06

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| JavaScript·TypeScript `SW.JS` | 5 | ★★★ |
| React·Next.js `SW.REACT` | 4 | ★★★ |
| HCI·UX `CE.HCI` | 3 | ★★★ |
| 컴퓨터 네트워크 `CE.NET` | 3 | ★★ |
| Git `SW.GIT` | 4 | ★★★ |
| 테스트 자동화 `SW.TEST` | 3 | ★★ |
| 소프트웨어공학 `CE.SE` | 3 | ★★ |
| CI/CD `SW.CICD` | 2 | ★ |
| 제품·도메인 이해 `CM.PRODUCT` | 3 | ★★ |
| 애자일 협업 `CM.AGILE` | 3 | ★★ |

#### 데이터 엔지니어 — `CE.DATAENG`

O*NET `15-2051.01` · 산업 AI, SW, SEMI · 트랙 UNIV_HIGH, GRAD

활동 지표 가중치 — CODE 0.3 · ANALYZE 0.26 · DESIGN 0.18 · OPTIMIZE 0.18 · ORCHESTRATE 0.08

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| SQL `SW.SQL` | 5 | ★★★ |
| 데이터 파이프라인 `DM.DATAENG` | 4 | ★★★ |
| Python `SW.PYTHON` | 4 | ★★★ |
| Spark·Kafka `SW.SPARK` | 4 | ★★★ |
| Airflow·dbt `SW.AIRFLOW` | 3 | ★★★ |
| 데이터베이스 `CE.DB` | 4 | ★★★ |
| AWS·GCP·Azure `SW.CLOUD` | 3 | ★★ |
| 분산·병렬 시스템 `CE.DIST` | 3 | ★★ |
| Docker `SW.DOCKER` | 3 | ★★ |
| 확률·통계 `CE.PROB` | 3 | ★★ |
| Git `SW.GIT` | 3 | ★★ |

#### AI·ML 엔지니어 — `CE.ML`

O*NET `15-2051.00` · 산업 AI, SW, AUTO, MED · 트랙 UNIV_HIGH, GRAD

활동 지표 가중치 — RESEARCH 0.3 · CODE 0.28 · ANALYZE 0.24 · OPTIMIZE 0.1 · DESIGN 0.08

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 기계학습 `CE.ML` | 4 | ★★★ |
| 딥러닝 `CE.DL` | 4 | ★★★ |
| PyTorch `SW.PYTORCH` | 4 | ★★★ |
| Python `SW.PYTHON` | 5 | ★★★ |
| 이산수학·선형대수 `CE.MATH` | 4 | ★★★ |
| 확률·통계 `CE.PROB` | 4 | ★★★ |
| Pandas·NumPy `SW.PANDAS` | 4 | ★★★ |
| MLOps·모델 서빙 `DM.MLOPS` | 3 | ★★ |
| AWS·GCP·Azure `SW.CLOUD` | 3 | ★★ |
| 영문 기술 커뮤니케이션 `CM.ENG` | 4 | ★★★ |
| Git `SW.GIT` | 3 | ★★ |

#### 시스템·임베디드 SW — `CE.SYSSW`

O*NET `15-1252.00` · 산업 SEMI, AUTO, ROBOT, TELCO · 트랙 UNIV_LOW, UNIV_HIGH, GRAD

활동 지표 가중치 — CODE 0.34 · ANALYZE 0.24 · BUILD 0.18 · OPTIMIZE 0.16 · DESIGN 0.08

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| C·C++ `SW.CPP` | 5 | ★★★ |
| 운영체제 `CE.OS` | 4 | ★★★ |
| 시스템·임베디드 SW `CE.EMBEDSW` | 4 | ★★★ |
| 컴퓨터구조 `CE.ARCH` | 4 | ★★★ |
| Linux·셸 `SW.LINUX` | 4 | ★★★ |
| 컴퓨터 네트워크 `CE.NET` | 3 | ★★ |
| Git `SW.GIT` | 3 | ★★ |
| 알고리즘 `CE.ALGO` | 3 | ★★ |
| 테스트 자동화 `SW.TEST` | 3 | ★★ |
| 기술문서 작성 `CM.DOC` | 3 | ★★ |

#### 클라우드·인프라 (DevOps·SRE) — `CE.DEVOPS`

O*NET `15-1244.00` · 산업 SW, AI, TELCO · 트랙 HS, UNIV_LOW, UNIV_HIGH

활동 지표 가중치 — OPTIMIZE 0.28 · FIELD 0.22 · CODE 0.22 · ANALYZE 0.16 · ORCHESTRATE 0.12

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| Linux·셸 `SW.LINUX` | 5 | ★★★ |
| Kubernetes `SW.K8S` | 4 | ★★★ |
| Docker `SW.DOCKER` | 4 | ★★★ |
| AWS·GCP·Azure `SW.CLOUD` | 4 | ★★★ |
| CI/CD `SW.CICD` | 4 | ★★★ |
| 컴퓨터 네트워크 `CE.NET` | 4 | ★★★ |
| 모니터링·관측 `SW.MONITOR` | 3 | ★★★ |
| Python `SW.PYTHON` | 3 | ★★ |
| 정보보안 `CE.SEC` | 3 | ★★ |
| Git `SW.GIT` | 4 | ★★★ |

#### 보안 엔지니어 — `CE.SECURITY`

O*NET `15-1212.00` · 산업 SW, POWER, DEF, TELCO · 트랙 UNIV_HIGH, GRAD

활동 지표 가중치 — ANALYZE 0.3 · RESEARCH 0.22 · CODE 0.2 · FIELD 0.16 · OPTIMIZE 0.12

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 정보보안 `CE.SEC` | 5 | ★★★ |
| 보안 운영·모의해킹 `DM.SECOPS` | 4 | ★★★ |
| 컴퓨터 네트워크 `CE.NET` | 4 | ★★★ |
| Linux·셸 `SW.LINUX` | 4 | ★★★ |
| 운영체제 `CE.OS` | 3 | ★★★ |
| Python `SW.PYTHON` | 3 | ★★ |
| 컴퓨터구조 `CE.ARCH` | 3 | ★★ |
| C·C++ `SW.CPP` | 3 | ★★ |
| 기술문서 작성 `CM.DOC` | 3 | ★★ |
| 영문 기술 커뮤니케이션 `CM.ENG` | 3 | ★★ |

#### SW 품질·테스트 엔지니어 — `CE.QA`

O*NET `15-1253.00` · 산업 SW, AUTO, MED, SEMI · 트랙 HS, UNIV_LOW, UNIV_HIGH

활동 지표 가중치 — OPTIMIZE 0.26 · ANALYZE 0.24 · CODE 0.22 · ORCHESTRATE 0.16 · BUILD 0.12

| 역량 | 요구 수준 | 필수도 |
|---|---|---|
| 테스트 자동화 `SW.TEST` | 5 | ★★★ |
| 소프트웨어공학 `CE.SE` | 4 | ★★★ |
| Python `SW.PYTHON` | 3 | ★★★ |
| CI/CD `SW.CICD` | 3 | ★★ |
| 데이터베이스 `CE.DB` | 3 | ★★ |
| Git `SW.GIT` | 3 | ★★ |
| 기술문서 작성 `CM.DOC` | 4 | ★★★ |
| 컴퓨터 네트워크 `CE.NET` | 3 | ★★ |
| 애자일 협업 `CM.AGILE` | 3 | ★★ |
| Linux·셸 `SW.LINUX` | 3 | ★★ |
