"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SDNote {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string; // free-form notes in each section
  sections: {
    requirements: string;
    estimation: string;
    apiDesign: string;
    dataModel: string;
    highLevel: string;
    deepDive: string;
    tradeoffs: string;
  };
  createdAt: number;
  updatedAt: number;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const KEY = "dsa-canvas:sd-notes";

function load(): SDNote[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function save(notes: SDNote[]) { localStorage.setItem(KEY, JSON.stringify(notes)); }

// ─── Constants ────────────────────────────────────────────────────────────────

const SD_CATEGORIES = [
  "URL Shortener", "Social Feed", "Messaging", "Search", "CDN / Storage",
  "Rate Limiter", "Notification System", "Ride Sharing", "Video Streaming",
  "E-Commerce", "Payment System", "Custom",
];

const SECTION_META: { key: keyof SDNote["sections"]; label: string; icon: string; placeholder: string }[] = [
  {
    key: "requirements",
    label: "Requirements",
    icon: "📋",
    placeholder:
      "Functional:\n• Users can shorten URLs\n• Users can retrieve original URL\n\nNon-Functional:\n• 100M URLs/day, reads 10x writes\n• 99.99% availability\n• Low latency reads (<50ms P99)",
  },
  {
    key: "estimation",
    label: "Capacity Estimation",
    icon: "🔢",
    placeholder:
      "Traffic:\n• Writes: 100M / day ≈ 1,200 RPS\n• Reads: 1B / day ≈ 12,000 RPS\n\nStorage:\n• 100M × 365 × 5 years ≈ 182B records\n• ~500 bytes/record → ~91 TB\n\nBandwidth:\n• Write: 1200 RPS × 500B ≈ 600 KB/s\n• Read: 12000 RPS × 500B ≈ 6 MB/s",
  },
  {
    key: "apiDesign",
    label: "API Design",
    icon: "🔌",
    placeholder:
      "POST /api/v1/shorten\n  Body: { longUrl, customAlias?, expiry? }\n  Returns: { shortUrl, key }\n\nGET /{key}\n  Returns: 302 Redirect to longUrl\n\nDELETE /api/v1/{key}\n  Auth: Bearer token",
  },
  {
    key: "dataModel",
    label: "Data Model",
    icon: "🗄️",
    placeholder:
      "URL Table (PostgreSQL or DynamoDB)\n  id          UUID PK\n  short_key   VARCHAR(8) UNIQUE INDEX\n  long_url    TEXT\n  user_id     UUID FK\n  created_at  TIMESTAMP\n  expires_at  TIMESTAMP\n\nUser Table\n  id          UUID PK\n  email       VARCHAR UNIQUE\n  created_at  TIMESTAMP",
  },
  {
    key: "highLevel",
    label: "High-Level Design",
    icon: "🏗️",
    placeholder:
      "Client → Load Balancer → App Servers\n              ↓\n         Cache (Redis)\n              ↓\n         DB (Primary + Replicas)\n\nURL Generation:\n• Base62 encoding of auto-increment ID\n  or MD5 + first 8 chars\n\nRead path:\n  1. Check Redis cache\n  2. On miss → query DB → warm cache\n  3. Return 302 redirect",
  },
  {
    key: "deepDive",
    label: "Deep Dive",
    icon: "🔍",
    placeholder:
      "Scaling:\n• App layer: stateless → easy horizontal scale\n• DB: read replicas for read-heavy load\n• Cache: Redis Cluster, LRU eviction\n\nKey Generation:\n• Approach 1: KGS (Key Generation Service)\n  Pre-generate keys, store in Redis, avoid race conditions\n• Approach 2: Snowflake IDs + Base62\n\nAvoiding hotspots:\n• Consistent hashing for cache shards\n• CDN for popular short links",
  },
  {
    key: "tradeoffs",
    label: "Trade-offs",
    icon: "⚖️",
    placeholder:
      "SQL vs NoSQL:\n  SQL: strong consistency, joins. Good if users + URLs related.\n  NoSQL: better horizontal scale, simpler schema.\n\nCache policy:\n  Write-through: consistency but slower writes\n  Write-around: cache only on read, may cause cache misses\n\nURL collision:\n  MD5 approach: may collide → need retry logic\n  KGS: no collision but extra infra\n\nCAP choice: AP (availability > consistency)\n  Acceptable to show stale data briefly",
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

const SEED_NOTE: SDNote = {
  id: "sd-seed-1",
  title: "Design a URL Shortener",
  category: "URL Shortener",
  tags: ["databases", "caching", "hashing"],
  content: "",
  sections: {
    requirements: "Functional:\n• Users can shorten URLs\n• Retrieve original URL from short link\n• Optional: custom aliases, expiry\n\nNon-Functional:\n• 100M URLs/day, reads ~10× writes\n• 99.99% availability\n• <50ms P99 read latency",
    estimation: "Writes: 100M/day ≈ 1,200 RPS\nReads: ~12,000 RPS\n\nStorage: 182B records × 500 bytes ≈ 91 TB over 5 years\nCache: top 20% URLs ≈ 18GB Redis",
    apiDesign: "POST /shorten  → { shortUrl }\nGET  /{key}    → 302 Redirect\nDELETE /{key}  → Auth required",
    dataModel: "urls: id, short_key (UNIQUE), long_url, user_id, created_at, expires_at\nusers: id, email, created_at",
    highLevel: "Client → LB → App Servers → Redis Cache → DB (Primary + Replicas)\n\nURL gen: Base62(autoincrement ID) or KGS",
    deepDive: "• KGS (Key Generation Service): pre-generates 8-char keys, stored in Redis to avoid race conditions\n• Read replicas for DB scaling\n• CDN for globally popular links\n• Async analytics pipeline (Kafka → ClickHouse)",
    tradeoffs: "NoSQL chosen for horizontal scale. AP over CP — brief stale cache acceptable.\nMD5 → possible collision, need retry. KGS → no collision, extra infra.",
  },
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 1800000,
};

function loadOrSeed(): SDNote[] {
  const notes = load();
  return notes.length > 0 ? notes : [SEED_NOTE];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── New Note Modal ───────────────────────────────────────────────────────────

function NewNoteModal({ onSave, onClose }: { onSave: (note: SDNote) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Custom");
  const [tagInput, setTagInput] = useState("");

  const handleSave = () => {
    if (!title.trim()) return;
    const tags = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    const note: SDNote = {
      id: `sd-${Date.now()}`,
      title: title.trim(),
      category,
      tags,
      content: "",
      sections: { requirements: "", estimation: "", apiDesign: "", dataModel: "", highLevel: "", deepDive: "", tradeoffs: "" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSave(note);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, width: 480, maxWidth: "95vw", padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>New Design Note</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>Problem Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Design Twitter's feed"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "9px 12px", color: "var(--text)", fontFamily: "Geist Mono, monospace", fontSize: 13, outline: "none", width: "100%" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 10px", color: "var(--text)", fontFamily: "Geist Mono, monospace", fontSize: 12, outline: "none" }}
            >
              {SD_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tags (comma-separated)</label>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="caching, sql, queue"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 10px", color: "var(--text)", fontFamily: "Geist Mono, monospace", fontSize: 12, outline: "none" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "7px 16px", color: "var(--text-muted)", cursor: "pointer", fontFamily: "Geist Mono, monospace", fontSize: 12 }}>Cancel</button>
          <button onClick={handleSave} style={{ background: "var(--accent)", border: "none", borderRadius: 7, padding: "7px 20px", color: "#0f0e0d", cursor: "pointer", fontFamily: "Geist Mono, monospace", fontSize: 12, fontWeight: 600 }}>Create</button>
        </div>
      </div>
    </div>
  );
}

// ─── Note Editor ──────────────────────────────────────────────────────────────

function NoteEditor({ note, onUpdate }: { note: SDNote; onUpdate: (n: SDNote) => void }) {
  const [activeSection, setActiveSection] = useState<keyof SDNote["sections"]>("requirements");
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const updateSection = (key: keyof SDNote["sections"], value: string) => {
    const updated: SDNote = {
      ...note,
      sections: { ...note.sections, [key]: value },
      updatedAt: Date.now(),
    };
    onUpdate(updated);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      // actual save happens in parent through onUpdate
    }, 300);
  };

  const sec = SECTION_META.find((s) => s.key === activeSection)!;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Section tabs */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-2)",
          flexShrink: 0,
          scrollbarWidth: "none",
        }}
      >
        {SECTION_META.map((s) => {
          const active = s.key === activeSection;
          const hasContent = !!note.sections[s.key].trim();
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                background: active ? "var(--surface)" : "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                color: active ? "var(--text)" : "var(--text-muted)",
                cursor: "pointer",
                fontFamily: "Geist Mono, monospace",
                fontSize: 11,
                fontWeight: active ? 600 : 400,
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 12 }}>{s.icon}</span>
              {s.label}
              {hasContent && !active && (
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-dim)", flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Active section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        <div
          style={{
            padding: "6px 14px 4px",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13 }}>{sec.icon}</span>
          <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {sec.label}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "Geist Mono, monospace", fontSize: 10, color: "var(--text-dim)" }}>
            {note.sections[activeSection].length} chars
          </span>
        </div>
        <textarea
          key={activeSection}
          value={note.sections[activeSection]}
          onChange={(e) => updateSection(activeSection, e.target.value)}
          placeholder={sec.placeholder}
          style={{
            flex: 1,
            padding: "16px 18px",
            background: "var(--surface)",
            color: "var(--text)",
            fontFamily: "Geist Mono, monospace",
            fontSize: 13,
            lineHeight: 1.7,
            border: "none",
            outline: "none",
            resize: "none",
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SystemDesignPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<SDNote[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loaded = loadOrSeed();
    setNotes(loaded);
    if (loaded.length > 0) setSelected(loaded[0].id);
  }, []);

  const persist = (updated: SDNote[]) => {
    setNotes(updated);
    save(updated);
  };

  const handleCreate = (note: SDNote) => {
    const updated = [note, ...notes];
    persist(updated);
    setSelected(note.id);
    setShowNew(false);
  };

  const handleUpdate = (note: SDNote) => {
    persist(notes.map((n) => (n.id === note.id ? note : n)));
  };

  const handleDelete = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    persist(updated);
    if (selected === id) setSelected(updated[0]?.id ?? null);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.category.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  const activeNote = notes.find((n) => n.id === selected) ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: 50, borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: "4px 6px", borderRadius: 4, lineHeight: 1 }}>←</button>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>System Design</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowNew(true)}
          style={{ background: "var(--accent)", border: "none", borderRadius: 7, padding: "6px 14px", color: "#0f0e0d", cursor: "pointer", fontFamily: "Geist Mono, monospace", fontSize: 12, fontWeight: 600 }}
        >
          + New Design
        </button>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--surface)" }}>
          {/* Search */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px", color: "var(--text)", fontFamily: "Geist Mono, monospace", fontSize: 11, outline: "none", width: "100%" }}
            />
          </div>

          {/* Notes list */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {filteredNotes.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-dim)" }}>
                No notes found
              </div>
            )}
            {filteredNotes.map((note) => {
              const active = note.id === selected;
              return (
                <div
                  key={note.id}
                  onClick={() => setSelected(note.id)}
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border)",
                    background: active ? "var(--surface-2)" : "transparent",
                    borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 12, color: active ? "var(--text)" : "var(--text-muted)", fontWeight: active ? 600 : 400, lineHeight: 1.4 }}>
                    {note.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, color: "var(--text-dim)" }}>{note.category}</span>
                    <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, color: "var(--text-dim)" }}>{timeAgo(note.updatedAt)}</span>
                  </div>
                  {note.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                      {note.tags.slice(0, 3).map((t) => (
                        <span key={t} style={{ fontSize: 9, fontFamily: "Geist Mono, monospace", padding: "1px 5px", borderRadius: 3, background: "var(--surface)", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor area */}
        {activeNote ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Note header */}
            <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 18, color: "var(--text)" }}>{activeNote.title}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, color: "var(--text-muted)", background: "var(--surface)", padding: "2px 7px", borderRadius: 4 }}>{activeNote.category}</span>
                  {activeNote.tags.map((t) => (
                    <span key={t} style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, color: "var(--text-dim)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>{t}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleDelete(activeNote.id)}
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontFamily: "Geist Mono, monospace", fontSize: 11, padding: "4px 8px" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
              >
                delete
              </button>
            </div>

            <NoteEditor note={activeNote} onUpdate={handleUpdate} />
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 22, color: "var(--text-muted)" }}>No design selected</div>
            <button onClick={() => setShowNew(true)} style={{ background: "var(--accent)", border: "none", borderRadius: 7, padding: "8px 20px", color: "#0f0e0d", cursor: "pointer", fontFamily: "Geist Mono, monospace", fontSize: 12, fontWeight: 600 }}>
              + Create your first design note
            </button>
          </div>
        )}
      </div>

      {showNew && <NewNoteModal onSave={handleCreate} onClose={() => setShowNew(false)} />}
    </div>
  );
}