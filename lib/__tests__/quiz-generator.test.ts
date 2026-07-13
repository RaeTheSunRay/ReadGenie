import { describe, it, expect } from "vitest";
import {
  buildFalseDistractors,
  buildStoryContext,
  extractEventPhrase,
  generateQuizQuestions,
  isStorySentence,
  makePlotQuestion,
  makeTimelineQuestion,
  storySentencesFromText,
} from "@/lib/quiz-generator";
import { getSeedPlot } from "@/lib/seed-plots";
import { QUIZ_QUESTION_COUNT } from "@/lib/quiz-config";

const SAMPLE_PLOT = `
Harry Potter is a young orphan who lives with his aunt and uncle. He discovers he is a wizard on his eleventh birthday. Harry attends Hogwarts School of Witchcraft and Wizardry. He meets his best friends Ron and Hermione on the train journey. The trio uncovers a secret involving the Sorcerer's Stone. Harry must face the dark wizard who killed his parents.
The novel was published in 1997 and became a bestseller.
After years of living with the Dursleys, Harry finally learns the truth about his past. Later in the story, he confronts the villain in the school dungeons.
`;

function isCompleteSentenceOption(option: string): boolean {
  return (
    /^[A-Z]/.test(option) &&
    /[.!?]$/.test(option) &&
    !/^(who|whom|whose|which|that|when|where|while|after|before|but|and)\b/i.test(
      option
    ) &&
    option.split(/\s+/).length >= 5
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

describe("makePlotQuestion", () => {
  it("uses one true event and false distractors as options", () => {
    const context = buildStoryContext(SAMPLE_PLOT, "Harry Potter");
    const distractors = buildFalseDistractors(
      context.eventPhrases,
      context.characters
    );
    const event = context.eventPhrases[0];
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
  it("uses complete sentences with unused false distractors", () => {
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
    expect(question?.question).toContain("timeline");
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

describe("generateQuizQuestions for Charlotte's Web", () => {
  it("produces 10 questions with exclusive complete-sentence options", async () => {
    const questions = await generateQuizQuestions("Charlotte's Web", "E.B. White");
    expect(questions).toHaveLength(QUIZ_QUESTION_COUNT);

    const correctAnswers = questions.map((q) => q.correctAnswer);
    expect(new Set(correctAnswers).size).toBe(QUIZ_QUESTION_COUNT);

    const allOptions = questions.flatMap((q) => q.options);
    expect(new Set(allOptions).size).toBe(allOptions.length);

    for (const q of questions) {
      expect(q.question).not.toMatch(/Which character the /i);
      for (const option of q.options) {
        const looksLikeName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(option);
        if (!looksLikeName) {
          expect(isCompleteSentenceOption(option)).toBe(true);
        }
      }
    }
  });
});

describe("character question wording", () => {
  it("builds readable which-character questions and never reuses options", async () => {
    const questions = await generateQuizQuestions(
      "The Remarkable Journey of Coyote Sunrise",
      "Dan Gemeinhart"
    );
    expect(questions).toHaveLength(QUIZ_QUESTION_COUNT);

    for (const q of questions) {
      expect(q.question).not.toMatch(/Which character the /i);
      expect(q.options).not.toContain("Along");
      expect(q.options).not.toContain("Oregon");
      if (q.question.startsWith("Which character ")) {
        expect(q.question).toMatch(
          /^Which character (is|was|has|helps|learns|plans|changes|becomes|meets|picks|digs|travels|keeps)\b/i
        );
      }
    }

    const allOptions = questions.flatMap((q) => q.options);
    expect(new Set(allOptions).size).toBe(allOptions.length);
  });
});
