"use client";
import { Problem, INITIAL_PROBLEMS } from "./problems";

const STORAGE_KEY = "dsa-canvas-problems";

function migrateProblems(problems: Problem[]): Problem[] {
  return problems.map((p) => ({
    ...p,
    canvas: {
      ...p.canvas,
      ideas: Array.isArray(p.canvas.ideas)
        ? p.canvas.ideas
        : [
            {
              approach: (p.canvas as any).ideas || (p.canvas as any).approach || "",
              time: (p.canvas as any).complexity || "",
              space: "",
            },
          ],
    },
  }));
}

export function getProblems(): Problem[] {
  if (typeof window === "undefined") return INITIAL_PROBLEMS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const migrated = migrateProblems(parsed);
      // Persist migrated shape back so it's only run once
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PROBLEMS));
    return INITIAL_PROBLEMS;
  } catch {
    return INITIAL_PROBLEMS;
  }
}

export function saveProblems(problems: Problem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(problems));
}

export function getProblem(id: string): Problem | undefined {
  return getProblems().find((p) => p.id === id);
}

export function saveProblem(updated: Problem): void {
  const problems = getProblems();
  const idx = problems.findIndex((p) => p.id === updated.id);
  if (idx >= 0) problems[idx] = updated;
  else problems.push(updated);
  saveProblems(problems);
}

export function addProblem(problem: Problem): void {
  const problems = getProblems();
  problems.push(problem);
  saveProblems(problems);
}

export function deleteProblem(id: string): void {
  const problems = getProblems().filter((p) => p.id !== id);
  saveProblems(problems);
}