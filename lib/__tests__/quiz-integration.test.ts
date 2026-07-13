import { describe, it, expect } from "vitest";
import { generateQuizQuestions } from "@/lib/quiz-generator";
import { QUIZ_QUESTION_COUNT } from "@/lib/quiz-config";
import { store } from "@/lib/store";

const BOOKS_THAT_MUST_WORK = [
  "Harry Potter and the Philosopher's Stone",
  "The Hobbit",
  "Charlotte's Web",
  "Percy Jackson and the Lightning Thief",
  "Wonder",
  "The Remarkable Journey of Coyote Sunrise",
];

describe("quiz generation for all database books", () => {
  const books = store.getBooks();

  it("has books in the database", () => {
    expect(books.length).toBeGreaterThan(0);
  });

  for (const book of books) {
    it(`generates ${QUIZ_QUESTION_COUNT} questions for "${book.title}"`, async () => {
      const questions = await generateQuizQuestions(book.title, book.author);

      if (BOOKS_THAT_MUST_WORK.includes(book.title)) {
        expect(questions.length).toBe(QUIZ_QUESTION_COUNT);
      }

      if (questions.length > 0) {
        expect(questions).toHaveLength(QUIZ_QUESTION_COUNT);
        for (const q of questions) {
          expect(q.question.length).toBeGreaterThan(10);
          expect(q.options).toHaveLength(4);
          expect(q.options).toContain(q.correctAnswer);
          expect(q.question).not.toMatch(/".*"/);
          for (const option of q.options) {
            const looksLikeName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(option);
            if (!looksLikeName) {
              expect(option).toMatch(/^[A-Z]/);
              expect(option).toMatch(/[.!?]$/);
              expect(option).not.toMatch(
                /^(who|whom|whose|which|that|when|where|while|after|before|but|and)\b/i
              );
            }
          }
        }
      }
    });
  }
});

describe("quiz generation error scenario", () => {
  it("returns empty when no plot source exists", async () => {
    const questions = await generateQuizQuestions(
      "Completely Fake Book XYZ",
      "Nobody Author"
    );
    expect(questions).toHaveLength(0);
  });
});
