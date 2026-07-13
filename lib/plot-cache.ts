import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { plotCache } from "@/lib/db/schema";

function cacheKey(bookTitle: string, author: string): string {
  return `${bookTitle.trim().toLowerCase()}|${author.trim().toLowerCase()}`;
}

export async function getCachedPlot(
  bookTitle: string,
  author: string
): Promise<string | null> {
  try {
    const [row] = await getDb()
      .select()
      .from(plotCache)
      .where(eq(plotCache.cacheKey, cacheKey(bookTitle, author)))
      .limit(1);
    return row?.plotText ?? null;
  } catch {
    return null;
  }
}

export async function setCachedPlot(
  bookTitle: string,
  author: string,
  text: string
): Promise<void> {
  try {
    const key = cacheKey(bookTitle, author);
    await getDb()
      .insert(plotCache)
      .values({ cacheKey: key, plotText: text })
      .onConflictDoUpdate({
        target: plotCache.cacheKey,
        set: { plotText: text },
      });
  } catch {
    // Cache is optional; ignore write failures on cold starts.
  }
}
