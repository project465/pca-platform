# Careermetri · international site (imweb)

The English set. Same design system as `../imweb/` (Korean): the CSS and the
slider script in `00-head-code.html` are byte-identical, only the header
comment differs. One system, two sites.

**This is not a translation of the Korean site.** The two sell different
things, so several sections have no counterpart.

| The Korean site has | The international site has instead |
|---|---|
| Regional retention as a headline product | Retention as an optional module under Localisation |
| 42 Korean cities, 13,920 employers | The same figures, stated as Korea, the first market |
| 14 department rows in Korean names | The same rows in field and discipline names |
| Korean e-commerce footer | imweb required-footer fields, labels in English |
| 직업정보제공사업 신고 as a credential | The same number, labelled as a Korean registration |
| Price in won for both tracks | Individual in won, department and partner quoted |

Two sections exist only here, and they carry the international pitch:
**Localisation** (what is shared worldwide, what is rebuilt per country, what
the university fills in) and **Partnership** (who does what, and the four
steps of a first year). They come from `marketing/src/content/global.ts`,
which is where that frame was first written.

---

## 1. CSS once

Copy `00-head-code.html` whole into

```
Admin > Settings > SEO > (scroll down) Common code > Header Code
```

The field is called **Header Code**. The font links live here, so nothing
below renders correctly until this is in.

If that field cannot be found, use the Korean set's
`../imweb/00b-head-code-as-widget.html` instead: identical content, pasted as
the top code widget on every page. Every page, or the ones you miss render bare.

## 2. One code widget per section

| Page | Widgets, top to bottom |
|---|---|
| Home | `01-hero` · `02-who` · `03-output` |
| The assessment | `04-instrument` · `05-scoring` |
| Reports | `06-report` · `07-screens` · `08-cohort` |
| Localisation | `09-localisation` |
| Partnership | `10-partnership` |
| Pricing | `11-pricing` |
| About | `12-evidence` · `13-coverage` |
| Contact | `14-contact` + an imweb form widget below it |
| Bottom of every page | `15-footer` |

Build the menu with imweb's menu settings, not in code, so the mobile
hamburger and the current-page marker attach themselves.

## 3. The sliders

`06-report` (the eight report sections) and `07-screens` (three screens).
The wiring is in the head code; the widgets carry markup only. It is
`scroll-snap`, so a finger or a trackpad still works if the script fails, and
a `MutationObserver` catches widgets imweb inserts late.

## 4. Images

Same three files as the Korean site, in `../img/`. Upload them and replace
the placeholders.

| Placeholder | File | Used in |
|---|---|---|
| `IMG_TEST` | `test.png` | `04-instrument` · `07-screens` |
| `IMG_REPORT` | `report.png` | `06-report` · `07-screens` |
| `IMG_ORG` | `org.png` | `08-cohort` · `07-screens` |

## 5. Do not write these in code

**The contact form.** `14-contact` ends at the heading and the note. A form
written in code has nowhere to send to.

**Company details.** Use imweb's required-information footer, which has a
field per item. `15-footer` holds the brand line and the Korean registration
number only.

**Button targets.** `01-hero` points at `/contact` and `/reports`. Change
them to the real page addresses.

## 6. What is still open

- The domain. `careermetri.com` is the reserved name in
  `marketing/src/content/global.ts`, not a live address
- Company details for the footer, same eight fields as the Korean site
- Terms, privacy and refunds in English. The Korean set in
  `../legal/` is written against Korean law and does not transfer
- Individual card payment, which waits on the Korean merchant review
