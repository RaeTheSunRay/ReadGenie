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
  /\b(was published|written by|the author|bestseller|won the|award for|adapted into|film version|critics|million copies|first published|sequel to|non-fiction|memoir|biography|nominees|judging|panel-based|blogger|cybils|ranked number|survey published|school library journal|middle grade novel written|farrar|straus|inspired by|based on the)\b/i;

const FILM_PATTERNS =
  /\b(film directed|movie directed|fantasy film directed|screenplay by|box office|opening weekend|starred|starring|was adapted|feature film|walt disney)\b/i;

const STORY_PATTERNS =
  /\b(who|finds?|found|discover(?:s|ed|ing)?|travel(?:s|ed|ing)?|journey|friend|enemy|famil(?:y|ies)|school|home|fight(?:s|ing)?|escape[ds]?|sav(?:e|es|ed|ing)|learn(?:s|ed|ing)?|meet(?:s|ing)?|liv(?:e|es|ed|ing)|di(?:e|es|ed)|born|magic|secret|quest|adventure|village|kingdom|world|follows?|protagonist|character|orphan|wizard|dragon|train|ride|parent|sister|brother|boy|girl|young|help(?:s|ed|ing)?|rescu(?:e|es|ed|ing)|return(?:s|ed|ing)?|leav(?:e|es|ing)|arriv(?:e|es|ed|ing)|win(?:s|ning)?|los(?:e|es|ing)|hid(?:e|es|ing)|reveal(?:s|ed|ing)?|remember(?:s|ed|ing)?|decid(?:e|es|ed|ing)|tri(?:es|ed|ing)|begin(?:s|ning)?|continu(?:e|es|ed|ing)|grow(?:s|ing)?|chang(?:e|es|ed|ing)|centers?|fac(?:e|es|ed|ing)|enter(?:s|ed|ing)?|uncov(?:er|ers|ered|ering)|must|named|called|promis(?:e|es|ed|ing)|protect(?:s|ed|ing)?|weav(?:e|es|ed|ing)|hatch(?:es|ed|ing)?|feel(?:s|ing)?|plan(?:s|ned|ning)?|slaughter|stay(?:s|ed|ing)?|send(?:s|ing)?|kill(?:s|ed|ing)?|lonely|pig|spider|barn|eggs?|winter|spring|farm|bus|road|grief|heal(?:s|ed|ing)?|bur(?:y|ies|ied)|angry|weak|miraculous|defeat(?:s|ed|ing)?|sacrifice(?:s|ed|ing)?|belong(?:s|ed|ing)?|honor(?:s|ed|ing)?|burn(?:s|ed|ing)?|recruit(?:s|ed|ing)?|enjoy(?:s|ed|ing)?|obsess(?:es|ed|ing)?|guard(?:s|ed|ing)?|slay(?:s|ed|ing)?|refuse(?:s|ed|ing)?|bully|bullies|homeschooled|camp|lunch|graduation|award|becomes?|became|build(?:s|ing)?|steal(?:s|ing)?|open(?:s|ing)?|repair(?:s|ing)?|expose(?:s|d|ing)?|challenge(?:s|d|ing)?|solv(?:e|es|ed|ing)|invent(?:s|or|ed|ing)?|companion|mayor|riddle|trap(?:s|ped)?|search|machine|workshop|hides?|curse|dig(?:s|ging)?|detention|desert|convict(?:ed|ion)?|theft|treasure|warden|realize[sd]?|buried|holes?|wrongfully|unjustly|war|mission|courage|soldier|moves?|pretends?|relocated|shortages?|thinks?|packet|escape(?:s|d)?|handkerchief|sweden|resistance|dig(?:s|ging)?|train|grief|traveler|relative)\b/i;

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
  "Now", "Then", "There", "Here", "But", "And", "Yet", "Still",
  "Soon", "Once", "Only", "Even", "Also", "Just", "Next", "Each",
  "Every", "Both", "Neither", "Either", "Such", "Those", "These",
  "Are", "Is", "Was", "Were", "Much", "More", "Most", "Holes",
  "Copenhagen", "Denmark", "Texas", "London", "Paris", "Berlin",
  "Chicago", "California", "Jews", "Nazis", "Nazi", "Soldiers", "Inspired", "Number", "Stars",
  "Disney", "Pictures", "Beyond", "Somehow", "Simple", "On",
]);

