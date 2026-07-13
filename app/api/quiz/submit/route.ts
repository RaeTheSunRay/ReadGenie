import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { formatBookLabel } from "@/lib/book-utils";
import { scoreQuiz, QuizQuestion } from "@/lib/quiz-utils";
import { store } from "@/lib/store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const { bookId, answers, questions } = await request.json();

  if (!bookId || !answers || !questions) {
    return NextResponse.json({ error: "Missing quiz data" }, { status: 400 });
  }

  const book = store.getBookById(bookId);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const fullQuestions: QuizQuestion[] = questions;
  const results = scoreQuiz(fullQuestions, answers);
  const score = results.filter((r) => r.isCorrect).length;

  store.createQuizAttempt(
    session.id,
    bookId,
    score,
    fullQuestions.length,
    results.map((r) => ({
      questionText: r.question,
      userAnswer: r.userAnswer,
      correctAnswer: r.correctAnswer,
      isCorrect: r.isCorrect,
    }))
  );

  return NextResponse.json({
    score,
    totalQuestions: fullQuestions.length,
    bookTitle: formatBookLabel(book.title, book.author),
    bookId: book.id,
    results,
  });
}
