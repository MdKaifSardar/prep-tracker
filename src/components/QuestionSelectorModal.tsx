"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatLocalDate } from "@/lib/streaks";
import { getSubjectIndex, getAllSubjectSummaries, normalizeProgressRecord } from "@/lib/curriculum";
import { SubjectIndex, QuestionIndexItem, SubjectProgressRecord } from "@/types/curriculum";
import { logQuestionsProgress } from "@/lib/progressService";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  X,
  Search,
  Check,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Layers,
  Sparkles,
  BookOpen,
} from "lucide-react";

interface QuestionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubjectId?: string | null;
  onLoggedSuccess?: (subjectId: string, count: number) => void;
}

export default function QuestionSelectorModal({
  isOpen,
  onClose,
  initialSubjectId,
  onLoggedSuccess,
}: QuestionSelectorModalProps) {
  const { user } = useAuth();
  const allSubjects = useMemo(() => getAllSubjectSummaries(), []);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || allSubjects[0]?.id || "javascript"
  );
  const [selectedSectionId, setSelectedSectionId] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "UNSOLVED" | "REVISED" | "P0">("ALL");
  const [selectedQuestionNums, setSelectedQuestionNums] = useState<Set<number>>(new Set());
  const [date, setDate] = useState<string>(formatLocalDate(new Date()));
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subject Progress Record (Unique solved + Revisions)
  const [progressRecord, setProgressRecord] = useState<SubjectProgressRecord>({
    subjectId: selectedSubjectId,
    uniqueCompletedCount: 0,
    totalRevisionCount: 0,
    questions: {},
  });

  // Current Subject Index (Metadata)
  const currentSubjectIndex: SubjectIndex | null = useMemo(() => {
    return getSubjectIndex(selectedSubjectId);
  }, [selectedSubjectId]);

  // Sync with initialSubjectId when modal opens
  useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
    }
  }, [initialSubjectId, isOpen]);

  // Reset section & selected questions when subject changes
  useEffect(() => {
    setSelectedSectionId("ALL");
    setSearchQuery("");
    setFilterType("ALL");
    setSelectedQuestionNums(new Set());
  }, [selectedSubjectId]);

  // Real-time Firestore / LocalStorage Listener for the selected subject's progress
  useEffect(() => {
    if (!isOpen || !selectedSubjectId) return;

    if (!user) {
      const local = typeof window !== "undefined" ? localStorage.getItem(`progress_${selectedSubjectId}`) : null;
      setProgressRecord(normalizeProgressRecord(selectedSubjectId, local ? JSON.parse(local) : null));
      return;
    }

    const docRef = doc(db, "curriculum_progress", `${user.uid}_${selectedSubjectId}`);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProgressRecord(normalizeProgressRecord(selectedSubjectId, docSnap.data()));
        } else {
          const local = typeof window !== "undefined" ? localStorage.getItem(`progress_${selectedSubjectId}`) : null;
          setProgressRecord(normalizeProgressRecord(selectedSubjectId, local ? JSON.parse(local) : null));
        }
      },
      (err) => {
        console.warn("Firestore progress listener error:", err);
      }
    );

    return () => unsubscribe();
  }, [user, selectedSubjectId, isOpen]);

  // Filtered Questions List
  const filteredQuestions: QuestionIndexItem[] = useMemo(() => {
    if (!currentSubjectIndex) return [];

    let pool: QuestionIndexItem[] = [];
    if (selectedSectionId === "ALL") {
      currentSubjectIndex.sections.forEach((sec) => {
        pool.push(...sec.questions);
      });
    } else {
      const sec = currentSubjectIndex.sections.find((s) => s.id === selectedSectionId);
      if (sec) pool = sec.questions;
    }

    return pool.filter((q) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesNum = String(q.number).includes(query);
        const matchesLabel = q.label && q.label.toLowerCase().includes(query);
        const matchesTitle = q.title.toLowerCase().includes(query);
        if (!matchesNum && !matchesLabel && !matchesTitle) return false;
      }

      // 2. Filter Pills
      const isSolvedBefore = Boolean(progressRecord.questions[q.number]);
      if (filterType === "UNSOLVED" && isSolvedBefore) return false;
      if (filterType === "REVISED" && !isSolvedBefore) return false;
      if (filterType === "P0" && q.priority !== "P0") return false;

      return true;
    });
  }, [currentSubjectIndex, selectedSectionId, searchQuery, filterType, progressRecord]);

  if (!isOpen) return null;

  // Toggle individual question
  const toggleQuestion = (num: number) => {
    setSelectedQuestionNums((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  };

  // Select all filtered
  const selectAllFiltered = () => {
    setSelectedQuestionNums((prev) => {
      const next = new Set(prev);
      filteredQuestions.forEach((q) => next.add(q.number));
      return next;
    });
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedQuestionNums(new Set());
  };

  // Count new vs revisions in current selection
  let selectedNewCount = 0;
  let selectedRevisionCount = 0;
  selectedQuestionNums.forEach((num) => {
    if (progressRecord.questions[num]) {
      selectedRevisionCount++;
    } else {
      selectedNewCount++;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestionNums.size === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const qNums = Array.from(selectedQuestionNums);
      const activeSection =
        selectedSectionId !== "ALL"
          ? currentSubjectIndex?.sections.find((s) => s.id === selectedSectionId)
          : undefined;

      await logQuestionsProgress({
        userId: user?.uid,
        subjectId: selectedSubjectId,
        subjectName: currentSubjectIndex?.name || selectedSubjectId,
        sectionId: typeof selectedSectionId === "number" ? selectedSectionId : undefined,
        sectionName: activeSection?.name,
        date,
        questionNumbers: qNums,
        notes,
      });

      if (onLoggedSuccess) {
        onLoggedSuccess(selectedSubjectId, qNums.length);
      }

      setSelectedQuestionNums(new Set());
      setNotes("");
      onClose();
    } catch (err) {
      console.error("Error submitting questions log:", err);
      alert("Failed to submit progress. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          background: "var(--bg-modal, #0f172a)",
          borderRadius: "var(--radius-lg, 12px)",
          border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.1rem 1.4rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Layers size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Log Completed Questions
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Select questions from the index to log first-time solves or repeat revisions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              padding: "0.3rem",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Dropdowns & Filters Bar */}
        <div
          style={{
            padding: "1rem 1.4rem 0.75rem 1.4rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            background: "rgba(15, 23, 42, 0.4)",
          }}
        >
          {/* Subject & Section Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem", display: "block" }}>
                Subject
              </label>
              <select
                className="form-input"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                style={{ padding: "0.45rem 0.6rem", fontSize: "0.85rem", cursor: "pointer" }}
              >
                {allSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.totalQuestions} {sub.category === "revision_handbook" ? "Ch" : "Qs"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem", display: "block" }}>
                Section
              </label>
              <select
                className="form-input"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value === "ALL" ? "ALL" : parseInt(e.target.value, 10))}
                style={{ padding: "0.45rem 0.6rem", fontSize: "0.85rem", cursor: "pointer" }}
              >
                <option value="ALL">All Sections ({currentSubjectIndex?.totalQuestions || 0} total)</option>
                {currentSubjectIndex?.sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.fullName} ({sec.questionCount})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search & Filter Pills Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
              <Search size={14} style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search by # or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ padding: "0.4rem 0.6rem 0.4rem 2rem", fontSize: "0.82rem" }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              {(["ALL", "UNSOLVED", "REVISED", "P0"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterType(mode)}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "0.3rem 0.55rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    border: filterType === mode ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                    background: filterType === mode ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.03)",
                    color: filterType === mode ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {mode === "ALL" && "All"}
                  {mode === "UNSOLVED" && "Unsolved"}
                  {mode === "REVISED" && "Revised"}
                  {mode === "P0" && "P0 Only"}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", paddingTop: "0.2rem" }}>
            <span>Showing {filteredQuestions.length} questions</span>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={selectAllFiltered}
                style={{ background: "transparent", border: "none", color: "var(--accent-cyan)", cursor: "pointer", fontWeight: 600 }}
              >
                Select All
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={clearSelection}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Question Checklist */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1rem", maxHeight: "380px" }}>
          {filteredQuestions.length === 0 ? (
            <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No questions match the current filter or search criteria.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {filteredQuestions.map((q) => {
                const isSelected = selectedQuestionNums.has(q.number);
                const progress = progressRecord.questions[q.number];
                const revCount = progress?.revisionCount || 0;

                return (
                  <div
                    key={q.number}
                    onClick={() => toggleQuestion(q.number)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "6px",
                      background: isSelected ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.02)",
                      border: isSelected ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(255, 255, 255, 0.05)",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* Checkbox Box */}
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "4px",
                        border: isSelected ? "2px solid var(--accent-primary)" : "2px solid rgba(255,255,255,0.3)",
                        background: isSelected ? "var(--accent-primary)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>

                    {/* Question Number & Priority */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                        {q.label || `#${q.number}`}
                      </span>
                      {q.priority === "P0" && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.08rem 0.35rem", borderRadius: "3px", background: "rgba(239, 68, 68, 0.2)", color: "var(--accent-rose)" }}>
                          P0
                        </span>
                      )}
                      {q.priority === "P1" && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "0.08rem 0.35rem", borderRadius: "3px", background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)" }}>
                          P1
                        </span>
                      )}
                    </div>

                    {/* Question Title */}
                    <span
                      style={{
                        flex: 1,
                        fontSize: "0.83rem",
                        color: isSelected ? "#fff" : "var(--text-primary)",
                        lineHeight: 1.4,
                      }}
                    >
                      {q.title}
                    </span>

                    {/* Revision Status Badge */}
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {revCount > 0 ? (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            padding: "0.15rem 0.45rem",
                            borderRadius: "10px",
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "var(--accent-emerald)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                          title={`Last revised: ${progress.lastRevisedAt}`}
                        >
                          <CheckCircle2 size={11} /> {revCount}x
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          Unsolved
                        </span>
                      )}

                      {/* GitHub Link Icon */}
                      <a
                        href={q.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: "var(--text-muted)",
                          padding: "0.2rem",
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: "4px",
                        }}
                        title="Read question and answer on GitHub"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "1rem 1.4rem",
            borderTop: "1px solid var(--border-subtle)",
            background: "rgba(8, 11, 17, 0.95)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {/* Date & Note Inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>
                Date Completed
              </label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ padding: "0.38rem 0.5rem", fontSize: "0.8rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>
                Session Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Revised closure gotchas and memory leaks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
                style={{ padding: "0.38rem 0.6rem", fontSize: "0.8rem" }}
              />
            </div>
          </div>

          {/* Submission Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.25rem" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {selectedQuestionNums.size > 0 ? (
                <span>
                  Selected: <strong style={{ color: "#fff" }}>{selectedQuestionNums.size}</strong> questions (
                  <span style={{ color: "var(--accent-emerald)" }}>{selectedNewCount} new</span>,{" "}
                  <span style={{ color: "var(--accent-cyan)" }}>{selectedRevisionCount} revisions</span>)
                </span>
              ) : (
                <span>No questions selected</span>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: "0.45rem 0.9rem", fontSize: "0.82rem" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedQuestionNums.size === 0 || isSubmitting}
                className="btn-primary"
                style={{
                  padding: "0.45rem 1.1rem",
                  fontSize: "0.82rem",
                  opacity: selectedQuestionNums.size === 0 || isSubmitting ? 0.5 : 1,
                  cursor: selectedQuestionNums.size === 0 || isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? "Submitting..." : `Submit ${selectedQuestionNums.size} Questions 🚀`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

