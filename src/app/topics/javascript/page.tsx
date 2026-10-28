"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import jsBankData from "@/data/question_bank/javascript.json";
import { QuestionBankData } from "@/types";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function JavaScriptIndexPage() {
  const { user } = useAuth();
  const bankData: QuestionBankData = jsBankData as QuestionBankData;

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // Firestore Realtime Listener for Completed Questions
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

  const totalQuestions = bankData.totalQuestions;
  const completedCount = completedIds.size;
  const progressPercent = Math.round((completedCount / totalQuestions) * 100);

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "5rem", background: "var(--bg-app)" }}>
      {/* Top Navigation Bar */}
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
              Overall Progress: <strong style={{ color: "var(--accent-emerald)" }}>{completedCount}</strong> / {totalQuestions} ({progressPercent}%)
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
        {/* Markdown Document Title */}
        <header style={{ marginBottom: "2rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1.5rem" }}>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.75rem",
            color: "var(--text-primary)",
          }}>
            # JavaScript Master Answer Key — Index ({totalQuestions} Questions)
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1rem" }}>
            Companion answer key covering all <strong>78 pure JavaScript questions</strong> across 9 dedicated section pages. Every answer strictly adheres to the standardized 4-part framework designed for rapid revision AND deep conceptual mastery.
          </p>

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
        </header>

        {/* 📚 Section & Pattern Index Table */}
        <section style={{ marginBottom: "3rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              📚 Section & Pattern Index
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Answers are split into dedicated pages per topic group. Select any section to open its page:
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
                  <th style={{ padding: "0.75rem 1rem" }}>Section / Pattern Page</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Problem IDs</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Questions</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Progress</th>
                  <th style={{ padding: "0.75rem 1rem", width: "40px" }}></th>
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
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {sec.id}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <Link
                          href={`/topics/javascript/${sec.id}`}
                          style={{
                            color: "var(--accent-primary)",
                            textDecoration: "none",
                            fontWeight: 600,
                            display: "inline-block",
                          }}
                        >
                          {sec.name}
                        </Link>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                        {sec.range}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                        {sec.questionCount}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "0.15rem 0.55rem",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontFamily: "var(--font-mono)",
                          background: isAllDone ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                          color: isAllDone ? "#34d399" : "var(--text-secondary)",
                        }}>
                          {secDone} / {sec.questionCount} {isAllDone && "✓"}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        <Link
                          href={`/topics/javascript/${sec.id}`}
                          style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                          title={`Open ${sec.name}`}
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

        {/* Revision Modes Guide */}
        <section style={{
          background: "rgba(15, 23, 42, 0.25)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem 1.5rem",
        }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
            🎯 Revision Modes & Recommended Path
          </h3>
          <ul style={{
            fontSize: "0.88rem",
            color: "var(--text-secondary)",
            paddingLeft: "1.25rem",
            lineHeight: 1.8,
          }}>
            <li>
              <strong>Core Interview Fast-Sweep:</strong> Focus on 🔴 P0 questions across all sections.
            </li>
            <li>
              <strong>Machine Coding / Output Round:</strong> Drill into <Link href="/topics/javascript/7" style={{ color: "var(--accent-primary)" }}>Section 7 (Output & Debugging)</Link> and <Link href="/topics/javascript/8" style={{ color: "var(--accent-primary)" }}>Section 8 (Polyfills & Utilities)</Link>.
            </li>
            <li>
              <strong>Live JS DSA Round:</strong> Master all 12 CoderPad/LeetCode patterns in <Link href="/topics/javascript/9" style={{ color: "var(--accent-primary)" }}>Section 9 (DSA in JavaScript)</Link>.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
