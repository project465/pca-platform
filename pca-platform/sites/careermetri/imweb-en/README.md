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

**Five menus, not seven.** Localisation and Partnership were two halves of one
question, so they are one page; About's evidence belongs with the instrument it
describes, and who builds it belongs beside the enquiry form. Seven items in a
bar is a site that has not decided what it is about.

| Page | Widgets, top to bottom |
|---|---|
| Home | `01-hero` · `07-screens` · `17-measure` · `02-who` · `03-output` |
| The assessment | `04-instrument` · `05-scoring` · `12-evidence` · `13-coverage` |
| Reports | `06-report` · `18-two` · `08-cohort` |
| Rollout | `09-localisation` · `16-markets` · `10-partnership` |
| Contact | `23-faq` · `22-about` · `14-contact` + an imweb form widget below it |
| Every page but Contact | `20-cta`, last, above the footer |
| Every page | `21-dock`, once, anywhere |
| Bottom of every page | `15-footer` |

**The world map is on Rollout, not Home.** That page is about what travels and
what gets rebuilt; the map is how far each market has got with the rebuilding.
On the home page it was a picture. Here it is the evidence for the paragraph
above it.

Build the menu with imweb's menu settings, not in code, so the mobile
hamburger and the current-page marker attach themselves.

## 3. What makes it read as engineering

Four things, and none of them is a picture.

**A second typeface, for data only.** IBM Plex Mono carries every figure and
every label that *names a measurement* — axis names, scale heads, item codes,
table heads, the step markers. Prose never uses it. An engineering document
sets its text in one face and its data in another; doing the same here is what
separates a specification from a brochure, and it costs one stylesheet.

**Graph paper, not a dot field.** The opening band is ruled with a fine grid
and a heavier line every fifth, which is the paper this work is drawn on. Four
CSS gradients, no image to upload and none to go missing.

**The plot is ruled like a plot.** Ticks at 25 / 50 / 75 / 100 with figures
against the twelve o'clock spoke, a heavier outer ring, and every value printed
under its axis name. A radar without a readable scale is a shape; with one it
is a chart.

**Everything is drawn against something.** The dashed outline on the radar and
the upright mark on each bar are the mean of 500 simulated sittings, read from
the database with the rest. It is not a student norm and we say so, but "62.5"
with nothing beside it asks the reader to invent a baseline, and they will
invent a flattering one.

**The map states its projection.** A graticule every 30 degrees, the equator
picked out, and the projection written under it in the technical face. A world
map without one is a shape; with one it is a chart, and this one is plotted
from real geometry so it can afford to say so.

**A title block in the footer.** What this is, which instrument it describes,
on what scale, where the figures come from, and the registrations. Every value
in it is checkable, which is the only reason to set it like a title block
rather than draw one.

The palette went down a step at the same time: a deeper navy, and a band that
is blue rather than grey. **A neutral grey reads as a colour nobody chose**,
and this product has no reason to be neutral. Contrast was re-measured: body
17.6:1, secondary 6.5:1, gold text 5.9:1.

Title-block rules at each sub-heading, registration marks at the corners of the
dark bands, extension lines and ticks around the opening figures, a progress
hairline at the top of the page, and a print stylesheet finish it.
**The print rules matter more than they look:** this site's reader prints it
and hands it to a head of department, so backgrounds come off, both radars and
both value lists un-hide, and cards stop breaking across pages.

## 4. What moves, and what turns it off

All of it is in the head code. The widgets carry no script.

| Effect | Where | Switched off by |
|---|---|---|
| Sections rise as they are reached | Every section, found by the script rather than declared | Reduced motion, or no `IntersectionObserver` |
| The opening figures count up | `01-hero`, on `data-cm-count` | Reduced motion |
| Dot lattice and the cool light behind the headline | `01-hero`, via `cm-open` | Nothing: they are static gradients |
| One map pin beats, and the ten arrive in order | `16-markets` | Reduced motion |
| The radar opens from its centre, and again on each profile switch | `17-measure` | Reduced motion |
| Pointing at an axis raises it in the plot and in the figures at once | `17-measure` | A device with no pointer; the figures are listed either way |
| A hairline at the top fills as the page goes past | Every page | Nothing; it is two pixels |
| The ten bars grow in place, one after another | `17-measure` | Reduced motion |
| Cards lift under the pointer | Any `cm-cell` | A device with no hover |
| The two sliders | See below | Reduced motion, for the automatic advance |

