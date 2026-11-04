"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Topic, DailyLog } from "@/types";
import { PlusCircle, Target, CheckCircle, Clock, Edit2, BookOpen, CheckCircle2, ArrowRight } from "lucide-react";

interface TopicProgressGridProps {
  topics: Topic[];
  logs: DailyLog[];
  onQuickLogTopic: (topic: Topic) => void;
  onUpdateTopicTarget: (topicId: string, newTarget: number) => Promise<void>;
}

export default function TopicProgressGrid({
  topics,
  logs,
  onQuickLogTopic,
  onUpdateTopicTarget,
}: TopicProgressGridProps) {
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTargetValue, setEditTargetValue] = useState<number>(100);

  // Calculate new activity per topic from logs
  const activityMap = new Map<string, number>();
  for (const log of logs) {
    activityMap.set(log.topicId, (activityMap.get(log.topicId) || 0) + log.parsedCount);
  }

  const sortedTopics = [...topics].sort((a, b) => a.order - b.order);

  const handleStartEdit = (t: Topic) => {
    setEditingTopicId(t.id);
    setEditTargetValue(t.target);
  };

  const handleSaveEdit = async (topicId: string) => {
    if (editTargetValue > 0) {
      await onUpdateTopicTarget(topicId, editTargetValue);
    }
    setEditingTopicId(null);
  };

  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "1.25rem",
      }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Topic Progress & Syllabus Goals
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Tracking questions completed vs target goals across all interview modules
          </p>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1.1rem",
      }}>
        {sortedTopics.map((t) => {
          const newActivity = activityMap.get(t.id) || 0;
          const totalCompleted = newActivity;
          const target = t.target || 100;
          const percentage = Math.min(100, Math.round((totalCompleted / target) * 100));
          const remaining = Math.max(0, target - totalCompleted);

          const isEditing = editingTopicId === t.id;

          return (
            <div
              key={t.id}
              className="glass-card"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                transition: "all 0.2s ease",
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "0.6rem",
                      height: "0.6rem",
                      borderRadius: "50%",
                      backgroundColor: t.color || "var(--accent-primary)",
                      boxShadow: `0 0 8px ${t.color || "var(--accent-primary)"}`,
                    }}
                  />
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {t.name}
                  </h3>
                </div>

                {/* Quick Log Button */}
                <button
                  onClick={() => onQuickLogTopic(t)}
                  className="btn-secondary"
                  style={{
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.75rem",
                    gap: "0.25rem",
                  }}
                  title="Quick Log Problems"
                >
                  <PlusCircle size={13} />
                  <span>Log</span>
                </button>
              </div>

              {/* Stats & Progress numbers */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <div>
                  <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {totalCompleted}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "0.25rem" }}>
                    / {isEditing ? "" : target}
                  </span>
                </div>

                {isEditing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <input
                      type="number"
                      value={editTargetValue}
                      onChange={(e) => setEditTargetValue(Number(e.target.value))}
                      style={{
                        width: "60px",
                        padding: "0.15rem 0.3rem",
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(t.id)}
                      className="btn-primary"
                      style={{ padding: "0.15rem 0.4rem", fontSize: "0.75rem" }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: percentage >= 100 ? "var(--accent-emerald)" : "var(--text-secondary)" }}>
                      {percentage}%
                    </span>
                    <button
                      onClick={() => handleStartEdit(t)}
                      style={{
                        color: "var(--text-muted)",
                        background: "none",
                        border: "none",
                        padding: "0.1rem",
                        cursor: "pointer",
                      }}
                      title="Edit Target"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div style={{
                width: "100%",
                height: "6px",
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
                marginBottom: "0.75rem",
              }}>
                <div
                  style={{
                    width: `${percentage}%`,
                    height: "100%",
                    background: percentage >= 100
                      ? "var(--accent-emerald)"
                      : `linear-gradient(90deg, ${t.color || "#6366f1"}, #06b6d4)`,
                    borderRadius: "var(--radius-full)",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>

              {/* Remaining badge */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span>
                  {remaining === 0 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "var(--accent-emerald)" }}>
                      <CheckCircle2 size={13} /> Target completed!
                    </span>
                  ) : (
                    `${remaining} problems remaining`
                  )}
                </span>
              </div>

              {/* Link to Subject Index */}
              <Link
                href={`/subjects/${t.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "0.85rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: "0.8rem",
                  color: t.color || "var(--accent-primary)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <BookOpen size={13} />
                  <span>
                    Questions Index ({t.target} {t.id.includes("fundamentals") ? "Ch" : "Qs"})
                  </span>
                </span>
                <ArrowRight size={13} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
