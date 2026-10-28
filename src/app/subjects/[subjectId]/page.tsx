"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getSubjectManifest } from "@/lib/curriculum";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle } from "lucide-react";

export default function SubjectMasterIndexPage() {
  const params = useParams();
  const subjectId = (params?.subjectId as string) || "javascript";
  const { user } = useAuth();

  const manifest = getSubjectManifest(subjectId);

  // Set of completed item IDs from single document: users/{userId}/curriculum_progress/{subjectId}
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

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

  if (!manifest) {
    return (
      <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
        <h2>Subject not found</h2>
        <p style={{ color: "var(--text-muted)", margin: "1rem 0" }}>
          Currently supported pilot subjects are: <strong>javascript</strong> and <strong>js-fundamentals</strong>.
        </p>
        <Link href="/" style={{ color: "var(--accent-primary)" }}>
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isHandbook = manifest.category === "revision_handbook";
  const totalItems = manifest.totalItems;
  const completedCount = completedIds.size;
  const progressPercent = Math.min(100, Math.round((completedCount / totalItems) * 100));

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
              {isHandbook ? "Chapters Revised:" : "Completed Questions:"} <strong style={{ color: "var(--accent-emerald)" }}>{completedCount}</strong> / {totalItems} ({progressPercent}%)
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
          </div>
        </div>
      </div>

      <main className="container" style={{ marginTop: "2.5rem", maxWidth: "980px" }}>
        {/* Document Header */}
        <header style={{ marginBottom: "2rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              background: isHandbook ? "rgba(6, 182, 212, 0.15)" : "rgba(234, 179, 8, 0.15)",
              color: isHandbook ? "#38bdf8" : "#facc15",
              border: `1px solid ${isHandbook ? "rgba(6, 182, 212, 0.3)" : "rgba(234, 179, 8, 0.3)"}`,
            }}>
              {isHandbook ? "📘 Revision Handbook" : "⚡ Technical Interview Q&A"}
            </span>
          </div>

          <h1 style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.75rem",
            color: "var(--text-primary)",
          }}>
            # {manifest.name} ({totalItems} {isHandbook ? "Chapters" : "Questions"})
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1rem" }}>
            {manifest.description}
          </p>

          {!isHandbook && (
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
                <strong style={{ color: "var(--text-secondary)" }}>Priority Legend:</strong> 🔴 P0 = must-know, highest interview ROI &nbsp;·&nbsp; 🟠 P1 = daily baseline / important
              </div>
              <div>
                <strong style={{ color: "var(--text-secondary)" }}>Types:</strong> [C] Conceptual &nbsp;·&nbsp; [Q] Code &nbsp;·&nbsp; [D] Architecture &nbsp;·&nbsp; [P] Performance
              </div>
            </div>
          )}
        </header>

        {/* 📚 Master Index Table */}
        <section style={{ marginBottom: "3rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              📚 {isHandbook ? "Chapter Navigation Index" : "Section & Pattern Index"}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              {isHandbook
                ? "Select any chapter to drill into its reference syntax, boilerplates, and gotchas:"
                : "Select any topic to open its dedicated question page with full pagination:"}
            </p>
          </div>

          <div style={{
            background: "rgba(15, 23, 42, 0.4)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
              textAlign: "left",
            }}>
              <thead>
                <tr style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "rgba(255, 255, 255, 0.03)",
                  color: "var(--text-muted)",
                }}>
                  <th style={{ padding: "0.75rem 1rem", width: "50px" }}>#</th>
                  <th style={{ padding: "0.75rem 1rem" }}>{isHandbook ? "Chapter Name" : "Section / Pattern Page"}</th>
                  <th style={{ padding: "0.75rem 1rem" }}>{isHandbook ? "Scope" : "Problem IDs"}</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>{isHandbook ? "Cards" : "Questions"}</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Progress</th>
                  <th style={{ padding: "0.75rem 1rem", width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {manifest.topics.map((topic) => {
                  let isDone = false;
                  let doneCount = 0;

                  if (isHandbook) {
                    isDone = completedIds.has(`chapter_${topic.id}`);
                  } else {
                    const topicQuestions = manifest.items.filter((item) => item.topicId === topic.id);
                    doneCount = topicQuestions.filter((item) => completedIds.has(item.id)).length;
                    isDone = doneCount === topic.itemCount && topic.itemCount > 0;
                  }

                  return (
                    <tr
                      key={topic.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {topic.id}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <Link
                          href={`/subjects/${subjectId}/${topic.id}`}
                          style={{
                            color: "var(--accent-primary)",
                            textDecoration: "none",
                            fontWeight: 600,
                            display: "inline-block",
                          }}
                        >
                          {topic.name}
                        </Link>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                        {topic.rangeOrLabel}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                        {topic.itemCount}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "0.15rem 0.55rem",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontFamily: "var(--font-mono)",
                          background: isDone ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                          color: isDone ? "#34d399" : "var(--text-secondary)",
                        }}>
                          {isHandbook ? (isDone ? "Revised ✓" : "Pending") : `${doneCount} / ${topic.itemCount} ${isDone ? "✓" : ""}`}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        <Link
                          href={`/subjects/${subjectId}/${topic.id}`}
                          style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                          title={`Open ${topic.name}`}
                        >
                          <ArrowRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
