import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="p-6">
        <Link href="/login" className="text-gold/80 hover:text-gold text-sm tracking-widest uppercase">
          ← Back to Login
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="card w-full max-w-md text-center">
          <h1
            className="text-2xl text-gold mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Forgot Username or Password?
          </h1>
          <p className="text-parchment/80 leading-relaxed">
            Please ask your teacher or librarian to help reset your account.
            They can help you create a new account with your school email.
          </p>
          <Link href="/login" className="btn-orange inline-block mt-8">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
