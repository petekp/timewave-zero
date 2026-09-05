/** What the user should do next, worked out from the program's state, for the guide panel. */
import type { Machine } from "./machine";

export interface Guide {
  heading: string;
  lines: string[];
}

const SET_NAMES = "LASTRUN, 1900RUN, 1990RUN, 1995RUN, 1996TRI or CHAP1";

export function guideFor(m: Machine): Guide {
  switch (m.mode) {
    case "title":
      return { heading: "Title screen", lines: ["This is the original's opening screen.", "Press any key (Space will do) to reach the main screen."] };
    case "dos":
      return {
        heading: "DOS prompt",
        lines: [m.dos?.shell ? "You shelled out to DOS from the program. Type EXIT and press Enter to return." : "The program has quit, as it did on a real PC.", "Type TWZ and press Enter to start it again. DIR lists the files that came with it."],
      };
    case "zoom": {
      const z = m.zoom;
      const what = z?.seek ? `moving the target to the ${z.seek === "min" ? "lowest" : "highest"} point and closing in on it` : `${z?.approach ? "shrinking" : "widening"} the timespan by a factor of ${z?.factor} at every step`;
      return { heading: "Zooming", lines: [`The graph is redrawn again and again, ${what}.`, "Press Esc to stop."] };
    }
    case "prompt":
      return promptGuide(m);
    default:
      return menuGuide(m);
  }
}

function promptGuide(m: Machine): Guide {
  const p = m.prompt;
  const first = p?.lines[0] ?? "";
  const lines: string[] = [];
  if (first.startsWith("Target date.")) lines.push("Enter the month number, then the day and the year at the next prompts. A month of 0 means the zero date itself. Years before 1 AD are negative.");
  else if (first.startsWith("Zero date.")) lines.push("The zero date is where the wave reaches zero, 12/21/2012 by default. Enter a month, day and year to move it.");
  else if (first.startsWith("Timespan.")) lines.push("The timespan is the width of the graph. Enter whole years, then months, then days; for one week enter 0, 0 and 7.");
  else if (first.startsWith("Specify the target date as a number")) lines.push("Enter how many days before the zero date the target should be. Decimals are allowed.");
  else if (first.startsWith("Which point")) lines.push("1 is the nearest resonance point, 2 the next, and so on. Each major resonance multiplies the timespan by the wave factor.");
  else if (first.startsWith("Which cycle")) lines.push("Trigrammatic resonances are half a cycle apart. Cycle 1 is 384 days; each next cycle is 64 times longer.");
  else if (first.startsWith("Please specify wave factor")) lines.push("64 is the value McKenna used. The wave factor is the ratio between one level of the fractal and the next.");
  else if (first.startsWith("Load screen set")) lines.push(`Type a name and press Enter. Sets you saved are here, and so are the ones shipped with the program: ${SET_NAMES}.`);
  else if (first.startsWith("Save screen set")) lines.push("Screens 1 to 10 are saved to this browser under the name you give.");
  else if (first.startsWith("Send values to which file")) lines.push("The values are written to a text file that your browser downloads.");
  else if (first.startsWith("Screens with target date")) lines.push("Enter the number of the screen to copy this one onto.");
  else if (first.startsWith("Construct set")) lines.push("Y fills all eleven screens with one resonance point each, N asks for a single point.");
  else if (first.startsWith("Zoom?")) lines.push("Y starts an automatic zoom that runs until you press Esc.");
  else if (first.startsWith("Zoom:")) lines.push("Seek makes the zoom home in on the lowest (or highest) point of the graph. Otherwise give the factor per step, 3 is a good one.");
  else if (first.includes("add a number of days")) lines.push("Y lets you add days to the date you typed; N keeps it.");

  switch (p?.kind) {
    case "input":
      lines.push("Type the value and press Enter. Enter on an empty field cancels; Backspace edits.");
      break;
    case "yn":
      lines.push("Press Y or N. Enter cancels.");
      break;
    case "choice":
      lines.push(`Press one of the letters in brackets${p?.choices ? ` (${p.choices.split("").join(", ")})` : ""}. Enter cancels.`);
      break;
    case "confirm":
      lines.push("Press Enter to go ahead or Esc to cancel.");
      break;
    case "anykey":
      lines.push("Press any key to continue.");
      break;
  }
  return { heading: "Answer the prompt on the bottom line", lines };
}

function menuGuide(m: Machine): Guide {
  const slot = m.slot;
  const n = m.current + 1;
  if (slot.target === null) {
    return {
      heading: `Screen ${n} is empty`,
      lines: ["Press C to specify a target date, or D to give it as a number of days before the zero date.", "PgUp and PgDn (or F1 to F11) show the other screens; the first ten came loaded from the original's LASTRUN.SCR."],
    };
  }
  if (slot.span === null) {
    return { heading: `Screen ${n} has a target but no timespan`, lines: ["Press E and enter the years, months and days the graph should cover. Then press F to draw it."] };
  }
  if (slot.target < 0) {
    return {
      heading: `Screen ${n}: the target is after the zero date`,
      lines: ["The wave is not defined past the zero date, so it cannot be graphed here.", "Press C and choose a date before 12/21/2012 (the screen starts on today's date), or B to move the zero date."],
    };
  }
  if (!slot.graphed) {
    return {
      heading: `Screen ${n} is ready to graph`,
      lines: ["Press F to draw the wave over the timespan.", "The short vertical line marks the target date within the timespan; Home, End and the arrow keys move it.", "C changes the target date and E the timespan."],
    };
  }
  return {
    heading: `Screen ${n} shows the timewave`,
    lines: [
      "Lower values mean more novelty; the wave reaches zero at the zero date. The vertical line marks the target date, and the table gives the dates and values at the edges and the target.",
      "Left and right arrows move the target (Ctrl for eight pixels). Up or down starts a zoom that closes in on the target.",
      "I jumps to a resonance: the same shape 64 times larger or smaller, or half a cycle away. H prints the values. K copies this screen to another; PgUp and PgDn browse them.",
    ],
  };
}
