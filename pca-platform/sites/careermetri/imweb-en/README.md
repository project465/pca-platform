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
| Home | `01-hero` · `16-markets` · `02-who` · `03-output` |
| The assessment | `04-instrument` · `05-scoring` |
| Reports | `06-report` · `07-screens` · `08-cohort` |
| Localisation | `09-localisation` |
| Partnership | `10-partnership` |
| About | `12-evidence` · `13-coverage` · `22-about` |
| Contact | `23-faq` · `14-contact` + an imweb form widget below it |
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

## 8. What is still open

- The domain. `careermetri.com` is the reserved name in
  `marketing/src/content/global.ts`, not a live address
- Company details for the footer, same eight fields as the Korean site
- Terms, privacy and refunds in English. The Korean set in
  `../legal/` is written against Korean law and does not transfer
- Individual card payment, which waits on the Korean merchant review
