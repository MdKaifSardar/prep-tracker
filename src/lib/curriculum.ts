import jsIndex from "@/data/indexes/javascript.json";
import sqlIndex from "@/data/indexes/sql.json";
import nodejsIndex from "@/data/indexes/nodejs.json";
import reactIndex from "@/data/indexes/react.json";
import mongodbIndex from "@/data/indexes/mongodb.json";
import dbmsIndex from "@/data/indexes/dbms.json";
import typescriptIndex from "@/data/indexes/typescript.json";
import dsaIndex from "@/data/indexes/dsa.json";
import jsFundIndex from "@/data/indexes/js-fundamentals.json";
import cppFundIndex from "@/data/indexes/cpp-fundamentals.json";
import sqlFundIndex from "@/data/indexes/sql-fundamentals.json";
import postgresqlIndex from "@/data/indexes/postgresql.json";
import manifestJson from "@/data/indexes/manifest.json";

import { SubjectIndex, SubjectSummary, SubjectProgressRecord } from "@/types/curriculum";

const ALL_INDEXES: Record<string, SubjectIndex> = {
  javascript: jsIndex as SubjectIndex,
  sql: sqlIndex as SubjectIndex,
  nodejs: nodejsIndex as SubjectIndex,
  react: reactIndex as SubjectIndex,
  mongodb: mongodbIndex as SubjectIndex,
  dbms: dbmsIndex as SubjectIndex,
  typescript: typescriptIndex as SubjectIndex,
  dsa: dsaIndex as SubjectIndex,
  "js-fundamentals": jsFundIndex as SubjectIndex,
  "cpp-fundamentals": cppFundIndex as SubjectIndex,
  "sql-fundamentals": sqlFundIndex as SubjectIndex,
  postgresql: postgresqlIndex as SubjectIndex,
};

export function getSubjectIndex(subjectId: string): SubjectIndex | null {
  return ALL_INDEXES[subjectId] || null;
}

export function getAllSubjectSummaries(): SubjectSummary[] {
  return manifestJson as SubjectSummary[];
}

export function getAllSubjectIds(): string[] {
  return Object.keys(ALL_INDEXES);
}

/**
 * Normalizes subject progress from Firestore doc or localStorage, maintaining 100% backward compatibility
 */
export function normalizeProgressRecord(
  subjectId: string,
  rawProgress: any
): SubjectProgressRecord {
  if (!rawProgress) {
    return {
      subjectId,
      uniqueCompletedCount: 0,
      totalRevisionCount: 0,
      questions: {},
    };
  }

  // Already in multi-revision structure
  if (rawProgress.questions && typeof rawProgress.questions === "object") {
    const questions = rawProgress.questions;
    const uniqueCount = Object.keys(questions).length;
    let totalRevisions = 0;
    Object.values(questions).forEach((q: any) => {
      totalRevisions += q?.revisionCount || 1;
    });

    return {
      subjectId,
      uniqueCompletedCount: rawProgress.uniqueCompletedCount ?? uniqueCount,
      totalRevisionCount: rawProgress.totalRevisionCount ?? totalRevisions,
      lastActiveDate: rawProgress.lastActiveDate,
      questions,
    };
  }

  // Legacy format support: completedItemIds: ["js_q1", "1", "2"]
  const legacyIds = Array.isArray(rawProgress.completedItemIds) ? rawProgress.completedItemIds : [];
  const questions: Record<number, any> = {};

  legacyIds.forEach((item: string | number) => {
    let num: number | null = null;
    if (typeof item === "number") {
      num = item;
    } else {
      const match = String(item).match(/\d+/);
      if (match) num = parseInt(match[0], 10);
    }

    if (num !== null && !isNaN(num)) {
      questions[num] = {
        questionNumber: num,
        firstSolvedAt: rawProgress.lastStudiedAt || "2026-10-25",
        lastRevisedAt: rawProgress.lastStudiedAt || "2026-10-25",
        revisionCount: 1,
      };
    }
  });

  return {
    subjectId,
    uniqueCompletedCount: Object.keys(questions).length,
    totalRevisionCount: Object.keys(questions).length,
    lastActiveDate: rawProgress.lastStudiedAt,
    questions,
  };
}
