"use client";

import { useRouter } from "next/navigation";
import { formatBookLabel } from "@/lib/book-utils";

type Book = { id: number; title: string; author: string };

export function BookFilter({
  books,
  selectedBookId,
}: {
  books: Book[];
  selectedBookId: number | null;
}) {
  const router = useRouter();

  return (
    <div className="mb-6 flex justify-center gap-2 items-center">
      <label htmlFor="bookFilter" className="text-parchment/70 text-sm">
        Filter by book:
      </label>
      <select
        id="bookFilter"
        value={selectedBookId?.toString() ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          router.push(val ? `/leaderboard?bookId=${val}` : "/leaderboard");
        }}
        className="input-field w-auto cursor-pointer"
      >
        <option value="">All books</option>
        {books.map((book) => (
          <option key={book.id} value={book.id}>
            {formatBookLabel(book.title, book.author)}
          </option>
        ))}
      </select>
    </div>
  );
}
