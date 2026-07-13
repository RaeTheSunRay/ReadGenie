import { QUIZ_QUESTION_COUNT } from "./quiz-config";
import { getCachedPlot, setCachedPlot } from "./plot-cache";
import { getSeedPlot } from "./seed-plots";
import { QuizQuestion, shuffle } from "./quiz-utils";

type OpenLibraryDoc = {
  author_name?: string[];
  first_sentence?: string[];
  title?: string;
};

type EventPhrase = {
  phrase: string;
  sentence: string;
  index: number;
};

type CharacterProfile = {
  name: string;
  /** Full story sentence about this character. */
  sentence: string;
  /** Predicate used for "Which character …?" questions (no leading name). */
  predicate: string;
};

type StoryContext = {
  storySentences: string[];
  eventPhrases: EventPhrase[];
  earlyEvents: EventPhrase[];
  lateEvents: EventPhrase[];
  characters: string[];
  characterProfiles: CharacterProfile[];
};

const META_PATTERNS =
  /\b(was published|written by|the author|bestseller|won the|award for|adapted into|film version|critics|million copies|first published|sequel to|non-fiction|memoir|biography|nominees|judging|panel-based|blogger|cybils)\b/i;

const FILM_PATTERNS =
  /\b(film directed|movie directed|fantasy film directed|screenplay by|box office|opening weekend|starred|starring)\b/i;

const STORY_PATTERNS =
  /\b(who|finds?|found|discover(?:s|ed|ing)?|travel(?:s|ed|ing)?|journey|friend|enemy|famil(?:y|ies)|school|home|fight(?:s|ing)?|escape[ds]?|sav(?:e|es|ed|ing)|learn(?:s|ed|ing)?|meet(?:s|ing)?|liv(?:e|es|ed|ing)|di(?:e|es|ed)|born|magic|secret|quest|adventure|village|kingdom|world|follows?|protagonist|character|orphan|wizard|dragon|train|ride|parent|sister|brother|boy|girl|young|help(?:s|ed|ing)?|rescu(?:e|es|ed|ing)|return(?:s|ed|ing)?|leav(?:e|es|ing)|arriv(?:e|es|ed|ing)|win(?:s|ning)?|los(?:e|es|ing)|hid(?:e|es|ing)|reveal(?:s|ed|ing)?|remember(?:s|ed|ing)?|decid(?:e|es|ed|ing)|tri(?:es|ed|ing)|begin(?:s|ning)?|continu(?:e|es|ed|ing)|grow(?:s|ing)?|chang(?:e|es|ed|ing)|centers?|fac(?:e|es|ed|ing)|enter(?:s|ed|ing)?|uncov(?:er|ers|ered|ering)|must|named|called|promis(?:e|es|ed|ing)|protect(?:s|ed|ing)?|weav(?:e|es|ed|ing)|hatch(?:es|ed|ing)?|feel(?:s|ing)?|plan(?:s|ned|ning)?|slaughter|stay(?:s|ed|ing)?|send(?:s|ing)?|kill(?:s|ed|ing)?|lonely|pig|spider|barn|eggs?|winter|spring|farm|bus|road|grief|heal(?:s|ed|ing)?|bur(?:y|ies|ied)|angry|weak|miraculous)\b/i;

const SKIP_NAMES = new Set([
  "The", "He", "She", "They", "His", "Her", "Its", "When", "After",
  "Before", "During", "While", "With", "From", "This", "That", "These",
  "February", "January", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December", "British",
  "American", "English", "French", "German", "Indian", "Philippines",
  "America", "Underworld", "Professor", "People", "Later",
  "Some", "Three", "Many", "Camp", "House", "Mountain", "Lake",
  "Along", "Oregon", "Austin", "Los", "Angeles", "Beecher", "Prep",
  "Hogwarts", "Shire", "Erebor", "Olympus",
]);

