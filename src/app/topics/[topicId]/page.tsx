"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { ArrowLeft, ExternalLink, CheckSquare, Square, ChevronDown, ChevronUp, ArrowUp } from "lucide-react";

export default function TopicQuestionBankPage() {
  const params = useParams();
  const topicId = (params?.topicId as string) || "javascript";
  const { user } = useAuth();

  // For now, JS is the supported section
  const bankData: QuestionBankData = jsBankData as QuestionBankData;

  // Local & Firestore state for completed question IDs: Set of "js_1", "js_2", etc.
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [filterPriority, setFilterPriority] = useState<"ALL" | "P0" | "P1">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UNCOMPLETED" | "COMPLETED">("ALL");
  const [expandedTldrs, setExpandedTldrs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Firestore Realtime Listener for Completed Questions
  useEffect(() => {
    if (!user) {
      // Offline / Local fallback: load from localStorage if present
      const saved = localStorage.getItem(`completed_${topicId}`);
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
          if (data.topicId === topicId && data.completed) {
            set.add(data.questionId || docSnap.id);
          }
        });
        setCompletedIds(set);
        localStorage.setItem(`completed_${topicId}`, JSON.stringify(Array.from(set)));
      },
      (error) => {
        console.error("Firestore progress listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [user, topicId]);

  // Toggle Question Completion (Interactive checkmark + Auto-log)
  const handleToggleQuestion = async (q: Question) => {
    const isCurrentlyDone = completedIds.has(q.id);
    const newCompleted = !isCurrentlyDone;

    // Optimistic local update
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (newCompleted) next.add(q.id);
      else next.delete(q.id);
      localStorage.setItem(`completed_${topicId}`, JSON.stringify(Array.from(next)));
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

        // Auto-log to daily_logs so Heatmap & Streaks tick up automatically!
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

  // Toggle TLDR disclosure
  const toggleTldr = (qId: string) => {
    setExpandedTldrs((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // Toggle all TLDRs in section or page
  const toggleAllTldrs = () => {
    if (expandedTldrs.size > 0) {
      setExpandedTldrs(new Set());
    } else {
      setExpandedTldrs(new Set(bankData.questions.map((q) => q.id)));
    }
  };

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return bankData.questions.filter((q) => {
      // Priority filter
      if (filterPriority !== "ALL" && q.priority !== filterPriority) return false;
      // Status filter
      const isDone = completedIds.has(q.id);
      if (filterStatus === "COMPLETED" && !isDone) return false;
      if (filterStatus === "UNCOMPLETED" && isDone) return false;
      // Search
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        return (
          q.title.toLowerCase().includes(query) ||
          q.qNumber.toString().includes(query) ||
          q.tldr.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [bankData.questions, filterPriority, filterStatus, searchQuery, completedIds]);

  const totalQuestions = bankData.totalQuestions;
  const completedCount = completedIds.size;
  const progressPercent = Math.round((completedCount / totalQuestions) * 100);

  // Group filtered questions by section
  const sectionGroups = useMemo(() => {
    return bankData.sections.map((section) => {
      const qs = filteredQuestions.filter((q) => q.sectionId === section.id);
      const sectionCompleted = qs.filter((q) => completedIds.has(q.id)).length;
      return {
        ...section,
        questions: qs,
        completedCount: sectionCompleted,
      };
    });
  }, [bankData.sections, filteredQuestions, completedIds]);

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "5rem", background: "var(--bg-app)" }}>
      {/* Top Breadcrumb & Actions Bar */}
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
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Progress: <strong style={{ color: "var(--accent-emerald)" }}>{completedCount}</strong> / {totalQuestions} ({progressPercent}%)
            </span>
            <div style={{
              width: "120px",
              height: "7px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${progressPercent}%`,
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
        {/* Markdown-style Header */}
        <header style={{ marginBottom: "2rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1.5rem" }}>
          <h1 style={{
            fontSize: "1.85rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.6rem",
            color: "var(--text-primary)",
          }}>
            # JavaScript Technical Interview Master List ({totalQuestions} Questions)
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1rem" }}>
            <strong>Track:</strong> Fresher → 0–1 YOE → Junior Full Stack / Backend / Frontend / Startup
          </p>

          {/* Legend Matching Markdown */}
          <div style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1.1rem",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}>
            <div>
              <strong style={{ color: "var(--text-secondary)" }}>Priority:</strong> 🔴 P0 Essential (Highest ROI) &nbsp;·&nbsp; 🟠 P1 Important
            </div>
            <div>
              <strong style={{ color: "var(--text-secondary)" }}>Type:</strong> [C] Conceptual &nbsp;·&nbsp; [Q] Code/Mechanism &nbsp;·&nbsp; [D] Architecture &nbsp;·&nbsp; [P] Performance
            </div>
          </div>
        </header>

        {/* 📚 In-Page Section & Pattern Index (Table of Contents) */}
        <section style={{
          background: "rgba(15, 23, 42, 0.4)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem",
          marginBottom: "2.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              📚 Section & Pattern Index (In-Page Navigation)
            </h2>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Click any section below to jump directly
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.88rem",
              textAlign: "left",
            }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.6rem 0.75rem", width: "40px" }}>#</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Section / Pattern Page</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Problem IDs</th>
                  <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {bankData.sections.map((sec) => {
                  const secQuestions = bankData.questions.filter((q) => q.sectionId === sec.id);
                  const secDone = secQuestions.filter((q) => completedIds.has(q.id)).length;
                  const isAllDone = secDone === sec.questionCount;

                  return (
                    <tr
                      key={sec.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "0.65rem 0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {sec.id}
                      </td>
                      <td style={{ padding: "0.65rem 0.75rem" }}>
                        <a
                          href={`#section-${sec.id}`}
                          style={{
                            color: "var(--accent-primary)",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          {sec.name}
                        </a>
                      </td>
                      <td style={{ padding: "0.65rem 0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                        {sec.range}
                      </td>
                      <td style={{ padding: "0.65rem 0.75rem", textAlign: "right" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontFamily: "var(--font-mono)",
                          background: isAllDone ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                          color: isAllDone ? "#34d399" : "var(--text-secondary)",
                        }}>
                          {secDone} / {sec.questionCount} {isAllDone && "✓"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Toolbar: Filters & Search */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "2rem",
          padding: "0.85rem 1rem",
          background: "rgba(15, 23, 42, 0.5)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}>
          {/* Priority & Status Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: "0.3rem" }}>Filter:</span>
            
            <button
              onClick={() => setFilterPriority("ALL")}
              style={{
                background: filterPriority === "ALL" ? "var(--accent-primary)" : "rgba(255,255,255,0.06)",
                color: filterPriority === "ALL" ? "#fff" : "var(--text-secondary)",
                padding: "0.3rem 0.7rem",
                borderRadius: "4px",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              All ({totalQuestions})
            </button>
            <button
              onClick={() => setFilterPriority(filterPriority === "P0" ? "ALL" : "P0")}
              style={{
                background: filterPriority === "P0" ? "#dc2626" : "rgba(220, 38, 38, 0.12)",
                color: filterPriority === "P0" ? "#fff" : "#fca5a5",
                border: "1px solid rgba(220, 38, 38, 0.3)",
                padding: "0.3rem 0.7rem",
                borderRadius: "4px",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              🔴 P0 Only ({bankData.questions.filter((q) => q.priority === "P0").length})
            </button>
            <button
              onClick={() => setFilterStatus(filterStatus === "UNCOMPLETED" ? "ALL" : "UNCOMPLETED")}
              style={{
                background: filterStatus === "UNCOMPLETED" ? "var(--accent-amber)" : "rgba(245, 158, 11, 0.12)",
                color: filterStatus === "UNCOMPLETED" ? "#000" : "#fcd34d",
                padding: "0.3rem 0.7rem",
                borderRadius: "4px",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              Unsolved ({totalQuestions - completedCount})
            </button>
          </div>

          {/* Quick Actions: Search + Expand All TLDR */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, maxWidth: "340px", justifyContent: "flex-end" }}>
            <input
              type="text"
              placeholder="Search questions or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "0.4rem 0.75rem",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
              }}
            />
            <button
              onClick={toggleAllTldrs}
              title="Expand/Collapse all TL;DR summaries"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                color: "var(--text-muted)",
                padding: "0.4rem 0.6rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.75rem",
                whiteSpace: "nowrap",
              }}
            >
              {expandedTldrs.size > 0 ? "Collapse All" : "Expand TL;DRs"}
            </button>
          </div>
        </div>

        {/* 📖 Section Blocks with In-Page Navigation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
          {sectionGroups.map((section, secIdx) => {
            if (section.questions.length === 0) return null;

            const prevSection = secIdx > 0 ? sectionGroups[secIdx - 1] : null;
            const nextSection = secIdx < sectionGroups.length - 1 ? sectionGroups[secIdx + 1] : null;

            return (
              <section
                key={section.id}
                id={`section-${section.id}`}
                style={{
                  background: "rgba(15, 23, 42, 0.3)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.75rem",
                  scrollMarginTop: "5rem",
                }}
              >
                {/* Section Header with In-Page Quick Nav */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "1rem",
                  marginBottom: "1.25rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}>
                  <div>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                      ## {section.name}
                    </h2>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Range: {section.range} &nbsp;·&nbsp; {section.completedCount}/{section.questions.length} completed
                    </span>
                  </div>

                  <a
                    href="#top"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      textDecoration: "none",
                      padding: "0.3rem 0.6rem",
                      background: "rgba(255, 255, 255, 0.04)",
                      borderRadius: "4px",
                    }}
                  >
                    <ArrowUp size={13} /> Back to Index
                  </a>
                </div>

                {/* Questions List for this Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {section.questions.map((q) => {
                    const isDone = completedIds.has(q.id);
                    const isExpanded = expandedTldrs.has(q.id);

                    return (
                      <div
                        key={q.id}
                        id={`q-${q.qNumber}`}
                        style={{
                          background: isDone ? "rgba(16, 185, 129, 0.04)" : "rgba(255, 255, 255, 0.015)",
                          border: `1px solid ${isDone ? "rgba(16, 185, 129, 0.25)" : "var(--border-subtle)"}`,
                          borderRadius: "var(--radius-md)",
                          padding: "0.85rem 1rem",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {/* Question Row Header */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleQuestion(q)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: isDone ? "#34d399" : "var(--text-muted)",
                              paddingTop: "0.15rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title={isDone ? "Mark as uncompleted" : "Mark as completed (auto-logs to streak)"}
                          >
                            {isDone ? <CheckSquare size={19} /> : <Square size={19} />}
                          </button>

                          {/* Content */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.35rem" }}>
                              <span style={{ fontWeight: 800, color: isDone ? "#34d399" : "var(--text-primary)", fontSize: "0.95rem" }}>
                                {q.qNumber}.
                              </span>

                              {/* Priority badge */}
                              <span style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: q.priority === "P0" ? "#fca5a5" : "#fed7aa",
                              }}>
                                {q.priority === "P0" ? "🔴 P0" : "🟠 P1"}
                              </span>

                              {/* Type tag */}
                              <span style={{
                                fontSize: "0.72rem",
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-mono)",
                                background: "rgba(255, 255, 255, 0.05)",
                                padding: "0.08rem 0.35rem",
                                borderRadius: "3px",
                              }}>
                                [{q.type}]
                              </span>

                              {/* Question Title */}
                              <span style={{
                                fontSize: "0.92rem",
                                fontWeight: 600,
                                color: isDone ? "var(--text-secondary)" : "var(--text-primary)",
                                textDecoration: isDone ? "line-through" : "none",
                                lineHeight: 1.45,
                              }}>
                                {q.title}
                              </span>

                              {/* LeetCode link if present */}
                              {q.leetcodeUrl && (
                                <a
                                  href={q.leetcodeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.2rem",
                                    fontSize: "0.75rem",
                                    color: "#f59e0b",
                                    textDecoration: "none",
                                    marginLeft: "0.3rem",
                                  }}
                                  title="Open official LeetCode problem"
                                >
                                  LeetCode <ExternalLink size={11} />
                                </a>
                              )}
                            </div>

                            {/* TLDR Block (Markdown-style quote) */}
                            {q.tldr && (
                              <div style={{ marginTop: "0.5rem" }}>
                                <button
                                  onClick={() => toggleTldr(q.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--accent-primary)",
                                    fontSize: "0.78rem",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    fontWeight: 600,
                                    padding: 0,
                                  }}
                                >
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  {isExpanded ? "Hide TL;DR Answer" : "Show TL;DR Summary"}
                                </button>

                                {isExpanded && (
                                  <blockquote style={{
                                    marginTop: "0.5rem",
                                    padding: "0.6rem 0.85rem",
                                    background: "rgba(99, 102, 241, 0.07)",
                                    borderLeft: "3px solid var(--accent-primary)",
                                    borderRadius: "0 4px 4px 0",
                                    fontSize: "0.84rem",
                                    color: "#e0e7ff",
                                    lineHeight: 1.5,
                                  }}>
                                    <strong>TL;DR:</strong> {q.tldr}
                                  </blockquote>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Section Pagination / Navigation Footer Matching Markdown */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "1.5rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                }}>
                  {prevSection ? (
                    <a
                      href={`#section-${prevSection.id}`}
                      style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                    >
                      ⬅️ Previous: {prevSection.name.split(". ")[1] || prevSection.name}
                    </a>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>⏮️ (start)</span>
                  )}

                  <a
                    href="#top"
                    style={{ color: "var(--accent-primary)", textDecoration: "none", fontWeight: 600 }}
                  >
                    📋 Index
                  </a>

                  {nextSection ? (
                    <a
                      href={`#section-${nextSection.id}`}
                      style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                    >
                      Next: {nextSection.name.split(". ")[1] || nextSection.name} ➡️
                    </a>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>(end) ⏭️</span>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
