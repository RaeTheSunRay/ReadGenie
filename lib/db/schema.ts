import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  addedByUserId: integer("added_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizAnswers = pgTable("quiz_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => quizAttempts.id),
  questionText: text("question_text").notNull(),
  userAnswer: text("user_answer").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
});

export const plotCache = pgTable("plot_cache", {
  id: serial("id").primaryKey(),
  cacheKey: varchar("cache_key", { length: 512 }).notNull().unique(),
  plotText: text("plot_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
