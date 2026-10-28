"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
} from "firebase/firestore";
import { getSubjectManifest } from "@/lib/curriculum";
import { CurriculumItem, TopicManifest } from "@/types/curriculum";
import CodeBlock from "@/components/CodeBlock";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { ArrowLeft, ExternalLink, CheckSquare, Square } from "lucide-react";

export default function DedicatedTopicPage() {
  const params = useParams();
  const subjectId = (params?.subjectId as string) || "javascript";
  const topicId = (params?.topicId as string) || "1";
  const { user } = useAuth();

  const manifest = getSubjectManifest(subjectId);
  const isHandbook = manifest?.category === "revision_handbook";

  // Find current, prev, next topics
  const currentTopic: TopicManifest | undefined = manifest?.topics.find((t) => t.id === topicId);
  const currentOrder = currentTopic ? currentTopic.order : parseInt(topicId, 10);
  const prevTopic: TopicManifest | undefined = manifest?.topics.find((t) => t.order === currentOrder - 1);
  const nextTopic: TopicManifest | undefined = manifest?.topics.find((t) => t.order === currentOrder + 1);

  // Completed items set (from single Firestore doc per subject)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [filterPriority, setFilterPriority] = useState<"ALL" | "P0" | "P1">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UNCOMPLETED" | "COMPLETED">("ALL");
  const [isSyncing, setIsSyncing] = useState(false);

  // Firestore Realtime Listener: Exactly 1 single document read per subject!
  useEffect(() => {
    if (!manifest) return;

    if (!user) {
      const saved = localStorage.getItem(`progress_${subjectId}`);
      if (saved) {
        try {
          setCompletedIds(new Set(JSON.parse(saved)));
        } catch (_) {}
      }
      return;
    }

    const docRef = doc(db, "curriculum_progress", `${user.uid}_${subjectId}`);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const items = Array.isArray(data.completedItemIds) ? data.completedItemIds : [];
          setCompletedIds(new Set(items));
          localStorage.setItem(`progress_${subjectId}`, JSON.stringify(items));
        } else {
          setCompletedIds(new Set());
        }
      },
      (error) => {
        console.error("Firestore single-doc progress listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [user, subjectId, manifest]);

  // Questions or Reference Blocks for this topic
  const topicItems: CurriculumItem[] = useMemo(() => {
    if (!manifest) return [];
    return manifest.items.filter((item) => item.topicId === topicId);
  }, [manifest, topicId]);

  // Filtered items (for Q&A)
  const displayedItems = useMemo(() => {
    return topicItems.filter((item) => {
      if (filterPriority !== "ALL" && item.priority !== filterPriority) return false;
      const isDone = completedIds.has(item.id);
      if (filterStatus === "COMPLETED" && !isDone) return false;
      if (filterStatus === "UNCOMPLETED" && isDone) return false;
      return true;
    });
  }, [topicItems, filterPriority, filterStatus, completedIds]);

  // Toggle item completion (Optimistic + Atomic arrayUnion on single Firestore doc)
  const handleToggleItem = async (itemId: string, itemTitle?: string, qNum?: number) => {
    const isCurrentlyDone = completedIds.has(itemId);
    const newCompleted = !isCurrentlyDone;

    // 1. Optimistic local update
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (newCompleted) next.add(itemId);
      else next.delete(itemId);
      localStorage.setItem(`progress_${subjectId}`, JSON.stringify(Array.from(next)));
      return next;
    });

    if (!user) return;

    try {
      setIsSyncing(true);
      const docRef = doc(db, "curriculum_progress", `${user.uid}_${subjectId}`);
      const todayStr = new Date().toISOString().split("T")[0];

      // Atomic single-doc update
      await setDoc(
        docRef,
        {
          userId: user.uid,
          subjectId,
          completedItemIds: newCompleted ? arrayUnion(itemId) : arrayRemove(itemId),
          lastStudiedAt: todayStr,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      // Auto-log to daily_logs on completion to tick Heatmaps & Streaks!
      if (newCompleted) {
        await addDoc(collection(db, "daily_logs"), {
          date: todayStr,
          topicId: subjectId,
          topicName: manifest?.name || subjectId,
          problemRange: qNum ? `${qNum}` : currentTopic?.name || "Topic Review",
          parsedCount: 1,
          isRevision: false,
          notes: itemTitle ? `Completed: ${itemTitle.slice(0, 60)}` : `Revised: ${currentTopic?.name}`,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error("Failed to sync progress:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!manifest || !currentTopic) {
    return (
      <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
        <h2>Topic not found</h2>
        <Link href={`/subjects/${subjectId}`} style={{ color: "var(--accent-primary)" }}>
          Return to {manifest?.name || "Subject"} Index
        </Link>
      </div>
    );
  }

  // Progress metrics
  const isChapterRevised = completedIds.has(`chapter_${currentTopic.id}`);
  const doneCount = topicItems.filter((i) => completedIds.has(i.id)).length;
  const progressPercent = topicItems.length > 0 ? Math.round((doneCount / topicItems.length) * 100) : 0;

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
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
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
              href={`/subjects/${subjectId}`}
              style={{
                color: "var(--accent-primary)",
                fontSize: "0.85rem",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              📋 {isHandbook ? "Handbook Index" : "Master Index"}
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {isHandbook ? (
              <button
                onClick={() => handleToggleItem(`chapter_${currentTopic.id}`, currentTopic.name)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isChapterRevised ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.15)",
                  background: isChapterRevised ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  color: isChapterRevised ? "#34d399" : "var(--text-primary)",
                }}
              >
                {isChapterRevised ? <CheckSquare size={16} /> : <Square size={16} />}
                <span>{isChapterRevised ? "Chapter Revised ✓" : "Mark Chapter as Revised"}</span>
              </button>
            ) : (
              <>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Topic Progress: <strong style={{ color: "var(--accent-emerald)" }}>{doneCount}</strong> / {topicItems.length} ({progressPercent}%)
                </span>
                <div style={{
                  width: "100px",
                  height: "6px",
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
              </>
            )}

            {isSyncing && (
              <span style={{ fontSize: "0.75rem", color: "var(--accent-primary)" }}>
                ● Syncing...
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="container" style={{ marginTop: "2rem", maxWidth: "980px" }}>
        {/* Markdown-Style Top Navigation Bar */}
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
          {prevTopic ? (
            <Link
              href={`/subjects/${subjectId}/${prevTopic.id}`}
              style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}
            >
              ⬅️ Previous: {prevTopic.name.replace(/^\d+\.\s*/, "")}
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>⏮️ (start)</span>
          )}

          <Link
            href={`/subjects/${subjectId}`}
            style={{ color: "var(--accent-primary)", textDecoration: "none", fontWeight: 700 }}
          >
            [📋 Index]
          </Link>

          {nextTopic ? (
            <Link
              href={`/subjects/${subjectId}/${nextTopic.id}`}
              style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}
            >
              Next: {nextTopic.name.replace(/^\d+\.\s*/, "")} ➡️
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>(end) ⏭️</span>
          )}
        </nav>

        {/* Topic Heading matching Markdown */}
        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{
            fontSize: "1.85rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.5rem",
            color: "var(--text-primary)",
          }}>
            ## {currentTopic.name}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {isHandbook ? (
              <span>Revision Scope: <code style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>{currentTopic.rangeOrLabel}</code> &nbsp;·&nbsp; {topicItems.length} Reference Cards</span>
            ) : (
              <span>Problem IDs: <code style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>{currentTopic.rangeOrLabel}</code> &nbsp;·&nbsp; {topicItems.length} Questions</span>
            )}
          </p>
        </header>

        {/* Markdown-Style In-Page Index */}
        <nav aria-label="In-page index" style={{
          marginBottom: "1.75rem",
          padding: "1rem 1.25rem",
          background: "rgba(15, 23, 42, 0.4)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}>
          <div style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--text-muted)",
            marginBottom: "0.6rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}>
            <span>📑 In-Page Topic Index</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>
              ({topicItems.length} items)
            </span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "0.35rem 1.25rem",
            fontSize: "0.85rem",
          }}>
            {topicItems.map((item) => {
              const targetId = isHandbook ? `ref-${item.id}` : `q-${item.order}`;
              const isDone = completedIds.has(item.id);
              return (
                <a
                  key={item.id}
                  href={`#${targetId}`}
                  style={{
                    color: isDone ? "#34d399" : "var(--text-secondary)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "inline-block",
                    padding: "0.15rem 0",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = isDone ? "#34d399" : "var(--text-secondary)")}
                >
                  <span style={{ opacity: 0.6, marginRight: "0.4rem", fontFamily: "var(--font-mono)" }}>
                    {isHandbook ? "•" : `#${item.order}`}
                  </span>
                  {item.title}
                </a>
              );
            })}
          </div>
        </nav>

        {!isHandbook && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "2rem",
            padding: "0.6rem 0.85rem",
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
                All ({topicItems.length})
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
                🔴 P0 Only ({topicItems.filter((q) => q.priority === "P0").length})
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
                Unsolved ({topicItems.length - doneCount})
              </button>
            </div>

            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Showing {displayedItems.length} of {topicItems.length} items
            </span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ARCHETYPE A: INTERVIEW Q&A (Full Content & Syntax Highlighting) */}
        {/* ------------------------------------------------------------- */}
        {!isHandbook && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", marginBottom: "3.5rem" }}>
            {displayedItems.map((q) => {
              const isDone = completedIds.has(q.id);

              return (
                <article
                  key={q.id}
                  id={`q-${q.order}`}
                  style={{
                    background: isDone ? "rgba(16, 185, 129, 0.025)" : "rgba(15, 23, 42, 0.45)",
                    border: `1px solid ${isDone ? "rgba(16, 185, 129, 0.3)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "1.5rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Question Header: ### QNum. 🔴 P0 [Type] Title */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", marginBottom: "1rem" }}>
                    <button
                      onClick={() => handleToggleItem(q.id, q.title, q.order)}
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
                      {isDone ? <CheckSquare size={22} /> : <Square size={22} />}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.35rem" }}>
                        <span style={{ fontWeight: 800, color: isDone ? "#34d399" : "var(--text-primary)", fontSize: "1.15rem" }}>
                          ### {q.order}.
                        </span>

                        <span style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: q.priority === "P0" ? "#fca5a5" : "#fed7aa",
                        }}>
                          {q.priority === "P0" ? "🔴 P0" : "🟠 P1"}
                        </span>

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

                        <h3 style={{
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          color: isDone ? "var(--text-secondary)" : "var(--text-primary)",
                          textDecoration: isDone ? "line-through" : "none",
                          lineHeight: 1.5,
                          display: "inline",
                        }}>
                          {q.title}
                        </h3>

                        {q.leetcodeUrl && (
                          <a
                            href={q.leetcodeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.8rem",
                              color: "#f59e0b",
                              textDecoration: "none",
                              marginLeft: "0.4rem",
                              fontWeight: 600,
                            }}
                            title="Open official LeetCode problem"
                          >
                            LeetCode <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1. TL;DR Blockquote (Markdown Style) */}
                  {q.summary && (
                    <blockquote style={{
                      padding: "0.75rem 1rem",
                      background: "rgba(99, 102, 241, 0.07)",
                      borderLeft: "3px solid var(--accent-primary)",
                      borderRadius: "0 6px 6px 0",
                      fontSize: "0.9rem",
                      color: "#e0e7ff",
                      lineHeight: 1.6,
                      marginBottom: "1.25rem",
                    }}>
                      <strong style={{ color: "var(--accent-primary)", display: "inline-block", marginRight: "0.4rem" }}>
                        TL;DR:
                      </strong>
                      <MarkdownRenderer content={q.summary} />
                    </blockquote>
                  )}

                  {/* 2. Core Concept & Explanation */}
                  {q.explanation && (
                    <div style={{ marginBottom: "1.25rem" }}>
                      <h4 style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        marginBottom: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}>
                        💡 Core Concept & Explanation
                      </h4>
                      <MarkdownRenderer content={q.explanation} />
                    </div>
                  )}

                  {/* 3. Code Implementation with Syntax Highlighting */}
                  {q.codeSnippet && (
                    <div style={{ marginBottom: "1.25rem" }}>
                      <h4 style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        marginBottom: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}>
                        🛠️ Code / Implementation
                      </h4>
                      <CodeBlock code={q.codeSnippet} language="javascript" title="JavaScript Solution & Logic" />
                    </div>
                  )}

                  {/* 4. Interview Pitfalls & Gotchas Alert */}
                  {q.gotchas && (
                    <div style={{
                      padding: "0.85rem 1.1rem",
                      background: "rgba(239, 68, 68, 0.07)",
                      borderLeft: "3px solid #ef4444",
                      borderRadius: "0 6px 6px 0",
                      fontSize: "0.88rem",
                      color: "#fecaca",
                      lineHeight: 1.6,
                    }}>
                      <strong style={{ color: "#f87171", display: "block", marginBottom: "0.35rem" }}>
                        ⚠️ Interview Pitfall / Pro-Tip:
                      </strong>
                      <MarkdownRenderer content={q.gotchas} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ARCHETYPE B: REVISION HANDBOOK (Syntax Cards with Highlighting) */}
        {/* ------------------------------------------------------------- */}
        {isHandbook && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", marginBottom: "3.5rem" }}>
            {topicItems.map((item) => (
              <section
                key={item.id}
                id={`ref-${item.id}`}
                style={{
                  background: "rgba(15, 23, 42, 0.45)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.5rem",
                }}
              >
                {/* Reference Block Title */}
                <h3 style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}>
                  <span style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}>
                    ###
                  </span>
                  {item.title}
                </h3>

                {/* Explanation text */}
                {item.summary && (
                  <div style={{ marginBottom: "1rem" }}>
                    <MarkdownRenderer content={item.summary} />
                  </div>
                )}

                {/* Syntax Highlighted Code Template */}
                {item.codeSnippet && (
                  <div style={{ marginBottom: "1rem" }}>
                    <CodeBlock code={item.codeSnippet} language="javascript" title="Algorithmic Syntax Template" />
                  </div>
                )}

                {/* Highlighted Gotchas Blockquote */}
                {item.gotchas && (
                  <blockquote style={{
                    padding: "0.75rem 1rem",
                    background: "rgba(245, 158, 11, 0.08)",
                    borderLeft: "3px solid var(--accent-amber)",
                    borderRadius: "0 6px 6px 0",
                    fontSize: "0.88rem",
                    color: "#fef3c7",
                    lineHeight: 1.6,
                  }}>
                    <strong style={{ display: "block", marginBottom: "0.25rem", color: "var(--accent-amber)" }}>
                      ⚠️ Don't Forget:
                    </strong>
                    <MarkdownRenderer content={item.gotchas.replace(/^⚠️\s*\*\*Don't Forget.*?\*\*:\s*/i, "")} />
                  </blockquote>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Markdown-Style Bottom Navigation Bar */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "0.88rem",
          color: "var(--text-muted)",
        }}>
          {prevTopic ? (
            <Link
              href={`/subjects/${subjectId}/${prevTopic.id}`}
              style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}
            >
              ⬅️ Previous: {prevTopic.name.replace(/^\d+\.\s*/, "")}
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>⏮️ (start)</span>
          )}

          <Link
            href={`/subjects/${subjectId}`}
            style={{ color: "var(--accent-primary)", textDecoration: "none", fontWeight: 700 }}
          >
            [📋 Index]
          </Link>

          {nextTopic ? (
            <Link
              href={`/subjects/${subjectId}/${nextTopic.id}`}
              style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}
            >
              Next: {nextTopic.name.replace(/^\d+\.\s*/, "")} ➡️
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>(end) ⏭️</span>
          )}
        </nav>
      </main>
    </div>
  );
}
