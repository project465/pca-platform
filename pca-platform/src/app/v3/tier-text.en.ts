/**
 * `tier-text.ts` 의 영어 벌. **내보내는 이름과 모양이 같다.**
 *
 * Core 마다 갈리는 표(산업 · 역할 · 조직 한 줄)는 영어판을 여는 이공계 셋
 * (`EDITION_CORES.en`)만 적었다. 표에 없는 카드는 한국어 벌과 같은 길로
 * 그 Core 의 팩(영어 원고)이 든 줄로 떨어진다.
 *
 * 화면에서만 쓰는 말이고 채점에 들어가지 않는다. 보기 넷의 꼬리표는 자리
 * 번호로만 판정되므로 글자가 언어마다 달라도 같은 응답이 같은 수준으로 간다.
 */
import type { Tier } from "@/lib/me-v3/scoring/types";

export const TIER_WHAT: Record<Tier, { label: string; what: string }> = {
  BASIC: {
    label: "Starting point",
    what: "Where to start among the work areas, and what experience already shows in your answers",
  },
  STANDARD: {
    label: "Experience in depth",
    what: "A closer look at the areas you've worked in, from scope and method to results and use, plus what's still missing and how to fill it",
  },
  PRO: {
    label: "For your applications",
    what: "Turning one project into words you can use in applications, plus a closer look at one industry and one role",
  },
};

export const STAGE_LABEL: Record<string, string> = {
  bachelor: "Undergraduate", master: "Master's", phd: "PhD", postdoc: "Postdoc",
};

export const FIELD_LABEL: Record<string, string> = {
  STEM: "STEM",
  HUMANITIES_SOCIAL: "Humanities and social sciences",
  BUSINESS: "Business and economics",
  OTHER_INTERDISCIPLINARY: "Other or interdisciplinary",
};

export const undergradLabel = (major: string): Record<string, string> => ({
  ME: `Yes, it was in ${major}`,
  OTHER: `No, it was in another field`,
});

export const undergradGloss = (major: string, examples: string): Record<string, string> => ({
  ME: examples,
  OTHER: `Pick this if your undergraduate major wasn't in ${major}.`,
});

export const UNDERGRAD_ASK = "Undergraduate major";
export const UNDERGRAD_HELP =
  "We ask this separately from your graduate field. Your results will show both.";

export const OWNERSHIP_SHORT = [
  "Never done it",
  "Followed a plan",
  "Did it myself",
  "Made the call",
];

export const OWNERSHIP_LABEL = [
  "Haven't done this yet",
  "Worked to criteria someone else set",
  "Chose the method and did it myself",
  "Set the criteria myself, too",
];

export const OWNERSHIP_HELP = [
  "Not yet",
  "Criteria were given",
  "I chose the method",
  "I set the criteria",
];

export const OWNERSHIP_EXAMPLE = [
  "",
  "I did what a senior student or professor set up, or filled numbers into a template.",
  "We agreed on the conditions together, and I did the actual work and calculations.",
  "I decided which criteria to use, and the team moved ahead based on that decision.",
];

export const INDUSTRY_HINT: Record<string, Record<string, string>> = {
  ME_CORE_V3: {
    INDUSTRY_SEMICON_V2: "Precision structures · thermal distortion · vibration · vacuum · equipment uptime",
    INDUSTRY_DEFENSE_V2: "Requirements · weight-saving rationale · shock and vibration · environmental tests",
    INDUSTRY_MOBILITY_V2: "Cost and weight · manufacturability · durability · noise and vibration",
    INDUSTRY_ROBOT_V2: "Loads and inertia · actuator choice · drivetrains · repeatability",
    INDUSTRY_BATTERY_V2: "Heat paths · swelling-tolerant design · tight process windows · yield",
    INDUSTRY_SHIP_V2: "Large structures · class rules · welding distortion · corrosion and service life",
    INDUSTRY_ENERGY_V2: "Operating points · rotating machinery health · inspection intervals · uptime",
    INDUSTRY_SMARTFACTORY_V2: "Automation scope · building machines · line flow · measurement and records",
  },
  EE_CORE_V1: {
    INDUSTRY_SEMI_V1: "Small-signal measurement · device variation · high-voltage supplies · equipment uptime",
    INDUSTRY_AUTOEV_V1: "In-vehicle networks · power conversion · motor control · EMI",
    INDUSTRY_NETWORK_V1: "Modulation and error rates · RF and antennas · standards · interoperability",
    INDUSTRY_POWER_V1: "Equipment ratings · protection coordination · generation and storage · power quality",
    INDUSTRY_CONSUMER_V1: "Cost · standby power · wireless connectivity · safety certification",
    INDUSTRY_FACTORY_V1: "Safety stops · motor drives · sensor signals · industrial networks",
    INDUSTRY_MEDICAL_V1: "Biosignals · isolation and leakage current · measurement error · regulatory tests",
    INDUSTRY_DEFENSE_V1: "Harsh environments · RF · redundant power · reliability tests",
  },
  CS_CORE_V1: {
    INDUSTRY_PLATFORM_V1: "Lots of users · frequent releases · response time · metrics",
    INDUSTRY_FINTECH_V1: "No double charges · transaction records · regulation · incident response",
    INDUSTRY_GAME_V1: "Frame time · device performance · updates · concurrent players",
    INDUSTRY_ENTERPRISE_V1: "Client requirements · acceptance criteria · install environments · maintenance",
    INDUSTRY_MOBILITY_V1: "Real-time processing · functional safety · updates · dropped connections",
    INDUSTRY_HEALTH_V1: "Sensitive data · data formats · clinician judgment · retention periods",
    INDUSTRY_PUBLIC_V1: "Compliance · network separation · long-term upkeep · access logs",
  },
};

