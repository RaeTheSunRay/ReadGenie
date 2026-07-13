import Link from "next/link";
import { getSession } from "@/lib/auth";

export async function Header() {
  const session = await getSession();

  return (
    <header className="flex justify-between items-center p-6">
      <Link href="/" className="text-gold/80 hover:text-gold text-sm tracking-widest uppercase">
        Home
      </Link>
      <div className="flex gap-3">
        {session ? (
          <>
            <span className="text-parchment/70 text-sm self-center hidden sm:inline">
              {session.email}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="btn-gold text-sm">
                Logout
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="btn-orange text-sm">
              Login
            </Link>
            <Link href="/signup" className="btn-orange text-sm">
              Sign-Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
