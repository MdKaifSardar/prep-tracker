"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getSubjectIndex, normalizeProgressRecord } from "@/lib/curriculum";
import { SubjectIndex, SubjectProgressRecord } from "@/types/curriculum";
import { logQuestionsProgress } from "@/lib/progressService";
import QuestionSelectorModal from "@/components/QuestionSelectorModal";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Zap,
  FolderTree,
  ExternalLink,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Check,
  CheckSquare,
  Square,
} from "lucide-react";

export default function SubjectMasterIndexPage() {
  const params = useParams();
  const subjectId = (params?.subjectId as string) || "javascript";
  const { user } = useAuth();

  const subjectIndex: SubjectIndex | null = useMemo(() => {
    return getSubjectIndex(subjectId);
  }, [subjectId]);

  // Real-time Progress Record (Unique solved count + multi-revisions map)
  const [progressRecord, setProgressRecord] = useState<SubjectProgressRecord>({
    subjectId,
    uniqueCompletedCount: 0,
    totalRevisionCount: 0,
    questions: {},
  });

  // Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Expanded sections state (default: all expanded or first 3 expanded)
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  // Inline selection state for logging directly from this page
  const [inlineSelectedNums, setInlineSelectedNums] = useState<Set<number>>(new Set());
  const [isSubmittingInline, setIsSubmittingInline] = useState(false);

  // Initialize expanded sections
  useEffect(() => {
    if (subjectIndex) {
      const init: Record<number, boolean> = {};
      subjectIndex.sections.forEach((sec, idx) => {
        // Expand first 3 sections by default
        init[sec.id] = idx < 3;
      });
      setExpandedSections(init);
    }
  }, [subjectIndex]);

  // Real-time Firestore Progress Listener (Single document)
  useEffect(() => {
    if (!subjectIndex) return;

    if (!user) {
      const saved = typeof window !== "undefined" ? localStorage.getItem(`progress_${subjectId}`) : null;
      if (saved) {
        try {
          setProgressRecord(normalizeProgressRecord(subjectId, JSON.parse(saved)));
        } catch (_) {}
      }
      return;
    }

    const docRef = doc(db, "curriculum_progress", `${user.uid}_${subjectId}`);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProgressRecord(normalizeProgressRecord(subjectId, docSnap.data()));
        } else {
          const saved = typeof window !== "undefined" ? localStorage.getItem(`progress_${subjectId}`) : null;
          setProgressRecord(normalizeProgressRecord(subjectId, saved ? JSON.parse(saved) : null));
        }
      },
      (error) => {
        console.error("Firestore progress listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [user, subjectId, subjectIndex]);

  if (!subjectIndex) {
    return (
      <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
        <h2>Subject not found</h2>
        <p style={{ color: "var(--text-muted)", margin: "1rem 0" }}>
          The requested subject does not exist or has not been indexed yet.
        </p>
        <Link href="/" className="btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isHandbook = subjectIndex.category === "revision_handbook";
  const totalQuestions = subjectIndex.totalQuestions;
  const uniqueCount = progressRecord.uniqueCompletedCount;
  const totalRevisions = progressRecord.totalRevisionCount;
  const progressPercent = Math.min(100, Math.round((uniqueCount / totalQuestions) * 100));

  const toggleSectionExpand = (secId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const toggleInlineQuestion = (num: number) => {
    setInlineSelectedNums((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  };

  const handleInlineSubmit = async () => {
    if (inlineSelectedNums.size === 0 || isSubmittingInline) return;

    setIsSubmittingInline(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await logQuestionsProgress({
        userId: user?.uid,
        subjectId,
        subjectName: subjectIndex.name,
        date: today,
        questionNumbers: Array.from(inlineSelectedNums),
        notes: "Quick logged from subject index",
      });

      setInlineSelectedNums(new Set());
    } catch (err) {
      console.error("Error submitting inline progress:", err);
      alert("Failed to submit progress. Please try again.");
    } finally {
      setIsSubmittingInline(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "6rem", background: "var(--bg-app)" }}>
      {/* Top Navigation Bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(8, 11, 17, 0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0.85rem 0",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Quick Metrics */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Syllabus:</span>
              <strong style={{ color: "var(--accent-emerald)" }}>{uniqueCount}</strong> / {totalQuestions} ({progressPercent}%)
              <span style={{ color: "var(--border-subtle)" }}>•</span>
              <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>{totalRevisions} solves</span>
            </div>

            {/* Log Modal Trigger */}
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.8rem",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              <PlusCircle size={14} /> Log Progress
            </button>
          </div>
        </div>
      </div>

      <main className="container" style={{ marginTop: "2rem", maxWidth: "980px" }}>
        {/* Subject Header */}
        <header
          style={{
            marginBottom: "2rem",
            paddingBottom: "1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {/* Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "0.2rem 0.55rem",
                borderRadius: "4px",
                background: isHandbook ? "rgba(6, 182, 212, 0.15)" : "rgba(234, 179, 8, 0.15)",
                color: isHandbook ? "#38bdf8" : "#facc15",
                border: `1px solid ${isHandbook ? "rgba(6, 182, 212, 0.3)" : "rgba(234, 179, 8, 0.3)"}`,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              {isHandbook ? (
                <>
                  <BookOpen size={13} /> Revision Handbook
                </>
              ) : (
                <>
                  <Zap size={13} /> Technical Interview Q&A
                </>
              )}
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "0.75rem",
              color: "var(--text-primary)",
            }}
          >
            # {subjectIndex.name} ({totalQuestions} {isHandbook ? "Chapters" : "Questions"})
          </h1>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
            Track question completions, record repeat revision sessions, and monitor syllabus coverage. Primary reading and explanations are maintained directly in GitHub Markdown.
          </p>

          {/* Action Row: GitHub Direct Link + Quick Log */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <a
              href={subjectIndex.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.45rem 1rem",
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              <BookOpen size={15} style={{ color: "var(--accent-primary)" }} />
              <span>Read Questions & Answers on GitHub</span>
              <ExternalLink size={13} style={{ color: "var(--text-muted)" }} />
            </a>

            <button
              onClick={() => setIsLogModalOpen(true)}
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.45rem 1.1rem",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              <PlusCircle size={15} />
              <span>Log Practice / Revision</span>
            </button>
          </div>

          {/* Progress Bar Container */}
          <div style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              <span>Unique Completion: {uniqueCount} of {totalQuestions}</span>
              <span>{progressPercent}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #10b981, #06b6d4)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        </header>

        {/* Section List & Question Checklist */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FolderTree size={18} style={{ color: "var(--accent-primary)" }} />
              <span>Sections & Question Index</span>
            </h2>

            {inlineSelectedNums.size > 0 && (
              <button
                onClick={handleInlineSubmit}
                disabled={isSubmittingInline}
                className="btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.35rem 0.85rem",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                <Check size={14} /> Submit {inlineSelectedNums.size} Selected Questions
              </button>
            )}
          </div>

          {/* Section Cards */}
          {subjectIndex.sections.map((section) => {
            const isExpanded = Boolean(expandedSections[section.id]);

            // Calculate section metrics
            let sectionSolvedCount = 0;
            let sectionRevisionTotal = 0;
            section.questions.forEach((q) => {
              const prog = progressRecord.questions[q.number];
              if (prog) {
                sectionSolvedCount++;
                sectionRevisionTotal += prog.revisionCount || 1;
              }
            });

            return (
              <div
                key={section.id}
                style={{
                  background: "rgba(15, 23, 42, 0.4)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  transition: "border-color 0.2s ease",
                }}
              >
                {/* Section Header */}
                <div
                  onClick={() => toggleSectionExpand(section.id)}
                  style={{
                    padding: "0.9rem 1.1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    background: isExpanded ? "rgba(255, 255, 255, 0.03)" : "transparent",
                    borderBottom: isExpanded ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent-primary)",
                        background: "rgba(99, 102, 241, 0.15)",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                      }}
                    >
                      {section.range}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {section.fullName}
                      </h3>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        {sectionSolvedCount} of {section.questionCount} unique solved • {sectionRevisionTotal} total solves
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {/* Status Pill */}
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "0.2rem 0.5rem",
                        borderRadius: "10px",
                        background: sectionSolvedCount === section.questionCount && section.questionCount > 0
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(255, 255, 255, 0.05)",
                        color: sectionSolvedCount === section.questionCount && section.questionCount > 0
                          ? "var(--accent-emerald)"
                          : "var(--text-muted)",
                      }}
                    >
                      {sectionSolvedCount}/{section.questionCount}
                    </span>

                    <button
                      type="button"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        padding: "0.2rem",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Question Checklist (When Expanded) */}
                {isExpanded && (
                  <div style={{ padding: "0.5rem 0.8rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {section.questions.map((q) => {
                      const isChecked = inlineSelectedNums.has(q.number);
                      const prog = progressRecord.questions[q.number];
                      const revCount = prog?.revisionCount || 0;

                      return (
                        <div
                          key={q.number}
                          onClick={() => toggleInlineQuestion(q.number)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.65rem",
                            padding: "0.45rem 0.65rem",
                            borderRadius: "6px",
                            background: isChecked ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.02)",
                            border: isChecked ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent",
                            cursor: "pointer",
                            fontSize: "0.82rem",
                            transition: "background 0.15s ease",
                          }}
                        >
                          {/* Checkbox */}
                          <div
                            style={{
                              width: "17px",
                              height: "17px",
                              borderRadius: "4px",
                              border: isChecked ? "2px solid var(--accent-primary)" : "2px solid rgba(255,255,255,0.3)",
                              background: isChecked ? "var(--accent-primary)" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              flexShrink: 0,
                            }}
                          >
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>

                          {/* Number & Tag */}
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-secondary)", minWidth: "2.5rem" }}>
                            {q.label || `#${q.number}`}
                          </span>

                          {q.priority === "P0" && (
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.05rem 0.35rem", borderRadius: "3px", background: "rgba(239, 68, 68, 0.2)", color: "var(--accent-rose)" }}>
                              P0
                            </span>
                          )}

                          {q.priority === "P1" && (
                            <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "0.05rem 0.35rem", borderRadius: "3px", background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)" }}>
                              P1
                            </span>
                          )}

                          {/* Title */}
                          <span style={{ flex: 1, color: isChecked ? "#fff" : "var(--text-primary)", lineHeight: 1.4 }}>
                            {q.title}
                          </span>

                          {/* Revision Count Badge */}
                          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {revCount > 0 ? (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 600,
                                  padding: "0.1rem 0.4rem",
                                  borderRadius: "10px",
                                  background: "rgba(16, 185, 129, 0.15)",
                                  color: "var(--accent-emerald)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.2rem",
                                }}
                                title={`Last revised on ${prog.lastRevisedAt}`}
                              >
                                <CheckCircle2 size={10} /> {revCount}x
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                ○
                              </span>
                            )}

                            {/* GitHub Link */}
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
                              title="Open on GitHub"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>

      {/* Global Question Selector Modal */}
      <QuestionSelectorModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        initialSubjectId={subjectId}
      />
    </div>
  );
}
