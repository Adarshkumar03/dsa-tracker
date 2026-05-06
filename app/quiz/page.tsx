"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

interface QuizResult {
  questionId: string;
  selectedIndex: number | null;
  correct: boolean;
  timeMs: number;
}

type QuizState = "config" | "active" | "review";

// ─── Question Bank ────────────────────────────────────────────────────────────

const QUESTION_BANK: QuizQuestion[] = [
  {
    id: "q1",
    category: "Arrays & Hashing",
    difficulty: "Easy",
    question: "What is the time complexity of inserting into a hash map on average?",
    options: ["O(log n)", "O(n)", "O(1)", "O(n log n)"],
    correctIndex: 2,
    explanation: "Hash maps achieve O(1) average-case insertions by computing a hash of the key and storing at the resulting index. Collisions make worst-case O(n) but this is rare with a good hash function.",
  },
  {
    id: "q2",
    category: "Sliding Window",
    difficulty: "Medium",
    question: "Which data structure is most commonly used to track characters in a sliding window substring problem?",
    options: ["Stack", "Hash Map / frequency array", "Min-Heap", "Trie"],
    correctIndex: 1,
    explanation: "A hash map (or fixed-size array for ASCII) lets you track character frequencies in O(1) per operation, making window expand/shrink efficient.",
  },
  {
    id: "q3",
    category: "Trees",
    difficulty: "Easy",
    question: "What is the height of a balanced binary tree with n nodes?",
    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    correctIndex: 1,
    explanation: "A balanced binary tree has O(log n) height because each level roughly doubles the number of nodes. This is why BST operations are O(log n) when balanced.",
  },
  {
    id: "q4",
    category: "Graphs",
    difficulty: "Medium",
    question: "Which algorithm finds the shortest path in an unweighted graph?",
    options: ["Dijkstra's", "Bellman-Ford", "BFS", "DFS"],
    correctIndex: 2,
    explanation: "BFS explores level-by-level, guaranteeing the shortest path (in terms of edge count) in unweighted graphs. Dijkstra's handles weighted graphs with non-negative edges.",
  },
  {
    id: "q5",
    category: "Dynamic Programming",
    difficulty: "Hard",
    question: "In the 0/1 Knapsack problem, what is the space-optimized complexity?",
    options: ["O(n × W)", "O(W)", "O(n)", "O(n²)"],
    correctIndex: 1,
    explanation: "By iterating backwards through the capacity dimension and reusing a 1D DP array, you reduce space from O(n×W) to O(W). The key is iterating capacity from W down to the item weight.",
  },
  {
    id: "q6",
    category: "Graphs",
    difficulty: "Hard",
    question: "Topological sort can only be performed on which type of graph?",
    options: ["Undirected acyclic graph", "Directed cyclic graph", "Directed acyclic graph (DAG)", "Any weighted graph"],
    correctIndex: 2,
    explanation: "Topological sort requires a Directed Acyclic Graph (DAG). If cycles exist, no valid topological ordering is possible (you can detect this by checking if all nodes were visited in Kahn's algorithm).",
  },
  {
    id: "q7",
    category: "Binary Search",
    difficulty: "Easy",
    question: "What is the time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correctIndex: 1,
    explanation: "Binary search halves the search space each iteration, giving O(log n). The key precondition is that the array must be sorted.",
  },
  {
    id: "q8",
    category: "Linked List",
    difficulty: "Medium",
    question: "To detect a cycle in a linked list, the optimal algorithm is:",
    options: ["Use a hash set to track visited nodes — O(n) space", "Floyd's Cycle Detection (slow/fast pointers) — O(1) space", "Sort the list then check for duplicates", "Reverse the list and compare"],
    correctIndex: 1,
    explanation: "Floyd's Cycle Detection uses two pointers (slow moves 1 step, fast moves 2). If they meet, there's a cycle. This is O(n) time and O(1) space — better than the hash set approach.",
  },
  {
    id: "q9",
    category: "Trees",
    difficulty: "Medium",
    question: "Which traversal visits nodes in sorted order for a BST?",
    options: ["Pre-order", "Post-order", "In-order", "Level-order (BFS)"],
    correctIndex: 2,
    explanation: "In-order traversal (Left → Root → Right) visits BST nodes in ascending sorted order. This property is often used to validate BSTs or retrieve sorted elements.",
  },
  {
    id: "q10",
    category: "Greedy",
    difficulty: "Hard",
    question: "Greedy algorithms are guaranteed to find the global optimum when:",
    options: [
      "The problem has overlapping subproblems",
      "The problem exhibits the greedy-choice property and optimal substructure",
      "The input is sorted",
      "The problem has at most n² states",
    ],
    correctIndex: 1,
    explanation: "A greedy algorithm works when the problem has (1) greedy-choice property: a locally optimal choice leads to a globally optimal solution, and (2) optimal substructure: an optimal solution contains optimal solutions to subproblems.",
  },
  {
    id: "q11",
    category: "Stack",
    difficulty: "Easy",
    question: "Which problem is a classic application of a monotonic stack?",
    options: ["Lowest Common Ancestor", "Next Greater Element", "Shortest Path", "Cycle Detection"],
    correctIndex: 1,
    explanation: "Monotonic stacks efficiently solve 'Next Greater/Smaller Element' problems in O(n) by maintaining a stack of elements in monotonically increasing or decreasing order.",
  },
  {
    id: "q12",
    category: "System Design",
    difficulty: "Hard",
    question: "In the CAP theorem, a distributed system can guarantee at most how many of the three properties simultaneously?",
    options: ["1", "2", "3", "All 3 with eventual consistency"],
    correctIndex: 1,
    explanation: "CAP theorem (Consistency, Availability, Partition Tolerance) states you can only guarantee 2 out of 3 simultaneously. In practice, partition tolerance is required in distributed systems, so you choose between CP or AP.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFF_COLORS: Record<string, string> = {
  Easy: "#4ade80",
  Medium: "#fb923c",
  Hard: "#f87171",
};

const ALL_CATEGORIES = Array.from(new Set(QUESTION_BANK.map((q) => q.category)));

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

// ─── Config Screen ────────────────────────────────────────────────────────────

function ConfigScreen({
  onStart,
}: {
  onStart: (questions: QuizQuestion[], timeLimitSecs: number | null) => void;
}) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(ALL_CATEGORIES);
  const [selectedDiff, setSelectedDiff] = useState<string[]>(["Easy", "Medium", "Hard"]);
  const [count, setCount] = useState(10);
  const [timed, setTimed] = useState(true);
  const [timeSecs, setTimeSecs] = useState(30);

  const toggleCat = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };
  const toggleDiff = (d: string) => {
    setSelectedDiff((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const pool = QUESTION_BANK.filter(
    (q) => selectedCategories.includes(q.category) && selectedDiff.includes(q.difficulty),
  );
  const actualCount = Math.min(count, pool.length);

  const start = () => {
    const questions = shuffle(pool).slice(0, actualCount);
    onStart(questions, timed ? timeSecs : null);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        overflow: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div>
          <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 28, color: "var(--text)", marginBottom: 6 }}>
            Configure Quiz
          </div>
          <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 12, color: "var(--text-muted)" }}>
            {pool.length} questions available · {actualCount} will be selected
          </div>
        </div>

        {/* Categories */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Categories
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: `1px solid ${selectedCategories.includes(cat) ? "var(--accent)" : "var(--border)"}`,
                  background: selectedCategories.includes(cat) ? "var(--accent-glow)" : "var(--surface)",
                  color: selectedCategories.includes(cat) ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 11,
                  transition: "all 0.15s",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Difficulty
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {["Easy", "Medium", "Hard"].map((d) => (
              <button
                key={d}
                onClick={() => toggleDiff(d)}
                style={{
                  padding: "5px 16px",
                  borderRadius: 6,
                  border: `1px solid ${selectedDiff.includes(d) ? DIFF_COLORS[d] : "var(--border)"}`,
                  background: selectedDiff.includes(d) ? `${DIFF_COLORS[d]}18` : "var(--surface)",
                  color: selectedDiff.includes(d) ? DIFF_COLORS[d] : "var(--text-muted)",
                  cursor: "pointer",
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  transition: "all 0.15s",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Count + Timer row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Questions: {actualCount}
            </label>
            <input
              type="range"
              min={1}
              max={Math.max(1, pool.length)}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              style={{ accentColor: "var(--accent)", width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Timer per question
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setTimed((t) => !t)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: `1px solid ${timed ? "var(--accent)" : "var(--border)"}`,
                  background: timed ? "var(--accent-glow)" : "var(--surface)",
                  color: timed ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 11,
                }}
              >
                {timed ? "On" : "Off"}
              </button>
              {timed && (
                <select
                  value={timeSecs}
                  onChange={(e) => setTimeSecs(Number(e.target.value))}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "5px 8px",
                    color: "var(--text-muted)",
                    fontFamily: "Geist Mono, monospace",
                    fontSize: 11,
                    outline: "none",
                  }}
                >
                  {[15, 30, 45, 60, 90].map((s) => (
                    <option key={s} value={s}>{s}s</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={start}
          disabled={actualCount === 0}
          style={{
            marginTop: 8,
            background: actualCount > 0 ? "var(--accent)" : "var(--surface-2)",
            border: "none",
            borderRadius: 9,
            padding: "12px 0",
            color: actualCount > 0 ? "#0f0e0d" : "var(--text-dim)",
            cursor: actualCount > 0 ? "pointer" : "not-allowed",
            fontFamily: "Geist Mono, monospace",
            fontSize: 13,
            fontWeight: 600,
            width: "100%",
          }}
        >
          {actualCount > 0 ? `Start Quiz — ${actualCount} Questions` : "No questions match filters"}
        </button>
      </div>
    </div>
  );
}

// ─── Active Quiz ──────────────────────────────────────────────────────────────

function ActiveQuiz({
  questions,
  timeLimitSecs,
  onComplete,
}: {
  questions: QuizQuestion[];
  timeLimitSecs: number | null;
  onComplete: (results: QuizResult[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimitSecs ?? 0);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const q = questions[index];

  const advance = useCallback(
    (chosenIndex: number | null) => {
      const elapsed = Date.now() - startTimeRef.current;
      const result: QuizResult = {
        questionId: q.id,
        selectedIndex: chosenIndex,
        correct: chosenIndex === q.correctIndex,
        timeMs: elapsed,
      };
      const updated = [...results, result];
      if (index + 1 >= questions.length) {
        onComplete(updated);
      } else {
        setResults(updated);
        setIndex((i) => i + 1);
        setSelected(null);
        setRevealed(false);
        setTimeLeft(timeLimitSecs ?? 0);
        startTimeRef.current = Date.now();
      }
    },
    [q, results, index, questions.length, onComplete, timeLimitSecs],
  );

  // Timer
  useEffect(() => {
    if (!timeLimitSecs || revealed) return;
    setTimeLeft(timeLimitSecs);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          // Auto-reveal on timeout
          setRevealed(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [index, timeLimitSecs]);

  useEffect(() => {
    if (revealed && timerRef.current) clearInterval(timerRef.current);
  }, [revealed]);

  const timerPct = timeLimitSecs ? (timeLeft / timeLimitSecs) * 100 : 100;
  const timerColor = timerPct > 50 ? "#4ade80" : timerPct > 25 ? "#fb923c" : "#f87171";

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
  };

  const optionBg = (idx: number) => {
    if (!revealed) {
      return idx === selected ? "var(--accent-glow)" : "var(--surface)";
    }
    if (idx === q.correctIndex) return "rgba(74,222,128,0.1)";
    if (idx === selected && idx !== q.correctIndex) return "rgba(248,113,113,0.1)";
    return "var(--surface)";
  };

  const optionBorder = (idx: number) => {
    if (!revealed) {
      return idx === selected ? "var(--accent)" : "var(--border)";
    }
    if (idx === q.correctIndex) return "#4ade80";
    if (idx === selected && idx !== q.correctIndex) return "#f87171";
    return "var(--border)";
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflow: "auto",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Progress + timer */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 3, background: "var(--surface-2)", borderRadius: 2 }}>
            <div
              style={{
                height: "100%",
                width: `${((index + 1) / questions.length) * 100}%`,
                background: "var(--accent)",
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {index + 1}/{questions.length}
          </span>
          {timeLimitSecs && (
            <span
              style={{
                fontFamily: "Geist Mono, monospace",
                fontSize: 13,
                fontWeight: 600,
                color: timerColor,
                minWidth: 32,
                textAlign: "right",
              }}
            >
              {timeLeft}s
            </span>
          )}
        </div>

        {timeLimitSecs && (
          <div style={{ height: 2, background: "var(--surface-2)", borderRadius: 1 }}>
            <div
              style={{
                height: "100%",
                width: `${timerPct}%`,
                background: timerColor,
                borderRadius: 1,
                transition: "width 1s linear, background 0.3s",
              }}
            />
          </div>
        )}

        {/* Tags */}
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "Geist Mono, monospace", fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "var(--surface-2)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {q.category}
          </span>
          <span style={{ fontSize: 10, fontFamily: "Geist Mono, monospace", fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty], textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {q.difficulty}
          </span>
        </div>

        {/* Question */}
        <div
          style={{
            fontFamily: "Instrument Serif, serif",
            fontSize: 22,
            color: "var(--text)",
            lineHeight: 1.5,
          }}
        >
          {q.question}
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              style={{
                background: optionBg(idx),
                border: `1px solid ${optionBorder(idx)}`,
                borderRadius: 9,
                padding: "14px 18px",
                textAlign: "left",
                color: "var(--text)",
                cursor: revealed ? "default" : "pointer",
                fontFamily: "Geist Mono, monospace",
                fontSize: 13,
                lineHeight: 1.5,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `1px solid ${optionBorder(idx)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  flexShrink: 0,
                  color: revealed && idx === q.correctIndex ? "#4ade80" : revealed && idx === selected ? "#f87171" : "var(--text-dim)",
                }}
              >
                {revealed && idx === q.correctIndex ? "✓" : revealed && idx === selected && idx !== q.correctIndex ? "✗" : String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </button>
          ))}
        </div>

        {/* Explanation */}
        {revealed && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Explanation
            </div>
            <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 12, color: "var(--text)", lineHeight: 1.65 }}>
              {q.explanation}
            </div>
          </div>
        )}

        {/* Next / Skip */}
        <div style={{ display: "flex", gap: 10 }}>
          {!revealed && (
            <button
              onClick={() => advance(null)}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 20px",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontFamily: "Geist Mono, monospace",
                fontSize: 12,
              }}
            >
              Skip
            </button>
          )}
          {revealed && (
            <button
              onClick={() => advance(selected)}
              style={{
                flex: 1,
                background: "var(--accent)",
                border: "none",
                borderRadius: 8,
                padding: "10px 0",
                color: "#0f0e0d",
                cursor: "pointer",
                fontFamily: "Geist Mono, monospace",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {index + 1 >= questions.length ? "Finish Quiz" : "Next Question →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Review Screen ────────────────────────────────────────────────────────────

function ReviewScreen({
  questions,
  results,
  onRetry,
  onConfig,
}: {
  questions: QuizQuestion[];
  results: QuizResult[];
  onRetry: () => void;
  onConfig: () => void;
}) {
  const correct = results.filter((r) => r.correct).length;
  const pct = Math.round((correct / questions.length) * 100);
  const avgTime = Math.round(results.reduce((s, r) => s + r.timeMs, 0) / results.length);

  const grade =
    pct >= 90 ? { label: "Excellent", color: "#4ade80" }
    : pct >= 70 ? { label: "Good", color: "var(--accent)" }
    : pct >= 50 ? { label: "Fair", color: "#fb923c" }
    : { label: "Needs Work", color: "#f87171" };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Score card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 28,
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div style={{ textAlign: "center", minWidth: 80 }}>
            <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 48, color: grade.color, lineHeight: 1 }}>
              {pct}%
            </div>
            <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: grade.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>
              {grade.label}
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Correct", value: `${correct} / ${questions.length}`, color: "#4ade80" },
              { label: "Avg Time", value: formatTime(avgTime), color: "var(--text-muted)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 13, fontWeight: 600, color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Retry buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onRetry}
            style={{
              flex: 1,
              background: "var(--accent)",
              border: "none",
              borderRadius: 9,
              padding: "10px 0",
              color: "#0f0e0d",
              cursor: "pointer",
              fontFamily: "Geist Mono, monospace",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Retry Same Set
          </button>
          <button
            onClick={onConfig}
            style={{
              flex: 1,
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: "10px 0",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "Geist Mono, monospace",
              fontSize: 12,
            }}
          >
            New Quiz
          </button>
        </div>

        {/* Per-question review */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Question Review
          </div>
          {questions.map((q, i) => {
            const r = results[i];
            if (!r) return null;
            return (
              <div
                key={q.id}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${r.correct ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{r.correct ? "✓" : "✗"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>
                      {q.question}
                    </div>
                    <div style={{ marginTop: 4, fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)" }}>
                      {r.selectedIndex === null
                        ? "Skipped"
                        : r.correct
                        ? "Correct"
                        : `You chose: "${q.options[r.selectedIndex]}" · Correct: "${q.options[q.correctIndex]}"`}
                    </div>
                  </div>
                  <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                    {formatTime(r.timeMs)}
                  </span>
                </div>
                {!r.correct && (
                  <div style={{ background: "var(--surface-2)", borderRadius: 6, padding: "8px 10px", fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const router = useRouter();
  const [state, setState] = useState<QuizState>("config");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [timeLimitSecs, setTimeLimitSecs] = useState<number | null>(30);
  const [results, setResults] = useState<QuizResult[]>([]);

  const handleStart = (qs: QuizQuestion[], t: number | null) => {
    setQuestions(qs);
    setTimeLimitSecs(t);
    setResults([]);
    setState("active");
  };

  const handleComplete = (r: QuizResult[]) => {
    setResults(r);
    setState("review");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
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
          onClick={() => state !== "config" ? setState("config") : router.push("/")}
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
        >
          ←
        </button>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
          {state === "config" ? "Quiz" : state === "active" ? "Quiz — In Progress" : "Quiz — Results"}
        </span>
      </header>

      {state === "config" && <ConfigScreen onStart={handleStart} />}
      {state === "active" && (
        <ActiveQuiz
          questions={questions}
          timeLimitSecs={timeLimitSecs}
          onComplete={handleComplete}
        />
      )}
      {state === "review" && (
        <ReviewScreen
          questions={questions}
          results={results}
          onRetry={() => handleStart(questions, timeLimitSecs)}
          onConfig={() => setState("config")}
        />
      )}
    </div>
  );
}