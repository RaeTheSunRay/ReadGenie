import fs from "fs";
import path from "path";

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

type Database = {
  users: User[];
  books: Book[];
  quizAttempts: QuizAttempt[];
  quizAnswers: QuizAnswer[];
  nextIds: {
    users: number;
    books: number;
    quizAttempts: number;
    quizAnswers: number;
  };
};

const DB_PATH = path.join(process.cwd(), "data.json");

const STARTER_BOOKS: Pick<Book, "title" | "author">[] = [
  { title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling" },
  { title: "The Hobbit", author: "J.R.R. Tolkien" },
  { title: "Charlotte's Web", author: "E.B. White" },
  { title: "Percy Jackson and the Lightning Thief", author: "Rick Riordan" },
  { title: "Wonder", author: "R.J. Palacio" },
];

const STARTER_AUTHOR_MAP = Object.fromEntries(
  STARTER_BOOKS.map((book) => [book.title, book.author])
);

const KNOWN_AUTHORS: Record<string, string> = {
  "Train I Ride": "Andrea Beaty",
  ...STARTER_AUTHOR_MAP,
};

function defaultDb(): Database {
  return {
    users: [],
    books: STARTER_BOOKS.map((book, i) => ({
      id: i + 1,
      title: book.title,
      author: book.author,
      createdAt: new Date().toISOString(),
    })),
    quizAttempts: [],
    quizAnswers: [],
    nextIds: {
      users: 1,
      books: STARTER_BOOKS.length + 1,
      quizAttempts: 1,
      quizAnswers: 1,
    },
  };
}

function migrateBook(book: Book & { author?: string }): Book {
  const knownAuthor = KNOWN_AUTHORS[book.title];
  if (book.author && book.author !== "Unknown Author") {
    return book as Book;
  }
  return { ...book, author: knownAuthor ?? book.author ?? "Unknown Author" };
}

function readDb(): Database {
  if (!fs.existsSync(DB_PATH)) {
    const db = defaultDb();
    writeDb(db);
    return db;
  }

  const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as Database;
  const migratedBooks = raw.books.map(migrateBook);
  const needsSave = raw.books.some((book, i) => {
    const migrated = migratedBooks[i];
    return book.author !== migrated.author;
  });

  if (needsSave) {
    writeDb({ ...raw, books: migratedBooks });
  }

  return { ...raw, books: migratedBooks };
}

function writeDb(db: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export const store = {
  getUsers() {
    return readDb().users;
  },

  getUserByEmail(email: string) {
    return readDb().users.find((u) => u.email === email.toLowerCase()) ?? null;
  },

  createUser(email: string, passwordHash: string): User {
    const db = readDb();
    const user: User = {
      id: db.nextIds.users++,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    writeDb(db);
    return user;
  },

  getBooks() {
    return readDb().books.sort((a, b) =>
      a.title.localeCompare(b.title) || a.author.localeCompare(b.author)
    );
  },

  getBookById(id: number) {
    return readDb().books.find((b) => b.id === id) ?? null;
  },

  createBook(title: string, author: string, addedByUserId?: number): Book {
    const db = readDb();
    const book: Book = {
      id: db.nextIds.books++,
      title,
      author,
      addedByUserId,
      createdAt: new Date().toISOString(),
    };
    db.books.push(book);
    writeDb(db);
    return book;
  },

  bookExists(title: string, author: string) {
    return readDb().books.some(
      (b) =>
        b.title.toLowerCase() === title.toLowerCase() &&
        b.author.toLowerCase() === author.toLowerCase()
    );
  },

  createQuizAttempt(
    userId: number,
    bookId: number,
    score: number,
    totalQuestions: number,
    answers: Omit<QuizAnswer, "id" | "attemptId">[]
  ): QuizAttempt {
    const db = readDb();
    const attempt: QuizAttempt = {
      id: db.nextIds.quizAttempts++,
      userId,
      bookId,
      score,
      totalQuestions,
      completedAt: new Date().toISOString(),
    };
    db.quizAttempts.push(attempt);

    for (const answer of answers) {
      db.quizAnswers.push({
        id: db.nextIds.quizAnswers++,
        attemptId: attempt.id,
        ...answer,
      });
    }

    writeDb(db);
    return attempt;
  },

  getLeaderboard(bookId?: number) {
    const db = readDb();
    let attempts = [...db.quizAttempts];

    if (bookId) {
      attempts = attempts.filter((a) => a.bookId === bookId);
    }

    return attempts
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (
          new Date(b.completedAt).getTime() -
          new Date(a.completedAt).getTime()
        );
      })
      .slice(0, 50)
      .map((attempt) => {
        const user = db.users.find((u) => u.id === attempt.userId);
        const book = db.books.find((b) => b.id === attempt.bookId);
        return {
          score: attempt.score,
          totalQuestions: attempt.totalQuestions,
          completedAt: attempt.completedAt,
          email: user?.email ?? "unknown",
          bookTitle: book?.title ?? "Unknown",
          bookAuthor: book?.author ?? "Unknown",
        };
      });
  },
};