const PREDICATE_START =
  /^(is|was|are|were|has|have|had|does|do|did|becomes|became|discovers|finds|travels|meets|lives|helps|fights|escapes|learns|saves|loses|faces|tries|leaves|returns|promises|protects|weaves|befriends|apologizes|earns|receives|accuses|joins|plans|dies|arrives|recruits|uses|slays|refuses|struggles|overhears|shows|digs|heals|talks|keeps|changes|picks|works|tells|enters|stops|wins|passes|suspects|enjoys|gets|solves|sacrifices|bullies|feels|grows|lays|named|called|defeats|belongs|plays|builds|steals|opens|repairs|exposes|challenges|guards|hides|moves|pretends|realizes|thinks)\b/i;

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ReadGenie/1.0 (educational quiz app; contact: readgenie@local)" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }
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
  ];

  const seenTitles = new Set<string>();
  const candidates: { title: string; score: number; text: string }[] = [];

  for (const title of directWikipediaTitles(bookTitle, author)) {
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);
    const text = await fetchWikipediaExtract(title);
    if (text && isRelevantStoryText(text, bookTitle, author)) {
      candidates.push({
        title,
        score: scorePageTitle(title, bookTitle, author) + 20,
        text,
      });
      // One high-quality novel page is enough.
      if (title.toLowerCase().includes("novel") || text.length > 1200) break;
    }
  }

  if (candidates.length === 0) {
    for (const query of queries) {
      const titles = await searchWikipediaTitles(query);
      for (const title of titles.slice(0, 3)) {
        if (seenTitles.has(title)) continue;
        seenTitles.add(title);

        const text = await fetchWikipediaExtract(title);
        if (!text || !isRelevantStoryText(text, bookTitle, author)) continue;

        candidates.push({
          title,
          score: scorePageTitle(title, bookTitle, author),
          text,
        });
        if (candidates.length >= 2) break;
      }
      if (candidates.length >= 2) break;
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.text ?? null;
}

async function fetchOpenLibraryStoryText(
  bookTitle: string,
  author: string
): Promise<string | null> {
  const lastName = authorLastName(author).toLowerCase();
  const searches = [
    `https://openlibrary.org/search.json?title=${encodeURIComponent(bookTitle)}&author=${encodeURIComponent(author)}&limit=5`,
    // Fallback when the author is misspelled (e.g. Moiser vs Mosier).
    `https://openlibrary.org/search.json?title=${encodeURIComponent(bookTitle)}&limit=5`,
  ];

  const parts: string[] = [];
  const seenWorks = new Set<string>();

  for (const url of searches) {
    const data = (await fetchJson(url)) as {
      docs?: {
        title?: string;
        author_name?: string[];
        first_sentence?: string[] | string;
        key?: string;
      }[];
    } | null;

    for (const doc of data?.docs ?? []) {
      const titleWords = bookTitle
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 2);
      const docTitle = doc.title?.toLowerCase() ?? "";
      const matchesTitle =
        titleWords.filter((word) => docTitle.includes(word)).length >=
        Math.min(2, titleWords.length);

      if (!matchesTitle) continue;

      const authorNames = doc.author_name ?? [];
      const exactAuthor = authorNames.some((name) =>
        name.toLowerCase().includes(lastName)
      );
      const fuzzyAuthor = authorNames.some((name) => {
        const docLast = authorLastName(name).toLowerCase();
        if (!lastName || !docLast) return false;
        if (docLast === lastName) return true;
        if (Math.abs(docLast.length - lastName.length) > 2) return false;
        let distance = 0;
        const max = Math.max(docLast.length, lastName.length);
        for (let i = 0; i < max; i++) {
          if (docLast[i] !== lastName[i]) distance += 1;
          if (distance > 2) return false;
        }
        return distance <= 2;
      });

      // Prefer author matches; on title-only search, still accept a clear title hit.
      if (url.includes("author=") && !exactAuthor && !fuzzyAuthor) continue;
      if (!url.includes("author=") && !exactAuthor && !fuzzyAuthor && parts.length > 0) {
        continue;
      }

      const firstSentence = Array.isArray(doc.first_sentence)
        ? doc.first_sentence[0]
        : doc.first_sentence;
      if (firstSentence && firstSentence.length > 40) {
        parts.push(firstSentence);
      }

      if (doc.key && !seenWorks.has(doc.key)) {
        seenWorks.add(doc.key);
        const work = (await fetchJson(`https://openlibrary.org${doc.key}.json`)) as {
          description?: string | { value?: string };
        } | null;
        const description =
          typeof work?.description === "string"
            ? work.description
            : work?.description?.value;
        if (description && description.length > 80) {
          parts.push(description.replace(/<[^>]+>/g, " "));
        }
      }

      if (parts.join(" ").length > 400) break;
    }

    if (parts.join(" ").length > 200) break;
  }

  const combined = parts.join("\n").replace(/\s+/g, " ").trim();
  if (!combined) return null;
  if (!STORY_PATTERNS.test(combined)) return null;
  return combined;
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
  // Prefer Open Library first — Wikipedia/Google often rate-limit.
  const openLibrary = await fetchOpenLibraryStoryText(bookTitle, author);
  const google = await fetchGoogleBooksStoryText(bookTitle, author);
  const wiki = await fetchWikipediaStoryText(bookTitle, author);

  const parts = [openLibrary, google, wiki].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join("\n") : null;
}

const FRAGMENT_START =
  /^(who|whom|whose|which|that|when|where|while|after|before|but|and|or|because|though|although|sent|called|named|born|told|given|taken|forced|asked|known|seen|found|made|left|kept|brought|are|is|was|were|what|why|how|a curse that)\b/i;

