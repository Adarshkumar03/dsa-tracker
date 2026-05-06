"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Problem } from "@/lib/problems";
import { getProblem, saveProblem } from "@/lib/store";

const LANGUAGES = [
  "python",
  "javascript",
  "typescript",
  "java",
  "cpp",
  "go",
  "rust",
  "kotlin",
];

function useResizeX(initialPct: number, minPct = 20, maxPct = 70) {
  const [pct, setPct] = useState(initialPct);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      const container = containerRef.current;
      if (!container) return;

      const move = (me: MouseEvent) => {
        if (!dragging.current || !container) return;
        const rect = container.getBoundingClientRect();
        const newPct = ((me.clientX - rect.left) / rect.width) * 100;
        setPct(Math.max(minPct, Math.min(maxPct, newPct)));
      };
      const up = () => {
        dragging.current = false;
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
    },
    [minPct, maxPct],
  );

  return { pct, containerRef, onMouseDown, dragging };
}

function ResizableSectionY({
  title,
  icon,
  children,
  minHeight = 80,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  minHeight?: number;
}) {
  const [height, setHeight] = useState(180);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;

    const move = (me: MouseEvent) => {
      if (!dragging.current) return;
      const delta = me.clientY - startY.current;
      setHeight(Math.max(minHeight, startH.current + delta));
    };
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "var(--surface-2)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13 }}>{icon}</span>
          <span
            style={{
              fontFamily: "Geist Mono, monospace",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {title}
          </span>
        </div>
      </div>
      {/* Content */}
      <div style={{ height, overflow: "hidden", position: "relative" }}>
        {children}
      </div>
      {/* Resize handle */}
      <div
        className="resize-handle-y"
        onMouseDown={onMouseDown}
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 2,
            background: "var(--border-light)",
            borderRadius: 1,
          }}
        />
      </div>
    </div>
  );
}

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [canvas, setCanvas] = useState<Problem["canvas"] | null>(null);
  const [saved, setSaved] = useState(true);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Horizontal split: left panel width %
  const [leftPct, setLeftPct] = useState(40);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingX = useRef(false);

  useEffect(() => {
    const p = getProblem(id);
    if (!p) {
      router.push("/");
      return;
    }
    setProblem(p);
    setCanvas({ ...p.canvas });
  }, [id, router]);

  function updateCanvas(
    field: keyof Problem["canvas"],
    value: string | Problem["canvas"]["ideas"],
  ) {
    if (!canvas || !problem) return;
    const updated = { ...canvas, [field]: value };
    setCanvas(updated);
    setSaved(false);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveProblem({ ...problem, canvas: updated });
      setSaved(true);
    }, 800);
  }

  // Horizontal resize
  const onHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingX.current = true;
    const container = containerRef.current;
    if (!container) return;

    const move = (me: MouseEvent) => {
      if (!draggingX.current || !container) return;
      const rect = container.getBoundingClientRect();
      const newPct = ((me.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.max(25, Math.min(65, newPct)));
    };
    const up = () => {
      draggingX.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  if (!problem || !canvas) {
    return (
      <div
        style={{
          background: "var(--bg)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "var(--text-muted)",
            fontFamily: "Geist Mono, monospace",
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  const DIFFICULTY_COLORS: Record<string, string> = {
    Easy: "#4ade80",
    Medium: "#fb923c",
    Hard: "#f87171",
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
      {/* Top bar */}
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
          title="Back to problems"
        >
          ←
        </button>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span
            style={{
              fontFamily: "Geist Mono, monospace",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            {problem.name}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 4,
              color: DIFFICULTY_COLORS[problem.difficulty],
              background: `${DIFFICULTY_COLORS[problem.difficulty]}18`,
            }}
          >
            {problem.difficulty}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 4,
              background: "var(--surface-2)",
              color: "var(--text-muted)",
            }}
          >
            {problem.category}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              color: saved ? "var(--text-dim)" : "var(--accent)",
              fontFamily: "Geist Mono, monospace",
              transition: "color 0.2s",
            }}
          >
            {saved ? "● saved" : "● saving..."}
          </span>
          <select
            value={canvas.language}
            onChange={(e) => updateCanvas("language", e.target.value)}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              padding: "4px 8px",
              color: "var(--text)",
              fontSize: 12,
              outline: "none",
              fontFamily: "Geist Mono, monospace",
              cursor: "pointer",
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Canvas body */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* LEFT PANEL */}
        <div
          style={{
            width: `${leftPct}%`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <ResizableSectionY title="Constraints" icon="⚡" minHeight={80}>
            <textarea
              value={canvas.constraints}
              onChange={(e) => updateCanvas("constraints", e.target.value)}
              placeholder={
                "• Input/output format\n• Value ranges (n ≤ 10⁵)\n• Edge cases to consider\n• Time/space requirements"
              }
              style={{
                height: "100%",
                width: "100%",
                padding: 14,
                fontSize: 13,
              }}
            />
          </ResizableSectionY>

          <ResizableSectionY title="Ideas" icon="💡" minHeight={120}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "auto",
              }}
            >
              {canvas.ideas.map((idea, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    borderBottom: "1px solid var(--border)",
                    minHeight: 80,
                  }}
                >
                  {/* Left: Approach */}
                  <div
                    style={{
                      borderRight: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {idx === 0 && (
                      <div
                        style={{
                          padding: "3px 12px",
                          fontSize: 10,
                          color: "var(--text-dim)",
                          fontFamily: "Geist Mono, monospace",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: "1px solid var(--border)",
                          background: "var(--surface-2)",
                        }}
                      >
                        Approach
                      </div>
                    )}
                    <textarea
                      value={idea.approach}
                      onChange={(e) => {
                        const updated = canvas.ideas.map((it, i) =>
                          i === idx ? { ...it, approach: e.target.value } : it,
                        );
                        updateCanvas("ideas", updated as any);
                      }}
                      placeholder="Describe the approach..."
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        fontSize: 13,
                        resize: "none",
                        outline: "none",
                        background: "transparent",
                        color: "var(--text)",
                        fontFamily: "Geist Mono, monospace",
                        lineHeight: 1.6,
                        border: "none",
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  </div>

                  {/* Right: Time + Space stacked */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                      style={{
                        flex: 1,
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {idx === 0 && (
                        <div
                          style={{
                            padding: "3px 12px",
                            fontSize: 10,
                            color: "var(--text-dim)",
                            fontFamily: "Geist Mono, monospace",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            borderBottom: "1px solid var(--border)",
                            background: "var(--surface-2)",
                          }}
                        >
                          Time
                        </div>
                      )}
                      <textarea
                        value={idea.time}
                        onChange={(e) => {
                          const updated = canvas.ideas.map((it, i) =>
                            i === idx ? { ...it, time: e.target.value } : it,
                          );
                          updateCanvas("ideas", updated as any);
                        }}
                        placeholder="O(n)"
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          fontSize: 13,
                          resize: "none",
                          outline: "none",
                          background: "transparent",
                          color: "var(--text)",
                          fontFamily: "Geist Mono, monospace",
                          lineHeight: 1.6,
                          border: "none",
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {idx === 0 && (
                        <div
                          style={{
                            padding: "3px 12px",
                            fontSize: 10,
                            color: "var(--text-dim)",
                            fontFamily: "Geist Mono, monospace",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            borderBottom: "1px solid var(--border)",
                            background: "var(--surface-2)",
                          }}
                        >
                          Space
                        </div>
                      )}
                      <textarea
                        value={idea.space}
                        onChange={(e) => {
                          const updated = canvas.ideas.map((it, i) =>
                            i === idx ? { ...it, space: e.target.value } : it,
                          );
                          updateCanvas("ideas", updated as any);
                        }}
                        placeholder="O(1)"
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          fontSize: 13,
                          resize: "none",
                          outline: "none",
                          background: "transparent",
                          color: "var(--text)",
                          fontFamily: "Geist Mono, monospace",
                          lineHeight: 1.6,
                          border: "none",
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add idea button */}
              <button
                onClick={() =>
                  updateCanvas("ideas", [
                    ...canvas.ideas,
                    { approach: "", time: "", space: "" },
                  ] as any)
                }
                style={{
                  margin: "10px 14px",
                  padding: "6px 0",
                  background: "none",
                  border: "1px dashed var(--border-light)",
                  borderRadius: 6,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  transition: "border-color 0.15s, color 0.15s",
                  width: "calc(100% - 28px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-light)";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
                title="Add another idea"
              >
                +
              </button>
            </div>
          </ResizableSectionY>

          <ResizableSectionY title="Test Cases" icon="✓" minHeight={80}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div style={{ flex: 1, borderBottom: "1px solid var(--border)" }}>
                <div
                  style={{
                    padding: "4px 14px 2px",
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "Geist Mono, monospace",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Cases
                </div>
                <textarea
                  value={canvas.testCases}
                  onChange={(e) => updateCanvas("testCases", e.target.value)}
                  placeholder={
                    "Input: [2,7,11], target=9\nOutput: [0,1]\n\nInput: [3,3], target=6\nOutput: [0,1]"
                  }
                  style={{
                    height: "calc(100% - 22px)",
                    width: "100%",
                    padding: "4px 14px",
                    fontSize: 13,
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    padding: "4px 14px 2px",
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "Geist Mono, monospace",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Edge Cases
                </div>
                <textarea
                  value={canvas.edgeCases}
                  onChange={(e) => updateCanvas("edgeCases", e.target.value)}
                  placeholder={
                    "Empty array\nSingle element\nAll duplicates\nNegative numbers"
                  }
                  style={{
                    height: "calc(100% - 22px)",
                    width: "100%",
                    padding: "4px 14px",
                    fontSize: 13,
                  }}
                />
              </div>
            </div>
          </ResizableSectionY>

          {/* Spacer to push sections to top */}
          <div
            style={{ flex: 1, background: "var(--surface)", borderTop: "none" }}
          />
        </div>

        {/* HORIZONTAL RESIZE HANDLE */}
        <div
          className="resize-handle-x"
          onMouseDown={onHandleMouseDown}
          style={{
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 2,
              height: 40,
              background: "var(--border-light)",
              borderRadius: 1,
            }}
          />
        </div>

        {/* RIGHT PANEL — Code */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          {/* Code panel header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 13 }}>⟨/⟩</span>
              <span
                style={{
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Code
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: "var(--surface)",
                  color: "var(--text-dim)",
                  fontFamily: "Geist Mono, monospace",
                }}
              >
                {canvas.language}
              </span>
            </div>
            <button
              onClick={() => updateCanvas("code", "")}
              style={{
                fontSize: 11,
                color: "var(--text-dim)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-dim)")
              }
            >
              clear
            </button>
          </div>

          {/* Line numbers + editor */}
          <div
            style={{
              flex: 1,
              display: "flex",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Line numbers */}
            <LineNumbers code={canvas.code} />
            {/* Textarea */}
            <textarea
              value={canvas.code}
              onChange={(e) => updateCanvas("code", e.target.value)}
              placeholder={`# Write your ${canvas.language} solution here\n\ndef solution():\n    pass`}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const ta = e.currentTarget;
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const newVal =
                    canvas.code.substring(0, start) +
                    "  " +
                    canvas.code.substring(end);
                  updateCanvas("code", newVal);
                  setTimeout(() => {
                    ta.selectionStart = ta.selectionEnd = start + 2;
                  }, 0);
                }
              }}
              spellCheck={false}
              style={{
                flex: 1,
                height: "100%",
                padding: "14px 14px 14px 0",
                fontSize: 13,
                lineHeight: 1.7,
                fontFamily: "Geist Mono, monospace",
                letterSpacing: "0.01em",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LineNumbers({ code }: { code: string }) {
  const lines = code ? code.split("\n").length : 1;
  return (
    <div
      style={{
        width: 44,
        flexShrink: 0,
        overflow: "hidden",
        paddingTop: 14,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        paddingRight: 10,
        paddingBottom: 14,
      }}
    >
      {Array.from({ length: Math.max(lines, 20) }, (_, i) => (
        <div
          key={i}
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 12,
            lineHeight: "1.7",
            color: "var(--text-dim)",
            userSelect: "none",
          }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}
