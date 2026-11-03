import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, addDoc, collection } from "firebase/firestore";
import { normalizeProgressRecord } from "@/lib/curriculum";
import { SubjectProgressRecord } from "@/types/curriculum";

export interface LogQuestionsPayload {
  userId?: string | null;
  subjectId: string;
  subjectName: string;
  sectionId?: number;
  sectionName?: string;
  date: string;
  questionNumbers: number[];
  notes?: string;
}

export async function logQuestionsProgress(payload: LogQuestionsPayload) {
  const {
    userId,
    subjectId,
    subjectName,
    sectionName,
    date,
    questionNumbers,
    notes = "",
  } = payload;

  if (!questionNumbers || questionNumbers.length === 0) return null;

  // 1. Fetch current progress record (from Firestore or localStorage)
  let currentRecord: SubjectProgressRecord;
  let docRef: any = null;

  if (userId) {
    docRef = doc(db, "curriculum_progress", `${userId}_${subjectId}`);
    try {
      const snap = await getDoc(docRef);
      currentRecord = normalizeProgressRecord(subjectId, snap.exists() ? snap.data() : null);
    } catch (e) {
      console.warn("Could not fetch remote progress, falling back to local:", e);
      const local = typeof window !== "undefined" ? localStorage.getItem(`progress_${subjectId}`) : null;
      currentRecord = normalizeProgressRecord(subjectId, local ? JSON.parse(local) : null);
    }
  } else {
    const local = typeof window !== "undefined" ? localStorage.getItem(`progress_${subjectId}`) : null;
    currentRecord = normalizeProgressRecord(subjectId, local ? JSON.parse(local) : null);
  }

  // 2. Determine revision status and update question records
  const updatedQuestions = { ...currentRecord.questions };
  let isAnyRevision = false;

  for (const qNum of questionNumbers) {
    if (updatedQuestions[qNum]) {
      isAnyRevision = true;
      updatedQuestions[qNum] = {
        ...updatedQuestions[qNum],
        lastRevisedAt: date,
        revisionCount: (updatedQuestions[qNum].revisionCount || 1) + 1,
      };
    } else {
      updatedQuestions[qNum] = {
        questionNumber: qNum,
        firstSolvedAt: date,
        lastRevisedAt: date,
        revisionCount: 1,
      };
    }
  }

  const uniqueCompletedCount = Object.keys(updatedQuestions).length;
  let totalRevisionCount = 0;
  Object.values(updatedQuestions).forEach((q) => {
    totalRevisionCount += q.revisionCount || 1;
  });

  const newRecord: SubjectProgressRecord = {
    subjectId,
    uniqueCompletedCount,
    totalRevisionCount,
    lastActiveDate: date,
    questions: updatedQuestions,
  };

  // 3. Persist progress record to localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(`progress_${subjectId}`, JSON.stringify(newRecord));
  }

  // Persist to Firestore if logged in
  if (userId && docRef) {
    try {
      await setDoc(docRef, newRecord, { merge: true });
    } catch (err) {
      console.error("Failed to update Firestore curriculum_progress:", err);
    }
  }

  // 4. Save to daily_logs collection for streaks and heatmap
  const sortedNums = [...questionNumbers].sort((a, b) => a - b);
  const problemRange = sortedNums.map((n) => `#${n}`).join(", ");

  const logEntry = {
    date,
    topicId: subjectId,
    topicName: subjectName,
    sectionName: sectionName || "",
    problemRange,
    problemNumbers: sortedNums,
    parsedCount: sortedNums.length,
    isRevision: isAnyRevision,
    notes: notes.trim(),
    timestamp: new Date(date).getTime() || Date.now(),
  };

  if (userId) {
    try {
      await addDoc(collection(db, "daily_logs"), logEntry);
    } catch (err) {
      console.error("Failed to add daily log:", err);
    }
  }

  return { newRecord, logEntry };
}

