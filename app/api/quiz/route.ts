import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { formatBookLabel } from "@/lib/book-utils";
import { QUIZ_QUESTION_COUNT } from "@/lib/quiz-config";
import { generateQuizQuestions } from "@/lib/quiz-generator";
import { store } from "@/lib/store";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in to take a quiz" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookId = Number(searchParams.get("bookId"));

  if (!bookId) {
    return NextResponse.json({ error: "Book ID is required" }, { status: 400 });
  }

  const book = await store.getBookById(bookId);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const questions = await generateQuizQuestions(book.title, book.author);

  if (questions.length < QUIZ_QUESTION_COUNT) {
    return NextResponse.json(
      {
        error:
          "We could not find enough story questions for this book. Try another title or check the spelling of the book and author.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    bookTitle: formatBookLabel(book.title, book.author),
    bookId: book.id,
    questions,
  });
}
