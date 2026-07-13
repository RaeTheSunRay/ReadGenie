import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { store } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await store.getBooks());
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const { title, author } = await request.json();

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Book title is required" }, { status: 400 });
  }

  if (!author || typeof author !== "string" || !author.trim()) {
    return NextResponse.json({ error: "Author is required" }, { status: 400 });
  }

  const trimmedTitle = title.trim();
  const trimmedAuthor = author.trim();

  if (await store.bookExists(trimmedTitle, trimmedAuthor)) {
    return NextResponse.json(
      { error: "This book and author already exist" },
      { status: 409 }
    );
  }

  const book = await store.createBook(trimmedTitle, trimmedAuthor, session.id);
  return NextResponse.json(book);
}
