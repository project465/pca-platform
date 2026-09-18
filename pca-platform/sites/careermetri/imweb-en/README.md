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
| The Korean career-information registration as a credential | The same number, labelled as a Korean registration |
| Price in won, individuals buy directly | No prices at all. This site explains and takes enquiries |

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
| Home | `01-hero` · `07-screens` · `16-markets` · `02-who` · `03-output` |
| The assessment | `04-instrument` · `05-scoring` |
| Reports | `06-report` · `08-cohort` |
| Localisation | `09-localisation` |
| Partnership | `10-partnership` |
| About | `12-evidence` · `13-coverage` · `22-about` |
| Contact | `23-faq` · `14-contact` + an imweb form widget below it |
| Bottom of every page | `15-footer` |

Build the menu with imweb's menu settings, not in code, so the mobile
hamburger and the current-page marker attach themselves.

## 3. The sliders

Two, and the wiring for both is in the head code; the widgets carry markup
only.

| Widget | Slides | Moves by |
|---|---|---|
| `07-screens` (Home) | The two platform screens, one per view | Drag, swipe, arrows, dots, arrow keys, and on its own every 6.5 s |
| `06-report` (Reports) | The eleven report sections, several per view | Drag on touch, swipe, arrows, dots, arrow keys |

It is built on CSS `scroll-snap`, so a finger or a trackpad still works if the
script never runs, and a `MutationObserver` catches widgets imweb inserts
late. A marker on each slider stops it being wired twice.

**Automatic advance is opt-in per section.** `data-cm-auto="6500"` on the
`.cm-sl` element is the dwell in milliseconds; remove the attribute and the
slider only moves when someone moves it. It stops under the pointer, while
anything inside has keyboard focus, on a hidden tab, and entirely for a
visitor whose system asks for reduced motion. The eleven-section slider does
not carry it: text that slides away while it is being read is worse than text
that never moves.

**Mouse drag is on the image slider only** (`cm-sl-img`). On a text slide the
same gesture is how someone selects a line. Snapping is switched off for the
duration of a drag and restored on release, because mandatory snap pulls the
position back after every write and a drag made of small steps would never
leave its slide.

## 4. Images

**This site has its own images, in `../img-en/`.** They are not the Korean
site's files. Both were captured from the platform with the language set to
English, so a reader who does not read Korean can follow them.

| Placeholder | File | Used in |
|---|---|---|
| `IMG_TEST` | `img-en/test.png` | `07-screens` |
| `IMG_REPORT` | `img-en/report.png` | `07-screens` |

Each screen appears once on the whole site. They used to be shown twice, once
as a plate inside `04-instrument` and `06-report` and once in the slider,
which made the site longer without saying anything more.

**There is no cohort-report screenshot, deliberately.** The coordinator's
report is not translated yet: with the language set to English it still
renders in Korean. A Korean screen on this site cannot be read by the person
it is for, so `08-cohort` carries the structure as a table and no picture.
When that screen is translated, capture it and add the plate back.

## 5. Do not write these in code

**The contact form.** `14-contact` ends at the heading and its paragraph. A
form written in code has nowhere to send to, so put an imweb **form widget**
directly below it with eight fields: institution, country, contact name,
phone, email, discipline under consideration, expected number of students,
and message. That instruction is in the widget's opening comment, not in the
page: a note to the person building the page used to render inside the box,
where every visitor read it.

**Company details.** Use imweb's required-information footer, which has a
field per item. `15-footer` holds the brand line and the Korean registration
number only.

**Button targets.** `01-hero` points at `/contact` and `/reports`. Change
them to the real page addresses.

## 6. The world map

`16-markets` carries an inline SVG world map. The dots are Natural Earth 110m land
geometry sampled every 3.2 degrees, so the coastlines are real rather than traced by
hand; Antarctica is dropped, which is the usual convention. Ten markets are pinned in
three states: development source, legal groundwork done, and named with a domain
reserved. **Nothing is marked live, because nothing is.**

To move a pin, change its `cx`/`cy` in the widget. The projection is equirectangular
over latitudes 80 to -56, so `x = (lon + 180) / 360 * 1000` and
`y = (80 - lat) / 136 * 470`.

## 7. This site carries no prices

There is no pricing page, no checkout and no individual purchase. The site explains
what the assessment is and takes enquiries; a figure is discussed against a country,
a discipline and a cohort size once someone writes in. The Korean site keeps its own
individual track and its price; this one does not carry either.

Six widgets were removed on the way to that, and the reasons are worth keeping:

| Removed | Why |
|---|---|
| `11-pricing` | A price on a site that cannot take payment is a promise with nothing behind it |
| `19-gap` | Its funnel figures were illustrative, not a real department's. On an explanatory site a reader takes numbers as real |
| `17-channels` | After the prices went, it repeated what Partnership already says |
| `18-why` | A two-column comparison against "a conventional career test" is positioning, not explanation |
| `20-choose` | Its four points are properties, and they are already stated where they belong: intervals and reproducibility in `05-scoring`, travelling in `09-localisation` |
| `21-program` | Lectures and mentoring are delivered in Korea. Selling them here would promise something a partner market has not built |

One fact from the removed widgets was kept, because it answers a real question:
students never see a payment screen. It now sits in `03-output` and in the FAQ.

## 8. What was cut, and why

A second pass took the site down from eighteen widgets to seventeen and cut
about a fifth of the words. Nothing true was dropped; what went was said
twice or said nothing.

| Cut | Reason |
|---|---|
| `07-screens` as a separate Reports section | The same two screenshots already sat inside `04-instrument` and `06-report`. Now they appear once, in the slider on Home |
| Thirteen "in sequence" rows in `13-coverage` | A fourteen-row table in which thirteen rows say the thing does not exist yet is a roadmap, not a specification. One row is live, so one row is a table; the rest are a sentence |
| The validation table in `12-evidence` | Five validity types against evidence like "factor structure". A validity claim with no number on it is weaker on a public page than not making the claim |
| Four of the nine FAQ entries | Their answers were already in full on Localisation, Reports, About and the section directly above the FAQ |
| The three brand cells in `22-about` | An org chart is not a reason to buy |
| The five retention items quoted verbatim in `09-localisation` | The module is worth naming; its questionnaire is not marketing copy |
| Two hero rows, the second market table's split rows, the duplicated "no country site is open yet" note | Said elsewhere, or said twice |

## 9. What is still open

- The domain. `careermetri.com` is the reserved name in
  `marketing/src/content/global.ts`, not a live address
- Company details for the footer, same eight fields as the Korean site
- Terms, privacy and refunds in English. The Korean set in
  `../legal/` is written against Korean law and does not transfer
- Individual card payment, which waits on the Korean merchant review
