import { collection, doc, writeBatch, getDocs, Firestore } from "firebase/firestore";
import { Topic } from "@/types";
import seedJson from "./seedHistoricalData.json";

export const DEFAULT_TOPICS: Topic[] = [
  { id: "dsa", name: "DSA", target: 134, baselineCompleted: 57, order: 1, color: "#3b82f6" },
  { id: "javascript", name: "JavaScript", target: 78, baselineCompleted: 61, order: 2, color: "#eab308" },
  { id: "js-fundamentals", name: "JS DSA Fundamentals", target: 12, baselineCompleted: 0, order: 2.5, color: "#06b6d4" },
  { id: "react", name: "React", target: 75, baselineCompleted: 31, order: 3, color: "#06b6d4" },
  { id: "typescript", name: "TypeScript", target: 50, baselineCompleted: 0, order: 4, color: "#3178c6" },
  { id: "nodejs", name: "NodeJS", target: 100, baselineCompleted: 0, order: 5, color: "#22c55e" },
  { id: "dbms", name: "DBMS", target: 100, baselineCompleted: 0, order: 6, color: "#a855f7" },
  { id: "sql", name: "SQL", target: 100, baselineCompleted: 0, order: 7, color: "#ec4899" },
  { id: "os", name: "Operating Systems", target: 100, baselineCompleted: 0, order: 8, color: "#f97316" },
  { id: "oops", name: "OOPS", target: 100, baselineCompleted: 0, order: 9, color: "#6366f1" },
  { id: "python", name: "Python", target: 100, baselineCompleted: 0, order: 10, color: "#14b8a6" },
  { id: "fastapi", name: "FastAPI", target: 100, baselineCompleted: 0, order: 11, color: "#10b981" },
  { id: "mongodb", name: "MongoDB", target: 100, baselineCompleted: 0, order: 12, color: "#84cc16" },
];

/**
 * Initializes topics and imports historical spreadsheet data if Firestore is empty
 */
export async function seedInitialData(db: Firestore): Promise<{ topicsSeeded: number; logsSeeded: number }> {
  const topicsRef = collection(db, "topics");
  const existingTopics = await getDocs(topicsRef);

  let topicsSeeded = 0;
  let logsSeeded = 0;

  // 1. Seed Topics if not present
  if (existingTopics.empty) {
    const batch = writeBatch(db);
    for (const t of DEFAULT_TOPICS) {
      const tDoc = doc(topicsRef, t.id);
      batch.set(tDoc, t);
      topicsSeeded++;
    }
    await batch.commit();
  }

  // 2. Seed Historical Logs if daily_logs is empty
  const logsRef = collection(db, "daily_logs");
  const existingLogs = await getDocs(logsRef);

  if (existingLogs.empty) {
    // Process Historical Logs
    const batch = writeBatch(db);
    let countInBatch = 0;

    for (const item of seedJson.historicalLogs) {
      const topicObj = DEFAULT_TOPICS.find(t => t.name.toLowerCase() === item.topic.toLowerCase()) || {
        id: item.topic.toLowerCase().replace(/\s+/g, "_"),
        name: item.topic,
      };

      const docRef = doc(logsRef);
      batch.set(docRef, {
        date: item.date,
        topicId: topicObj.id,
        topicName: topicObj.name,
        problemRange: `${item.count} questions (historical)`,
        parsedCount: item.count,
        isRevision: false,
        notes: "Imported from Historical Backfill",
        timestamp: new Date(item.date).getTime(),
      });
      logsSeeded++;
      countInBatch++;

      if (countInBatch >= 450) {
        await batch.commit();
        countInBatch = 0;
      }
    }

    // Process Daily Logs from Excel
    for (const item of seedJson.dailyLogs) {
      const topicObj = DEFAULT_TOPICS.find(t => t.name.toLowerCase() === item.topic.toLowerCase()) || {
        id: item.topic.toLowerCase().replace(/\s+/g, "_"),
        name: item.topic,
      };

      const docRef = doc(logsRef);
      batch.set(docRef, {
        date: item.date,
        topicId: topicObj.id,
        topicName: topicObj.name,
        problemRange: item.problems || `${item.count} questions`,
        parsedCount: item.count,
        isRevision: false,
        notes: "Imported from Daily Log",
        timestamp: new Date(item.date).getTime(),
      });
      logsSeeded++;
      countInBatch++;
    }

    if (countInBatch > 0) {
      await batch.commit();
    }
  }

  return { topicsSeeded, logsSeeded };
}
