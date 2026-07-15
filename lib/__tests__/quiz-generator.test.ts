import { describe, it, expect } from "vitest";
import {
  buildFalseDistractors,
  buildStoryContext,
  extractEventPhrase,
  generateQuizFromStoryText,
  generateQuizQuestions,
  isStorySentence,
  makePlotQuestion,
  makeTimelineQuestion,
  makeWhyQuestion,
  storySentencesFromText,
} from "@/lib/quiz-generator";
import { getSeedPlot } from "@/lib/seed-plots";
import { QUIZ_QUESTION_COUNT } from "@/lib/quiz-config";

const SAMPLE_PLOT = `
Harry Potter is a young orphan who lives with his aunt and uncle. He discovers he is a wizard on his eleventh birthday. Harry attends Hogwarts School of Witchcraft and Wizardry. He meets his best friends Ron and Hermione on the train journey. The trio uncovers a secret involving the Sorcerer's Stone. Harry must face the dark wizard who killed his parents.
The novel was published in 1997 and became a bestseller.
After years of living with the Dursleys, Harry finally learns the truth about his past. Later in the story, he confronts the villain in the school dungeons.
Harry defeats Professor Quirrell because the love protection from Harry's mother makes Quirrell burn at Harry's touch.
`;

function isCompleteSentenceOption(option: string): boolean {
  return (
    /^[A-Z]/.test(option) &&
    /[.!?]$/.test(option) &&
    !/^(who|whom|whose|which|that|when|where|while|after|before|but|and)\b/i.test(
      option
    ) &&
    option.split(/\s+/).length >= 4
  );
}

describe("extractEventPhrase", () => {
  it("returns a complete story sentence as the option", () => {
    const phrase = extractEventPhrase(
      "He discovers he is a wizard on his eleventh birthday."
    );
    expect(phrase).toBe(
      "He discovers he is a wizard on his eleventh birthday."
    );
  });

  it("rejects sentence fragments", () => {
    expect(extractEventPhrase("who lives with his aunt and uncle.")).toBeNull();
    expect(extractEventPhrase("sent to live at the Zuckerman barn")).toBeNull();
  });
});

describe("isStorySentence", () => {
  it("keeps plot sentences", () => {
    expect(
      isStorySentence(
        "Harry discovers he is a wizard on his eleventh birthday."
      )
    ).toBe(true);
  });

  it("filters publishing metadata", () => {
    expect(
      isStorySentence("The novel was published in 1997 and became a bestseller.")
    ).toBe(false);
  });

  it("filters fragments that start with relative pronouns", () => {
    expect(isStorySentence("who is born on the Arable farm.")).toBe(false);
  });
});

describe("buildStoryContext", () => {
  it("builds story events and characters from plot text", () => {
    const context = buildStoryContext(SAMPLE_PLOT, "Harry Potter");
    expect(context.eventPhrases.length).toBeGreaterThan(2);
    expect(context.characters.length).toBeGreaterThan(0);
    for (const event of context.eventPhrases) {
      expect(isCompleteSentenceOption(event.phrase)).toBe(true);
    }
  });
});

describe("buildFalseDistractors", () => {
  it("creates wrong options that are not real plot events", () => {
    const context = buildStoryContext(SAMPLE_PLOT, "Harry Potter");
    const distractors = buildFalseDistractors(
      context.eventPhrases,
      context.characters
    );
    expect(distractors.length).toBeGreaterThan(2);
    const trueSet = new Set(context.eventPhrases.map((e) => e.phrase));
    for (const fake of distractors) {
      expect(trueSet.has(fake)).toBe(false);
      expect(isCompleteSentenceOption(fake)).toBe(true);
    }
  });
});

