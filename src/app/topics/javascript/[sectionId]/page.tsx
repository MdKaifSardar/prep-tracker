"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import jsBankData from "@/data/question_bank/javascript.json";
import { Question, QuestionBankData, SectionInfo } from "@/types";
import { ArrowLeft, ExternalLink, CheckSquare, Square, ChevronDown, ChevronUp } from "lucide-react";

export default function JavaScriptSectionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const bankData: QuestionBankData = jsBankData as QuestionBankData;

  const sectionIdNum = parseInt((params?.sectionId as string) || "1", 10);

  // Find current section
  const currentSection: SectionInfo | undefined = bankData.sections.find((s) => s.id === sectionIdNum);

  // Previous and Next section info for exact markdown navigation
  const prevSection: SectionInfo | undefined = bankData.sections.find((s) => s.id === sectionIdNum - 1);
  const nextSection: SectionInfo | undefined = bankData.sections.find((s) => s.id === sectionIdNum + 1);

  // Completed question IDs set
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [filterPriority, setFilterPriority] = useState<"ALL" | "P0" | "P1">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UNCOMPLETED" | "COMPLETED">("ALL");
  const [expandedTldrs, setExpandedTldrs] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  // Firestore Realtime Listener
  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem("completed_javascript");
      if (saved) {
        try {
          setCompletedIds(new Set(JSON.parse(saved)));
        } catch (_) {}
      }
      return;
    }

    const progressRef = collection(db, "question_progress");
    const unsubscribe = onSnapshot(
      progressRef,
      (snapshot) => {
        const set = new Set<string>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.topicId === "javascript" && data.completed) {
            set.add(data.questionId || docSnap.id);
          }
        });
        setCompletedIds(set);
        localStorage.setItem("completed_javascript", JSON.stringify(Array.from(set)));
      },
      (error) => {
        console.error("Firestore progress listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Questions for this specific section
  const sectionQuestions = useMemo(() => {
    return bankData.questions.filter((q) => q.sectionId === sectionIdNum);
  }, [bankData.questions, sectionIdNum]);

  // Filtered Questions inside this section
  const displayedQuestions = useMemo(() => {
    return sectionQuestions.filter((q) => {
      if (filterPriority !== "ALL" && q.priority !== filterPriority) return false;
      const isDone = completedIds.has(q.id);
      if (filterStatus === "COMPLETED" && !isDone) return false;
      if (filterStatus === "UNCOMPLETED" && isDone) return false;
      return true;
    });
  }, [sectionQuestions, filterPriority, filterStatus, completedIds]);

  // Toggle completion & auto-log
  const handleToggleQuestion = async (q: Question) => {
    const isCurrentlyDone = completedIds.has(q.id);
    const newCompleted = !isCurrentlyDone;

    // Optimistic local update
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (newCompleted) next.add(q.id);
      else next.delete(q.id);
      localStorage.setItem("completed_javascript", JSON.stringify(Array.from(next)));
      return next;
    });

    if (!user) return;

    try {
      setIsSyncing(true);
      const docId = `${user.uid || "user"}_${q.id}`;
      const qRef = doc(db, "question_progress", docId);

      if (newCompleted) {
        const todayStr = new Date().toISOString().split("T")[0];
        await setDoc(
          qRef,
          {
            userId: user.uid,
            questionId: q.id,
            qNumber: q.qNumber,
            topicId: q.topicId,
            completed: true,
            completedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Auto-log to daily_logs
        await addDoc(collection(db, "daily_logs"), {
          date: todayStr,
          topicId: q.topicId,
          topicName: "JavaScript",
          problemRange: `${q.qNumber}`,
          parsedCount: 1,
          isRevision: false,
          notes: `Completed #${q.qNumber}: ${q.title.slice(0, 60)}...`,
          timestamp: Date.now(),
        });
      } else {
        await deleteDoc(qRef);
      }
    } catch (err) {
      console.error("Failed to sync question progress:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleTldr = (qId: string) => {
    setExpandedTldrs((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const toggleAllTldrs = () => {
    if (expandedTldrs.size > 0) {
      setExpandedTldrs(new Set());
    } else {
      setExpandedTldrs(new Set(sectionQuestions.map((q) => q.id)));
    }
  };

  if (!currentSection) {
    return (
      <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
        <h2>Section not found</h2>
        <Link href="/topics/javascript" style={{ color: "var(--accent-primary)" }}>
          Return to JavaScript Index
        </Link>
      </div>
    );
  }

  const completedInSection = sectionQuestions.filter((q) => completedIds.has(q.id)).length;
  const sectionPercent = Math.round((completedInSection / sectionQuestions.length) * 100);

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "5rem", background: "var(--bg-app)" }}>
      {/* Top Navbar */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(8, 11, 17, 0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0.85rem 0",
      }}>
        <div className="container" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <span style={{ color: "var(--border-subtle)" }}>/</span>
            <Link
              href="/topics/javascript"
              style={{
                color: "var(--accent-primary)",
                fontSize: "0.85rem",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              📋 Master Index
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Section Progress: <strong style={{ color: "var(--accent-emerald)" }}>{completedInSection}</strong> / {sectionQuestions.length} ({sectionPercent}%)
            </span>
            <div style={{
              width: "100px",
              height: "6px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${sectionPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #10b981, #06b6d4)",
                transition: "width 0.3s ease",
              }} />
            </div>
            {isSyncing && (
              <span style={{ fontSize: "0.75rem", color: "var(--accent-primary)" }}>
                ● Syncing...
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="container" style={{ marginTop: "2rem", maxWidth: "980px" }}>
        {/* Markdown-Style Top Pagination Links */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "1.25rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize: "0.88rem",
          color: "var(--text-muted)",
        }}>
          {prevSection ? (
            <Link
              href={`/topics/javascript/${prevSection.id}`}
              style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}
            >
              ⬅️ Previous: {prevSection.name.replace(/^\d+\.\s*/, "")}
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>⏮️ (start)</span>
          )}

          <Link
            href="/topics/javascript"
            style={{ color: "var(--accent-primary)", textDecoration: "none", fontWeight: 700 }}
          >
            [📋 Index]
          </Link>

          {nextSection ? (
            <Link
              href={`/topics/javascript/${nextSection.id}`}
              style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}
            >
              Next: {nextSection.name.replace(/^\d+\.\s*/, "")} ➡️
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>(end) ⏭️</span>
          )}
        </nav>

        {/* Section Heading matching Markdown */}
        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{
            fontSize: "1.85rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.5rem",
            color: "var(--text-primary)",
          }}>
            ## {currentSection.name}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Problem IDs: <code style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>{currentSection.range}</code> &nbsp;·&nbsp;
            Total Questions: <strong>{sectionQuestions.length}</strong>
          </p>
        </header>

        {/* Section Filter Toolbar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.75rem",
          padding: "0.75rem 1rem",
          background: "rgba(15, 23, 42, 0.4)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: "0.2rem" }}>Filter:</span>
            <button
              onClick={() => setFilterPriority("ALL")}
              style={{
                background: filterPriority === "ALL" ? "var(--accent-primary)" : "rgba(255,255,255,0.06)",
                color: filterPriority === "ALL" ? "#fff" : "var(--text-secondary)",
                padding: "0.25rem 0.65rem",
                borderRadius: "4px",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              All ({sectionQuestions.length})
            </button>
            <button
              onClick={() => setFilterPriority(filterPriority === "P0" ? "ALL" : "P0")}
              style={{
                background: filterPriority === "P0" ? "#dc2626" : "rgba(220, 38, 38, 0.12)",
                color: filterPriority === "P0" ? "#fff" : "#fca5a5",
                border: "1px solid rgba(220, 38, 38, 0.3)",
                padding: "0.25rem 0.65rem",
                borderRadius: "4px",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              🔴 P0 Only ({sectionQuestions.filter((q) => q.priority === "P0").length})
            </button>
            <button
              onClick={() => setFilterStatus(filterStatus === "UNCOMPLETED" ? "ALL" : "UNCOMPLETED")}
              style={{
                background: filterStatus === "UNCOMPLETED" ? "var(--accent-amber)" : "rgba(245, 158, 11, 0.12)",
                color: filterStatus === "UNCOMPLETED" ? "#000" : "#fcd34d",
                padding: "0.25rem 0.65rem",
                borderRadius: "4px",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              Unsolved ({sectionQuestions.length - completedInSection})
            </button>
          </div>

          <button
            onClick={toggleAllTldrs}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              color: "var(--text-muted)",
              padding: "0.35rem 0.65rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
            }}
          >
            {expandedTldrs.size > 0 ? "Collapse All TL;DRs" : "Expand All TL;DRs"}
          </button>
        </div>

        {/* Questions List for this Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "3rem" }}>
          {displayedQuestions.map((q) => {
            const isDone = completedIds.has(q.id);
            const isExpanded = expandedTldrs.has(q.id);

            return (
              <article
                key={q.id}
                id={`q-${q.qNumber}`}
                style={{
                  background: isDone ? "rgba(16, 185, 129, 0.03)" : "rgba(15, 23, 42, 0.45)",
                  border: `1px solid ${isDone ? "rgba(16, 185, 129, 0.25)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "1rem 1.25rem",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                  {/* Interactive Checkbox */}
                  <button
                    onClick={() => handleToggleQuestion(q)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: isDone ? "#34d399" : "var(--text-muted)",
                      paddingTop: "0.2rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={isDone ? "Mark as uncompleted" : "Mark as completed (auto-logs to streak)"}
                  >
                    {isDone ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>

                  <div style={{ flex: 1 }}>
                    {/* Question Header: ### QNum. 🔴 P0 [Type] Title */}
                    <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.45rem" }}>
                      <span style={{ fontWeight: 800, color: isDone ? "#34d399" : "var(--text-primary)", fontSize: "1.05rem" }}>
                        ### {q.qNumber}.
                      </span>

                      {/* Priority */}
                      <span style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: q.priority === "P0" ? "#fca5a5" : "#fed7aa",
                      }}>
                        {q.priority === "P0" ? "🔴 P0" : "🟠 P1"}
                      </span>

                      {/* Type */}
                      <span style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        background: "rgba(255, 255, 255, 0.05)",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "3px",
                      }}>
                        [{q.type}]
                      </span>

                      {/* Title */}
                      <h3 style={{
                        fontSize: "0.98rem",
                        fontWeight: 600,
                        color: isDone ? "var(--text-secondary)" : "var(--text-primary)",
                        textDecoration: isDone ? "line-through" : "none",
                        lineHeight: 1.5,
                        display: "inline",
                      }}>
                        {q.title}
                      </h3>

                      {/* LeetCode link if present */}
                      {q.leetcodeUrl && (
                        <a
                          href={q.leetcodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.78rem",
                            color: "#f59e0b",
                            textDecoration: "none",
                            marginLeft: "0.3rem",
                            fontWeight: 600,
                          }}
                          title="Open official LeetCode problem"
                        >
                          LeetCode <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    {/* TLDR Toggle Button */}
                    {q.tldr && (
                      <div style={{ marginTop: "0.6rem" }}>
                        <button
                          onClick={() => toggleTldr(q.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--accent-primary)",
                            fontSize: "0.8rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            fontWeight: 600,
                            padding: 0,
                          }}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? "Hide Answer / TL;DR" : "> **TL;DR:** (Click to reveal)"}
                        </button>

                        {/* TLDR Blockquote (Markdown Style) */}
                        {isExpanded && (
                          <blockquote style={{
                            marginTop: "0.6rem",
                            padding: "0.75rem 1rem",
                            background: "rgba(99, 102, 241, 0.08)",
                            borderLeft: "3px solid var(--accent-primary)",
                            borderRadius: "0 6px 6px 0",
                            fontSize: "0.88rem",
                            color: "#e0e7ff",
                            lineHeight: 1.6,
                          }}>
                            <strong>TL;DR:</strong> {q.tldr}
                          </blockquote>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Markdown-Style Bottom Pagination Links */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "0.88rem",
          color: "var(--text-muted)",
        }}>
          {prevSection ? (
            <Link
              href={`/topics/javascript/${prevSection.id}`}
              style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}
            >
              ⬅️ Previous: {prevSection.name.replace(/^\d+\.\s*/, "")}
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>⏮️ (start)</span>
          )}

          <Link
            href="/topics/javascript"
            style={{ color: "var(--accent-primary)", textDecoration: "none", fontWeight: 700 }}
          >
            [📋 Index]
          </Link>

          {nextSection ? (
            <Link
              href={`/topics/javascript/${nextSection.id}`}
              style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}
            >
              Next: {nextSection.name.replace(/^\d+\.\s*/, "")} ➡️
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>(end) ⏭️</span>
          )}
        </nav>
      </main>
    </div>
  );
}
