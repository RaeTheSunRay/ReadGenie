"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { QUIZ_QUESTION_COUNT } from "@/lib/quiz-config";

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
};

function QuizContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId");
  const router = useRouter();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bookTitle, setBookTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookId) {
      setError("No book selected");
      setLoading(false);
      return;
    }

    async function loadQuiz() {
      const res = await fetch(`/api/quiz?bookId=${bookId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load quiz");
        setLoading(false);
        return;
      }

      setQuestions(data.questions);
      setBookTitle(data.bookTitle);
      setLoading(false);
    }

    loadQuiz();
  }, [bookId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (questions.some((q) => !answers[q.id])) {
      setError(`Please answer all ${QUIZ_QUESTION_COUNT} questions`);
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: Number(bookId), answers, questions }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to submit quiz");
      setSubmitting(false);
      return;
    }

    sessionStorage.setItem("quizResults", JSON.stringify(data));
    router.push("/results");
  }

  if (loading) {
    return (
      <div className="text-center text-parchment/70 py-20">
        <p className="text-xl">Summoning questions from the literary realm...</p>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/" className="btn-orange">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <h1
        className="text-2xl text-gold text-center mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Quiz: {bookTitle}
      </h1>
      <p className="text-center text-parchment/60 text-sm mb-8">
        Answer all {QUIZ_QUESTION_COUNT} questions
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {questions.map((q, index) => (
          <fieldset key={q.id} className="space-y-3">
            <legend className="text-parchment font-medium text-lg">
              {index + 1}. {q.question}
            </legend>
            <div className="space-y-2 pl-2">
              {q.options.map((option) => (
                <label
                  key={option}
                  className={`flex items-center gap-3 p-3 rounded-md cursor-pointer border transition-colors ${
                    answers[q.id] === option
                      ? "border-gold bg-gold/10"
                      : "border-gold/20 hover:border-gold/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={option}
                    checked={answers[q.id] === option}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: option }))
                    }
                    className="accent-orange-btn"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          className="btn-orange w-full py-3 text-lg"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Quiz"}
        </button>
      </form>
    </div>
  );
}

export default function QuizPage() {
  return (
    <main>
      <div className="p-6">
        <Link href="/" className="text-gold/80 hover:text-gold text-sm tracking-widest uppercase">
          ← Back to Home
        </Link>
      </div>
      <div className="container mx-auto px-6 pb-16">
        <Suspense fallback={<p className="text-center py-20">Loading...</p>}>
          <QuizContent />
        </Suspense>
      </div>
    </main>
  );
}
