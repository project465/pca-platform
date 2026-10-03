/* 직무군별 준비 신호. content/evidence-rules.json 에서 만든다.
   화면이 fetch 를 쓰지 않아 같은 내용을 전역에 담는다. 고칠 곳은 json 쪽이다. */
window.PCA_EVIDENCE_RULES = window.PCA_EVIDENCE_RULES || {};
window.PCA_EVIDENCE_RULES.ME = {
  "schema_version": "1.0",
  "major_id": "ME",
  "note": "직무군마다 '이 자리를 보려면 무엇이 있어야 하는가' 를 신호로 적어 둔다. 응시자가 낸 경험이 그 신호에 걸리는지만 본다. 가중 평균을 만들지 않는 것은 일부러다. 검증된 모형이 없는 상태에서 가중치를 두면 그 숫자가 근거처럼 보인다. 지금은 걸린 것과 안 걸린 것만 센다.",
  "levels": {
    "high": "신호의 3분의 2 이상이 걸렸다",
    "medium": "3분의 1 이상이 걸렸다",
    "low": "그 아래. 못한다는 뜻이 아니라 지금 낸 자료로는 말할 수 없다는 뜻이다"
  },
  "course_catalog": [
    "정역학",
    "동역학",
    "재료역학",
    "열역학",
    "유체역학",
    "열전달",
    "기계진동",
    "자동제어",
    "기계요소설계",
    "기구학",
    "CAD · 도면",
    "제조공학 · 가공",
    "수치해석",
    "유한요소해석",
    "메카트로닉스",
    "로봇공학",
    "공학실험",
    "공학통계 · 실험계획법",
    "재료공학",
    "프로그래밍 · 전산",
    "품질공학",
    "산업공학 · 생산관리"
  ],
  "tool_categories": [
    {
      "id": "cad",
      "n": "CAD · 3D 모델링",
      "ex": [
        "SolidWorks",
        "CATIA",
        "NX",
        "Creo",
        "Inventor",
        "Fusion 360"
      ]
    },
    {
      "id": "cae",
      "n": "CAE · 구조해석",
      "ex": [
        "ANSYS Mechanical",
        "Abaqus",
        "Nastran",
        "HyperWorks",
        "LS-DYNA"
      ]
    },
    {
      "id": "cfd",
      "n": "유동 · 열해석",
      "ex": [
        "Fluent",
        "CFX",
        "STAR-CCM+",
        "OpenFOAM",
        "Icepak"
      ]
    },
    {
      "id": "num",
      "n": "수치 · 수식",
      "ex": [
        "MATLAB",
        "Simulink",
        "Mathematica",
        "Maple"
      ]
    },
    {
      "id": "code",
      "n": "프로그래밍",
      "ex": [
        "Python",
        "C/C++",
        "LabVIEW",
        "Git"
      ]
    },
    {
      "id": "data",
      "n": "데이터 분석",
      "ex": [
        "pandas",
        "Minitab",
        "JMP",
        "R",
        "SPC 도구"
      ]
    },
    {
      "id": "test",
      "n": "시험 · 계측",
      "ex": [
        "DAQ",
        "로드셀",
        "가속도계",
        "열화상",
        "만능시험기",
        "오실로스코프"
      ]
    },
    {
      "id": "cam",
      "n": "제조 · CAM",
      "ex": [
        "NX CAM",
        "Mastercam",
        "3D 프린터",
        "CNC"
      ]
    },
    {
      "id": "plm",
      "n": "PLM · PDM",
      "ex": [
        "Teamcenter",
        "Windchill",
        "SAP",
        "ERP"
      ]
    },
    {
      "id": "doc",
      "n": "문서 · 협업",
      "ex": [
        "Jira",
        "Confluence",
        "Notion",
        "LaTeX"
      ]
    }
  ],
  "tool_levels": [
    {
      "id": "seen",
      "n": "수업에서 따라 해 봤다"
    },
    {
      "id": "used",
      "n": "과제나 프로젝트에서 직접 썼다"
    },
    {
      "id": "owned",
      "n": "결과물을 끝까지 내 손으로 만들었다"
    },
    {
      "id": "taught",
      "n": "남에게 설명하거나 가르쳐 봤다"
    }
  ],
  "families": [
    {
      "career_family_id": "ME_DESIGN_PRODUCT",
      "signals": [
        {
          "id": "cad_output",
          "label": "도면이나 3D 모델을 끝까지 만들어 본 것",
          "tools": [
            "cad"
          ],
          "outputs": [
            "도면",
            "CAD",
            "모델",
            "설계안"
          ]
        },
        {
          "id": "requirement",
          "label": "요구조건을 수치와 제약으로 옮겨 본 것",
          "courses": [
            "기계요소설계",
            "기구학"
          ],
          "methods": [
            "요구조건",
            "사양",
            "트레이드오프"
          ]
        },
        {
          "id": "mechanics",
          "label": "하중과 재질을 근거로 치수를 정해 본 것",
          "courses": [
            "정역학",
            "재료역학",
            "기계요소설계"
          ]
        },
        {
          "id": "build",
          "label": "만들어 보고 고쳐 본 것",
          "project_types": [
            "capstone",
            "competition",
            "personal"
          ],
          "outputs": [
            "시제품",
            "프로토타입",
            "조립"
          ]
        },
        {
          "id": "change_log",
          "label": "설계 변경을 이력으로 남겨 본 것",
          "methods": [
            "설계변경",
            "형상관리",
            "검도"
          ],
          "tools": [
            "plm"
          ]
        },
        {
          "id": "manufacturing",
          "label": "만들 수 있는지를 함께 본 것",
          "courses": [
            "제조공학 · 가공"
          ],
          "tools": [
            "cam"
          ]
        }
      ]
    },
    {
      "career_family_id": "ME_CAE_SIM",
      "signals": [
        {
          "id": "fea",
          "label": "해석을 직접 돌려 본 것",
          "tools": [
            "cae",
            "cfd"
          ],
          "courses": [
            "유한요소해석"
          ]
        },
        {
          "id": "model_reduce",
          "label": "현상을 풀 수 있는 모델로 줄여 본 것",
          "methods": [
            "가정",
            "경계조건",
            "단순화",
            "대칭"
          ]
        },
        {
          "id": "convergence",
          "label": "수렴과 메시 민감도를 확인해 본 것",
          "methods": [
            "수렴",
            "메시",
            "민감도",
            "격자"
          ]
        },
        {
          "id": "validation",
          "label": "시험값이나 손 계산과 맞춰 본 것",
          "methods": [
            "검증",
            "시험 비교",
            "손 계산",
            "자릿수"
          ]
        },
        {
          "id": "numerics",
          "label": "수치해석의 바탕을 배운 것",
          "courses": [
            "수치해석",
            "유한요소해석",
            "열전달",
            "유체역학"
          ]
        },
        {
          "id": "report",
          "label": "해석 결과를 설계 판단으로 옮겨 본 것",
          "outputs": [
            "해석 리포트",
            "보고서",
            "비교표"
          ]
        }
      ]
    },
    {
      "career_family_id": "ME_RND",
      "signals": [
        {
          "id": "question",
          "label": "무엇을 모르는지부터 정해 본 것",
          "methods": [
            "가설",
            "연구 질문",
            "문제 정의"
          ]
        },
        {
          "id": "experiment",
          "label": "실험이나 해석을 설계해 본 것",
          "courses": [
            "공학실험",
            "공학통계 · 실험계획법"
          ],
          "methods": [
            "실험계획",
            "DOE",
            "변수 통제"
          ]
        },
        {
          "id": "iterate",
          "label": "예상과 다른 결과에서 다음을 설계해 본 것",
          "methods": [
            "재설계",
            "반복",
            "실패 분석"
          ]
        },
        {
          "id": "record",
          "label": "남이 재현할 수 있게 기록한 것",
          "outputs": [
            "실험노트",
            "논문",
            "보고서",
            "데이터셋"
          ]
        },
        {
          "id": "research_exp",
          "label": "연구에 실제로 참여한 것",
          "project_types": [
            "research"
          ]
        },
        {
          "id": "literature",
          "label": "선행 문헌을 읽고 자리를 잡아 본 것",
          "methods": [
            "문헌",
            "선행연구",
            "리뷰"
          ]
        }
      ]
    },
    {
      "career_family_id": "ME_MANUFACTURING",
      "signals": [
        {
          "id": "field",
          "label": "현장이나 라인을 직접 본 것",
          "project_types": [
            "internship",
            "work"
          ],
          "methods": [
            "현장",
            "라인",
            "작업 관찰"
          ]
        },
        {
          "id": "measure",
          "label": "바꾸기 전에 먼저 재 본 것",
          "methods": [
            "사이클 타임",
            "측정",
            "전후 비교",
            "기준선"
          ]
        },
        {
          "id": "bottleneck",
          "label": "병목을 찾아 본 것",
          "courses": [
            "산업공학 · 생산관리"
          ],
          "methods": [
            "병목",
            "공정 분석",
            "레이아웃"
          ]
        },
        {
          "id": "process_make",
          "label": "가공과 조립을 배워 본 것",
          "courses": [
            "제조공학 · 가공"
          ],
          "tools": [
            "cam"
          ]
        },
        {
          "id": "improve",
          "label": "개선안을 숫자로 보여 준 것",
          "outputs": [
            "개선 보고서",
            "전후 비교표"
          ]
        },
        {
          "id": "people",
          "label": "쓰는 사람과 같이 바꿔 본 것",
          "methods": [
            "작업자",
            "교육",
            "표준화"
          ]
        }
      ]
    },
    {
      "career_family_id": "ME_PROCESS",
      "signals": [
        {
          "id": "variables",
          "label": "변수를 좁혀 본 것",
          "courses": [
            "공학통계 · 실험계획법"
          ],
          "methods": [
            "인자",
            "스크리닝",
            "DOE"
          ]
        },
        {
          "id": "data",
          "label": "데이터로 확인해 본 것",
          "tools": [
            "data",
            "num",
            "code"
          ]
        },
        {
          "id": "process_know",
          "label": "공정의 바탕을 배운 것",
          "courses": [
            "열전달",
            "유체역학",
            "재료공학",
            "제조공학 · 가공"
          ]
        },
        {
          "id": "control",
          "label": "찾은 조건을 지켜지게 만들어 본 것",
          "methods": [
            "표준화",
            "관리도",
            "SPC",
            "작업표준"
          ]
        },
        {
          "id": "yield",
          "label": "수율이나 불량을 다뤄 본 것",
          "methods": [
            "수율",
            "불량",
            "변동"
          ]
        },
        {
          "id": "field2",
          "label": "현장이나 설비 앞에 서 본 것",
          "project_types": [
            "internship",
            "work"
          ]
        }
      ]
    },
    {
      "career_family_id": "ME_QUALITY_RELIABILITY",
      "signals": [
        {
          "id": "criteria",
          "label": "기준을 먼저 세워 본 것",
          "methods": [
            "합격 기준",
            "판정",
            "규격",
            "스펙"
          ]
        },
        {
          "id": "stats",
          "label": "통계로 본 것",
          "courses": [
            "공학통계 · 실험계획법",
            "품질공학"
          ],
          "tools": [
            "data"
          ]
        },
        {
          "id": "rootcause",
          "label": "원인까지 내려가 본 것",
          "methods": [
            "근본 원인",
            "5Why",
            "FMEA",
            "고장 분석"
          ]
        },
        {
          "id": "test",
          "label": "시험하고 재 본 것",
          "tools": [
            "test"
          ],
          "courses": [
            "공학실험"
          ]
        },
        {
          "id": "trace",
          "label": "기록으로 남겨 본 것",
          "outputs": [
            "시험 성적서",
            "판정 기준서",
            "검사 기록"
          ]
        },
        {
          "id": "material",
          "label": "재료와 파손을 배운 것",
          "courses": [
            "재료공학",
            "재료역학"
          ]
        }
      ]
    },
    {
      "career_family_id": "ME_EQUIPMENT_MAINT",
      "signals": [
        {
          "id": "hands",
          "label": "직접 분해하거나 고쳐 본 것",
          "methods": [
            "분해",
            "정비",
            "조립",
            "복구"
          ]
        },
        {
          "id": "diagnose",
          "label": "확인 순서를 지켜 좁혀 본 것",
          "methods": [
            "진단",
            "원인 추적",
            "점검 순서"
          ]
        },
        {
          "id": "mechatronics",
          "label": "기계와 전기·제어를 함께 본 것",
          "courses": [
            "메카트로닉스",
            "자동제어",
            "기계진동"
          ]
        },
        {
          "id": "log",
          "label": "고장 이력을 남겨 본 것",
          "outputs": [
            "점검 기록",
            "고장 이력",
            "정비 보고서"
          ]
        },
        {
          "id": "safety",
          "label": "안전 절차를 지켜 본 것",
          "methods": [
            "안전",
            "LOTO",
            "작업 허가"
          ]
        },
        {
          "id": "site",
          "label": "현장에서 일해 본 것",
          "project_types": [
            "internship",
            "work"
          ]
        }
      ]
    },
    {
      "career_family_id": "ME_SYSTEMS_TPM",
      "signals": [
        {
          "id": "schedule",
          "label": "일정과 선후 관계를 잡아 본 것",
          "methods": [
            "일정",
            "마일스톤",
            "의존",
            "WBS"
          ]
        },
        {
          "id": "crossteam",
          "label": "여러 쪽을 맞춰 본 것",
          "methods": [
            "조율",
            "협업",
            "부서",
            "이해관계"
          ]
        },
        {
          "id": "decide",
          "label": "회의를 결정으로 끝내 본 것",
          "methods": [
            "의사결정",
            "회의록",
            "합의"
          ]
        },
        {
          "id": "doc",
          "label": "현황을 한 장으로 남겨 본 것",
          "outputs": [
            "현황 문서",
            "회의록",
            "계획서"
          ],
          "tools": [
            "doc"
          ]
        },
        {
          "id": "tech",
          "label": "기술 바탕이 있는 것",
          "courses": [
            "기계요소설계",
            "제조공학 · 가공",
            "자동제어"
          ]
        },
        {
          "id": "risk",
          "label": "위험을 먼저 말해 본 것",
          "methods": [
            "리스크",
            "지연",
            "대안"
          ]
        }
      ]
    }
  ]
};
