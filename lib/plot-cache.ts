import fs from "fs";
import path from "path";

const CACHE_PATH = path.join(process.cwd(), "plot-cache.json");

type PlotCache = Record<string, string>;

function cacheKey(bookTitle: string, author: string): string {
  return `${bookTitle.trim().toLowerCase()}|${author.trim().toLowerCase()}`;
}

function readCache(): PlotCache {
  if (!fs.existsSync(CACHE_PATH)) return {};
  return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")) as PlotCache;
}

function writeCache(cache: PlotCache): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

export function getCachedPlot(bookTitle: string, author: string): string | null {
  const cache = readCache();
  return cache[cacheKey(bookTitle, author)] ?? null;
}

export function setCachedPlot(
  bookTitle: string,
  author: string,
  text: string
): void {
  const cache = readCache();
  cache[cacheKey(bookTitle, author)] = text;
  writeCache(cache);
}
