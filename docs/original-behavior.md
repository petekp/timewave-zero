# Timewave Zero 4.22 (MS-DOS): observed behavior

Captured 2026-09-04/05 from the archive.org copy (twz_20200405) running in DOSBox, screen 640x200 CGA
graphics mode with the 8x8 BIOS font (80x25 text cells). Coordinates below are native 640x200 pixels
and text (row, col) cells. The title bar says "Timewave Zero (Version 4.22 US)".

## Screen layout

- Row 0: `Timewave Zero (Version 4.22 US)` at col 0; `Screen no. 11 of 11` at col 38.
- Menu at col 57, rows 0..19:
  ```
  Select item:                 (row 0, only while waiting for a menu key)
  A Calendar: Gregorian
  B Zero date: 12/21/2012
  C Specify target date
  D Days to zero date
  E Specify timespan
  F Graph the wave
  G Dump graph to printer
  H Print wave values
  I Resonances
  J Print resonance pnts
  K Copy this screen
  L Remove this screen
  M Save screen set
  N Load screen set
  O Print all screens
  P Wave factor: 64
  Q Quit   R DOS               (row 17)
  Use function keys or         (rows 18-19, only while waiting for a menu key;
  PgUp/Dn for new screen        after a graph row 19 reads "^ v to approach/recede")
  ```
- Plot area: x 76..444 (368 px = 46 cells of 8 px), y 12..116.
  Vertical axis x=76, y 12..118. Horizontal axis y=116, x 74..445.
  X ticks at x = 76 + 8k (k = 0..46), y 117..118. Y ticks at y = 12 + 8k (k = 0..13), x 74..75.
- Target marker: vertical line at x = 76 + targetPx (targetPx 0..368). Without a graph it spans y 97..115
  (19 px); with a graph it runs from the axis up to the curve. Without a graph the target position is
  printed as a percentage ("50.0%") on row 15, right-aligned so its last character sits in the marker's
  text column.
- Y-axis labels: 14 labels on rows 1..14, cols 0..8, right-aligned; value = max - k*(max-min)/13.
  Format: fixed decimals chosen so the widest label fits in 9 characters, at most 7 decimals
  (0.0083550, 874.33817, 6933805.6).
- X-axis labels: one label per tick (47), written as stacked digits, one digit per row, in the tick's
  text column (cols 9..55). Label groups depend on the tick interval t = span/46 days:
  t < 1 hour: Minute + Hour; t < 1 day: Hour + Day; t < half month (15.2184375 d): Day + Month;
  t < 1 year: Month + Year (2-digit year); otherwise Year alone.
  Two groups use rows 15-16 and 18-19 with names ("Hour", "Day", ...) at col 0 of rows 16 and 18.
  Year alone uses rows 15-18 (as many rows as the widest label), name "Year" on row 16; when the
  largest |year| exceeds 4 digits the labels are |year|/10^3 or /10^6 rounded, with "/10^3" on row 17.
  Digits are top-aligned (a 3-digit label leaves the fourth row blank). Labels use the tick moment
  rounded to the minute; no labels are printed for ticks after the zero date.
- Bottom table (rows 20-24):
  Row 20 col 0: `Home End [Ctrl] -> to move target date` (no graph) or
  `Home End + - [Ctrl] -> to move target date` (graph). Prompts and messages also use row 20.
  Row 21: `Date` at col 8, `Days to zero date` col 28, `Value` col 48, `Timespan:` col 62.
  Rows 22-24: `Left`, `Target`, `Right` at col 0; date at col 7; time (HH:MM) at col 19 for Target only;
  days at col 28 right-aligned to col 39 ("4,936.5000": thousands separators, 4 decimals);
  value at col 44 ("0.007990121841": 14 characters wide, decimals = 13 - integer digits, trailing
  zeros stripped); timespan text at col 62, rows 22-24, e.g. "7 days" / "1 year", "and 10 months",
  "and 24 days" (first three non-zero units of years, months, days, hours, minutes;
  "5,000,000,000 yrs" when the string would exceed 17 characters).
- Dates print as MM/DD/YYYY; years beyond four digits get thousands separators and a minus sign
  (`06/20/-498,001`, `06/20/2,500,001,999`). Astronomical year numbering (no BC).

## Model

- Zero point: 6 AM on the zero date (default 12/21/2012 Gregorian). Days to zero are fractional.
- Timespan units: year = 365.2425 days, month = 30.436875 days. Entered as whole years, months, days.
- Each of 11 screens holds: target (days to zero), span (days), targetPx (0..368), wave factor,
  whether a graph is drawn. Left edge = target + span*targetPx/368, right edge = left - span.
