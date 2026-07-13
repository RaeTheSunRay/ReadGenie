import { describe, it, expect } from "vitest";
import { isValidEmail, maskEmail } from "@/lib/auth";
import { formatBookLabel } from "@/lib/book-utils";
import { scoreQuiz, shuffle } from "@/lib/quiz-utils";

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("student@school.com")).toBe(true);
    expect(isValidEmail("you@example.org")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
    expect(isValidEmail("@school.com")).toBe(false);
  });
});

describe("maskEmail", () => {
  it("masks the local part", () => {
    expect(maskEmail("john@school.com")).toBe("j***@school.com");
  });
});

describe("scoreQuiz", () => {
  const questions = [
    {
      id: "1",
      question: "Q1",
      options: ["A", "B"],
      correctAnswer: "A",
    },
    {
      id: "2",
      question: "Q2",
      options: ["C", "D"],
      correctAnswer: "D",
    },
  ];

  it("scores correct answers", () => {
    const results = scoreQuiz(questions, { "1": "A", "2": "D" });
    expect(results.every((r) => r.isCorrect)).toBe(true);
  });

  it("identifies wrong answers", () => {
    const results = scoreQuiz(questions, { "1": "B", "2": "D" });
    expect(results[0].isCorrect).toBe(false);
    expect(results[1].isCorrect).toBe(true);
  });
});

describe("formatBookLabel", () => {
  it("combines title and author", () => {
    expect(formatBookLabel("Wonder", "R.J. Palacio")).toBe(
      "Wonder by R.J. Palacio"
    );
  });
});

describe("shuffle", () => {
  it("returns same items", () => {
    const items = [1, 2, 3, 4];
    const shuffled = shuffle(items);
    expect(shuffled.sort()).toEqual(items.sort());
  });
});
