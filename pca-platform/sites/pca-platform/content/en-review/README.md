# English drafts for review (hidden)

This folder holds **machine-drafted English translations** of the assessment
item banks. They are drafts for human review only.

- **Users do not see these files.** The app reads English only from `../en/`,
  and only for the cores listed in `EDITION_CORES` in
  `src/lib/me-v3/i18n.ts`. This folder is not in that path. Do not change
  `EDITION_CORES` until a person has reviewed a core.
- The Korean files in `../` are the source. If the Korean changes, the draft
  here is out of date.
- Official English editions already exist for ME, CS and EE in `../en/`.
  They are not in this folder.

## Files for each core

| File | Content |
|---|---|
| `<core>-v1-items.json` | Items, in the same shape as `../en/cs-v1-items.json` |
| `<core>-v1-checklists.json` | Checklist evidence lines |
| `<core>-v1-domains.json` | Domains, workflow, axis wording, organization outcomes |
| `<core>-v1-taxonomy.json` | Axes, domains, role functions, organization types, job titles, boundaries |
| `<core>-REVIEW.md` | Review sheet: item id, Korean, English draft, check note, approved box |

## Translation rules used

- Translate meaning, not words. Plain English (about CEFR B1), short
  sentences, no idioms, no dashes.
- Keep the measured construct the same. Ownership and frequency words are
  scoring words: 직접 (yourself), 혼자 (alone), 정했다 (decided),
  맡아서 (took charge), 받아서 했다 (received and did). Do not make them
  stronger or weaker.
- Keep ids, codes, numbers, placeholders and `response_scale` values as they
  are (for example `5보기` and `L0~L3` stay in Korean, as in `../en/`).
- Strings that are the same as a string in the official `../en/` files reuse
  that translation.

## How a reviewer approves an item

1. Open `<core>-REVIEW.md`. Read the rows with a note in the "check" column
   first.
2. If the English is right, change `[ ]` to `[x]` in the "approved" column.
3. If the English is wrong, fix the text in `<core>-v1-*.json`. Fix the same
   text in the review sheet. Then mark `[x]`.
4. When every row of a core is `[x]`, a developer can copy the four JSON files
   to `../en/` and add the core to `EDITION_CORES`. That step is a separate
   change and needs its own check.

## Status

| Core | Status | Items |
|---|---|---|
| BIZ_CORE_V1 | done (draft, not reviewed) | 359 |
| LANG_CORE_V1 | done (draft, not reviewed) | 369 |
| PUBADM_CORE_V1 | not started | |
| MEDIA_CORE_V1 | not started | |
| EDU_CORE_V1 | not started | |
| VISUAL_CORE_V1 | not started | |
| SPORTS_CORE_V1 | not started | |
| HEALTH_CORE_V1 | not started | |
| BT_CORE_V1 | not started | |
| FOOD_CORE_V1 | not started | |
| STYLE_CORE_V1 | not started | |
| CIV_CORE_V1 | not started | |
| LAW_CORE_V1 | not started | |
| ARCH_CORE_V1 | not started | |
| AGRI_CORE_V1 | not started | |
| PSY_CORE_V1 | not started | |
| NURSING_CORE_V1 | not started | |
| AI_CORE_V1 | not started | |
| ME, CS, EE | official English in `../en/` (not in this folder) | |

Order: by how many partner schools use the core in
`../campus-universities.json` (most first).
