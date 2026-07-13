"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="p-6">
        <Link href="/" className="text-gold/80 hover:text-gold text-sm tracking-widest uppercase">
          ← Back to Home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="card w-full max-w-md">
          <h1
            className="text-3xl text-gold text-center mb-8"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Enter Username and Password
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm text-parchment/70 mb-1">
                Username (email)
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-parchment/70 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button type="submit" className="btn-orange w-full py-3" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/forgot-password" className="text-gold/80 hover:text-gold text-sm underline">
              Forgot username and password
            </Link>
          </div>

          <p className="mt-4 text-center text-parchment/60 text-sm">
            No account?{" "}
            <Link href="/signup" className="text-gold hover:underline">
              Sign-Up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
