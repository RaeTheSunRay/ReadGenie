import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { books, quizAnswers, quizAttempts, users } from "@/lib/db/schema";

export type User = {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type Book = {
  id: number;
  title: string;
  author: string;
  addedByUserId?: number;
  createdAt: string;
};

export type QuizAttempt = {
  id: number;
  userId: number;
  bookId: number;
  score: number;
  totalQuestions: number;
  completedAt: string;
};

export type QuizAnswer = {
  id: number;
  attemptId: number;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export const STARTER_BOOKS: Pick<Book, "title" | "author">[] = [
  { title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling" },
  { title: "The Hobbit", author: "J.R.R. Tolkien" },
  { title: "Charlotte's Web", author: "E.B. White" },
  { title: "Percy Jackson and the Lightning Thief", author: "Rick Riordan" },
  { title: "Wonder", author: "R.J. Palacio" },
];

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

let seedPromise: Promise<void> | null = null;

async function ensureStarterBooks(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      for (const book of STARTER_BOOKS) {
        const [existing] = await getDb()
          .select({ id: books.id })
          .from(books)
          .where(
            and(
              sql`lower(${books.title}) = ${book.title.toLowerCase()}`,
              sql`lower(${books.author}) = ${book.author.toLowerCase()}`
            )
          )
          .limit(1);

        if (existing) continue;

        try {
          await getDb().insert(books).values({
            title: book.title,
            author: book.author,
          });
        } catch {
          // Another instance may have inserted the same starter book.
        }
      }
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }

  await seedPromise;
}

export const store = {
  async getUsers(): Promise<User[]> {
    await ensureStarterBooks();
    const rows = await getDb().select().from(users);
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      createdAt: toIso(row.createdAt),
    }));
  },

  async getUserByEmail(email: string): Promise<User | null> {
    await ensureStarterBooks();
    const [row] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      createdAt: toIso(row.createdAt),
    };
  },

  async createUser(email: string, passwordHash: string): Promise<User> {
    await ensureStarterBooks();
    const [row] = await getDb()
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
      })
      .returning();

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      createdAt: toIso(row.createdAt),
    };
  },

  async getBooks(): Promise<Book[]> {
    await ensureStarterBooks();
    const rows = await getDb().select().from(books).orderBy(books.title, books.author);
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      addedByUserId: row.addedByUserId ?? undefined,
      createdAt: toIso(row.createdAt),
    }));
  },

  async getBookById(id: number): Promise<Book | null> {
    await ensureStarterBooks();
    const [row] = await getDb().select().from(books).where(eq(books.id, id)).limit(1);
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      addedByUserId: row.addedByUserId ?? undefined,
      createdAt: toIso(row.createdAt),
    };
  },

  async createBook(
    title: string,
    author: string,
    addedByUserId?: number
  ): Promise<Book> {
    await ensureStarterBooks();
    const [row] = await getDb()
      .insert(books)
      .values({
        title,
        author,
        addedByUserId: addedByUserId ?? null,
      })
      .returning();

    return {
      id: row.id,
      title: row.title,
      author: row.author,
      addedByUserId: row.addedByUserId ?? undefined,
      createdAt: toIso(row.createdAt),
    };
  },

  async bookExists(title: string, author: string): Promise<boolean> {
    await ensureStarterBooks();
    const [row] = await getDb()
      .select({ id: books.id })
      .from(books)
      .where(
        and(
          sql`lower(${books.title}) = ${title.toLowerCase()}`,
          sql`lower(${books.author}) = ${author.toLowerCase()}`
        )
      )
      .limit(1);

    return !!row;
  },

  async createQuizAttempt(
    userId: number,
    bookId: number,
    score: number,
    totalQuestions: number,
    answers: Omit<QuizAnswer, "id" | "attemptId">[]
  ): Promise<QuizAttempt> {
    await ensureStarterBooks();

    const [attempt] = await getDb()
      .insert(quizAttempts)
      .values({
        userId,
        bookId,
        score,
        totalQuestions,
      })
      .returning();

    if (answers.length > 0) {
      await getDb().insert(quizAnswers).values(
        answers.map((answer) => ({
          attemptId: attempt.id,
          questionText: answer.questionText,
          userAnswer: answer.userAnswer,
          correctAnswer: answer.correctAnswer,
          isCorrect: answer.isCorrect,
        }))
      );
    }

    return {
      id: attempt.id,
      userId: attempt.userId,
      bookId: attempt.bookId,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      completedAt: toIso(attempt.completedAt),
    };
  },

  async getLeaderboard(bookId?: number) {
    await ensureStarterBooks();

    const rows = await getDb()
      .select({
        score: quizAttempts.score,
        totalQuestions: quizAttempts.totalQuestions,
        completedAt: quizAttempts.completedAt,
        email: users.email,
        bookTitle: books.title,
        bookAuthor: books.author,
      })
      .from(quizAttempts)
      .innerJoin(users, eq(users.id, quizAttempts.userId))
      .innerJoin(books, eq(books.id, quizAttempts.bookId))
      .where(bookId ? eq(quizAttempts.bookId, bookId) : undefined)
      .orderBy(desc(quizAttempts.score), desc(quizAttempts.completedAt))
      .limit(50);

    return rows.map((row) => ({
      score: row.score,
      totalQuestions: row.totalQuestions,
      completedAt: toIso(row.completedAt),
      email: row.email,
      bookTitle: row.bookTitle,
      bookAuthor: row.bookAuthor,
    }));
  },
};
