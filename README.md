# Timewave Zero

A faithful web recreation of **Timewave Zero 4.22 for MS-DOS** (Peter Meyer, 1989-1993,
Lux Natura / Dolphin Software): the program that graphed Terence McKenna's timewave.

**Run it:** https://timewave-zero-seven.vercel.app

The wave is computed from Meyer's published algorithm and the King Wen sequence. All of the
number sets are derived at run time from the hexagram sequences and checked against Meyer's
own data files. The screen is a 640x200 CGA bitmap drawn pixel for pixel like the original,
including its rounding quirks, and the program is driven entirely from the keyboard.

## Using it

- Press any key on the title screen. Then press a menu letter (A to R) or click a menu line.
  Escape selects Quit.
- F1 to F11, PgUp and PgDn change screens. On a Mac hold `fn` for those keys, or click the
  "Screen no." text.
- Home, End and the left and right arrows move the target date. Hold Ctrl or Alt for eight-pixel
  steps. After a graph, `+` and `-` move it too, and the up and down arrows start a zoom.
- Screen sets save to the browser. The sets shipped with the program (LASTRUN, 1900RUN,
  1990RUN, 1995RUN, 1996TRI, CHAP1) load by name.
- "Printer" output appears under the screen; files download.
- Quit drops to a small DOS prompt. Type `TWZ` to run the program again.

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
pnpm test       # vitest: derivation, wave, calendar, formatting, state machine
pnpm typecheck
pnpm lint
pnpm build
```

`src/lib/timewave` holds the mathematics (hexagrams, derivation, wave, calendar).
`src/lib/twz` holds the program model (screens, labels, prompts, printouts, renderer).
`src/components/Twz.tsx` is the client component that draws the screen on a canvas.

## Sources and credits

- Peter Meyer's Timewave Zero 4.22 package and C sources (`reference/`, see `SOURCES.md`).
- Font: Web437 IBM EGA 8x8 from the Ultimate Oldschool PC Font Pack by VileR,
  CC BY-SA 4.0 (`public/fonts/LICENSE-oldschool-pc-fonts.txt`).