describe("makeWhyQuestion", () => {
  it("asks a why question with one correct complete-sentence answer", () => {
    const context = buildStoryContext(SAMPLE_PLOT, "Harry Potter");
    const distractors = buildFalseDistractors(
      context.eventPhrases,
      context.characters
    );
    const becauseEvent = context.eventPhrases.find((e) =>
      /because/i.test(e.phrase)
    );
    expect(becauseEvent).toBeTruthy();

    const question = makeWhyQuestion(
      becauseEvent!.phrase,
      distractors,
      undefined,
      new Set(context.eventPhrases.map((e) => e.phrase.toLowerCase()))
    );

    expect(question).not.toBeNull();
    expect(question?.question.toLowerCase()).toContain("why");
    expect(question?.question.toLowerCase()).toContain("harry");
    expect(question?.options).toHaveLength(4);
    expect(question?.options.filter((o) => o === question.correctAnswer)).toHaveLength(1);
    for (const option of question!.options) {
      expect(isCompleteSentenceOption(option)).toBe(true);
    }
  });
});

describe("makePlotQuestion", () => {
  it("uses one true event and false distractors as options", () => {
    const context = buildStoryContext(SAMPLE_PLOT, "Harry Potter");
    const distractors = buildFalseDistractors(
      context.eventPhrases,
      context.characters
    );
    const event =
      context.eventPhrases.find((item) => makePlotQuestion(item, distractors)) ??
      context.eventPhrases[0];
    const question = makePlotQuestion(event, distractors);

    expect(question).not.toBeNull();
    expect(question?.options).toHaveLength(4);
    expect(question?.options).toContain(question?.correctAnswer);
    expect(question?.correctAnswer).toBe(event.phrase);

    const wrong = question!.options.filter((o) => o !== question!.correctAnswer);
    for (const option of wrong) {
      expect(distractors).toContain(option);
      expect(option).not.toBe(event.phrase);
    }
  });
});

describe("makeTimelineQuestion", () => {
  it("uses complete sentences for beginning or ending questions", () => {
    const context = buildStoryContext(SAMPLE_PLOT, "Harry Potter");
    const distractors = buildFalseDistractors(
      context.eventPhrases,
      context.characters
    );
    const event = context.eventPhrases[0];
    const question = makeTimelineQuestion(
      event,
      context.eventPhrases.filter((e) => e.phrase !== event.phrase),
      "early",
      0,
      undefined,
      distractors
    );

    expect(question).not.toBeNull();
    expect(question?.question.toLowerCase()).toMatch(/early|later/);
    expect(question?.correctAnswer).toBe(event.phrase);
    for (const option of question?.options ?? []) {
      expect(isCompleteSentenceOption(option)).toBe(true);
    }
  });
});

describe("storySentencesFromText", () => {
  it("extracts only story-related sentences", () => {
    const sentences = storySentencesFromText(SAMPLE_PLOT);
    expect(sentences.length).toBeGreaterThan(2);
    expect(sentences.some((s) => s.includes("wizard"))).toBe(true);
    expect(sentences.some((s) => s.includes("published"))).toBe(false);
  });

  it("keeps sentences that contain Mr. or Mrs. abbreviations", () => {
    const sentences = storySentencesFromText(
      "Wilbur learns that Mr. Zuckerman plans to slaughter him for food. Charlotte promises to save Wilbur's life."
    );
    expect(
      sentences.some((s) =>
        s.includes("Wilbur learns that Mr. Zuckerman plans to slaughter him for food")
      )
    ).toBe(true);
    expect(sentences.some((s) => /^Zuckerman plans/i.test(s))).toBe(false);
  });

  it("keeps full Charlotte's Web sentences without splitting them", () => {
    const seed = getSeedPlot("Charlotte's Web", "E.B. White");
    expect(seed).toBeTruthy();

    const sentences = storySentencesFromText(seed!);
    expect(sentences.length).toBeGreaterThanOrEqual(10);
    expect(
      sentences.some((s) =>
        s.includes("Wilbur is a young pig who is born on the Arable farm")
      )
    ).toBe(true);
    expect(sentences.every((s) => !/^(who|when|but)\b/i.test(s))).toBe(true);
  });
});

