export type SubjectCategory = "interview_qa" | "revision_handbook";

export interface SubjectManifest {
  id: string;               // "javascript" | "js-fundamentals"
  name: string;             // Display name
  description: string;      // Subtitle / Track description
  category: SubjectCategory;
  totalItems: number;       // 78 Qs or 12 Chapters
  topics: TopicManifest[];
  items: CurriculumItem[];
}

export interface TopicManifest {
  id: string;               // e.g. "1", "2", ... "9" or slug
  order: number;            // 1, 2, 3...
  name: string;             // "1. JS Fundamentals, Engine & Scope"
  rangeOrLabel: string;     // "#1 – #15" or "Chapter 4"
  itemCount: number;
}

export type ItemType = "C" | "Q" | "D" | "P" | "SYNTAX" | "TEMPLATE" | "GOTCHA" | "TABLE";

export interface CurriculumItem {
  id: string;               // "js_q15" or "jsfund_c4_matrix"
  subjectId: string;        // "javascript" | "js-fundamentals"
  topicId: string;          // "1", "2", ...
  order: number;
  title: string;
  priority?: "P0" | "P1";   // (For Q&A)
  type: ItemType;
  summary: string;          // TL;DR concept or syntax rule
  explanation?: string;     // Core Concept & Explanation breakdown
  codeSnippet?: string;     // Code implementation / template
  gotchas?: string;         // Traps, edge cases, or memory quirks
  leetcodeUrl?: string;     // Official problem link (for DSA)
  docRef?: string;          // Anchor in original markdown repo
}

export interface UserSubjectProgress {
  completedItemIds: string[]; // e.g. ["js_q1", "js_q15"] or ["jsfund_c1", "jsfund_c4"]
  lastStudiedAt: string;      // "YYYY-MM-DD"
  updatedAt: number;          // Epoch millis
}
