"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QuizResult = {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

type StoredResults = {
  score: number;
  totalQuestions: number;
  bookTitle: string;
  bookId: number;
  results: QuizResult[];
};

export default function ResultsPage() {
  const [data, setData] = useState<StoredResults | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("quizResults");
    if (!stored) {
      router.push("/");
      return;
    }
    setData(JSON.parse(stored));
  }, [router]);

  if (!data) {
    return <p className="text-center py-20 text-parchment/70">Loading results...</p>;
  }

  return (
    <main>
      <div className="p-6">
        <Link href="/" className="text-gold/80 hover:text-gold text-sm tracking-widest uppercase">
          ← Back to Home
        </Link>
      </div>

      <div className="container mx-auto px-6 pb-16 max-w-2xl">
        <div className="card text-center mb-8">
          <h1
            className="text-3xl text-gold mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Quiz Complete!
          </h1>
          <p className="text-parchment/70">{data.bookTitle}</p>
          <p className="text-5xl font-bold text-gold mt-4">
            {data.score} / {data.totalQuestions}
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl text-gold text-center mb-4">Your Summary</h2>
          {data.results.map((result, i) => (
            <div
              key={i}
              className={`card border-l-4 ${
                result.isCorrect ? "border-l-green-500" : "border-l-red-500"
              }`}
            >
              <p className="font-medium mb-2">
                {result.isCorrect ? "✓ Correct" : "✗ Incorrect"}
              </p>
              <p className="text-parchment/90 mb-2">{result.question}</p>
              {!result.isCorrect && (
                <div className="text-sm space-y-1">
                  <p className="text-red-300">Your answer: {result.userAnswer || "(none)"}</p>
                  <p className="text-green-300">Correct answer: {result.correctAnswer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href={`/quiz?bookId=${data.bookId}`} className="btn-orange text-center">
            Try Again
          </Link>
          <Link href="/leaderboard" className="btn-gold text-center">
            Leaderboard
          </Link>
          <Link href="/" className="btn-gold text-center">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
