# CareerMatri legal documents: English drafts

**Status: draft. It needs review by a person fluent in Korean and English
law terms.** Do not publish these files until that review is done.

The Korean files in the folder above (`../`) are the governing text. Each
English file starts with a notice that says this.

## Files

| English draft | Korean source | Content |
|---|---|---|
| `01-terms.md` | `../01-terms.md` | Terms of Service |
| `02-privacy.md` | `../02-privacy.md` | Privacy Policy |
| `03-refund.md` | `../03-refund.md` | Withdrawal and Refund Policy |
| `04-subscription.md` | `../04-subscription.md` | MAT Subscription Rules (recurring payment) |

## Rules used for the drafts

- Article and section numbers are the same as in the Korean text.
- Company facts are copied exactly from the Korean text.
- Korean law names keep the Korean name with an English gloss. Example: Act
  on the Consumer Protection in Electronic Commerce (전자상거래법).
- EU (GDPR) and Turkey (KVKK) clauses are out of scope. They are not added.
- For foreign residents in Korea, a sentence says that Korean law applies.
- Plain English for readers who are not native speakers: short sentences,
  one idea per sentence, no idioms, no dashes.

## Checklist of [TO CONFIRM] items

Tick each item when a reviewer has checked it. Search the files for
`TO CONFIRM` and `romanization to confirm` to find them.

### All files

- [ ] Company name romanization: `주식회사 에이치에이연구원 (HA Research
      Institute Co., Ltd.)`. The Korean documents give no English name. The
      Korean README (`../README.md`) says an older version used a different
      English name. Choose one official English name.
- [ ] Representative and Chief Privacy Officer name romanization:
      `조건희 (Cho Geonhui) · 한정인 (Han Jeongin)` (01, 02). Use the spelling
      in their passports or registration.
- [ ] "Korean law applies" sentence for foreign residents. It is added in
      the English drafts only (01 Article 16, 02 top, 03 top, 04 top).
      Decide whether to keep it, or add it to the Korean text too.

- [ ] English brand spelling: the drafts use `CareerMatri` (the spelling in
      `src/`). `scripts/launch-check.ts` blocks the old spelling `CareerMetri`.

### 01-terms.md

- [ ] Article 11(3) says the MAT period pass does not renew automatically.
      The Refund Policy and the Subscription Rules say it does. The Korean
      Terms may need an update first.
- [ ] English address format for the head office
      (세종특별자치시 한누리대로 2143, 704호).
- [ ] Mail-order business report number (통신판매업 신고번호): not issued yet.
      Fill in the English file when the Korean file is filled in.

### 02-privacy.md

- [ ] Whether to mention the alien registration number (외국인등록번호) for
      foreign residents, next to the resident registration number sentence.
- [ ] Section 8 says "None (the Company does not take payments now)" for
      payment processing. NHN KCP (from 2026-11-04) and Paddle (planned) are
      not listed. The Korean Policy may need an update first.
- [ ] Section 9: final English labels of the MAT buttons.
- [ ] Section 10: whether the listed Korean organizations offer service in
      English.

### 03-refund.md

- [ ] Section 4: refund route and timing for overseas card payments through
      Paddle (Merchant of Record). Needs the Paddle terms.

### 04-subscription.md

- [ ] Article 1-2 (overseas card, USD, Paddle) is not in the Korean text.
      Add it to the Korean text first, then check the English again.
- [ ] Paddle terms: buyer terms and Merchant of Record contract. Who the
      customer contacts first for billing and refunds.
- [ ] Paddle terms: check that Paddle allows each Company rule (7-day
      notice email, 30-day notice and re-consent for price increases,
      one-button cancel, refund rules, 3 daily retries then pause, no
      arrears). Write who does what if Paddle runs some steps.
- [ ] USD prices for each pass. Not decided.
- [ ] Taxes for USD payments: included in the shown price, or added by
      Paddle.
- [ ] Article 5(2): rounding rule for USD (amounts below 1 cent dropped).
      The Korean text only covers won.
- [ ] Article 5(4): how the Company sends a USD refund to Paddle, and how
      long it takes.
- [ ] Article 4(1): final English menu label for [My Info › Passes].
- [ ] Effective date of Article 1-2.
