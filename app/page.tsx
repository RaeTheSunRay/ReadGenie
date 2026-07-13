import Link from "next/link";
import { Header } from "@/components/Header";
import { QuoteDisplay, getRandomQuote } from "@/components/QuoteDisplay";
import { BookSelector } from "@/components/BookSelector";
import { getSession } from "@/lib/auth";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const quote = getRandomQuote();
  const allBooks = store.getBooks();

  return (
    <main>
      <Header />

      <div className="container mx-auto px-6 pb-16 flex flex-col items-center gap-10">
        <div className="text-center">
          <div className="inline-block relative">
            <h1
              className="text-5xl md:text-7xl font-bold text-gold tracking-wider"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ReadGenie
            </h1>
            <div className="absolute -top-2 -left-4 text-gold/30 text-2xl">✦</div>
            <div className="absolute -bottom-1 -right-4 text-gold/30 text-2xl">✦</div>
          </div>
          <p className="mt-3 text-parchment/60 text-sm tracking-widest uppercase">
            Your Literary Quest Awaits
          </p>
        </div>

        <div className="card w-full max-w-3xl">
          <QuoteDisplay text={quote.text} author={quote.author} />
        </div>

        <BookSelector
          books={allBooks}
          isLoggedIn={!!session}
        />

        <Link href="/leaderboard" className="btn-gold mt-4">
          View Leaderboard
        </Link>
      </div>
    </main>
  );
}
