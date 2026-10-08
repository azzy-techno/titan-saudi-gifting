# QC1 — grey-box storyboard critique

Critic: independent subagent (did not build). Evidence: `greybox-desktop/` (30 frames), `greybox-mobile/` (20 frames), `lab/`, `type/`, `greybox-scroll-desktop.webm`.

## Round 1 — 2026-10-08

| Category | Score | Verdict |
|---|---|---|
| Pacing | 5 | MUST-FIX |
| Hierarchy | 5 | MUST-FIX |
| Layout & grid | 4 | MUST-FIX |
| Type choice | 7 | MUST-FIX |
| Anti-slop | 7 | MUST-FIX |
| Copy | 8 | pass |

Top issues (abridged) and the fix applied:

| # | Issue | Fix |
|---|---|---|
| 1 | HUD translucent, covers content | HUD cells solid ink; mobile HUD = time + chapter only; toggles also in the chapter menu |
| 2 | 3D parts run through text (anatomy, reassembly, movement); caseback engraving shows early | Anatomy stack framed in the centre columns with side-column labels after the intro body fades; finishes copy hidden until reassembly completes; caseback pushed far out of the movement shot |
| 3 | Header ~90% opaque shows content; 3-line lockup | Header hides on scroll-down / returns opaque on scroll-up; one-line lockup |
| 4 | Mobile stacked, not designed | Vertical explode on phones (watch laid flat), one active label; pinned caseback band above the configurator; earlier reveals on touch; leader hidden on phones |
| 5 | Two numbering systems in anatomy | Stage list removed; labels carry names only |
| 6 | No hold on the finished spread; labels crowded | 45/45 hold (~70vh), body fades; side columns |
| 7 | Movement static | 200vh; spec rows highlight as focus moves fourth → escape → balance |
| 8 | Finishes doesn't show the finishes | Reassemble in first 30% with copy hidden; equal holds for steel / gold-tone / black, sweep on each; strap chips removed here; large typographic finish selector; watch on the start side (composition varied) |
| 9 | Stray strap / empty screen around collections | Watch hidden while out of frame; caseback turn starts as the strip leaves; shorter gap |
| 10 | Hero CTAs crowd the headline; full stop near the case | Intro ≥ 96 px above the headline; mega 12vw; watch further to the end side; caption fades with the headline |
| 11 | Process dial lacks quadrants; engraving asked twice; inputs in Boska (licence!) | 360 px dial with four labelled quadrants; form shows the configurator's engraving (no second field); engraving inputs in IBM Plex Sans (OFL, = caseback face); tiers as one hairline scale |
| 12 | Al Khobar field over the watch; canvas hard edge before footer | Field in columns 1–5; coordinates at display size; canvas fades out before the footer |
| — | Sentences in uppercase mono; bad breaks; accent overused | Notes in General Sans 13 px sentence case; nbsp for "2.2 mm", "in 1988"; accent only on primary buttons, live hands, active index, process arcs |
| — | Copy nits | "On screen" → "What you see"; loupe hint plain; "Request a proposal." |