describe("generateQuizQuestions story quality", () => {
  it("produces varied character/storyline questions for Sorcerer's Stone", async () => {
    const questions = await generateQuizQuestions(
      "Harry Potter and the Sorcerer's Stone",
      "J.K. Rowling"
    );
    expect(questions).toHaveLength(QUIZ_QUESTION_COUNT);

    const stems = questions.map((q) => q.question);
    expect(new Set(stems).size).toBe(stems.length);

    expect(
      questions.some((q) =>
        /why|who|what did|which statement|which early|which later/i.test(q.question)
      )
    ).toBe(true);

    for (const q of questions) {
      expect(q.question).not.toMatch(/Which of these plot events happens in the story\?/i);
      expect(q.options.filter((o) => o === q.correctAnswer)).toHaveLength(1);
      for (const option of q.options) {
        const looksLikeName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(option);
        if (!looksLikeName) {
          expect(isCompleteSentenceOption(option)).toBe(true);
        }
      }
    }
  });

  it("produces 10 questions with exclusive complete options for Charlotte's Web", async () => {
    const questions = await generateQuizQuestions("Charlotte's Web", "E.B. White");
    expect(questions).toHaveLength(QUIZ_QUESTION_COUNT);

    const correctAnswers = questions.map((q) => q.correctAnswer);
    expect(new Set(correctAnswers).size).toBe(QUIZ_QUESTION_COUNT);

    const allOptions = questions.flatMap((q) => q.options);
    expect(new Set(allOptions).size).toBe(allOptions.length);

    for (const q of questions) {
      expect(q.options.filter((o) => o === q.correctAnswer)).toHaveLength(1);
      for (const option of q.options) {
        const looksLikeName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(option);
        if (!looksLikeName) {
          expect(isCompleteSentenceOption(option)).toBe(true);
        }
      }
    }
  });

  it("builds readable who questions and never reuses options", async () => {
    const questions = await generateQuizQuestions(
      "The Remarkable Journey of Coyote Sunrise",
      "Dan Gemeinhart"
    );
    expect(questions).toHaveLength(QUIZ_QUESTION_COUNT);

    for (const q of questions) {
      expect(q.question).not.toMatch(/Which character the /i);
      expect(q.options).not.toContain("Along");
      expect(q.options).not.toContain("Oregon");
      if (q.question.startsWith("Who ")) {
        expect(q.question).toMatch(/^Who [a-z]/i);
      }
    }

    const allOptions = questions.flatMap((q) => q.options);
    expect(new Set(allOptions).size).toBe(allOptions.length);
  });

  it("builds a full complete-sentence quiz from a non-seed book plot", () => {
    const plot = `
Mira Vale is a twelve-year-old inventor who lives in a Victorian clocktower.
Mira builds a flying lantern because she wants to find her missing brother.
Theo the raven becomes Mira's loyal companion during the search.
The mayor hides the truth about the missing children of the city.
Mira and Theo travel through storm canals to reach the Night Market.
A clockwork fox guards the market gate and challenges Mira to a riddle.
Mira solves the fox's riddle because she remembers her brother's notebook code.
Theo steals the mayor's silver key during the parade.
The silver key opens a hidden workshop beneath the library.
Mira finds her brother trapped inside a broken weather machine.
Mira repairs the machine with spare gears from the tower.
The siblings escape together and expose the mayor's secret plan.
    `;

    const questions = generateQuizFromStoryText(plot, "Lantern of Vale");
    expect(questions).toHaveLength(QUIZ_QUESTION_COUNT);

    const corrects = questions.map((q) => q.correctAnswer);
    expect(new Set(corrects).size).toBe(QUIZ_QUESTION_COUNT);

    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o === q.correctAnswer)).toHaveLength(1);
      for (const option of q.options) {
        const looksLikeName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(option);
        if (!looksLikeName) {
          expect(isCompleteSentenceOption(option)).toBe(true);
        }
      }
    }
  });

  it("still builds a full quiz when the author name is slightly misspelled", async () => {
    const questions = await generateQuizQuestions("Train I Ride", "Paul Moiser");
    expect(questions).toHaveLength(QUIZ_QUESTION_COUNT);
    for (const q of questions) {
      expect(q.options.filter((o) => o === q.correctAnswer)).toHaveLength(1);
      for (const option of q.options) {
        const looksLikeName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(option);
        if (!looksLikeName) {
          expect(isCompleteSentenceOption(option)).toBe(true);
        }
      }
    }
  });
});
