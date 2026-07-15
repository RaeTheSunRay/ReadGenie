import quotes from "@/lib/quotes.json";

export function getRandomQuote() {
  const index = Math.floor(Math.random() * quotes.length);
  return quotes[index];
}

export function QuoteDisplay({ text, author }: { text: string; author: string }) {
  return (
    <blockquote className="text-center max-w-2xl mx-auto leading-relaxed">
      <p className="text-lg md:text-xl font-semibold text-parchment/90">
        &ldquo;{text}&rdquo;
      </p>
      <footer className="mt-3 text-orange-btn text-sm font-extrabold">
        — {author}
      </footer>
    </blockquote>
  );
}
