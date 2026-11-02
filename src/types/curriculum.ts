export type SubjectCategory = "interview_qa" | "revision_handbook";

export interface QuestionIndexItem {
  number: number;
  label?: string; // e.g. "#1" or "#1a" or "Chapter 1"
  title: string;
  priority: "P0" | "P1" | "P2";
  type: string; // "C" | "Q" | "D" | "P" | "B" | "CHAPTER"
  sectionId: number;
  leetcodeUrl?: string;
  githubUrl: string;
}

export interface SectionIndex {
  id: number;
  name: string;
  fullName: string;
  range: string;
  questionCount: number;
  questions: QuestionIndexItem[];
}

export interface SubjectIndex {
  id: string;
  name: string;
  category: SubjectCategory;
  totalQuestions: number;
  githubFilePath: string;
  githubUrl: string;
  sections: SectionIndex[];
}

export interface SubjectSummary {
  id: string;
  name: string;
  category: SubjectCategory;
  totalQuestions: number;
  sectionCount: number;
  fileSizeKb: string;
}

export interface QuestionProgress {
  questionNumber: number;
  firstSolvedAt: string; // YYYY-MM-DD
  lastRevisedAt: string;  // YYYY-MM-DD
  revisionCount: number;  // 1, 2, 3...
  notes?: string;
}

export interface SubjectProgressRecord {
  subjectId: string;
  uniqueCompletedCount: number;
  totalRevisionCount: number;
  lastActiveDate?: string;
  questions: Record<number, QuestionProgress>;
}

// Legacy format compatibility
export interface LegacySubjectProgress {
  completedItemIds?: string[];
  lastStudiedAt?: string;
  updatedAt?: number;
}