- Setting the target (C, D, B, resonances) keeps targetPx; setting the span (E) keeps target and
  targetPx; Home/End/arrows change targetPx and target together, leaving the edges fixed.
- Graph: sample the wave at each pixel column 76..444 (369 samples); columns after the zero date
  are not drawn; y = 116 - (v-min)/(max-min)*104 using the sampled min/max.
- Wave value per Meyer's TW_EN.C (see src/lib/timewave/wave.ts); the DOS program's printed values
  match it to 12 decimals.
- Screen 11 is set to "now" with a 7-day span at start-up; screens 1-10 come from LASTRUN.SCR.

## Keys (menu state)

- Letters A-R select items; Escape selects Quit (`"Quit" selected; [Enter] = confirm, [Escape] = cancel.`).
- F1..F11 select a screen; PgUp = next screen (wraps), PgDn = previous. Title shows "Screen no. N of 11".
- Home/End: target to left/right edge. Arrow left/right: move target one pixel; Ctrl+arrow: one tick
  (8 px); "+" / "-": one pixel earlier/later, wrapping at the edges.
- Up/Down arrow (after a graph): zoom dialog. `Zoom?  (Y/N)` -> `Zoom:  Seek minimum? (Y/N)`
  (Down: maximum) -> `Approach factor? (>1.0)` (Down: recession factor). The span is then divided
  (multiplied) by the factor repeatedly, redrawing each time with only the curve and axes and
  `Zoom: approach factor = 3.  Press Escape to quit.` on row 19, until Escape.
  Seek Y uses SEEKFACTOR (3) and stops at the extreme.

## Prompts (all on row 20, col 0; Escape does not cancel an input field; fields echo characters
up to their length and are validated on Enter)

- C: `Target date.  Month:` -> `Target date.  Month: 6  Day:` -> `... Day: 20  Year:` ->
  `Target date: 06/20/1999  Do you wish to add a number of days? (Y/N)` (Y -> `How many days?`).
  Time of day is always 06:00. Month 0 at the month prompt = the zero date (version 4.21 note).
- B: same flow with `Zero date.` prefix; clears the graph.
- D: `Specify the target date as a number of days before the zero date.` on row 20 and
  `How many days?` on row 21.
- E: `Timespan.  Years:` -> `Timespan.  Years: 0  plus months:` -> `... plus months: 7  plus days:`.
  Zero total -> `Timespan is too short.  Please press a key to begin ...`. Clears the graph.
- F with target after the zero date: `Target date later than zero date.  Please press a key to begin ...`
- A: `Use Gregorian or Julian calendrical notation? (G/J)`.
- P: `Please specify wave factor (18 through 84):`.
- I (needs a graph, else `Draw graph first.  Press a key ...`):
  `Construct set of 11 trigrammatic resonances? (Y/N)` -> `Higher or lower resonance?  (H/L)` ->
  `Major or trigrammatic resonance?  (M/T)` -> major: `Which point: 1st, 2nd, 3rd ...  99th?`;
  trigrammatic: `Which cycle? (1=384-day, 2=67.29-year, 3=4306.36-year, 4=275,607-year)` (single
  key) then the point prompt. Major point k: target and span multiplied (higher) or divided (lower)
  by 64^k. Trigrammatic point k of cycle c: target +/- k * 192 * 64^(c-1) days, span unchanged.
  The current screen is replaced and redrawn.
- H: `"Print wave values" selected; [Enter] = confirm, [Escape] = cancel.` ->
  `Print only local maximum and minimum values? (Y/N)` -> `Print only values in vicinity of target date?  (Y/N)`
  -> `Send values to printer or to file?  (P/F)` -> F: `Send values to which file?`.
- J: `"Print resonance pnts" selected; ...` -> `Print trigrammatic resonance points only?  (Y/N)`.
- K: `Screens with target date: 1,2,3,4,5,6,7,8,9,10,11.  Copy to which screen?` ->
  `Overwrite screen no. 9? (Y/N)`.
- L: `"Remove this screen" selected; [Enter] = confirm, [Escape] = cancel.`
- M: `"Save screen set" selected; ...` -> `Save screen set to LASTRUN.SCR? (Y/N)`.
- N: `"Load screen set" selected; ...` -> `Load screen set from which file?` ->
  `Cannot open file!  Press a key ...` on failure.
- O: `"Print all screens" selected; ...`. G: dump graph to printer.
- Q/Escape: `"Quit" selected; [Enter] = confirm, [Escape] = cancel.`
