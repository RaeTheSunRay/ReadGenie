import Link from "next/link";
import { Header } from "@/components/Header";
import { BookFilter } from "@/components/BookFilter";
import { maskEmail } from "@/lib/auth";
import { formatBookLabel } from "@/lib/book-utils";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bookId?: string }>;
}) {
  const params = await searchParams;
  const bookIdFilter = params.bookId ? Number(params.bookId) : null;

  const allBooks = await store.getBooks();
  const entries = await store.getLeaderboard(bookIdFilter ?? undefined);

  return (
    <main>
      <Header />

      <div className="container mx-auto px-6 pb-16 max-w-3xl">
        <h1
          className="text-4xl text-gold text-center mb-8"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Leaderboard
        </h1>

        <BookFilter books={allBooks} selectedBookId={bookIdFilter} />

        {entries.length === 0 ? (
          <div className="card text-center text-parchment/70">
            <p>No quiz scores yet. Be the first to take a quiz!</p>
            <Link href="/" className="btn-orange inline-block mt-4">
              Take a Quiz
            </Link>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gold/30 text-gold text-sm">
                  <th className="py-3 pr-4">Rank</th>
                  <th className="py-3 pr-4">Player</th>
                  <th className="py-3 pr-4">Book</th>
                  <th className="py-3 pr-4">Score</th>
                  <th className="py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="border-b border-gold/10">
                    <td className="py-3 pr-4 text-gold font-bold">#{index + 1}</td>
                    <td className="py-3 pr-4">{maskEmail(entry.email)}</td>
                    <td className="py-3 pr-4">
                      {formatBookLabel(entry.bookTitle, entry.bookAuthor)}
                    </td>
                    <td className="py-3 pr-4">
                      {entry.score}/{entry.totalQuestions}
                    </td>
                    <td className="py-3 text-sm text-parchment/60">
                      {new Date(entry.completedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/" className="btn-gold">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