const PREDICATE_START =
  /^(is|was|are|were|has|have|had|does|do|did|becomes|became|discovers|finds|travels|meets|lives|helps|fights|escapes|learns|saves|loses|faces|tries|leaves|returns|promises|protects|weaves|befriends|apologizes|earns|receives|accuses|joins|plans|dies|arrives|recruits|uses|slays|refuses|struggles|overhears|shows|digs|heals|talks|keeps|changes|picks|works|tells|enters|stops|wins|passes|suspects|enjoys|gets|solves|sacrifices|bullies|feels|grows|lays|named|called)\b/i;

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ReadGenie/1.0 (educational quiz app)" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchWikipediaExtract(pageTitle: string): Promise<string | null> {
  const data = (await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=true&exsentences=80&titles=${encodeURIComponent(pageTitle)}&origin=*`
  )) as { query?: { pages?: Record<string, { extract?: string; missing?: string }> } } | null;

  const page = Object.values(data?.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) return null;
  return page.extract ?? null;
}

async function searchWikipediaTitles(query: string): Promise<string[]> {
  const data = (await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=8&format=json&origin=*`
  )) as { query?: { search?: { title: string }[] } } | null;

  return data?.query?.search?.map((item) => item.title) ?? [];
}

function authorLastName(author: string): string {
  const parts = author.replace(/\./g, " ").split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? author;
}

function scorePageTitle(title: string, bookTitle: string, author: string): number {
  const lower = title.toLowerCase();
  const lastName = authorLastName(author).toLowerCase();
  let score = 0;

  if (lower.includes("film") || lower.includes("movie") || lower.includes("award")) {
    score -= 40;
  }
  if (lower.includes("novel") || lower.includes("(book)")) score += 25;

  for (const word of bookTitle.toLowerCase().split(/\s+/)) {
    if (word.length > 3 && lower.includes(word)) score += 8;
  }

  if (lastName && lower.includes(lastName)) score += 12;

  return score;
}

function isRelevantStoryText(text: string, bookTitle: string, author: string): boolean {
  const lower = text.toLowerCase();
  const lastName = authorLastName(author).toLowerCase();
  const titleWords = bookTitle
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);

  if (FILM_PATTERNS.test(text.slice(0, 250)) && !lower.includes("novel")) {
    return false;
  }

  if (!STORY_PATTERNS.test(text)) return false;

  const hasAuthor = !!lastName && lower.includes(lastName);
  const hasTitle = titleWords.some((word) => lower.includes(word));

  return hasAuthor || hasTitle;
}

function directWikipediaTitles(bookTitle: string, author: string): string[] {
  const lastName = authorLastName(author);
  return [
    `${bookTitle} (${lastName} novel)`,
    `${bookTitle} (novel)`,
    bookTitle,
  ];
}

