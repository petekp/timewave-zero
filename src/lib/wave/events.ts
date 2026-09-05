/**
 * Events on the timeline, chosen the way McKenna chose them: moments he, Peter
 * Meyer, or the software's 1997 correlation list held up as novelty or as
 * resonances of one another, then a handful after his death in the same
 * spirit. Each note says who made the claim.
 */
import { toJdn } from "../timewave/calendar";

export type EventTier = "mckenna" | "later" | "projected";

export interface WaveEvent {
  id: string;
  title: string;
  /** Astronomical year (0 = 1 BC). Month and day default to the middle of the year. */
  year: number;
  month?: number;
  day?: number;
  /** The date is given in the Julian calendar (events before 1582). */
  julian?: boolean;
  /** The date is a round figure, not a day. */
  approx?: boolean;
  tier: EventTier;
  /** What was said about this moment, and by whom. */
  note: string;
  source: SourceKey;
  /** Wikipedia article title, for the live summary and image. */
  wiki?: string;
  /** archive.org item to embed. */
  archive?: string;
  /** 3 is always labelled, 1 only when zoomed in. */
  weight: 1 | 2 | 3;
}

export type SourceKey = "twzdemo" | "list1997" | "meyer" | "history" | "later";

export const SOURCES: Record<SourceKey, { label: string; url?: string }> = {
  twzdemo: { label: "Terence McKenna, “The Time Wave and History” (twzdemo.html, mid-1990s), reproduced in the 2001 software guide" },
  list1997: { label: "“Time wave zero date correlation and resonance lists”, August 1997, in Geoffrey Ashbrook’s Timewave Zero software guide (2001)" },
  meyer: { label: "Peter Meyer, Timewave Zero documentation (README and PROJZD notes, 1993–94)" },
  history: { label: "Background on Terence McKenna and the timewave", url: "https://en.wikipedia.org/wiki/Terence_McKenna#Novelty_theory_and_Timewave_Zero" },
  later: { label: "Added for this recreation: events after McKenna’s death chosen in the spirit of his list" },
};

export const TIER_LABEL: Record<EventTier, string> = {
  mckenna: "cited by McKenna and Meyer",
  later: "after McKenna",
  projected: "projected in 1997",
};

/** Day number of an event at midnight. */
export function eventDay(e: WaveEvent): number {
  const month = e.month ?? 7;
  const day = e.day ?? 1;
  return toJdn({ year: e.year, month, day }, e.julian ? "julian" : "gregorian");
}

