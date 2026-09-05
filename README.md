# Timewave Zero

A faithful web recreation of **Timewave Zero 4.22 for MS-DOS** (Peter Meyer, 1989-1993,
Lux Natura / Dolphin Software): the program that graphed Terence McKenna's timewave.

**Run it:** https://timewave-zero-seven.vercel.app · **Reimagined view:** https://timewave-zero-seven.vercel.app/wave

The wave is computed from Meyer's published algorithm and the King Wen sequence. All of the
number sets are derived at run time from the hexagram sequences and checked against Meyer's
own data files. The screen is a 640x200 CGA bitmap drawn pixel for pixel like the original,
including its rounding quirks, and the program is driven entirely from the keyboard.

## Using it

- Press any key on the title screen. Then press a menu letter (A to R) or click a menu line.
  Escape selects Quit.
- F1 to F11, PgUp and PgDn change screens. On a Mac hold `fn` for those keys, or click the
  "Screen no." text.
- Home, End and the left and right arrows move the target date. Hold Ctrl (or Alt/Option on a
  Mac) for eight-pixel steps. After a graph, `+` and `-` move it too, and the up and down arrows
  start a zoom.
- An on-screen keyboard in the same style appears on touch devices and can be toggled anywhere.
  Its Ctrl key arms the next arrow; Fn turns the number row into F1 to F11.
- Screen sets save to the browser. The sets shipped with the program (LASTRUN, 1900RUN,
  1990RUN, 1995RUN, 1996TRI, CHAP1) load by name.
- "Printer" output appears under the screen; files download.
- Quit drops to a small DOS prompt. Type `TWZ` to run the program again.

## The reimagined view (`/wave`)

A second way in, built with three.js (React Three Fiber, drei, postprocessing). The same
mathematics drives both views; a link in each corner switches between them and carries the zero
date, number set and the stretch of time being looked at.

- The wave is a ribbon of terrain. Height is habit, the dips are novelty, and the deepest dips
  glow. Drag to travel (a flick coasts), scroll or pinch to zoom, click the ribbon to mark a
  date and see the mark's echoes at other scales. The view spans anything from an hour to the
  72-billion-year cycle; the ladder on the right shows which of the seven cycles the view sits
  in, and thin dashed lines mark where each cycle begins.
- "Descend" glides the view into the zero point at a fixed rate on the log scale, 64 times
  closer every few seconds. Because the wave repeats at every 64×, the same terrain keeps rising
  under the camera until an hour is left. Any drag or scroll stops it.
- The zero point is a beam of light. It defaults to 6 AM on December 21, 2012; a slider moves
  it anywhere from 1900 to 2200 and the whole curve re-fits. Three presets carry their reasons:
  McKenna's final date, the Hiroshima-aligned Nov 18, 2012 he started with, and the Sept 28,
  1995 that Meyer's Caesar/Kennedy pairing implies. Past the zero point the theory ends; the
  ribbon continues as a grey reflection of the years before, and the readout says so.
- "Stack ×64" raises two terraces behind the ribbon: the same window 64 and 4,096 times wider.
  Points that line up vertically are resonances. "Compare number sets" draws the other four
  sets as thin lines over the ribbon, each scaled to its own range, so the Watkins objection
  can be seen rather than described.
- The readout shows novelty as a bar relative to the visible window (the exact wave value is in
  its tooltip) and the I Ching hexagram in effect on the cycle the view sits in, with all seven
  cycles a click away. The 384 positions of the hexagrammatic layer are six per hexagram, and
  the derivation walks the King Wen sequence so a 384-day cycle opens at hexagram 1 and closes
  at hexagram 64 on the zero point.
- Pins are events: gold for McKenna, Meyer and the theory (moments they cited as novelty or as
  resonances, from McKenna's "The Time Wave and History", Meyer's documentation, Food of the
  Gods and the 1997 correlation list in the software guide, plus McKenna's own life), cyan for
  events added in the same spirit, violet for dates the 1997 list projected (off by default).
  Crowded pins collapse into a "+N" chip that zooms in. Each pin opens a card with the claim,
  its source, a live Wikipedia summary, the dates of its echoes on the other cycles (each a
  jump), and, for a few, a Psychedelic Salon recording of McKenna on the timewave from the
  Internet Archive.
- "Sound", in the ⋯ menu, starts a quiet drone: lower for wider views, brighter in the dips.
- Keys: arrows travel, `+`/`-` zoom, `N` now, `Z` zero point, `S` stack, `E` events, space
  descends, `?` guide.
- The URL holds the view (`?c=1999-06-15&s=7&z=2012-12-21T06:00&n=Kelley`), so any view can be
  shared; "copy link" is in the ⋯ menu.

`src/lib/wave` holds the view's pure code (sampling, ticks, cycles, hexagram mapping, events,
zero-date presets, URL state, sound). `src/components/wave` holds the scene and HUD.

## Fidelity

Behaviour was captured from the original running in DOSBox and compared cell by cell:
layout, prompts, label rules, the value-to-pixel mapping, marker placement, the truncated
"days" column, and the single-precision y-axis labels. See `docs/original-behavior.md`.

The shipped `DATA.TWZ` differs from the algorithmically derived Kelley set at one position
(index 119: 22 instead of 32). The default number set reproduces the shipped file; the
derived Kelley, Watkins, Sheliak and Huang Ti sets are also available.

## Development

```
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # vitest: derivation, wave, calendar, formatting, state machine, modern view
pnpm typecheck
pnpm lint
pnpm build
```

`src/lib/timewave` holds the mathematics (hexagrams, derivation, wave, calendar).
`src/lib/twz` holds the program model (screens, labels, prompts, printouts, renderer).
`src/components/Twz.tsx` is the client component that draws the screen on a canvas.

## Further reading

- [Terence McKenna](https://en.wikipedia.org/wiki/Terence_McKenna) and his
  [novelty theory and Timewave Zero](https://en.wikipedia.org/wiki/Terence_McKenna#Novelty_theory_and_Timewave_Zero) on Wikipedia.
- The [King Wen sequence](https://en.wikipedia.org/wiki/King_Wen_sequence) the wave is built from, and the
  [2012 phenomenon](https://en.wikipedia.org/wiki/2012_phenomenon) it fed into.
- The [original program running in the browser](https://archive.org/details/twz_20200405) at the Internet Archive.
- Peter Meyer's Fractal Time site ([archived copy](https://web.archive.org/web/2024/https://www.fractal-timewave.com/)).

## Sources and credits

- Peter Meyer's Timewave Zero 4.22 package and C sources (`reference/`, see `SOURCES.md`).
- Font: Web437 IBM EGA 8x8 from the Ultimate Oldschool PC Font Pack by VileR,
  CC BY-SA 4.0 (`public/fonts/LICENSE-oldschool-pc-fonts.txt`). The reimagined view uses
  IBM Plex Sans and IBM Plex Mono (OFL) via `next/font`.
- Event notes quote McKenna's "The Time Wave and History", Peter Meyer's Timewave Zero
  documentation and the August 1997 correlation list, all reproduced in Geoffrey Ashbrook's 2001
  software guide (`reference/papers/twz-software-guide-2001.txt`). Event summaries and images
  are fetched from Wikipedia (CC BY-SA) at view time. Recordings are Lorenzo Hagerty's
  Psychedelic Salon episodes on the Internet Archive (CC BY-NC-SA), embedded from archive.org.
