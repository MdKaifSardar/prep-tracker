"use client";

import React, { useState } from "react";
import { Topic, DailyLog } from "@/types";
import { PlusCircle, Target, CheckCircle, Clock, Edit2 } from "lucide-react";

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
          // Note: If historical logs were imported into daily_logs, baselineCompleted is already included in logs
          // We compute completed = Math.max(t.baselineCompleted, newActivity) or total
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
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: t.color || "var(--accent-primary)",
                    boxShadow: `0 0 10px ${t.color || "var(--accent-primary)"}`,
                  }} />
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{t.name}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <button
                    onClick={() => handleStartEdit(t)}
                    title="Edit target goal"
                    style={{
                      padding: "0.3rem",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => onQuickLogTopic(t)}
                    className="btn-primary"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.3rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <PlusCircle size={13} />
                    <span>Log</span>
                  </button>
                </div>
              </div>

              {/* Progress Numbers */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <div>
                  <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>
                    {totalCompleted}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "0.25rem" }}>
                    / {isEditing ? (
                      <input
                        type="number"
                        value={editTargetValue}
                        onChange={(e) => setEditTargetValue(parseInt(e.target.value, 10) || 1)}
                        onBlur={() => handleSaveEdit(t.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(t.id)}
                        autoFocus
                        style={{
                          width: "60px",
                          background: "var(--bg-input)",
                          border: "1px solid var(--accent-primary)",
                          color: "#fff",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                        }}
                      />
                    ) : (
                      `${target} target`
                    )}
                  </span>
                </div>

                <span style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: percentage >= 100 ? "var(--accent-emerald)" : "var(--accent-primary)",
                }}>
                  {percentage}%
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div style={{
                width: "100%",
                height: "8px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                overflow: "hidden",
                marginBottom: "0.85rem",
              }}>
                <div
                  style={{
                    width: `${percentage}%`,
                    height: "100%",
                    borderRadius: "var(--radius-full)",
                    background: percentage >= 100
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : `linear-gradient(90deg, ${t.color || "var(--accent-primary)"}, #818cf8)`,
                    boxShadow: `0 0 10px ${t.color || "var(--accent-primary)"}80`,
                    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>

              {/* Remaining badge */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span>
                  {remaining === 0 ? "Target completed! 🎉" : `${remaining} problems remaining`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
