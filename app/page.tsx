"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Types (mirrors your existing Problem type from @/lib/problems) ───────────

interface Problem {
  id: string;
  name: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  status?: "todo" | "attempted" | "solved";
  canvas?: {
    constraints: string;
    ideas: { approach: string; time: string; space: string }[];
    testCases: string;
    edgeCases: string;
    code: string;
    language: string;
    notes: string;
  };
}

// ─── Mock data helpers — replace with your actual store imports ───────────────
// These are fallback stubs so the dashboard compiles standalone.
// In your real app, import getProblems / saveProblems from @/lib/store

function getProblems(): Problem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("dsa-canvas:problems") ?? "[]"); } catch { return []; }
}

function saveProblem(p: Problem) {
  const all = getProblems();
  const idx = all.findIndex((x) => x.id === p.id);
  if (idx >= 0) all[idx] = p; else all.push(p);
  localStorage.setItem("dsa-canvas:problems", JSON.stringify(all));
}

function getFlashcardCount(): number {
  try { return JSON.parse(localStorage.getItem("dsa-canvas:flashcards") ?? "[]").length; } catch { return 0; }
}
function getDueFlashcardCount(): number {
  try {
    const cards = JSON.parse(localStorage.getItem("dsa-canvas:flashcards") ?? "[]");
    const now = Date.now();
    return cards.filter((c: any) => c.nextReview <= now).length;
  } catch { return 0; }
}
function getSDNoteCount(): number {
  try { return JSON.parse(localStorage.getItem("dsa-canvas:sd-notes") ?? "[]").length; } catch { return 0; }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFF_COLORS: Record<string, string> = {
  Easy: "#4ade80",
  Medium: "#fb923c",
  Hard: "#f87171",
};

const CATEGORIES = [
  "Arrays & Hashing", "Sliding Window", "Two Pointers", "Stack",
  "Binary Search", "Linked List", "Trees", "Graphs",
  "Dynamic Programming", "Greedy", "Intervals", "Math", "Bit Manipulation",
];

const LANGUAGES = ["python", "javascript", "typescript", "java", "cpp", "go", "rust", "kotlin"];

// ─── Add Problem Modal ────────────────────────────────────────────────────────

function AddProblemModal({ onSave, onClose }: { onSave: (p: Problem) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<Problem["difficulty"]>("Medium");
  const [category, setCategory] = useState("Arrays & Hashing");
  const [language, setLanguage] = useState("python");

  const save = () => {
    if (!name.trim()) return;
    const p: Problem = {
      id: `prob-${Date.now()}`,
      name: name.trim(),
      difficulty,
      category,
      status: "todo",
      canvas: {
        constraints: "", ideas: [{ approach: "", time: "", space: "" }],
        testCases: "", edgeCases: "", code: "", language, notes: "",
      },
    };
    onSave(p);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, width: 480, maxWidth: "95vw", padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Add Problem</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>Problem Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="e.g. Two Sum"
            autoFocus
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "9px 12px", color: "var(--text)", fontFamily: "Geist Mono, monospace", fontSize: 13, outline: "none", width: "100%" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Difficulty", value: difficulty, onChange: setDifficulty, options: ["Easy", "Medium", "Hard"] },
            { label: "Category", value: category, onChange: setCategory, options: CATEGORIES },
            { label: "Language", value: language, onChange: setLanguage, options: LANGUAGES },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
              <select
                value={value}
                onChange={(e) => (onChange as any)(e.target.value)}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 8px", color: "var(--text)", fontFamily: "Geist Mono, monospace", fontSize: 11, outline: "none" }}
              >
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "7px 16px", color: "var(--text-muted)", cursor: "pointer", fontFamily: "Geist Mono, monospace", fontSize: 12 }}>Cancel</button>
          <button onClick={save} style={{ background: "var(--accent)", border: "none", borderRadius: 7, padding: "7px 20px", color: "#0f0e0d", cursor: "pointer", fontFamily: "Geist Mono, monospace", fontSize: 12, fontWeight: 600 }}>Add Problem</button>
        </div>
      </div>
    </div>
  );
}

