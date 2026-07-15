import Link from "next/link";
import { Header } from "@/components/Header";
import { QuoteDisplay, getRandomQuote } from "@/components/QuoteDisplay";
import { BookSelector } from "@/components/BookSelector";
import { BookshelfDecor, WallShelves } from "@/components/BookshelfDecor";
import { getSession } from "@/lib/auth";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const quote = getRandomQuote();
  const allBooks = await store.getBooks();

  return (
    <main className="relative pb-10">
      <Header />
      <WallShelves />

      <section className="relative z-10 container mx-auto px-6 pt-4 pb-8 flex flex-col items-center text-center">
        <p className="home-brand mb-2 text-sm font-extrabold uppercase tracking-[0.2em] text-orange-btn">
          Pick a book. Ace the quiz.
        </p>
        <h1
          className="home-brand text-6xl sm:text-7xl md:text-8xl font-bold leading-none tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="bg-gradient-to-r from-orange-btn via-[#ff8a4c] to-gold bg-clip-text text-transparent">
            ReadGenie
          </span>
        </h1>
        <p className="home-brand mt-4 max-w-xl text-base md:text-lg font-semibold text-parchment/75">
          Climb the shelves, crush the quiz, and race your friends up the leaderboard.
        </p>
      </section>

      <section className="relative z-10 container mx-auto px-6 flex flex-col items-center gap-6">
        <div className="w-full max-w-3xl rounded-3xl bg-white/80 px-6 py-5 shadow-lg border border-white">
          <QuoteDisplay text={quote.text} author={quote.author} />
        </div>

        <div className="w-full max-w-2xl rounded-3xl bg-white/90 p-5 md:p-6 shadow-xl border-2 border-lemon/70">
          <p className="mb-3 text-center text-sm font-extrabold uppercase tracking-wider text-gold">
            Grab a book from the shelves
          </p>
          <BookSelector books={allBooks} isLoggedIn={!!session} />
        </div>

        <Link href="/leaderboard" className="btn-gold mt-1">
          View Leaderboard
        </Link>
      </section>

      <section className="relative z-10 mt-10 px-4">
        <div className="pointer-events-none absolute inset-x-0 -top-8 mx-auto h-24 max-w-4xl bg-gradient-to-b from-transparent to-white/30 blur-xl" />
        <BookshelfDecor className="opacity-95" />
      </section>
    </main>
  );
}