export async function fetchWikipediaStoryText(
  bookTitle: string,
  author: string
): Promise<string | null> {
  const queries = [
    `"${bookTitle}" ${author} novel`,
    `${bookTitle} ${author} novel plot`,
    `${bookTitle} ${author} book`,
    `${bookTitle} novel`,
  ];

  const seenTitles = new Set<string>();
  const candidates: { title: string; score: number; text: string }[] = [];

  for (const title of directWikipediaTitles(bookTitle, author)) {
    seenTitles.add(title);
    const text = await fetchWikipediaExtract(title);
    if (text && isRelevantStoryText(text, bookTitle, author)) {
      candidates.push({ title, score: scorePageTitle(title, bookTitle, author) + 20, text });
    }
  }

  for (const query of queries) {
    const titles = await searchWikipediaTitles(query);
    for (const title of titles) {
      if (seenTitles.has(title)) continue;
      seenTitles.add(title);

      const text = await fetchWikipediaExtract(title);
      if (!text || !isRelevantStoryText(text, bookTitle, author)) continue;

      candidates.push({
        title,
        score: scorePageTitle(title, bookTitle, author),
        text,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.text ?? null;
}

async function fetchOpenLibraryStoryText(
  bookTitle: string,
  author: string
): Promise<string | null> {
  const data = (await fetchJson(
    `https://openlibrary.org/search.json?title=${encodeURIComponent(bookTitle)}&author=${encodeURIComponent(author)}&limit=5`
  )) as { docs?: OpenLibraryDoc[] } | null;

  const lastName = authorLastName(author).toLowerCase();

  for (const doc of data?.docs ?? []) {
    const matchesAuthor = doc.author_name?.some((name) =>
      name.toLowerCase().includes(lastName)
    );
    const matchesTitle = doc.title
      ?.toLowerCase()
      .includes(bookTitle.toLowerCase().split(" ")[0] ?? "");

    if (!matchesAuthor || !matchesTitle) continue;

    const text = doc.first_sentence?.[0];
    if (text && isRelevantStoryText(text, bookTitle, author)) return text;
  }

  return null;
}

async function fetchGoogleBooksStoryText(
  bookTitle: string,
  author: string
): Promise<string | null> {
  const query = `intitle:"${bookTitle}" inauthor:"${author}"`;
  const data = (await fetchJson(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3`
  )) as {
    items?: { volumeInfo?: { title?: string; authors?: string[]; description?: string } }[];
  } | null;

  const lastName = authorLastName(author).toLowerCase();

  for (const item of data?.items ?? []) {
    const info = item.volumeInfo;
    if (!info?.description) continue;

    const matchesAuthor = info.authors?.some((name) =>
      name.toLowerCase().includes(lastName)
    );
    const matchesTitle = info.title
      ?.toLowerCase()
      .includes(bookTitle.toLowerCase().split(" ")[0] ?? "");

    if (!matchesAuthor || !matchesTitle) continue;
    if (!isRelevantStoryText(info.description, bookTitle, author)) continue;

    return info.description.replace(/<[^>]+>/g, " ");
  }

  return null;
}

export async function fetchBookStoryText(
  bookTitle: string,
  author: string
): Promise<string | null> {
  const [wiki, google, openLibrary] = await Promise.all([
    fetchWikipediaStoryText(bookTitle, author),
    fetchGoogleBooksStoryText(bookTitle, author),
    fetchOpenLibraryStoryText(bookTitle, author),
  ]);

  const parts = [wiki, google, openLibrary].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join("\n") : null;
}

const FRAGMENT_START =
  /^(who|whom|whose|which|that|when|where|while|after|before|but|and|or|because|though|although|sent|called|named|born|told|given|taken|forced|asked|known|seen|found|made|left|kept|brought)\b/i;

const HAS_SUBJECT_AND_VERB =
  /\b(He|She|They|It|I|We|The|A|An|His|Her|Their|This|These|Those|One|Some|Many|People|Three|Later|[A-Z][a-z]+(?:'[sS])?(?:\s+[A-Z][a-z]+)?)\b[^.!?]{0,60}\b(is|was|are|were|has|have|had|does|do|did|discovers?|finds?|meets?|helps?|lives?|saves?|learns?|travels?|becomes?|faces?|tries|leaves?|returns?|promises?|protects?|weaves?|enters?|uncovers?|attends?|must|comes?|goes?|dies?|grows?|lays?|plans?|feels?|picks?|joins?|begins?|digs?|changes?|keeps?|recruits?|uses?|slays?|refuses?|struggles?|accuses?|prevents?|earns?|receives?|befriends?|overhears?|apologizes?|shows?|arrives?|escapes?|fights?|hides?|reveals?|remembers?|decides?|continues?|centers?|named|called|hatches?|stays?|sends?|kills?|buries?|drives?|tells?|stops?|wins?|passes?|suspects?|enjoys?|gets?|works?|talks?|heals?)\b/i;

export function isStorySentence(sentence: string): boolean {
  if (sentence.length < 20 || sentence.length > 280) return false;
  if (FILM_PATTERNS.test(sentence)) return false;
  if (META_PATTERNS.test(sentence) && !STORY_PATTERNS.test(sentence)) return false;
  if (FRAGMENT_START.test(sentence)) return false;
  if (!HAS_SUBJECT_AND_VERB.test(sentence)) return false;
  return STORY_PATTERNS.test(sentence);
}

function normalizeCompleteSentence(sentence: string): string | null {
  let cleaned = sentence
    .replace(/^(The (story|novel|book|plot)|It)\s+(follows|centers on|focuses on|tells|describes)\s+/i, "")
    .replace(/^This (story|novel|book)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  if (FRAGMENT_START.test(cleaned)) return null;

  const words = cleaned.split(/\s+/);
  if (words.length < 5 || words.length > 40) return null;
  if (cleaned.length < 20 || cleaned.length > 220) return null;
  if (META_PATTERNS.test(cleaned) || FILM_PATTERNS.test(cleaned)) return null;
  if (!STORY_PATTERNS.test(cleaned)) return null;
  if (!HAS_SUBJECT_AND_VERB.test(cleaned)) return null;

  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!/[.!?]$/.test(cleaned)) cleaned += ".";

  return cleaned;
}

export function storySentencesFromText(text: string): string[] {
  const protectedText = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Jr|Sr|St)\./g, "$1·")
    .replace(/\b([A-Z])\./g, "$1·");

  const sentences = protectedText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/·/g, ".").trim())
    .filter((s) => isStorySentence(s));

  return [...new Set(sentences)];
}

/** Returns a complete story sentence suitable as a quiz answer option. */
export function extractEventPhrase(sentence: string): string | null {
  return normalizeCompleteSentence(sentence);
}

function isLikelyCharacter(name: string, text: string): boolean {
  if (SKIP_NAMES.has(name) || name.length < 3) return false;

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const afterVerb = new RegExp(
    `\\b${escaped}\\b[^.!?]{0,60}\\b(is|was|are|discovers|finds|meets|helps|fights|escapes|learns|saves|lives|travels|becomes|has|faces|tries|leaves|returns|named|called|promises|protects|weaves|befriends|apologizes|earns|receives|accuses|joins|plans|dies|arrives|recruits|uses|slays|refuses|struggles|overhears|shows|digs|heals|talks|keeps|changes|picks|works|tells|enters|stops|wins|passes|suspects|enjoys|gets)\\b`,
    "i"
  );
  const beforeVerb = new RegExp(
    `\\b(meets|helps|befriends|saves|finds|named|called|joins|recruits|tells|faces|accuses|overhears|follows|brings|takes|sees|visits)\\s+${escaped}\\b`,
    "i"
  );

  return afterVerb.test(text) || beforeVerb.test(text);
}

function extractCharacters(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
  const names = [
    ...new Set(
      matches.filter((name) => !SKIP_NAMES.has(name) && isLikelyCharacter(name, text))
    ),
  ];

  // Prefer distinct people: keep both full names and clear first names when useful.
  const expanded = new Set(names);
  for (const name of names) {
    const parts = name.split(/\s+/);
    if (parts.length === 2 && parts[0].length > 2) {
      if (isLikelyCharacter(parts[0], text) || text.includes(parts[0])) {
        expanded.add(parts[0]);
      }
    }
  }

  return [...expanded];
}

function extractCharacterProfiles(
  characters: string[],
  storySentences: string[]
): CharacterProfile[] {
  const profiles: CharacterProfile[] = [];
  const claimedFirstNames = new Set<string>();
  const ordered = [...characters].sort((a, b) => b.length - a.length);

  for (const name of ordered) {
    const firstName = name.split(/\s+/)[0];
    if (claimedFirstNames.has(firstName)) continue;

    for (const raw of storySentences) {
      const sentence = normalizeCompleteSentence(raw);
      if (!sentence) continue;

      const subject = sentence.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
      if (!subject || subject[1] !== name) continue;

      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const hasAction = new RegExp(
        `\\b${escaped}\\b[^.!?]{0,90}\\b(is|was|becomes|discovers|finds|travels|meets|lives|helps|fights|escapes|learns|saves|loses|faces|tries|leaves|returns|has|named|called|promises|protects|weaves|befriends|apologizes|earns|receives|accuses|joins|plans|dies|arrives|recruits|uses|slays|refuses|struggles|overhears|shows|digs|heals|talks|keeps|changes|picks|works|tells|enters|stops|wins|passes|suspects|enjoys|gets|solves|sacrifices|bullies)\\b`,
        "i"
      ).test(sentence);

      if (!hasAction) continue;

      const predicate = sentence
        .replace(new RegExp(`^${escaped}\\s*`, "i"), "")
        .replace(/[.!?]+$/, "")
        .trim();

      if (predicate.length < 10 || FRAGMENT_START.test(predicate)) continue;
      if (!PREDICATE_START.test(predicate)) continue;

      profiles.push({ name, sentence, predicate });
      claimedFirstNames.add(firstName);
      break;
    }
  }

  return profiles;
}

export function buildStoryContext(text: string, bookTitle: string): StoryContext {
  const storySentences = storySentencesFromText(text);
  const eventPhrases: EventPhrase[] = [];
  const seenPhrases = new Set<string>();

  storySentences.forEach((sentence, index) => {
    const phrase = extractEventPhrase(sentence);
    if (phrase && !seenPhrases.has(phrase.toLowerCase())) {
      seenPhrases.add(phrase.toLowerCase());
      eventPhrases.push({ phrase, sentence, index });
    }
  });

  const split = Math.max(1, Math.ceil(eventPhrases.length / 3));
  const earlyEvents = eventPhrases.slice(0, split);
  const lateEvents = eventPhrases.slice(split * 2);

  const characters = extractCharacters(text);
  const characterProfiles = extractCharacterProfiles(characters, storySentences);

  return {
    storySentences,
    eventPhrases,
    earlyEvents,
    lateEvents,
    characters,
    characterProfiles,
  };
}

function pickStoryOptions(
  correct: string,
  pool: string[],
  count = 3,
  usedOptions?: Set<string>
): string[] | null {
  const uniquePool = [
    ...new Set(
      pool.filter(
        (item) =>
          item !== correct &&
          item.trim().length > 0 &&
          !usedOptions?.has(item)
      )
    ),
  ];
  if (uniquePool.length < count) return null;
  return shuffle(uniquePool).slice(0, count);
}

function markOptionsUsed(usedOptions: Set<string>, options: string[]) {
  for (const option of options) {
    usedOptions.add(option);
  }
}

function uniqueQuestion(
  questions: QuizQuestion[],
  candidate: QuizQuestion | null
): QuizQuestion | null {
  if (!candidate) return null;
  const key = `${candidate.question}::${candidate.correctAnswer}`;
  if (questions.some((q) => `${q.question}::${q.correctAnswer}` === key)) {
    return null;
  }
  if (questions.some((q) => q.correctAnswer === candidate.correctAnswer)) {
    return null;
  }
  return candidate;
}

/** Build plausible false answer sentences by swapping characters and key outcomes. */
export function buildFalseDistractors(
  events: EventPhrase[],
  characters: string[]
): string[] {
  const trueSet = new Set(events.map((e) => e.phrase.toLowerCase()));
  const distractors = new Set<string>();

  const addFake = (fake: string) => {
    const normalized = normalizeCompleteSentence(fake);
    if (!normalized) return;
    if (trueSet.has(normalized.toLowerCase()) || trueSet.has(fake.toLowerCase())) return;
    // Reject clumsy swaps like "Hermione Granger Granger" or "Templeton helps Templeton".
    if (/\b([A-Za-z]+)\s+\1\b/i.test(normalized)) return;
    if (characters.some((name) => {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const hits = normalized.match(new RegExp(`\\b${esc}\\b`, "gi"));
      return (hits?.length ?? 0) >= 2;
    })) {
      return;
    }
    distractors.add(normalized);
  };

  const sortedCharacters = [...characters].sort((a, b) => b.length - a.length);

  for (const event of events) {
    const mentioned = sortedCharacters.filter((name) =>
      new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(event.phrase)
    );

    for (const from of mentioned) {
      for (const to of sortedCharacters) {
        if (to === from) continue;
        // Avoid swapping a short name inside a longer name already present.
        if (from.length < to.length && event.phrase.includes(to)) continue;
        addFake(
          event.phrase.replace(
            new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"),
            to
          )
        );
      }
    }

    // Outcome / verb swaps create wrong answers even when few characters exist.
    const swaps: [RegExp, string][] = [
      [/\bsaves?\b/gi, "abandons"],
      [/\bpromises to save\b/gi, "refuses to help"],
      [/\bdies\b/gi, "survives"],
      [/\bprotects?\b/gi, "destroys"],
      [/\blearns?\b/gi, "forgets"],
      [/\bdiscovers?\b/gi, "ignores"],
      [/\bhelps?\b/gi, "betrays"],
      [/\bfriends?\b/gi, "enemies"],
      [/\breturns?\b/gi, "steals"],
      [/\bescapes?\b/gi, "surrenders"],
      [/\bwins?\b/gi, "loses"],
      [/\bbefriends?\b/gi, "avoids"],
      [/\bapologizes?\b/gi, "blames"],
      [/\bearns?\b/gi, "rejects"],
      [/\breceives?\b/gi, "refuses"],
      [/\btravels?\b/gi, "hides"],
      [/\bfaces?\b/gi, "avoids"],
      [/\bmeets?\b/gi, "avoids"],
    ];

    for (const [pattern, replacement] of swaps) {
      if (event.phrase.match(pattern)) {
        addFake(event.phrase.replace(pattern, replacement));
      }
    }
  }

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i].phrase;
      const b = events[j].phrase;
      const nameA = characters.find((n) =>
        new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(a)
      );
      const nameB = characters.find((n) =>
        new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(b)
      );
      if (!nameA || !nameB || nameA === nameB) continue;

      addFake(
        a.replace(
          new RegExp(`^${nameA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`),
          nameB
        )
      );
    }
  }

  return [...distractors];
}

const PLOT_QUESTIONS = [
  "Which of these plot events happens in the story?",
  "Which event is part of the story?",
  "Which moment happens in the plot?",
  "Which story event is correct?",
];

const TIMELINE_EARLY = [
  "Which event happens earlier in the timeline?",
  "Which happens near the beginning of the story?",
  "Which event comes first in the story?",
];

const TIMELINE_LATE = [
  "Which event happens later in the timeline?",
  "Which happens toward the end of the story?",
  "Which event comes later in the story?",
];

export function makePlotQuestion(
  event: EventPhrase,
  distractors: string[],
  questionIndex = 0,
  usedOptions?: Set<string>
): QuizQuestion | null {
  if (usedOptions?.has(event.phrase)) return null;

  const correct = event.phrase;
  const wrongOptions = pickStoryOptions(correct, distractors, 3, usedOptions);
  if (!wrongOptions) return null;

  const options = shuffle([correct, ...wrongOptions]);
  if (usedOptions) markOptionsUsed(usedOptions, options);

  return {
    id: crypto.randomUUID(),
    question: PLOT_QUESTIONS[questionIndex % PLOT_QUESTIONS.length],
    options,
    correctAnswer: correct,
  };
}

export function makeTimelineQuestion(
  event: EventPhrase,
  _contrastEvents: EventPhrase[],
  timing: "early" | "late",
  questionIndex = 0,
  usedOptions?: Set<string>,
  distractors: string[] = []
): QuizQuestion | null {
  if (usedOptions?.has(event.phrase)) return null;

  const correct = event.phrase;
  // Wrong answers must be unused false options so real story sentences stay unique.
  const wrongOptions = pickStoryOptions(correct, distractors, 3, usedOptions);
  if (!wrongOptions) return null;

  const templates = timing === "early" ? TIMELINE_EARLY : TIMELINE_LATE;
  const options = shuffle([correct, ...wrongOptions]);
  if (usedOptions) markOptionsUsed(usedOptions, options);

  return {
    id: crypto.randomUUID(),
    question: templates[questionIndex % templates.length],
    options,
    correctAnswer: correct,
  };
}

function makeCharacterQuestion(
  profile: CharacterProfile,
  characters: string[],
  usedOptions?: Set<string>
): QuizQuestion | null {
  if (!PREDICATE_START.test(profile.predicate)) return null;
  if (usedOptions?.has(profile.name)) return null;

  const candidates = shuffle(
    characters.filter(
      (name) =>
        name !== profile.name &&
        !SKIP_NAMES.has(name) &&
        !usedOptions?.has(name) &&
        !profile.name.startsWith(name + " ") &&
        !name.startsWith(profile.name + " ")
    )
  ).sort((a, b) => b.length - a.length);

  const wrongOptions: string[] = [];
  for (const name of candidates) {
    const conflicts = [profile.name, ...wrongOptions].some(
      (other) =>
        other.startsWith(name + " ") ||
        name.startsWith(other + " ") ||
        other.split(/\s+/)[0] === name.split(/\s+/)[0]
    );
    if (conflicts) continue;
    wrongOptions.push(name);
    if (wrongOptions.length === 3) break;
  }
  if (wrongOptions.length < 3) return null;

  const options = shuffle([profile.name, ...wrongOptions]);
  if (usedOptions) markOptionsUsed(usedOptions, options);

  return {
    id: crypto.randomUUID(),
    question: `Which character ${profile.predicate}?`,
    options,
    correctAnswer: profile.name,
  };
}

function makeCharacterActionQuestion(
  profile: CharacterProfile,
  distractors: string[],
  usedOptions?: Set<string>
): QuizQuestion | null {
  if (usedOptions?.has(profile.sentence)) return null;

  const correct = profile.sentence;
  const wrongOptions = pickStoryOptions(correct, distractors, 3, usedOptions);
  if (!wrongOptions) return null;

  const options = shuffle([correct, ...wrongOptions]);
  if (usedOptions) markOptionsUsed(usedOptions, options);

  return {
    id: crypto.randomUUID(),
    question: `What does ${profile.name} do in the story?`,
    options,
    correctAnswer: correct,
  };
}

function addQuestion(questions: QuizQuestion[], candidate: QuizQuestion | null) {
  const question = uniqueQuestion(questions, candidate);
  if (question && questions.length < QUIZ_QUESTION_COUNT) {
    questions.push(question);
  }
}

function buildStoryQuestions(context: StoryContext): QuizQuestion[] {
  const { eventPhrases, earlyEvents, lateEvents, characters, characterProfiles } =
    context;
  const questions: QuizQuestion[] = [];
  const usedOptions = new Set<string>();
  const distractors = buildFalseDistractors(eventPhrases, characters);
  const usedCorrect = new Set<string>();

  let plotIndex = 0;
  let earlyIndex = 0;
  let lateIndex = 0;

  const markCorrect = (answer: string) => usedCorrect.add(answer.toLowerCase());
  const isFreshCorrect = (answer: string) => !usedCorrect.has(answer.toLowerCase());

  const plotEvents = shuffle(eventPhrases);
  const earlyPool = shuffle(earlyEvents);
  const latePool = shuffle(lateEvents);
  const profilePool = shuffle(characterProfiles);

  let plotCursor = 0;
  let earlyCursor = 0;
  let lateCursor = 0;
  let profileCursor = 0;

  const tryPlot = () => {
    while (plotCursor < plotEvents.length) {
      const event = plotEvents[plotCursor++];
      if (!isFreshCorrect(event.phrase)) continue;
      const before = questions.length;
      addQuestion(
        questions,
        makePlotQuestion(event, distractors, plotIndex++, usedOptions)
      );
      if (questions.length > before) {
        markCorrect(event.phrase);
        return;
      }
    }
  };

  const tryEarly = () => {
    while (earlyCursor < earlyPool.length) {
      const event = earlyPool[earlyCursor++];
      if (!isFreshCorrect(event.phrase)) continue;
      const contrast = lateEvents.length >= 3 ? lateEvents : eventPhrases;
      const before = questions.length;
      addQuestion(
        questions,
        makeTimelineQuestion(
          event,
          contrast.filter((e) => e.phrase !== event.phrase),
          "early",
          earlyIndex++,
          usedOptions,
          distractors
        )
      );
      if (questions.length > before) {
        markCorrect(event.phrase);
        return;
      }
    }
  };

  const tryLate = () => {
    while (lateCursor < latePool.length) {
      const event = latePool[lateCursor++];
      if (!isFreshCorrect(event.phrase)) continue;
      const contrast = earlyEvents.length >= 3 ? earlyEvents : eventPhrases;
      const before = questions.length;
      addQuestion(
        questions,
        makeTimelineQuestion(
          event,
          contrast.filter((e) => e.phrase !== event.phrase),
          "late",
          lateIndex++,
          usedOptions,
          distractors
        )
      );
      if (questions.length > before) {
        markCorrect(event.phrase);
        return;
      }
    }
  };

  const tryCharacter = () => {
    while (profileCursor < profilePool.length) {
      const profile = profilePool[profileCursor++];
      if (isFreshCorrect(profile.name) && characters.length >= 4) {
        const before = questions.length;
        addQuestion(
          questions,
          makeCharacterQuestion(profile, characters, usedOptions)
        );
        if (questions.length > before) {
          markCorrect(profile.name);
          return;
        }
      }
      if (isFreshCorrect(profile.sentence)) {
        const before = questions.length;
        addQuestion(
          questions,
          makeCharacterActionQuestion(profile, distractors, usedOptions)
        );
        if (questions.length > before) {
          markCorrect(profile.sentence);
          return;
        }
      }
    }
  };

  const builders = [tryPlot, tryEarly, tryLate, tryCharacter, tryPlot];
  let guard = 0;
  while (questions.length < QUIZ_QUESTION_COUNT && guard < 80) {
    builders[guard % builders.length]();
    guard++;
  }

  while (questions.length < QUIZ_QUESTION_COUNT && plotCursor < plotEvents.length) {
    tryPlot();
  }

  return questions;
}

function hasEnoughSourceMaterial(context: StoryContext): boolean {
  return (
    context.eventPhrases.length >= 4 ||
    context.characterProfiles.length >= 4 ||
    context.eventPhrases.length + context.characterProfiles.length >= 6
  );
}

export async function generateQuizQuestions(
  bookTitle: string,
  author: string
): Promise<QuizQuestion[]> {
  const seed = getSeedPlot(bookTitle, author);
  const cached = seed ? null : await getCachedPlot(bookTitle, author);
  let storyText = seed ?? cached ?? (await fetchBookStoryText(bookTitle, author));

  if (!storyText) return [];

  if (!seed && !cached) {
    await setCachedPlot(bookTitle, author, storyText);
  }

  const context = buildStoryContext(storyText, bookTitle);
  if (!hasEnoughSourceMaterial(context)) return [];

  const questions = buildStoryQuestions(context);
  if (questions.length < QUIZ_QUESTION_COUNT) return [];

  return shuffle(questions).slice(0, QUIZ_QUESTION_COUNT);
}
