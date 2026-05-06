"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  reviewCount: number;
  confidence: 0 | 1 | 2 | 3; // 0=new, 1=again, 2=good, 3=easy
  nextReview: number; // timestamp
  createdAt: number;
}

type FilterMode = "all" | "due" | "new";
type ViewMode = "browse" | "study";

// ─── Storage helpers ─────────────────────────────────────────────────────────

const STORAGE_KEY = "dsa-canvas:flashcards";

function loadCards(): Flashcard[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCards(cards: Flashcard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

// Simple spaced-repetition intervals (minutes)
const INTERVALS: Record<number, number> = {
  1: 10,
  2: 60 * 24,       // 1 day
  3: 60 * 24 * 4,   // 4 days
};

function nextReviewTime(confidence: 0 | 1 | 2 | 3): number {
  const mins = INTERVALS[confidence] ?? 1;
  return Date.now() + mins * 60 * 1000;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED: Omit<Flashcard, "id" | "reviewCount" | "confidence" | "nextReview" | "createdAt">[] = [
  {
    front: "Two Sum — optimal approach?",
    back: "Hash map. One pass: for each num, check if (target - num) is in the map. O(n) time, O(n) space.",
    category: "Arrays & Hashing",
    difficulty: "Easy",
  },
  {
    front: "What is a sliding window and when do you use it?",
    back: "A technique for contiguous subarrays/strings. Use when you need max/min/count within a range that can be defined by two pointers moving in the same direction.",
    category: "Sliding Window",
    difficulty: "Medium",
  },
  {
    front: "BFS vs DFS — when to choose which?",
    back: "BFS: shortest path in unweighted graphs, level-order traversal. DFS: cycle detection, topological sort, path existence, backtracking. BFS uses a queue; DFS uses a stack (or recursion).",
    category: "Graphs",
    difficulty: "Medium",
  },
  {
    front: "Dijkstra's algorithm — complexity?",
    back: "O((V + E) log V) with a min-heap. Works for non-negative weighted graphs. Use Bellman-Ford if negative edges exist.",
    category: "Graphs",
    difficulty: "Hard",
  },
  {
    front: "What is memoization?",
    back: "Caching the result of expensive function calls. A top-down DP technique. Store results in a hash map keyed by input state to avoid recomputation.",
    category: "Dynamic Programming",
    difficulty: "Easy",
  },
];

function seedIfEmpty(cards: Flashcard[]): Flashcard[] {
  if (cards.length > 0) return cards;
  return SEED.map((s, i) => ({
    ...s,
    id: `seed-${i}`,
    reviewCount: 0,
    confidence: 0,
    nextReview: Date.now(),
    createdAt: Date.now() - i * 1000,
  }));
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

const DIFF_COLORS: Record<string, string> = {
  Easy: "#4ade80",
  Medium: "#fb923c",
  Hard: "#f87171",
};

const CONFIDENCE_LABELS = ["New", "Again", "Good", "Easy"];
const CONFIDENCE_COLORS = ["var(--text-dim)", "#f87171", "#fb923c", "#4ade80"];

function Tag({ label, color }: { label: string; color?: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "Geist Mono, monospace",
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 4,
        background: color ? `${color}18` : "var(--surface-2)",
        color: color ?? "var(--text-muted)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

// ─── Card Form Modal ──────────────────────────────────────────────────────────

const CATEGORIES = [
  "Arrays & Hashing",
  "Sliding Window",
  "Two Pointers",
  "Stack",
  "Binary Search",
  "Linked List",
  "Trees",
  "Graphs",
  "Dynamic Programming",
  "Greedy",
  "Intervals",
  "Math",
  "Bit Manipulation",
  "System Design",
  "Behavioral",
  "Other",
];

function CardFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Flashcard>;
  onSave: (data: Pick<Flashcard, "front" | "back" | "category" | "difficulty">) => void;
  onClose: () => void;
}) {
  const [front, setFront] = useState(initial?.front ?? "");
  const [back, setBack] = useState(initial?.back ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Arrays & Hashing");
  const [difficulty, setDifficulty] = useState<Flashcard["difficulty"]>(
    initial?.difficulty ?? "Medium",
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          width: 560,
          maxWidth: "95vw",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              fontFamily: "Geist Mono, monospace",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {initial?.id ? "Edit Card" : "New Flashcard"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Front */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Front (Question)
          </label>
          <textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="What is the question or concept?"
            rows={3}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              padding: "10px 12px",
              color: "var(--text)",
              fontFamily: "Geist Mono, monospace",
              fontSize: 13,
              lineHeight: 1.6,
              resize: "none",
              outline: "none",
              width: "100%",
            }}
          />
        </div>

        {/* Back */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Back (Answer)
          </label>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Explain the answer clearly and concisely."
            rows={5}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              padding: "10px 12px",
              color: "var(--text)",
              fontFamily: "Geist Mono, monospace",
              fontSize: 13,
              lineHeight: 1.6,
              resize: "none",
              outline: "none",
              width: "100%",
            }}
          />
        </div>

        {/* Category + Difficulty row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 7,
                padding: "8px 10px",
                color: "var(--text)",
                fontFamily: "Geist Mono, monospace",
                fontSize: 12,
                outline: "none",
              }}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Flashcard["difficulty"])}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 7,
                padding: "8px 10px",
                color: DIFF_COLORS[difficulty],
                fontFamily: "Geist Mono, monospace",
                fontSize: 12,
                outline: "none",
              }}
            >
              {["Easy", "Medium", "Hard"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 7,
              padding: "7px 16px",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "Geist Mono, monospace",
              fontSize: 12,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!front.trim() || !back.trim()) return;
              onSave({ front: front.trim(), back: back.trim(), category, difficulty });
            }}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: 7,
              padding: "7px 20px",
              color: "#0f0e0d",
              cursor: "pointer",
              fontFamily: "Geist Mono, monospace",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Save Card
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Study Mode ───────────────────────────────────────────────────────────────

function StudyMode({
  cards,
  onRate,
  onExit,
}: {
  cards: Flashcard[];
  onRate: (id: string, confidence: 0 | 1 | 2 | 3) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  const card = cards[index];

  const rate = (confidence: 0 | 1 | 2 | 3) => {
    onRate(card.id, confidence);
    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  if (done) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div style={{ fontSize: 48 }}>🎉</div>
        <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 28, color: "var(--text)" }}>
          Session Complete
        </div>
        <div style={{ color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", fontSize: 13 }}>
          Reviewed {cards.length} card{cards.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={onExit}
          style={{
            marginTop: 8,
            background: "var(--accent)",
            border: "none",
            borderRadius: 8,
            padding: "10px 28px",
            color: "#0f0e0d",
            cursor: "pointer",
            fontFamily: "Geist Mono, monospace",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Back to Browse
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: 24,
      }}
    >
      {/* Progress */}
      <div style={{ width: "100%", maxWidth: 600 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)" }}>
            {index + 1} / {cards.length}
          </span>
          <button
            onClick={onExit}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "Geist Mono, monospace",
              fontSize: 11,
            }}
          >
            ✕ Exit
          </button>
        </div>
        <div style={{ height: 3, background: "var(--surface-2)", borderRadius: 2 }}>
          <div
            style={{
              height: "100%",
              width: `${((index + 1) / cards.length) * 100}%`,
              background: "var(--accent)",
              borderRadius: 2,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped((f) => !f)}
        style={{
          width: "100%",
          maxWidth: 600,
          minHeight: 280,
          background: "var(--surface)",
          border: `1px solid ${flipped ? "var(--accent-dim)" : "var(--border)"}`,
          borderRadius: 14,
          padding: 36,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          cursor: "pointer",
          transition: "border-color 0.2s, background 0.2s",
          position: "relative",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag label={card.category} />
          <Tag label={card.difficulty} color={DIFF_COLORS[card.difficulty]} />
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              fontFamily: "Geist Mono, monospace",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {flipped ? "Answer" : "Question — tap to reveal"}
          </span>
        </div>
        <div
          style={{
            fontFamily: flipped ? "Geist Mono, monospace" : "Instrument Serif, serif",
            fontSize: flipped ? 14 : 22,
            lineHeight: 1.6,
            color: "var(--text)",
            flex: 1,
          }}
        >
          {flipped ? card.back : card.front}
        </div>
      </div>

      {/* Rating buttons — only shown when flipped */}
      {flipped && (
        <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 600 }}>
          {([1, 2, 3] as const).map((conf) => (
            <button
              key={conf}
              onClick={() => rate(conf)}
              style={{
                flex: 1,
                padding: "10px 0",
                background: "var(--surface)",
                border: `1px solid ${CONFIDENCE_COLORS[conf]}44`,
                borderRadius: 8,
                color: CONFIDENCE_COLORS[conf],
                cursor: "pointer",
                fontFamily: "Geist Mono, monospace",
                fontSize: 12,
                fontWeight: 600,
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${CONFIDENCE_COLORS[conf]}18`;
                e.currentTarget.style.borderColor = CONFIDENCE_COLORS[conf];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface)";
                e.currentTarget.style.borderColor = `${CONFIDENCE_COLORS[conf]}44`;
              }}
            >
              {CONFIDENCE_LABELS[conf]}
            </button>
          ))}
        </div>
      )}

      {!flipped && (
        <div
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 11,
            color: "var(--text-dim)",
          }}
        >
          Click the card to reveal the answer
        </div>
      )}
    </div>
  );
}

// ─── Browse Mode ──────────────────────────────────────────────────────────────

function BrowseMode({
  cards,
  onAdd,
  onEdit,
  onDelete,
  onStartStudy,
}: {
  cards: Flashcard[];
  onAdd: () => void;
  onEdit: (card: Flashcard) => void;
  onDelete: (id: string) => void;
  onStartStudy: (filter: FilterMode) => void;
}) {
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterDiff, setFilterDiff] = useState<string>("All");
  const [search, setSearch] = useState("");

  const now = Date.now();
  const dueCards = cards.filter((c) => c.nextReview <= now);
  const newCards = cards.filter((c) => c.confidence === 0);

  const allCategories = ["All", ...Array.from(new Set(cards.map((c) => c.category)))];

  const filtered = cards.filter((c) => {
    if (filterCategory !== "All" && c.category !== filterCategory) return false;
    if (filterDiff !== "All" && c.difficulty !== filterDiff) return false;
    if (search && !c.front.toLowerCase().includes(search.toLowerCase()) && !c.back.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          background: "var(--surface-2)",
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards..."
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "6px 12px",
            color: "var(--text)",
            fontFamily: "Geist Mono, monospace",
            fontSize: 12,
            outline: "none",
            width: 200,
          }}
        />

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "6px 10px",
            color: "var(--text-muted)",
            fontFamily: "Geist Mono, monospace",
            fontSize: 12,
            outline: "none",
          }}
        >
          {allCategories.map((c) => <option key={c}>{c}</option>)}
        </select>

        {/* Diff filter */}
        <select
          value={filterDiff}
          onChange={(e) => setFilterDiff(e.target.value)}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "6px 10px",
            color: "var(--text-muted)",
            fontFamily: "Geist Mono, monospace",
            fontSize: 12,
            outline: "none",
          }}
        >
          {["All", "Easy", "Medium", "Hard"].map((d) => <option key={d}>{d}</option>)}
        </select>

        <div style={{ flex: 1 }} />

        {/* Study buttons */}
        {dueCards.length > 0 && (
          <button
            onClick={() => onStartStudy("due")}
            style={{
              background: "var(--accent-dim)",
              border: "none",
              borderRadius: 7,
              padding: "6px 14px",
              color: "var(--accent)",
              cursor: "pointer",
              fontFamily: "Geist Mono, monospace",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Review Due ({dueCards.length})
          </button>
        )}
        <button
          onClick={() => onStartStudy("all")}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "6px 14px",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontFamily: "Geist Mono, monospace",
            fontSize: 12,
          }}
        >
          Study All
        </button>
        <button
          onClick={onAdd}
          style={{
            background: "var(--accent)",
            border: "none",
            borderRadius: 7,
            padding: "6px 14px",
            color: "#0f0e0d",
            cursor: "pointer",
            fontFamily: "Geist Mono, monospace",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          + New Card
        </button>
      </div>

      {/* Stats bar */}
      <div
        style={{
          padding: "8px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: 20,
          flexShrink: 0,
        }}
      >
        {[
          { label: "Total", value: cards.length, color: "var(--text-muted)" },
          { label: "Due", value: dueCards.length, color: "#fb923c" },
          { label: "New", value: newCards.length, color: "#60a5fa" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 16, fontWeight: 600, color }}>
              {value}
            </span>
            <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Card grid */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 14,
          alignContent: "start",
        }}
      >
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: 60,
              color: "var(--text-dim)",
              fontFamily: "Geist Mono, monospace",
              fontSize: 13,
            }}
          >
            {cards.length === 0 ? "No flashcards yet. Add your first one!" : "No cards match your filters."}
          </div>
        )}

        {filtered.map((card) => {
          const isDue = card.nextReview <= now && card.confidence > 0;
          const isNew = card.confidence === 0;
          return (
            <div
              key={card.id}
              style={{
                background: "var(--surface)",
                border: `1px solid ${isDue ? "var(--accent-dim)" : "var(--border)"}`,
                borderRadius: 10,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                position: "relative",
              }}
            >
              {/* Tags row */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Tag label={card.category} />
                <Tag label={card.difficulty} color={DIFF_COLORS[card.difficulty]} />
                {isNew && <Tag label="New" color="#60a5fa" />}
                {isDue && <Tag label="Due" color="var(--accent)" />}
              </div>

              {/* Front */}
              <div
                style={{
                  fontFamily: "Instrument Serif, serif",
                  fontSize: 15,
                  color: "var(--text)",
                  lineHeight: 1.5,
                }}
              >
                {card.front}
              </div>

              {/* Back preview */}
              <div
                style={{
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 8,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {card.back}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 2 }}>
                <span
                  style={{
                    flex: 1,
                    fontFamily: "Geist Mono, monospace",
                    fontSize: 10,
                    color: CONFIDENCE_COLORS[card.confidence],
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {CONFIDENCE_LABELS[card.confidence]}
                </span>
                <button
                  onClick={() => onEdit(card)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "Geist Mono, monospace",
                    padding: "2px 6px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                >
                  edit
                </button>
                <button
                  onClick={() => onDelete(card.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "Geist Mono, monospace",
                    padding: "2px 6px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                >
                  del
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FlashcardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Flashcard | undefined>();

  useEffect(() => {
    setCards(seedIfEmpty(loadCards()));
  }, []);

  const persist = (updated: Flashcard[]) => {
    setCards(updated);
    saveCards(updated);
  };

  const handleAdd = (data: Pick<Flashcard, "front" | "back" | "category" | "difficulty">) => {
    const card: Flashcard = {
      ...data,
      id: `card-${Date.now()}`,
      reviewCount: 0,
      confidence: 0,
      nextReview: Date.now(),
      createdAt: Date.now(),
    };
    persist([card, ...cards]);
    setShowForm(false);
  };

  const handleEdit = (data: Pick<Flashcard, "front" | "back" | "category" | "difficulty">) => {
    persist(cards.map((c) => (c.id === editTarget?.id ? { ...c, ...data } : c)));
    setEditTarget(undefined);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    persist(cards.filter((c) => c.id !== id));
  };

  const handleRate = useCallback(
    (id: string, confidence: 0 | 1 | 2 | 3) => {
      persist(
        cards.map((c) =>
          c.id === id
            ? {
                ...c,
                confidence,
                reviewCount: c.reviewCount + 1,
                nextReview: nextReviewTime(confidence),
              }
            : c,
        ),
      );
    },
    [cards],
  );

  const startStudy = (filter: FilterMode) => {
    const now = Date.now();
    let pool: Flashcard[];
    if (filter === "due") pool = cards.filter((c) => c.nextReview <= now);
    else if (filter === "new") pool = cards.filter((c) => c.confidence === 0);
    else pool = [...cards];
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setStudyCards(pool);
    setViewMode("study");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 16px",
          height: 50,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 18,
            padding: "4px 6px",
            borderRadius: 4,
            lineHeight: 1,
          }}
          title="Back to dashboard"
        >
          ←
        </button>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <span
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          Flashcards
        </span>
        {viewMode === "study" && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 4,
              background: "var(--accent)18",
              color: "var(--accent)",
              fontFamily: "Geist Mono, monospace",
              fontWeight: 600,
            }}
          >
            Study Mode
          </span>
        )}
      </header>

      {/* Content */}
      {viewMode === "study" ? (
        <StudyMode
          cards={studyCards}
          onRate={handleRate}
          onExit={() => setViewMode("browse")}
        />
      ) : (
        <BrowseMode
          cards={cards}
          onAdd={() => { setEditTarget(undefined); setShowForm(true); }}
          onEdit={(card) => { setEditTarget(card); setShowForm(true); }}
          onDelete={handleDelete}
          onStartStudy={startStudy}
        />
      )}

      {/* Form modal */}
      {showForm && (
        <CardFormModal
          initial={editTarget}
          onSave={editTarget ? handleEdit : handleAdd}
          onClose={() => { setShowForm(false); setEditTarget(undefined); }}
        />
      )}
    </div>
  );
}