const HAS_SUBJECT_AND_VERB =
  /\b(He|She|They|It|I|We|The|A|An|His|Her|Their|This|These|Those|One|Some|Many|People|Three|Later|[A-Z][a-z]+(?:'[sS])?(?:\s+[A-Z][a-z]+)?)\b[^.!?]{0,60}\b(is|was|are|were|has|have|had|does|do|did|discovers?|finds?|meets?|helps?|lives?|saves?|learns?|travels?|becomes?|faces?|tries|leaves?|returns?|promises?|protects?|weaves?|enters?|uncovers?|attends?|must|comes?|goes?|dies?|grows?|lays?|plans?|feels?|picks?|joins?|begins?|digs?|changes?|keeps?|recruits?|uses?|slays?|refuses?|struggles?|accuses?|prevents?|earns?|receives?|befriends?|overhears?|apologizes?|shows?|arrives?|escapes?|fights?|hides?|reveals?|remembers?|decides?|continues?|centers?|named|called|hatches?|stays?|sends?|kills?|buries?|drives?|tells?|stops?|wins?|passes?|suspects?|enjoys?|gets?|works?|talks?|heals?|defeats?|sacrifices?|belongs?|honors?|burns?|builds?|steals?|opens?|repairs?|exposes?|challenges?|solves?|guards?|traps?|realize[sd]?|sent|moves?|pretends?)\b/i;

export function isStorySentence(sentence: string): boolean {
  if (sentence.length < 20 || sentence.length > 280) return false;
  if (FILM_PATTERNS.test(sentence)) return false;
  if (META_PATTERNS.test(sentence)) return false;
  if (FRAGMENT_START.test(sentence)) return false;
  if (/^(The book|The novel|The story|This book|This novel)\b/i.test(sentence)) {
    return false;
  }
  if (!HAS_SUBJECT_AND_VERB.test(sentence)) return false;
  return STORY_PATTERNS.test(sentence);
}

function stripLeadingStoryAdverb(sentence: string): string {
  return sentence
    .replace(
      /^(Now|Then|Later|Soon|Finally|Suddenly|Eventually|Afterward|Afterwards)\s+/i,
      ""
    )
    .replace(/^On the train,\s*/i, "")
    .replace(/^Near the end of the trip,\s*/i, "")
    .trim();
}

function normalizeCompleteSentence(sentence: string): string | null {
  let cleaned = stripLeadingStoryAdverb(sentence)
    .replace(/^(The (story|novel|book|plot)|It)\s+(follows|centers on|focuses on|tells|describes)\s+/i, "")
    .replace(/^This (story|novel|book)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  if (FRAGMENT_START.test(cleaned)) return null;

  const words = cleaned.split(/\s+/);
  if (words.length < 5 || words.length > 48) return null;
  if (cleaned.length < 20 || cleaned.length > 260) return null;
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

  const rawChunks = protectedText
    .split(/(?<=[.!?])\s+|\n+/)
    .flatMap((chunk) => chunk.split(/\s*;\s*/))
    .flatMap((chunk) =>
      chunk.split(/,?\s+so\s+/i).map((part, index, arr) => {
        if (arr.length === 1) return part;
        if (index === 0) {
          const cleaned = part.replace(/["”]+$/, "").trim();
          return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
        }
        const capitalized = part.charAt(0).toUpperCase() + part.slice(1);
        return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
      })
    )
    .map((s) => s.replace(/·/g, ".").trim())
    .filter(Boolean);

  const sentences: string[] = [];
  for (const chunk of rawChunks) {
    if (isStorySentence(chunk)) {
      sentences.push(chunk);
      continue;
    }

    const words = chunk.split(/\s+/);
    if (words.length > 48) {
      const clipped = `${words.slice(0, 40).join(" ").replace(/[,:;]+$/, "")}.`;
      if (isStorySentence(clipped)) sentences.push(clipped);
    }
  }

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
    `\\b${escaped}\\b[^.!?]{0,80}\\b(is|was|are|discovers|finds|meets|helps|fights|escapes|learns|saves|lives|travels|becomes|has|faces|tries|leaves|returns|named|called|promises|protects|weaves|befriends|apologizes|earns|receives|accuses|joins|plans|dies|arrives|recruits|uses|slays|refuses|struggles|overhears|shows|digs|heals|talks|keeps|changes|picks|works|tells|enters|stops|wins|passes|suspects|enjoys|gets|moves|pretends|thinks?|asks|realizes|builds|steals|asked)\\b`,
    "i"
  );
  const beforeVerb = new RegExp(
    `\\b(meets|helps|befriends|saves|finds|named|called|joins|recruits|tells|faces|accuses|overhears|follows|brings|takes|sees|visits|asks)\\s+${escaped}\\b`,
    "i"
  );

  return afterVerb.test(text) || beforeVerb.test(text);
}

function extractCharacters(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
  const names = [
    ...new Set(
      matches.filter((name) => {
        if (SKIP_NAMES.has(name)) return false;
        const parts = name.split(/\s+/);
        if (parts.some((part) => SKIP_NAMES.has(part))) return false;
        return isLikelyCharacter(name, text);
      })
    ),
  ];

  // Prefer distinct people: keep both full names and clear first names when useful.
  const expanded = new Set(names);
  for (const name of names) {
    const parts = name.split(/\s+/);
    if (parts.length === 2 && parts[0].length > 2) {
      if (
        !SKIP_NAMES.has(parts[0]) &&
        (isLikelyCharacter(parts[0], text) || text.includes(parts[0]))
      ) {
        expanded.add(parts[0]);
      }
    }
  }

  return [...expanded].filter((name) => !SKIP_NAMES.has(name));
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
      const sentence = normalizeCompleteSentence(stripLeadingStoryAdverb(raw));
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
    if (!phrase || seenPhrases.has(phrase.toLowerCase())) return;
    if (/^There is no\b/i.test(phrase)) return;
    if (/^(Inspired|Based|Number|According|Beyond|Somehow|On the)\b/i.test(phrase)) return;

    const rewritten = rewritePronounEvent(phrase, extractCharacters(text));
    const finalPhrase = extractEventPhrase(rewritten) ?? phrase;
    if (seenPhrases.has(finalPhrase.toLowerCase())) return;
    if (!isCompleteAnswerOption(finalPhrase) && !isCompleteAnswerOption(phrase)) return;

    const chosen =
      isCompleteAnswerOption(finalPhrase) && !/^(It|It's)\b/i.test(finalPhrase)
        ? finalPhrase
        : phrase;
    if (!isCompleteAnswerOption(chosen)) return;

    seenPhrases.add(chosen.toLowerCase());
    eventPhrases.push({ phrase: chosen, sentence, index });
  });

  const split = Math.max(1, Math.ceil(eventPhrases.length / 3));
  const earlyEvents = eventPhrases.slice(0, split);
  const lateEvents = eventPhrases.slice(split * 2);

  const characters = extractCharacters(text).filter(
    (name) => name.toLowerCase() !== bookTitle.toLowerCase()
  );
  const characterProfiles = extractCharacterProfiles(characters, [
    ...storySentences,
    ...eventPhrases.map((event) => event.phrase),
  ]);

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

/** Prefer unused wrong answers; if the pool is thin, allow reused wrongs (never the correct answer). */
function pickWrongOptions(
  correct: string,
  pool: string[],
  usedOptions: Set<string> | undefined,
  allowReuse: boolean
): string[] | null {
  const exclusive = pickStoryOptions(correct, pool, 3, usedOptions);
  if (exclusive) return exclusive;
  if (!allowReuse) return null;
  return pickStoryOptions(correct, pool, 3, undefined);
}

function markOptionsUsed(usedOptions: Set<string>, options: string[]) {
  for (const option of options) {
    usedOptions.add(option);
  }
}

function uniqueQuestion(
  questions: QuizQuestion[],
  candidate: QuizQuestion | null,
  allowReuseCorrect = false
): QuizQuestion | null {
  if (!candidate) return null;
  if (questions.some((q) => q.question.toLowerCase() === candidate.question.toLowerCase())) {
    return null;
  }
  if (
    !allowReuseCorrect &&
    questions.some((q) => q.correctAnswer === candidate.correctAnswer)
  ) {
    return null;
  }
  return candidate;
}

function templateWrongAnswers(characters: string[]): string[] {
  const names =
    characters.length > 0
      ? characters
      : ["The hero", "The companion", "The rival", "The mentor"];

  const templates = [
    (name: string) => `${name} abandons the adventure before anything important happens.`,
    (name: string) => `${name} refuses to help friends during the most dangerous moment.`,
    (name: string) => `${name} forgets the main goal of the quest completely.`,
    (name: string) => `${name} joins the villain and betrays everyone else in the story.`,
    (name: string) => `${name} never meets any friends and travels alone forever.`,
    (name: string) => `${name} destroys the object everyone worked hard to protect.`,
    (name: string) => `${name} stays home and avoids every challenge in the journey.`,
    (name: string) => `${name} reveals the secret plan to the enemy on purpose.`,
    (name: string) => `${name} loses courage and surrenders without trying to fight.`,
    (name: string) => `${name} steals credit for another character's brave actions.`,
  ];

  const results: string[] = [];
  for (const name of names) {
    for (const template of templates) {
      results.push(template(name));
    }
  }
  return results;
}

/** Build plausible false answer sentences by swapping characters and key outcomes. */
export function buildFalseDistractors(
  events: EventPhrase[],
  characters: string[]
): string[] {
  const trueSet = new Set(events.map((e) => e.phrase.toLowerCase()));
  const distractors = new Set<string>();

  const addFake = (fake: string) => {
    let normalized = normalizeCompleteSentence(fake);
    if (!normalized) {
      // Keep template-style wrong answers even if STORY_PATTERNS is picky.
      const trimmed = fake.replace(/\s+/g, " ").trim();
      if (
        /^[A-Z]/.test(trimmed) &&
        trimmed.split(/\s+/).length >= 6 &&
        /[.!?]$/.test(trimmed) &&
        HAS_SUBJECT_AND_VERB.test(trimmed)
      ) {
        normalized = trimmed;
      } else {
        return;
      }
    }
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
      [/\bdefeats?\b/gi, "joins"],
      [/\bsacrifices?\b/gi, "betrays"],
      [/\bsolves?\b/gi, "ruins"],
      [/\benters?\b/gi, "avoids"],
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

  for (const template of templateWrongAnswers(characters)) {
    addFake(template);
  }

  return [...distractors];
}

function isCompleteAnswerOption(option: string): boolean {
  const looksLikeName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(option);
  if (looksLikeName) return true;

  const expanded = option
    .replace(/\bIt's\b/g, "It is")
    .replace(/\bHe's\b/g, "He is")
    .replace(/\bShe's\b/g, "She is")
    .replace(/\bThey're\b/g, "They are")
    .replace(/\bdoesn't\b/gi, "does not")
    .replace(/\bisn't\b/gi, "is not")
    .replace(/\bwasn't\b/gi, "was not")
    .replace(/\bweren't\b/gi, "were not")
    .replace(/\bcan't\b/gi, "cannot");

  return (
    /^[A-Z]/.test(option) &&
    /[.!?]$/.test(option) &&
    !FRAGMENT_START.test(option) &&
    option.split(/\s+/).length >= 5 &&
    HAS_SUBJECT_AND_VERB.test(expanded)
  );
}

function asCompleteCause(cause: string): string | null {
  let text = cause.trim().replace(/\s+/g, " ");
  if (!text) return null;
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?]$/.test(text)) text += ".";

  const normalized = normalizeCompleteSentence(text);
  if (normalized) return normalized;

  // Allow slightly shorter cause answers for why-questions.
  const words = text.replace(/[.!?]$/, "").split(/\s+/);
  if (words.length < 4 || words.length > 40) return null;
  if (FRAGMENT_START.test(text)) return null;
  if (!/^(He|She|They|It|The|A|An|[A-Z])/i.test(text)) return null;
  return text;
}

function effectToWhyQuestion(effect: string): string | null {
  let cleaned = effect.trim().replace(/[.!?]+$/, "");
  if (!cleaned) return null;
  if (/^(is|was|are|were|has|have|had)\b/i.test(cleaned)) return null;

  const match = cleaned.match(
    /^((?:The|A|An)\s+[A-Za-z][A-Za-z'-]*|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+([a-zA-Z]+)\b(.*)$/
  );
  if (!match) {
    return `Why did this story event happen: ${cleaned}?`;
  }

  const [, subject, verb, rest] = match;
  let base = verb.toLowerCase();
  if (base.endsWith("ies")) base = `${base.slice(0, -3)}y`;
  else if (base.endsWith("es") && /[sxzch]es$/.test(base)) base = base.slice(0, -2);
  else if (base.endsWith("s") && !base.endsWith("ss")) base = base.slice(0, -1);

  // Keep the why-question focused on the first action clause.
  const firstClause = rest.split(/\band\b/i)[0] ?? rest;

  return `Why did ${subject} ${base}${firstClause}?`;
}

export function makeWhyQuestion(
  sentence: string,
  distractors: string[],
  usedOptions?: Set<string>,
  trueAnswers?: Set<string>,
  allowReuseWrong = false
): QuizQuestion | null {
  const match = sentence.match(/^(.+?)\s+because\s+(.+)$/i);
  if (!match) return null;

  const question = effectToWhyQuestion(match[1]);
  const correct = asCompleteCause(match[2]);
  if (!question || !correct) return null;
  if (!allowReuseWrong && usedOptions?.has(correct)) return null;

  const wrongPool = distractors.filter(
    (item) =>
      item !== correct &&
      isCompleteAnswerOption(item) &&
      !trueAnswers?.has(item.toLowerCase())
  );
  const wrongOptions = pickWrongOptions(
    correct,
    wrongPool,
    usedOptions,
    allowReuseWrong
  );
  if (!wrongOptions) return null;
  if (!wrongOptions.every(isCompleteAnswerOption)) return null;

  return {
    id: crypto.randomUUID(),
    question,
    options: shuffle([correct, ...wrongOptions]),
    correctAnswer: correct,
  };
}

export function makeWhoQuestion(
  profile: CharacterProfile,
  characters: string[],
  usedOptions?: Set<string>,
  allowReuseWrong = false
): QuizQuestion | null {
  if (!PREDICATE_START.test(profile.predicate)) return null;
  if (!allowReuseWrong && usedOptions?.has(profile.name)) return null;

  const fillerNames = ["Marcus", "Elena", "Theo", "Priya", "Jonas", "Amira"];
  const candidates = shuffle(
    [...characters, ...fillerNames].filter(
      (name) =>
        name !== profile.name &&
        !SKIP_NAMES.has(name) &&
        (allowReuseWrong || !usedOptions?.has(name)) &&
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

  return {
    id: crypto.randomUUID(),
    question: `Who ${profile.predicate}?`,
    options: shuffle([profile.name, ...wrongOptions]),
    correctAnswer: profile.name,
  };
}

export function makeWhatDidQuestion(
  profile: CharacterProfile,
  distractors: string[],
  usedOptions?: Set<string>,
  trueAnswers?: Set<string>,
  allowReuseWrong = false
): QuizQuestion | null {
  if (!allowReuseWrong && usedOptions?.has(profile.sentence)) return null;
  if (!isCompleteAnswerOption(profile.sentence)) return null;
  // Prefer action events over simple identity statements like "is a young orphan".
  if (/^(is|was|are|were)\b/i.test(profile.predicate)) return null;

  const correct = profile.sentence;
  const wrongPool = distractors.filter(
    (item) =>
      item !== correct &&
      isCompleteAnswerOption(item) &&
      !trueAnswers?.has(item.toLowerCase())
  );
  const wrongOptions = pickWrongOptions(
    correct,
    wrongPool,
    usedOptions,
    allowReuseWrong
  );
  if (!wrongOptions) return null;

  return {
    id: crypto.randomUUID(),
    question: `What did ${profile.name} do in the story?`,
    options: shuffle([correct, ...wrongOptions]),
    correctAnswer: correct,
  };
}

function rewritePronounEvent(phrase: string, characters: string[]): string {
  const sorted = [...characters].sort((a, b) => b.length - a.length);
  const named = sorted.find((name) =>
    new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(phrase)
  );
  if (!named) return phrase;

  const realize = phrase.match(
    /\bIt (?:does not|doesn't) take long for (.+?) to realize (.+)$/i
  );
  if (realize) {
    const out = `${realize[1]} realizes ${realize[2]}`.replace(/\s+/g, " ").trim();
    return /[.!?]$/.test(out) ? out : `${out}.`;
  }

  const upTo = phrase.match(/\bIt(?:'s| is) up to (.+?) to (.+)$/i);
  if (upTo) {
    const out = `${upTo[1]} ${upTo[2]}`.replace(/\s+/g, " ").trim();
    return /[.!?]$/.test(out) ? out : `${out}.`;
  }

  return phrase;
}

function eventSubject(phrase: string, characters: string[]): string {
  const named = characters.find((name) =>
    new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(phrase)
  );
  if (named) return named;

  const mentioned = characters.find((name) =>
    new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(phrase)
  );
  if (mentioned && /^(It|He|She|They)\b/i.test(phrase)) return mentioned;

  const group = phrase.match(
    /^(The (?:three friends|friends|company|trio|dwarves|group))\b/i
  );
  if (group) return group[1];

  const match = phrase.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
  if (match && !SKIP_NAMES.has(match[1]) && match[1] !== "The") return match[1];
  return "the characters";
}

function isWeakStorySubject(subject: string): boolean {
  if (
    /^(The (?:three friends|friends|company|trio|dwarves|group))$/i.test(subject)
  ) {
    return false;
  }
  return (
    SKIP_NAMES.has(subject) ||
    /^(It|It's|The|Somehow|Then|Later|Jews|A|An)$/i.test(subject) ||
    /^The\s+/i.test(subject)
  );
}

function eventVerb(phrase: string, subject: string): string {
  const afterSubject = phrase
    .replace(new RegExp(`^${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "")
    .replace(/[.!?]+$/, "")
    .trim();
  const words = afterSubject
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ""))
    .filter(Boolean);

  const knownVerb = words.find((word) =>
    /^(is|was|are|were|has|have|had|does|do|did|discovers?|finds?|meets?|helps?|lives?|saves?|learns?|travels?|becomes?|faces?|tries|leaves?|returns?|promises?|protects?|weaves?|enters?|attends?|comes?|goes?|dies?|grows?|plans?|feels?|joins?|digs?|moves?|pretends?|realizes?|builds?|steals?|opens?|solves?|guards?|escapes?|fights?|hides?|asks?|wins?|stops?|tells?|works?|sacrifices?|defeats?|belongs?|bullies|thinks?|wrongly)$/i.test(
      word
    )
  );
  if (knownVerb && !/^(wrongly)$/i.test(knownVerb)) return knownVerb.toLowerCase();

  const verb =
    words.find(
      (word) =>
        /^[a-z]/.test(word) &&
        word.length > 2 &&
        !/ly$/i.test(word) &&
        !/^(the|a|an|three|his|her|their|and|by|for|from|with|into|onto|over|under|about|later|boy|girl|young)$/i.test(
          word
        )
    ) ?? "acts";
  return verb.toLowerCase();
}

export function makeEventQuestion(
  event: EventPhrase,
  distractors: string[],
  usedOptions?: Set<string>,
  trueAnswers?: Set<string>,
  characters: string[] = [],
  allowReuseWrong = false
): QuizQuestion | null {
  if (!allowReuseWrong && usedOptions?.has(event.phrase)) return null;
  if (!isCompleteAnswerOption(event.phrase)) return null;

  const correct = event.phrase;
  const wrongPool = distractors.filter(
    (item) =>
      item !== correct &&
      isCompleteAnswerOption(item) &&
      !trueAnswers?.has(item.toLowerCase())
  );
  const wrongOptions = pickWrongOptions(
    correct,
    wrongPool,
    usedOptions,
    allowReuseWrong
  );
  if (!wrongOptions) return null;

  const subject = eventSubject(event.phrase, characters);
  if (isWeakStorySubject(subject)) {
    return null;
  }
  const verb = eventVerb(event.phrase, subject);
  if (verb.length < 3 || /^(by|s|she|he|they|denmark)$/i.test(verb)) return null;

  return {
    id: crypto.randomUUID(),
    question: `Which statement about ${subject} is true in the story (${verb})?`,
    options: shuffle([correct, ...wrongOptions]),
    correctAnswer: correct,
  };
}

export function makeWhenQuestion(
  event: EventPhrase,
  earlyEvents: EventPhrase[],
  lateEvents: EventPhrase[],
  usedOptions?: Set<string>,
  distractors: string[] = [],
  characters: string[] = [],
  allowReuseWrong = false
): QuizQuestion | null {
  if (!allowReuseWrong && usedOptions?.has(event.phrase)) return null;
  if (!isCompleteAnswerOption(event.phrase)) return null;

  const isEarly = earlyEvents.some((e) => e.phrase === event.phrase);
  const isLate = lateEvents.some((e) => e.phrase === event.phrase);
  if (!isEarly && !isLate) return null;

  const correct = event.phrase;
  const wrongPool = distractors.filter(
    (item) => item !== correct && isCompleteAnswerOption(item)
  );
  const wrongOptions = pickWrongOptions(
    correct,
    wrongPool,
    usedOptions,
    allowReuseWrong
  );
  if (!wrongOptions) return null;

  const subject = eventSubject(event.phrase, characters);
  if (isWeakStorySubject(subject) && subject !== "the characters") {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    question: isEarly
      ? `Which early story event about ${subject} is true?`
      : `Which later story event about ${subject} is true?`,
    options: shuffle([correct, ...wrongOptions]),
    correctAnswer: correct,
  };
}

/** @deprecated Kept for unit tests; prefer makeEventQuestion. */
export function makePlotQuestion(
  event: EventPhrase,
  distractors: string[],
  _questionIndex = 0,
  usedOptions?: Set<string>
): QuizQuestion | null {
  return makeEventQuestion(event, distractors, usedOptions);
}

/** @deprecated Kept for unit tests; prefer makeWhenQuestion. */
export function makeTimelineQuestion(
  event: EventPhrase,
  _contrastEvents: EventPhrase[],
  timing: "early" | "late",
  _questionIndex = 0,
  usedOptions?: Set<string>,
  distractors: string[] = []
): QuizQuestion | null {
  const early = timing === "early" ? [event] : [];
  const late = timing === "late" ? [event] : [];
  return makeWhenQuestion(event, early, late, usedOptions, distractors);
}

function addQuestion(
  questions: QuizQuestion[],
  candidate: QuizQuestion | null,
  allowReuseCorrect = false
) {
  const question = uniqueQuestion(questions, candidate, allowReuseCorrect);
  if (!question) return false;
  if (!question.options.every(isCompleteAnswerOption)) return false;
  const correctHits = question.options.filter((o) => o === question.correctAnswer);
  if (correctHits.length !== 1) return false;
  if (questions.length >= QUIZ_QUESTION_COUNT) return false;
  questions.push(question);
  return true;
}

function buildStoryQuestions(context: StoryContext): QuizQuestion[] {
  const { eventPhrases, earlyEvents, lateEvents, characters, characterProfiles } =
    context;
  const questions: QuizQuestion[] = [];
  const usedOptions = new Set<string>();
  const usedQuestions = new Set<string>();
  const distractors = buildFalseDistractors(eventPhrases, characters).filter(
    isCompleteAnswerOption
  );
  const trueAnswers = new Set(eventPhrases.map((e) => e.phrase.toLowerCase()));
  const usedCorrect = new Set<string>();

  const markCorrect = (answer: string) => usedCorrect.add(answer.toLowerCase());
  const isFreshCorrect = (answer: string) => !usedCorrect.has(answer.toLowerCase());

  const tryAdd = (
    candidate: QuizQuestion | null,
    correctKey: string,
    markAllOptions = true,
    allowReuseCorrect = false
  ) => {
    if (!candidate) return false;
    if (usedQuestions.has(candidate.question.toLowerCase())) return false;
    if (!allowReuseCorrect && !isFreshCorrect(correctKey)) return false;
    if (!addQuestion(questions, candidate, allowReuseCorrect)) return false;
    usedQuestions.add(candidate.question.toLowerCase());
    if (markAllOptions) {
      markOptionsUsed(usedOptions, candidate.options);
    } else {
      usedOptions.add(candidate.correctAnswer);
    }
    markCorrect(correctKey);
    return true;
  };

  const runPass = (allowReuseWrong: boolean, allowReuseCorrect: boolean) => {
    for (const event of shuffle(eventPhrases)) {
      if (questions.length >= QUIZ_QUESTION_COUNT) return;
      if (!/\bbecause\b/i.test(event.phrase)) continue;
      const why = makeWhyQuestion(
        event.phrase,
        distractors,
        usedOptions,
        trueAnswers,
        allowReuseWrong
      );
      if (why) {
        tryAdd(why, why.correctAnswer, !allowReuseWrong, allowReuseCorrect);
      }
    }

    for (const profile of shuffle(characterProfiles)) {
      if (questions.length >= QUIZ_QUESTION_COUNT) return;
      tryAdd(
        makeWhoQuestion(profile, characters, usedOptions, allowReuseWrong),
        profile.name,
        !allowReuseWrong,
        allowReuseCorrect
      );
    }

    for (const profile of shuffle(characterProfiles)) {
      if (questions.length >= QUIZ_QUESTION_COUNT) return;
      tryAdd(
        makeWhatDidQuestion(
          profile,
          distractors,
          usedOptions,
          trueAnswers,
          allowReuseWrong
        ),
        profile.sentence,
        !allowReuseWrong,
        allowReuseCorrect
      );
    }

    if (allowReuseWrong || allowReuseCorrect) {
      for (const profile of shuffle(characterProfiles)) {
        if (questions.length >= QUIZ_QUESTION_COUNT) return;
        if (!isCompleteAnswerOption(profile.sentence)) continue;
        const wrongPool = distractors.filter(
          (item) =>
            item !== profile.sentence &&
            isCompleteAnswerOption(item) &&
            !trueAnswers.has(item.toLowerCase())
        );
        const wrongOptions = pickWrongOptions(
          profile.sentence,
          wrongPool,
          usedOptions,
          true
        );
        if (!wrongOptions) continue;
        tryAdd(
          {
            id: crypto.randomUUID(),
            question: `Which statement about ${profile.name} is true in the story?`,
            options: shuffle([profile.sentence, ...wrongOptions]),
            correctAnswer: profile.sentence,
          },
          profile.sentence,
          false,
          allowReuseCorrect
        );
      }
    }

    for (const event of shuffle(eventPhrases)) {
      if (questions.length >= QUIZ_QUESTION_COUNT) return;
      tryAdd(
        makeEventQuestion(
          event,
          distractors,
          usedOptions,
          trueAnswers,
          characters,
          allowReuseWrong
        ),
        event.phrase,
        !allowReuseWrong,
        allowReuseCorrect
      );
    }

    for (const event of shuffle([...earlyEvents, ...lateEvents])) {
      if (questions.length >= QUIZ_QUESTION_COUNT) return;
      tryAdd(
        makeWhenQuestion(
          event,
          earlyEvents,
          lateEvents,
          usedOptions,
          distractors,
          characters,
          allowReuseWrong
        ),
        event.phrase,
        !allowReuseWrong,
        allowReuseCorrect
      );
    }

    // Extra stems so thin plots can still reach a full quiz set.
    if (allowReuseCorrect) {
      for (const event of shuffle(eventPhrases)) {
        if (questions.length >= QUIZ_QUESTION_COUNT) return;
        if (!isCompleteAnswerOption(event.phrase)) continue;
        const wrongPool = distractors.filter(
          (item) =>
            item !== event.phrase &&
            isCompleteAnswerOption(item) &&
            !trueAnswers.has(item.toLowerCase())
        );
        const wrongOptions = pickWrongOptions(event.phrase, wrongPool, usedOptions, true);
        if (!wrongOptions) continue;
        const subject = eventSubject(event.phrase, characters);
        if (isWeakStorySubject(subject)) continue;
        const verb = eventVerb(event.phrase, subject);
        if (verb.length < 3) continue;
        tryAdd(
          {
            id: crypto.randomUUID(),
            question: `What happens with ${subject} in the storyline (${verb})?`,
            options: shuffle([event.phrase, ...wrongOptions]),
            correctAnswer: event.phrase,
          },
          `${event.phrase}::storyline`,
          false,
          true
        );
      }
    }
  };

  // Pass 1: exclusive options across the quiz when possible.
  runPass(false, false);
  // Pass 2: reuse wrong answers only if needed.
  if (questions.length < QUIZ_QUESTION_COUNT) {
    runPass(true, false);
  }
  // Pass 3: allow the same true fact under different question stems.
  if (questions.length < QUIZ_QUESTION_COUNT) {
    runPass(true, true);
  }

  return questions;
}

function hasEnoughSourceMaterial(context: StoryContext): boolean {
  return (
    context.eventPhrases.length >= 2 ||
    context.characterProfiles.length >= 2 ||
    context.eventPhrases.length + context.characterProfiles.length >= 3
  );
}

/** Build a full quiz from story text (used by tests and shared by the network path). */
export function generateQuizFromStoryText(
  storyText: string,
  bookTitle: string
): QuizQuestion[] {
  const context = buildStoryContext(storyText, bookTitle);
  if (!hasEnoughSourceMaterial(context)) return [];

  const questions = buildStoryQuestions(context).filter((question) => {
    if (/about (Beyond|Somehow|Inspired|Number|Simple)\b/i.test(question.question)) {
      return false;
    }
    if (/\((simple|by|she|he|they|denmark|stars|s)\)/i.test(question.question)) {
      return false;
    }
    const correctHits = question.options.filter((o) => o === question.correctAnswer);
    if (correctHits.length !== 1) return false;
    return question.options.every(isCompleteAnswerOption);
  });

  if (questions.length < QUIZ_QUESTION_COUNT) return [];

  return shuffle(questions).slice(0, QUIZ_QUESTION_COUNT);
}

export async function generateQuizQuestions(
  bookTitle: string,
  author: string
): Promise<QuizQuestion[]> {
  const seed = getSeedPlot(bookTitle, author);
  const cached = seed ? null : await getCachedPlot(bookTitle, author);

  const tryFromText = (storyText: string | null) =>
    storyText ? generateQuizFromStoryText(storyText, bookTitle) : [];

  let questions = tryFromText(seed ?? cached);
  if (questions.length >= QUIZ_QUESTION_COUNT) {
    return shuffle(questions).slice(0, QUIZ_QUESTION_COUNT);
  }

  const fetched = seed ? null : await fetchBookStoryText(bookTitle, author);
  questions = tryFromText(fetched);
  if (questions.length >= QUIZ_QUESTION_COUNT) {
    if (fetched) {
      await setCachedPlot(bookTitle, author, fetched);
    }
    return shuffle(questions).slice(0, QUIZ_QUESTION_COUNT);
  }

  // Combine cache + fresh fetch when either source alone is too thin.
  if (cached && fetched) {
    questions = tryFromText(`${cached}\n${fetched}`);
    if (questions.length >= QUIZ_QUESTION_COUNT) {
      await setCachedPlot(bookTitle, author, `${cached}\n${fetched}`);
      return shuffle(questions).slice(0, QUIZ_QUESTION_COUNT);
    }
  }

  return [];
}
