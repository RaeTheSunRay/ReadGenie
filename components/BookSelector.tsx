"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBookLabel } from "@/lib/book-utils";

type Book = { id: number; title: string; author: string };

export function BookSelector({
  books,
  isLoggedIn,
}: {
  books: Book[];
  isLoggedIn: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAddBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        author: newAuthor.trim(),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add book");
      setLoading(false);
      return;
    }

    setNewTitle("");
    setNewAuthor("");
    setShowAdd(false);
    setLoading(false);
    router.refresh();
  }

  function handleStartQuiz() {
    if (!selectedId) return;
    router.push(`/quiz?bookId=${selectedId}`);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 w-full items-stretch sm:items-center">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="input-field flex-1 cursor-pointer"
          aria-label="Select a book"
        >
          <option value="">Choose a book...</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {formatBookLabel(book.title, book.author)}
            </option>
          ))}
        </select>

        {isLoggedIn && (
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="btn-orange whitespace-nowrap"
          >
            Add book title
          </button>
        )}
      </div>

      {showAdd && isLoggedIn && (
        <form onSubmit={handleAddBook} className="flex flex-col gap-3 w-full">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter book title"
            className="input-field"
            required
          />
          <input
            type="text"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            placeholder="Enter author name"
            className="input-field"
            required
          />
          <button type="submit" className="btn-gold self-end" disabled={loading}>
            {loading ? "..." : "Add"}
          </button>
        </form>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {selectedId && (
        <button onClick={handleStartQuiz} className="btn-orange text-lg px-8 py-3">
          Start Quiz
        </button>
      )}
    </div>
  );
}
