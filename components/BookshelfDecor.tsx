type BookSpec = {
  title: string;
  color: string;
  height: number;
  width: number;
  band?: "top" | "middle" | "bottom" | "none";
};

type WallShelfSpec = {
  id: string;
  side: "left" | "right";
  top: string;
  shelfWidth: number;
  books: BookSpec[];
  woodTone: string;
};

const BOOK_POOL: BookSpec[] = [
  { title: "Quest", color: "#ff6a3d", height: 78, width: 16, band: "top" },
  { title: "Magic", color: "#7c3aed", height: 58, width: 12, band: "middle" },
  { title: "Galaxy", color: "#2563eb", height: 92, width: 20, band: "bottom" },
  { title: "Paws", color: "#f59e0b", height: 50, width: 11, band: "none" },
  { title: "Storm", color: "#0f9e8f", height: 84, width: 18, band: "top" },
  { title: "Genie", color: "#ec4899", height: 70, width: 14, band: "middle" },
  { title: "Hero", color: "#ef4444", height: 96, width: 22, band: "bottom" },
  { title: "Map", color: "#14b8a6", height: 64, width: 13, band: "none" },
  { title: "Spark", color: "#6366f1", height: 76, width: 17, band: "top" },
  { title: "Moon", color: "#0891b2", height: 54, width: 12, band: "middle" },
  { title: "Camp", color: "#22c55e", height: 88, width: 19, band: "none" },
  { title: "Tide", color: "#0ea5e9", height: 60, width: 13, band: "top" },
];

const MAIN_BOOKS: BookSpec[] = [
  { title: "Quest", color: "#ff6a3d", height: 148, width: 28, band: "top" },
  { title: "Magic", color: "#7c3aed", height: 112, width: 18, band: "middle" },
  { title: "Galaxy", color: "#2563eb", height: 168, width: 34, band: "bottom" },
  { title: "Paws", color: "#f59e0b", height: 98, width: 16, band: "none" },
  { title: "Storm", color: "#0f9e8f", height: 156, width: 30, band: "top" },
  { title: "Genie", color: "#ec4899", height: 132, width: 22, band: "middle" },
  { title: "Hero", color: "#ef4444", height: 176, width: 36, band: "bottom" },
  { title: "Map", color: "#14b8a6", height: 120, width: 20, band: "none" },
  { title: "Spark", color: "#6366f1", height: 142, width: 26, band: "top" },
  { title: "Moon", color: "#0891b2", height: 104, width: 17, band: "middle" },
];

const WOOD_TONES = [
  "linear-gradient(90deg, #8f5728, #d9a86a 40%, #b57a42 75%, #6e3c14)",
  "linear-gradient(90deg, #6b3e1f, #c4925a 45%, #9a6434)",
  "linear-gradient(90deg, #a06838, #e2b57a 50%, #8b5429)",
  "linear-gradient(90deg, #5c3317, #b8884f 55%, #7a4a24)",
];

function pick<T>(items: T[], count: number): T[] {
  const copy = [...items];
  const chosen: T[] = [];
  while (chosen.length < count && copy.length > 0) {
    const index = Math.floor(Math.random() * copy.length);
    chosen.push(copy.splice(index, 1)[0]);
  }
  return chosen;
}

function scaleBook(book: BookSpec, factor: number): BookSpec {
  return {
    ...book,
    height: Math.round(book.height * factor),
    width: Math.max(10, Math.round(book.width * factor)),
  };
}

function buildWallShelves(): WallShelfSpec[] {
  const placements: Array<{ side: "left" | "right"; top: string }> = [
    { side: "left", top: "12%" },
    { side: "right", top: "22%" },
    { side: "left", top: "34%" },
    { side: "right", top: "48%" },
    { side: "left", top: "58%" },
    { side: "right", top: "70%" },
  ];

  return placements.map((placement, index) => {
    const bookCount = index === 0 ? 2 : 2 + Math.floor(Math.random() * 2);
    const scale = index === 0 ? 0.85 : 0.7 + Math.random() * 0.35;
    const books = pick(BOOK_POOL, bookCount).map((book) => scaleBook(book, scale));
    const gapTotal = Math.max(0, bookCount - 1) * 2;
    const shelfWidth = books.reduce((sum, book) => sum + book.width, 0) + gapTotal + 12;

    return {
      id: `wall-shelf-${index}`,
      side: placement.side,
      top: placement.top,
      shelfWidth,
      books,
      woodTone: WOOD_TONES[index % WOOD_TONES.length],
    };
  });
}