// ─── Problem row ──────────────────────────────────────────────────────────────

function ProblemRow({
  problem,
  onOpen,
  onStatusChange,
  onDelete,
}: {
  problem: Problem;
  onOpen: () => void;
  onStatusChange: (status: Problem["status"]) => void;
  onDelete: () => void;
}) {
  const status = problem.status ?? "todo";
  const statusIcon = status === "solved" ? "✓" : status === "attempted" ? "~" : "○";
  const statusColor = status === "solved" ? "#4ade80" : status === "attempted" ? "#fb923c" : "var(--text-dim)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto auto auto",
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: "1px solid var(--border)",
        gap: 12,
        transition: "background 0.1s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      onClick={onOpen}
    >
      {/* Status toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const next = status === "todo" ? "attempted" : status === "attempted" ? "solved" : "todo";
          onStatusChange(next);
        }}
        style={{
          background: "none",
          border: `1px solid ${statusColor}`,
          borderRadius: "50%",
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: statusColor,
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
        title="Toggle status"
      >
        {statusIcon}
      </button>

      {/* Name */}
      <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 13, color: "var(--text)", textDecoration: status === "solved" ? "line-through" : "none", opacity: status === "solved" ? 0.6 : 1 }}>
        {problem.name}
      </div>

      {/* Category */}
      <span style={{ fontSize: 11, fontFamily: "Geist Mono, monospace", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
        {problem.category}
      </span>

      {/* Difficulty */}
      <span style={{ fontSize: 11, fontFamily: "Geist Mono, monospace", fontWeight: 600, color: DIFF_COLORS[problem.difficulty], background: `${DIFF_COLORS[problem.difficulty]}18`, padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
        {problem.difficulty}
      </span>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "2px 4px" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
        title="Delete"
      >
        ×
      </button>
    </div>
  );
}

// ─── Navigation card ──────────────────────────────────────────────────────────

function NavCard({
  icon,
  title,
  description,
  badge,
  badgeColor,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 20px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 0.15s, background 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent-dim)";
        e.currentTarget.style.background = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--surface)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {badge && (
          <span
            style={{
              fontFamily: "Geist Mono, monospace",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 5,
              background: badgeColor ? `${badgeColor}18` : "var(--surface-2)",
              color: badgeColor ?? "var(--text-muted)",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
        {title}
      </div>
      <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filterDiff, setFilterDiff] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterCat, setFilterCat] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [sdCount, setSDCount] = useState(0);

  useEffect(() => {
    setProblems(getProblems());
    setFlashcardCount(getFlashcardCount());
    setDueCount(getDueFlashcardCount());
    setSDCount(getSDNoteCount());
  }, []);

  const persistUpdate = (updated: Problem[]) => {
    setProblems(updated);
    localStorage.setItem("dsa-canvas:problems", JSON.stringify(updated));
  };

  const handleAdd = (p: Problem) => {
    persistUpdate([p, ...problems]);
    setShowAdd(false);
  };

  const handleStatusChange = (id: string, status: Problem["status"]) => {
    persistUpdate(problems.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const handleDelete = (id: string) => {
    persistUpdate(problems.filter((p) => p.id !== id));
  };

  // Stats
  const solved = problems.filter((p) => p.status === "solved").length;
  const attempted = problems.filter((p) => p.status === "attempted").length;
  const totalByDiff = (d: string) => problems.filter((p) => p.difficulty === d).length;
  const solvedByDiff = (d: string) => problems.filter((p) => p.difficulty === d && p.status === "solved").length;

  // Filtered list
  const filtered = problems.filter((p) => {
    if (filterDiff !== "All" && p.difficulty !== filterDiff) return false;
    if (filterStatus !== "All") {
      const status = p.status ?? "todo";
      if (filterStatus !== status) return false;
    }
    if (filterCat !== "All" && p.category !== filterCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allCategories = ["All", ...Array.from(new Set(problems.map((p) => p.category)))];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 20px",
          height: 54,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "Instrument Serif, serif",
            fontSize: 18,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          dsa-canvas
        </span>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)" }}>
          job prep workspace
        </span>
        <div style={{ flex: 1 }} />
        {dueCount > 0 && (
          <button
            onClick={() => router.push("/flashcards")}
            style={{
              background: "var(--accent-glow)",
              border: "1px solid var(--accent-dim)",
              borderRadius: 7,
              padding: "5px 12px",
              color: "var(--accent)",
              cursor: "pointer",
              fontFamily: "Geist Mono, monospace",
              fontSize: 11,
              fontWeight: 600,
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            🔔 {dueCount} cards due
          </button>
        )}
      </header>

      {/* Main scrollable area */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

          {/* Tool nav cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <NavCard
              icon="🎴"
              title="Flashcards"
              description="Spaced repetition for patterns, algorithms, and concepts."
              badge={dueCount > 0 ? `${dueCount} due` : flashcardCount > 0 ? `${flashcardCount} cards` : undefined}
              badgeColor={dueCount > 0 ? "var(--accent)" : undefined}
              onClick={() => router.push("/flashcards")}
            />
            <NavCard
              icon="⚡"
              title="Quiz"
              description="MCQ quizzes with timers, explanations, and score tracking."
              onClick={() => router.push("/quiz")}
            />
            <NavCard
              icon="🏗️"
              title="System Design"
              description="Structured notes across requirements, API, data model, and trade-offs."
              badge={sdCount > 0 ? `${sdCount} notes` : undefined}
              onClick={() => router.push("/system-design")}
            />
          </div>

          {/* Stats strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 1,
              background: "var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            {[
              { label: "Total", value: problems.length, color: "var(--text)" },
              { label: "Solved", value: solved, color: "#4ade80" },
              { label: "Attempted", value: attempted, color: "#fb923c" },
              { label: "Easy ✓", value: `${solvedByDiff("Easy")}/${totalByDiff("Easy")}`, color: "#4ade80" },
              { label: "Med ✓", value: `${solvedByDiff("Medium")}/${totalByDiff("Medium")}`, color: "#fb923c" },
              { label: "Hard ✓", value: `${solvedByDiff("Hard")}/${totalByDiff("Hard")}`, color: "#f87171" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{ background: "var(--surface)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}
              >
                <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Problem list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {/* Problem list header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface-2)",
                flexWrap: "wrap",
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search problems..."
                style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px", color: "var(--text)", fontFamily: "Geist Mono, monospace", fontSize: 11, outline: "none", width: 180 }}
              />

              {/* Filters */}
              {[
                { value: filterDiff, onChange: setFilterDiff, options: ["All", "Easy", "Medium", "Hard"], label: "Diff" },
                { value: filterStatus, onChange: setFilterStatus, options: ["All", "todo", "attempted", "solved"], label: "Status" },
                { value: filterCat, onChange: setFilterCat, options: allCategories, label: "Category" },
              ].map(({ value, onChange, options, label }) => (
                <select
                  key={label}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 8px", color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", fontSize: 11, outline: "none" }}
                >
                  {options.map((o) => <option key={o}>{o}</option>)}
                </select>
              ))}

              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, color: "var(--text-dim)" }}>
                {filtered.length} problem{filtered.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setShowAdd(true)}
                style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "5px 14px", color: "#0f0e0d", cursor: "pointer", fontFamily: "Geist Mono, monospace", fontSize: 11, fontWeight: 700 }}
              >
                + Add
              </button>
            </div>

            {/* Column headings */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr auto auto auto",
                padding: "6px 16px",
                gap: 12,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {["", "Name", "Category", "Difficulty", ""].map((h, i) => (
                <span key={i} style={{ fontFamily: "Geist Mono, monospace", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {filtered.length === 0 && (
              <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "Geist Mono, monospace", fontSize: 12, color: "var(--text-dim)" }}>
                {problems.length === 0 ? "No problems yet. Add your first one!" : "No problems match your filters."}
              </div>
            )}
            {filtered.map((p) => (
              <ProblemRow
                key={p.id}
                problem={p}
                onOpen={() => router.push(`/canvas/${p.id}`)}
                onStatusChange={(status) => handleStatusChange(p.id, status)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {showAdd && <AddProblemModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}