"use client";

import React, { useState, useEffect } from "react";
import { Topic, DailyLog } from "@/types";
import { parseProblemRange } from "@/lib/parser";
import { formatLocalDate } from "@/lib/streaks";
import { X, CheckCircle, AlertTriangle, Calendar, Layers, Hash, BookOpen } from "lucide-react";

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  logs: DailyLog[];
  selectedTopic?: Topic | null;
  onSaveLog: (logData: {
    date: string;
    topicId: string;
    topicName: string;
    problemRange: string;
    parsedCount: number;
    isRevision: boolean;
    notes?: string;
  }) => Promise<void>;
}

export default function QuickLogModal({
  isOpen,
  onClose,
  topics,
  logs,
  selectedTopic,
  onSaveLog,
}: QuickLogModalProps) {
  const [date, setDate] = useState<string>(formatLocalDate(new Date()));
  const [topicId, setTopicId] = useState<string>("");
  const [problemRange, setProblemRange] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState(parseProblemRange(""));

  useEffect(() => {
    if (selectedTopic) {
      setTopicId(selectedTopic.id);
    } else if (topics.length > 0 && !topicId) {
      setTopicId(topics[0].id);
    }
  }, [selectedTopic, topics, topicId]);

  useEffect(() => {
    setParseResult(parseProblemRange(problemRange));
  }, [problemRange]);

  if (!isOpen) return null;

  const currentTopic = topics.find((t) => t.id === topicId) || topics[0];

  // Duplicate / Overlap Check: See if any of the parsed numbers were logged for this topic before
  const previousProblemsForTopic = new Set<number>();
  for (const log of logs) {
    if (log.topicId === topicId) {
      const parsed = parseProblemRange(log.problemRange);
      parsed.problems.forEach((num) => previousProblemsForTopic.add(num));
    }
  }

  const duplicates = parseResult.problems.filter((p) => previousProblemsForTopic.has(p));
  const isRevision = duplicates.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parseResult.isValid || parseResult.count <= 0) return;

    setIsSubmitting(true);
    try {
      await onSaveLog({
        date,
        topicId: currentTopic.id,
        topicName: currentTopic.name,
        problemRange: parseResult.cleanString,
        parsedCount: parseResult.count,
        isRevision,
        notes: notes.trim() || "",
      });
      // Reset form
      setProblemRange("");
      setNotes("");
      onClose();
    } catch (err) {
      console.error("Error saving log:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
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
          maxWidth: "480px",
          background: "var(--bg-modal)",
          boxShadow: "var(--shadow-modal)",
          padding: "1.75rem",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Log Completed Problems
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Record questions solved to update your streaks and heatmap
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              color: "var(--text-muted)",
              padding: "0.4rem",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Date Field */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
              <Calendar size={14} color="var(--accent-primary)" /> Date
            </label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Topic Selector */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
              <Layers size={14} color="var(--accent-cyan)" /> Topic
            </label>
            <select
              className="form-input"
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              required
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id} style={{ background: "#0d1322" }}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Problem Range */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
              <Hash size={14} color="var(--accent-amber)" /> Problem Number(s) or Range
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 58-61, 70 or 1, 3, 5"
              value={problemRange}
              onChange={(e) => setProblemRange(e.target.value)}
              autoFocus
              required
            />
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
              Supports ranges (`58-61`) or comma-separated numbers (`1, 2, 5`).
            </div>
          </div>

          {/* Validation Feedback & Duplicate Warning */}
          {problemRange.trim() && (
            <div style={{
              padding: "0.65rem 0.85rem",
              borderRadius: "var(--radius-md)",
              background: parseResult.isValid
                ? isRevision
                  ? "rgba(245, 158, 11, 0.1)"
                  : "rgba(16, 185, 129, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${
                parseResult.isValid
                  ? isRevision
                    ? "rgba(245, 158, 11, 0.3)"
                    : "rgba(16, 185, 129, 0.3)"
                  : "rgba(239, 68, 68, 0.3)"
              }`,
              fontSize: "0.8rem",
            }}>
              {parseResult.isValid ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {isRevision ? (
                    <>
                      <AlertTriangle size={15} color="var(--accent-amber)" />
                      <span>
                        <strong>{parseResult.count} problem{parseResult.count > 1 ? "s" : ""}</strong> (
                        <span style={{ color: "var(--accent-amber)" }}>
                          ⚠ Q{duplicates.join(", Q")} revisited / previously logged
                        </span>)
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} color="var(--accent-emerald)" />
                      <span style={{ color: "var(--accent-emerald)" }}>
                        ✓ <strong>{parseResult.count} new question{parseResult.count > 1 ? "s" : ""}</strong> ready to log
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ color: "var(--accent-rose)" }}>
                  ✖ {parseResult.error}
                </div>
              )}
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
              <BookOpen size={14} color="var(--text-muted)" /> Notes (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Revised Two Pointers, solved LC 54"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Submit Actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!parseResult.isValid || isSubmitting}
              className="btn-primary"
              style={{ opacity: !parseResult.isValid || isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? "Saving..." : "Save Progress"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