function BookSpine({ color, height, width, band = "none" }: BookSpec) {
  return (
    <div
      className="relative flex shrink-0"
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      aria-hidden="true"
    >
      <div
        className="relative z-10 flex h-full w-full items-end justify-center overflow-hidden border border-black/20 shadow-lg"
        style={{
          background: [
            "linear-gradient(90deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 18%, transparent 42%, rgba(0,0,0,0.18) 100%)",
            "linear-gradient(180deg, rgba(255,255,255,0.12), transparent 18%, transparent 82%, rgba(0,0,0,0.2))",
            color,
          ].join(", "),
          borderRadius: "3px 2px 2px 3px",
          boxShadow:
            "inset 2px 0 0 rgba(255,255,255,0.25), inset -2px 0 0 rgba(0,0,0,0.2), 2px 4px 8px rgba(22, 50, 79, 0.28)",
        }}
      >
        {band !== "none" && (
          <div
            className="absolute left-0 right-0 h-[8px] border-y border-black/15"
            style={{
              top: band === "top" ? "16%" : band === "middle" ? "46%" : "72%",
              background:
                "linear-gradient(90deg, rgba(255,215,120,0.9), rgba(255,236,180,0.95), rgba(212,160,60,0.85))",
            }}
          />
        )}
        <div className="absolute inset-x-[15%] top-1 h-0.5 rounded-full bg-white/25" />
        <div className="absolute inset-x-[15%] bottom-1 h-0.5 rounded-full bg-black/20" />
      </div>
    </div>
  );
}

function WallShelf({ shelf }: { shelf: WallShelfSpec }) {
  const isLeft = shelf.side === "left";

  return (
    <div
      className={`pointer-events-none absolute z-0 hidden sm:block ${isLeft ? "left-0" : "right-0"}`}
      style={{ top: shelf.top }}
      aria-hidden="true"
    >
      <div
        className={`relative flex flex-col ${isLeft ? "ml-1 items-start" : "mr-1 items-end"}`}
        style={{ width: `${shelf.shelfWidth}px` }}
      >
        <div className="flex w-full items-end justify-center gap-0.5">
          {shelf.books.map((book) => (
            <BookSpine key={`${shelf.id}-${book.title}-${book.width}`} {...book} />
          ))}
        </div>
        <div
          className="h-3 w-full rounded-sm border border-black/10"
          style={{
            background: shelf.woodTone,
            boxShadow: isLeft
              ? "4px 6px 10px rgba(22, 50, 79, 0.22), 0 4px 0 rgba(90, 45, 15, 0.3)"
              : "-4px 6px 10px rgba(22, 50, 79, 0.22), 0 4px 0 rgba(90, 45, 15, 0.3)",
          }}
        />
      </div>
    </div>
  );
}

export function WallShelves() {
  const shelves = buildWallShelves();

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ clipPath: "inset(16px 0 0 0)" }}
      aria-hidden="true"
    >
      {shelves.map((shelf) => (
        <WallShelf key={shelf.id} shelf={shelf} />
      ))}
    </div>
  );
}

function ForestCandle({
  height = 56,
  width = 20,
}: {
  height?: number;
  width?: number;
}) {
  return (
    <div
      className="relative flex flex-col items-center self-end"
      style={{ width: `${width + 8}px` }}
    >
      <div className="relative mb-0.5 h-4 w-2.5">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 70%, #ffe08a, #ff9f1c 55%, transparent 70%)",
            filter: "blur(0.5px)",
          }}
        />
        <div
          className="absolute left-1/2 top-0 h-3.5 w-2 -translate-x-1/2 rounded-full bg-gradient-to-b from-[#fff3b0] via-[#ffb703] to-[#fb8500]"
          style={{ clipPath: "ellipse(45% 55% at 50% 55%)" }}
        />
      </div>
      <div className="h-1 w-0.5 bg-[#2b2118]" />
      <div
        className="rounded-sm border border-black/10"
        style={{
          height: `${height}px`,
          width: `${width}px`,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.18), transparent 35%, rgba(0,0,0,0.2)), linear-gradient(180deg, #3d7a4a, #1f4d2c 70%, #163820)",
          boxShadow: "1px 3px 6px rgba(22,50,79,0.25)",
        }}
      />
      <div
        className="absolute left-1/2 h-3 w-1.5 -translate-x-1/2 rounded-b-full bg-[#4f9a5c]"
        style={{ bottom: `${height * 0.55}px` }}
      />
    </div>
  );
}

export function BookshelfDecor({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full max-w-5xl mx-auto ${className}`} aria-hidden="true">
      <div className="mb-5">
        <div className="relative flex min-h-[190px] items-end justify-center gap-1 px-3 pb-0 sm:gap-1.5">
          <div className="absolute bottom-0 left-3 z-10 flex items-end gap-1 sm:left-4">
            <ForestCandle height={36} width={13} />
            <ForestCandle height={78} width={24} />
            <ForestCandle height={52} width={17} />
          </div>
          <div className="flex items-end gap-1 sm:gap-1.5">
            {MAIN_BOOKS.map((book) => (
              <BookSpine key={book.title} {...book} />
            ))}
          </div>
          <div className="absolute bottom-0 right-3 z-10 flex items-end gap-1 sm:right-4">
            <ForestCandle height={68} width={22} />
            <ForestCandle height={40} width={14} />
          </div>
        </div>
        <div
          className="h-4 rounded-md border border-black/10"
          style={{
            background:
              "linear-gradient(90deg, #8f5728, #d9a86a 35%, #b57a42 70%, #6e3c14)",
            boxShadow: "0 10px 0 rgba(110, 60, 20, 0.28)",
          }}
        />
      </div>
    </div>
  );
}