**The starting state is added by the script, never by the stylesheet.** A rule
in CSS that sets `opacity:0` and waits for JavaScript leaves a reader whose
script failed looking at an empty page, which is worse than a page that does
not move. So the script adds `cm-anim` to the document only once it has an
observer in hand, and the numbers written into the HTML are the real ones and
are always put back when the count finishes.

## 5. The sliders

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

## 6. The charts on the home page

`17-measure` carries the two radars and the ranked bars. **Every figure in it
is the scoring engine's real output for one simulated sitting** (`attempt 8377`,
produced by `npm run metri:sim`), read out of the database, and the polygon
coordinates were computed from those figures rather than drawn by eye. The
same sitting is the one in `img-en/report.png`, so the screenshot and the
charts agree: Research & Education 77.0, Independent 62.5.

**The file is generated. Do not edit it by hand.**

```
npm run metri:radar          # the demonstration sitting, both languages
npm run metri:radar -- 1234  # some other attempt
npm run metri:head           # copy this file's Head Code body to the Korean site
```

The `points` attribute is geometry computed from the figures, so editing a
value in the list beside the chart without recomputing the polygon makes the
picture lie. The script reads both out of the database and writes the whole
widget, which is why there is nowhere for the shape and the numbers to drift
apart. Change the attempt and you have to re-capture `img-en/report.png` from
the same one, or the screenshot and the charts stop agreeing.

**Two series, and one of them is the point.** The sitting is the accent; the
comparison mean is a neutral dashed outline with no fill. That is the emphasis
form, not a categorical palette, so no hue has to be told apart from another:
the legend names both, the dash separates them in print and for a reader who
cannot distinguish the colours, and every figure is listed beside the plot.

**Six and eight axes are a shape; ten areas are magnitudes.** The radar is the
form the report itself draws and the one a coordinator recognises across a
cohort. Ten ranked values are a different job, and a ten-spoke radar is a
decoration nobody can read, so those are bars. Gold carries the data and never
carries text: it is 2.4:1 on white and unreadable as type, so every label and
figure stays in the text tokens. The figures are listed beside the shape, which
is also the table view, so nothing depends on reading an angle.

## 7. Images

**This site has its own images, in `../img-en/`.** They are not the Korean
site's files. Both were captured from a build that serves English only, so
there is no Korean or Turkish tab in frame, and both come from the same
sitting as the charts in `17-measure`.

That is a real setting, not a crop: `NEXT_PUBLIC_LANGS=en` at build time makes
`OFFERED_LANGS` a single language, and the switcher renders nothing when there
is only one to pick. Leave the variable unset and all three stay, which is what
the Korean deployment wants. **Re-capture from an English-only build**, or the
tabs come back into the picture.

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

## 8. Do not write these in code

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

## 9. The world map

`16-markets` carries an inline SVG world map. The dots are Natural Earth 110m land
geometry sampled every 3.2 degrees, so the coastlines are real rather than traced by
hand; Antarctica is dropped, which is the usual convention. Ten markets are pinned in
three states: development source, legal groundwork done, and named with a domain
reserved. **Nothing is marked live, because nothing is.**

To move a pin, change its `cx`/`cy` in the widget. The projection is equirectangular
over latitudes 80 to -56, so `x = (lon + 180) / 360 * 1000` and
`y = (80 - lat) / 136 * 470`.

## 10. This site carries no prices

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

## 11. What was cut, and why

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

## 12. What is still open

- The domain. `careermetri.com` is the reserved name in
  `marketing/src/content/global.ts`, not a live address
- Company details for the footer, same eight fields as the Korean site
- Terms, privacy and refunds in English. The Korean set in
  `../legal/` is written against Korean law and does not transfer
- Individual card payment, which waits on the Korean merchant review