export const ROLE_HINT: Record<string, Record<string, string>> = {
  ME_CORE_V3: {
    ROLE_DESIGN_V2: "Locks down the geometry, dimensions and tolerances",
    ROLE_CAE_V2: "Predicts how a design will behave before it's built, and stands behind it",
    ROLE_RND_V2: "Builds a method when none exists yet",
    ROLE_TEST_V2: "Decides how to measure and what passes, then makes the call",
    ROLE_MFG_V2: "Sets the conditions that make every part come out the same",
    ROLE_MAINT_V2: "Keeps equipment performing and gets it running again when it stops",
    ROLE_QUALITY_V2: "Makes sure requirements hold through production and the product's life",
    ROLE_PM_V2: "Ties requirements, schedules and roles together and sets the order",
  },
  EE_CORE_V1: {
    ROLE_DESIGN_V1: "Decides the circuit structure, part values and operating conditions",
    ROLE_ANALYSIS_V1: "Predicts behavior with simulation before building, and stands behind it",
    ROLE_TEST_V1: "Decides how to measure and what passes, then makes the call",
    ROLE_PROCESS_V1: "Sets process conditions so the same product comes out every time",
    ROLE_MAINT_V1: "Sets operating and inspection rules so equipment keeps running",
    ROLE_PM_V1: "Brings everyone's requirements and schedules together and decides what comes first",
    ROLE_RND_V1: "Narrows down open problems and finds a method that works",
    ROLE_QUALITY_V1: "Makes sure electrical requirements hold through production and the product's life",
  },
  CS_CORE_V1: {
    ROLE_DEV_V1: "Splits the system into modules and decides interfaces and implementation",
    ROLE_PERF_V1: "Measures what's slow and predicts how much a fix will help",
    ROLE_QA_V1: "Decides what to test and what passes, then makes the call",
    ROLE_DEPLOY_V1: "Sets the release order and stop conditions, then automates them",
    ROLE_SRE_V1: "Sets alerting rules and brings failed services back",
    ROLE_PM_V1: "Decides what to build and in what order, and gets teams to agree",
    ROLE_RESEARCH_V1: "Frames the question and compares new methods with existing ones",
    ROLE_QUALITY_V1: "Checks against security and certification standards and keeps the evidence",
  },
};

export const ORG_HINT: Record<string, Record<string, string>> = {
  ME_CORE_V3: {
    OC1: "Builds finished products and balances performance, cost and delivery",
    OC2: "Supplies parts, equipment or materials and is judged on customer specs",
    OC3: "Does design and analysis for other companies and is judged on deadlines",
    OC4: "Runs on funded projects, with milestone reviews setting the pace",
    OC5: "Sets its own methods and publishes the results",
    OC6: "Checks whether things meet standards and keeps the records",
    OC7: "Covers design, testing and production at once, and moves fast",
  },
  EE_CORE_V1: {
    OC1: "Builds finished products and balances circuit performance, cost and delivery",
    OC2: "Supplies parts and equipment and is judged on meeting customer specs",
    OC3: "Does circuit design and testing for other companies, judged on deadlines",
    OC4: "Delivers prototypes and reports on government projects, with milestone reviews",
    OC5: "Sets its own experiment and measurement methods and publishes the results",
    OC6: "Tests against electrical safety and certification standards and makes the call",
    OC7: "One person often covers circuits, firmware and prototypes, and ships fast",
  },
};