export const EVENTS: readonly WaveEvent[] = [
  // Deep time, as McKenna read the wave.
  { id: "big-bang", title: "McKenna’s Big Bang", year: -22_000_000_000, approx: true, tier: "mckenna", weight: 2, source: "twzdemo", wiki: "Big Bang",
    note: "Read as a prediction, the wave puts the Big Bang “22 billion years in the past. A value that is at variance with the current debate on the issue.”" },
  { id: "moon", title: "The Moon-forming impact", year: -4_500_000_000, approx: true, tier: "mckenna", weight: 2, source: "twzdemo", wiki: "Giant-impact hypothesis",
    note: "“The now well documented collision of a Mars sized object with the primordial earth which caused the accretion of the moon shows as a very dramatic plunge into novelty.”" },
  { id: "life", title: "Life emerges", year: -3_800_000_000, approx: true, tier: "mckenna", weight: 2, source: "twzdemo", wiki: "Abiogenesis",
    note: "“Life’s emergence almost immediately afterwards in geological time is also in good agreement with the wave.”" },
  { id: "cambrian", title: "The Cambrian explosion", year: -538_000_000, approx: true, tier: "mckenna", weight: 3, source: "twzdemo", wiki: "Cambrian explosion",
    note: "One of McKenna’s three “perfect” resonances: “The explosion of new life forms in the Cambrian, the crucifixion of Christ and the murder of Anwar Sadat are in perfect resonance.”" },
  { id: "kt", title: "The dinosaurs die", year: -66_000_000, approx: true, tier: "mckenna", weight: 3, source: "twzdemo", wiki: "Cretaceous–Paleogene extinction event",
    note: "“The most recent of these [extinctions] occurred at the KT boundary with the extinction of the dinosaurs 65 million years ago.” The 1997 list puts it more plainly: “Everything on the earth bigger than a chicken dies.”" },
  { id: "australopithecus", title: "Australopithecus walks upright", year: -3_000_000, approx: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Australopithecus",
    note: "“First hominid to walk upright appears in southern and eastern Africa. Possible use of simple pebbles as tools.”" },
  { id: "habilis", title: "Homo habilis makes tools", year: -2_000_000, approx: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Homo habilis",
    note: "“A tool making hominid, appears in Africa. Simple stones used to make other tools.”" },
  { id: "erectus", title: "Homo erectus and the hand axe", year: -1_700_000, approx: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Homo erectus",
    note: "“Homo erectus appears in eastern Africa. Hand ax made and used as general purpose tool.”" },
  { id: "fire", title: "Fire", year: -460_000, approx: true, tier: "mckenna", weight: 2, source: "list1997", wiki: "Control of fire by early humans",
    note: "“Earliest known use of fire.” McKenna contrasted written history with “the length of time during which human beings have been using fire and perhaps language.”" },
  { id: "neanderthal", title: "Neanderthals", year: -120_000, approx: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Neanderthal",
    note: "“Neanderthal people (homo sapiens neanderthalis) appear in Europe and western Asia.”" },
  { id: "sapiens", title: "Modern humans", year: -100_000, approx: true, tier: "mckenna", weight: 2, source: "list1997", wiki: "Homo sapiens",
    note: "“Modern humans (homo sapiens sapiens) appear in Africa. Earliest known burials, specialized stone tools.” The list’s date; the fossil record now reaches further back." },
  { id: "australia", title: "Humans reach Australia", year: -40_000, approx: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Prehistory of Australia",
    note: "“Colonization of Australia by early homo sapiens sapiens. Cro-Magnon reached Europe from Asia.”" },
  { id: "cave-art", title: "Cooking and cave painting", year: -25_000, approx: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Cave painting",
    note: "“Various methods of cooking develop, start of coldest period of the last ice age. Earliest known rock paintings, earliest known cremation, earliest known clay figures.”" },
  { id: "glaciers", title: "The glaciers melt", year: -15_000, approx: true, tier: "mckenna", weight: 2, source: "twzdemo", wiki: "Last Glacial Period",
    note: "“Following the last melting of the glaciers some 17,000 years ago the descent into novelty appears almost uninterrupted at this scale.”" },
  { id: "americas", title: "The Americas are settled", year: -11_000, approx: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Settlement of the Americas",
    note: "“Colonization of North America begins with crossing the last bridge between Asia and Alaska.”" },
  { id: "farming", title: "Farming begins", year: -7_000, approx: true, tier: "mckenna", weight: 2, source: "list1997", wiki: "Neolithic Revolution",
    note: "“Farming begins, mammoth becomes extinct, people reach tip of South America, first sun dried mud bricks.”" },
  { id: "cities", title: "The first cities", year: -3_000, approx: true, tier: "mckenna", weight: 2, source: "list1997", wiki: "Sumer",
    note: "“First corn cultivated in Mexico, first cities are founded in Mesopotamia, first Ziggurats built in Sumer. First copper used in Mesopotamia, first irrigation systems.”" },
  { id: "pyramid", title: "The Great Pyramid", year: -2789, approx: true, tier: "mckenna", weight: 2, source: "twzdemo", wiki: "Great Pyramid of Giza",
    note: "McKenna framed “human history, from the building of the Great Pyramid in 2790 BC until 2012 AD” in a single graph. “The accomplishments of ancient Egypt show clearly.”" },
  { id: "axial", title: "Greece and the Axial Age", year: -500, approx: true, tier: "mckenna", weight: 3, source: "twzdemo", wiki: "Axial Age",
    note: "“The Golden Age of Greece, occurring in a general ambience of great novelty nevertheless appears as an even deeper acceleration.” “Buddha, Mencius, Confucius, Lao-Tzu & Ezekiel were also novel personalities that flourished during this same well defined period.”" },
  { id: "caesar", title: "Caesar is assassinated", year: -43, month: 3, day: 15, julian: true, tier: "mckenna", weight: 2, source: "meyer", wiki: "Assassination of Julius Caesar",
    note: "Meyer’s worked example: if Caesar’s murder and Kennedy’s are resonances of each other, the zero date they imply is September 28, 1995. “Both were assassinations of political leaders who had a major influence on the society of their time.”" },
  { id: "crucifixion", title: "The crucifixion", year: 30, approx: true, julian: true, tier: "mckenna", weight: 3, source: "twzdemo", wiki: "Crucifixion of Jesus",
    note: "The second of McKenna’s three “perfect” resonances, with the Cambrian explosion and the murder of Anwar Sadat." },
  { id: "rome", title: "Rome falls", year: 476, month: 9, day: 4, julian: true, tier: "mckenna", weight: 3, source: "meyer", wiki: "Fall of the Western Roman Empire",
    note: "“Resonantly we have (in 1993) emerged from the fall of the Roman empire and are well into the transitional period known historically as the Dark Ages.” The 1997 list: “Rome falls (yes, had been falling a while, but dies for good).”" },
  { id: "muhammad", title: "Birth of Muhammad", year: 570, approx: true, julian: true, tier: "mckenna", weight: 2, source: "twzdemo", wiki: "Muhammad",
    note: "“Every major episode of great novelty since the birth of the Prophet Mohammed appears in its proportional importance here.”" },
  { id: "745", title: "The year 745", year: 745, approx: true, julian: true, tier: "mckenna", weight: 1, source: "meyer", wiki: "Abbasid Revolution",
    note: "Meyer, 1993: “During this time [1992 to 2012] the events of the period from 745 CE are expected to recur (albeit in modern form).”" },
  { id: "chivalry", title: "Romantic love and chivalry", year: 1171, approx: true, julian: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Chivalry",
    note: "“The idea of romantic love and chivalry is introduced into the cruel and socially retarded middle ages.”" },
  { id: "clock", title: "The mechanical clock", year: 1273, approx: true, julian: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Marco Polo",
    note: "“Nothing big. European mechanical clock, Marco Polo goes to China.”" },
  { id: "plague", title: "The Black Death", year: 1348, approx: true, julian: true, tier: "mckenna", weight: 2, source: "list1997", wiki: "Black Death",
    note: "“One third of Europe dies in eighteen month period, Plague.”" },
  { id: "press", title: "The printing press", year: 1450, approx: true, julian: true, tier: "mckenna", weight: 2, source: "list1997", wiki: "Printing press",
    note: "The guide’s warning about pinning dates: “even things like the invention of the printing press by Gutenberg vary easily from 1440 to 1454.”" },
  { id: "columbus", title: "Columbus lands", year: 1492, month: 10, day: 12, julian: true, tier: "mckenna", weight: 2, source: "list1997", wiki: "Voyages of Christopher Columbus",
    note: "“Columbus rediscovers the missing half of the planet (not to mention the Italian Renaissance).”" },
  { id: "galileo", title: "Galileo, Shakespeare, opera", year: 1592, approx: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Galileo Galilei",
    note: "“Galileo Galilei invents thermometer (and begins to revolutionize world view). William Shakespeare begins writing, first opera is put on.”" },
  { id: "1776", title: "The American Revolution", year: 1776, month: 7, day: 4, tier: "mckenna", weight: 2, source: "list1997", wiki: "American Revolution",
    note: "“1776: American revolution.”" },
  { id: "industry", title: "The Industrial Revolution takes hold", year: 1837, approx: true, tier: "mckenna", weight: 1, source: "list1997", wiki: "Industrial Revolution",
    note: "“It began in 1780, but hardly changed everything from social structure to man’s view toward nature immediately. 1837 seems a reasonable date.”" },
  { id: "flight", title: "The first flight", year: 1903, month: 12, day: 17, tier: "mckenna", weight: 2, source: "list1997", wiki: "Wright Flyer",
    note: "“First powered airplane flight, Orville and Wilbur Wright. Henry Ford founds the Ford Motor Company. First coast to coast crossing of the American continent with a car (64 days).”" },
  { id: "wwi", title: "The First World War", year: 1914, month: 7, day: 28, tier: "mckenna", weight: 2, source: "list1997", wiki: "World War I",
    note: "“1914-18: WWI.”" },
  { id: "hiroshima", title: "Hiroshima", year: 1945, month: 8, day: 6, tier: "mckenna", weight: 3, source: "history", wiki: "Atomic bombings of Hiroshima and Nagasaki",
    note: "McKenna’s anchor. He took the bombing as the novel event that opened the final 67.29-year cycle, and 24,576 days later fell in mid-November 2012: his first zero date. He moved it to December 21 to meet the Maya calendar. Set the zero point to November 18, 2012 and this cycle begins here.", archive: "476TMcKennaTimewaveDetails" },
  { id: "jfk", title: "Kennedy is assassinated", year: 1963, month: 11, day: 22, tier: "mckenna", weight: 2, source: "meyer", wiki: "Assassination of John F. Kennedy",
    note: "The later half of Meyer’s worked example with Caesar. Paired, the two murders imply a zero date of September 28, 1995 rather than 2012." },
  { id: "sixties", title: "The Summer of Love", year: 1967, month: 6, day: 16, tier: "mckenna", weight: 3, source: "twzdemo", wiki: "Summer of Love",
    note: "“The 1960’s represented the decade of the great turning point in Twentieth Century history. The technologies and social movements of the ’60s are clearly shown to be responsible for the cascade into deeper novelty that characterized the decades that follow.” The guide adds that the wave shows the sixties and the Greeks as resonances of each other." },
  { id: "chorrera", title: "The experiment at La Chorrera", year: 1971, month: 3, day: 4, tier: "mckenna", weight: 3, source: "history", wiki: "Terence McKenna",
    note: "Terence and Dennis McKenna’s weeks in the Colombian Amazon, where the idea of a wave of time built from the King Wen sequence arrived. The DOS title screen credits “extraterrestrial communications to Terence McKenna”.", archive: "476TMcKennaTimewaveDetails" },
  { id: "sadat", title: "Sadat is assassinated", year: 1981, month: 10, day: 6, tier: "mckenna", weight: 2, source: "twzdemo", wiki: "Assassination of Anwar Sadat",
    note: "The third of McKenna’s “perfect” resonances, with the Cambrian explosion and the crucifixion." },
  { id: "software", title: "Timewave Zero, the software", year: 1987, month: 7, approx: true, tier: "mckenna", weight: 1, source: "history",
    note: "Peter Meyer finishes the first Timewave Zero program, giving the theory a calculator. Version 4.22 for DOS, the program recreated on this site, followed in 1993." },
  { id: "watkins", title: "The Watkins Objection", year: 1996, approx: true, tier: "mckenna", weight: 1, source: "history", wiki: "Terence McKenna",
    note: "Mathematician Matthew Watkins shows the “half twist” in the derivation is an unexplained step. Meyer adds a Watkins number set; John Sheliak’s revision follows in 1998. All of them are in the number-set menu." },
  { id: "mckenna-dies", title: "Terence McKenna dies", year: 2000, month: 4, day: 3, tier: "mckenna", weight: 3, source: "history", wiki: "Terence McKenna",
    note: "He died of a brain tumour at 53, twelve years before his zero date. In his last talks he called the timewave his “big idea” and doubted it in the same breath.", archive: "706-mc-kenna-one-last-timewave-rap" },

  // After McKenna, in the spirit of his list.
  { id: "911", title: "September 11", year: 2001, month: 9, day: 11, tier: "later", weight: 3, source: "later", wiki: "September 11 attacks",
    note: "The attacks on New York and Washington." },
  { id: "genome", title: "The human genome is read", year: 2003, month: 4, day: 14, tier: "later", weight: 2, source: "later", wiki: "Human Genome Project",
    note: "The Human Genome Project declares the sequence complete." },
  { id: "iphone", title: "The iPhone", year: 2007, month: 1, day: 9, tier: "later", weight: 2, source: "later", wiki: "IPhone (1st generation)",
    note: "The computer moves into the pocket." },
  { id: "lehman", title: "Lehman Brothers fails", year: 2008, month: 9, day: 15, tier: "later", weight: 2, source: "later", wiki: "Bankruptcy of Lehman Brothers",
    note: "The financial crisis peaks." },
  { id: "bitcoin", title: "Bitcoin", year: 2009, month: 1, day: 3, tier: "later", weight: 1, source: "later", wiki: "Bitcoin",
    note: "The genesis block is mined." },
  { id: "arab-spring", title: "The Arab Spring", year: 2010, month: 12, day: 17, tier: "later", weight: 1, source: "later", wiki: "Arab Spring",
    note: "A protest in Tunisia spreads across the region." },
  { id: "crispr", title: "CRISPR gene editing", year: 2012, month: 6, day: 28, tier: "later", weight: 1, source: "later", wiki: "CRISPR gene editing",
    note: "Doudna and Charpentier publish the programmable cut." },
  { id: "zero", title: "December 21, 2012", year: 2012, month: 12, day: 21, tier: "later", weight: 3, source: "history", wiki: "2012 phenomenon",
    note: "The zero date. The Maya Long Count turns over, the wave reaches zero, and the day passes like any other. Everything to the right is the reflection.", archive: "701-return-of-the-timewave" },
  { id: "covid", title: "The pandemic", year: 2020, month: 3, day: 11, tier: "later", weight: 3, source: "later", wiki: "COVID-19 pandemic",
    note: "The WHO declares COVID-19 a pandemic." },
  { id: "chatgpt", title: "ChatGPT", year: 2022, month: 11, day: 30, tier: "later", weight: 3, source: "later", wiki: "ChatGPT",
    note: "A conversational machine reaches the public." },

  // Dates the 1997 list projected as resonances of earlier events.
  { id: "p1999", title: "Projected: October 27, 1999", year: 1999, month: 10, day: 27, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of 1171 (romantic love and chivalry) and of 50,000 BC (Neanderthal rock painting)." },
  { id: "p2001", title: "Projected: May 19, 2001", year: 2001, month: 5, day: 19, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of 1273 (the mechanical clock, Marco Polo), of 45,000 BC and of Australopithecus three million years ago." },
  { id: "p2002", title: "Projected: September 1, 2002", year: 2002, month: 9, day: 1, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of 1350 (the Black Death) and of the settlement of Australia around 40,000 BC." },
  { id: "p2004", title: "Projected: November 21, 2004", year: 2004, month: 11, day: 21, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of 1492 (Columbus, the Renaissance), of the last ice age around 30,000 BC and of Homo habilis." },
  { id: "p2006", title: "Projected: May 30, 2006", year: 2006, month: 5, day: 30, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of 1592 (Galileo, Shakespeare), of cooking and cave painting around 25,000 BC and of Homo erectus." },
  { id: "p2009", title: "Projected: April 4, 2009", year: 2009, month: 4, day: 4, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of 1776, of the settlement of the Americas, of Homo erectus reaching Asia and of the asteroid that ended the dinosaurs." },
  { id: "p2010", title: "Projected: April 23, 2010", year: 2010, month: 4, day: 23, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of 1837 (the Industrial Revolution) and of the beginning of farming around 9,000 BC." },
  { id: "p2011a", title: "Projected: March 31, 2011", year: 2011, month: 3, day: 31, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of 1903 (the first flight), of the first cities around 5,000 BC and of the first use of fire." },
  { id: "p2011b", title: "Projected: July 9, 2011", year: 2011, month: 7, day: 9, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of the First World War, of animal domestication around 4,000 BC and of the first shelters." },
  { id: "p2012a", title: "Projected: June 27, 2012", year: 2012, month: 6, day: 27, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of the year 24 (Christ), of November 1981 and of the appearance of the Neanderthals." },
  { id: "p2012b", title: "Projected: August 5, 2012", year: 2012, month: 8, day: 5, tier: "projected", weight: 1, source: "list1997",
    note: "Listed as the resonance of 472 (the fall of Rome), of November 1988 and of the appearance of modern humans." },
];

export const EVENTS_BY_ID: ReadonlyMap<string, WaveEvent> = new Map(EVENTS.map((e) => [e.id, e]));

/** Days-to-zero of the event's resonances at other scales: x times 64^k for k = -3..3, skipping 0. */
export function echoes(daysToZero: number, waveFactor = 64): { level: number; daysToZero: number }[] {
  if (!(daysToZero > 0)) return [];
  const out: { level: number; daysToZero: number }[] = [];
  for (let level = -3; level <= 3; level++) {
    if (level === 0) continue;
    out.push({ level, daysToZero: daysToZero * Math.pow(waveFactor, level) });
  }
  return out;
}
