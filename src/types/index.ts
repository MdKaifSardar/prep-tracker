export interface Topic {
  id: string;               // e.g. "dsa", "javascript", "react"
  name: string;             // "DSA", "JavaScript", "React"
  target: number;           // Target questions (e.g. 134, 84, 75)
  baselineCompleted: number;// Initial historical completed (e.g. 57, 61, 31)
  order: number;            // Display order index
  color: string;            // Primary accent color hex
}

export interface DailyLog {
  id: string;               // Firestore doc ID
  date: string;             // ISO Date "YYYY-MM-DD"
  topicId: string;          // Topic ID reference
  topicName: string;        // Denormalized name for easy queries
  problemRange: string;     // e.g. "58-61" or "1, 2, 5"
  parsedCount: number;      // Calculated question count
  isRevision?: boolean;     // Flagged if problems were previously completed
  notes?: string;           // Optional revision notes
  timestamp: number;        // Epoch millis
}

export interface DayActivity {
  date: string;             // "YYYY-MM-DD"
  count: number;            // Total questions solved on this date
  topics: { topicName: string; count: number }[];
}

export interface KPIStats {
  todayQuestions: number;
  todayTopics: number;
  currentStreak: number;
  bestStreak: number;
  totalCompleted: number;
  last7Days: number;
  thisWeek: number;
  thisMonth: number;
}

export interface Question {
  id: string;               // e.g. "js_1"
  topicId: string;          // "javascript"
  qNumber: number;          // 1..78
  title: string;            // Question text
  sectionId: number;        // 1..9
  sectionName: string;      // e.g. "1. JS Fundamentals, Engine & Scope"
  priority: "P0" | "P1";
  type: "C" | "Q" | "D" | "P";
  tldr: string;             // 1-2 sentence core concept takeaway
  leetcodeUrl?: string;     // Official link if DSA question
  docRef?: string;          // Relative markdown anchor
}

export interface SectionInfo {
  id: number;               // 1..9
  name: string;             // "1. JS Fundamentals, Engine & Scope"
  range: string;            // "#1 – #15"
  questionCount: number;
}

export interface QuestionBankData {
  topicId: string;
  topicName: string;
  totalQuestions: number;
  sections: SectionInfo[];
  questions: Question[];
}

