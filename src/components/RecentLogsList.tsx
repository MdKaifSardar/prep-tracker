"use client";

import React, { useState } from "react";
import { DailyLog, Topic } from "@/types";
import { Trash2, Search, Filter } from "lucide-react";

interface RecentLogsListProps {
  logs: DailyLog[];
  topics: Topic[];
  onDeleteLog: (id: string) => Promise<void>;
}

export default function RecentLogsList({ logs, topics, onDeleteLog }: RecentLogsListProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(20);

  const filteredLogs = logs.filter((log) => {
    const matchesTopic = selectedTopic === "all" || log.topicId === selectedTopic;
    const matchesSearch =
      !searchQuery ||
      log.topicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.problemRange.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.notes && log.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTopic && matchesSearch;
  });

  const displayedLogs = filteredLogs.slice(0, visibleCount);

  return (
    <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "3rem" }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginBottom: "1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Activity Log History
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              All recorded study sessions ({filteredLogs.length} entries)
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search problems, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "30px", width: "180px", fontSize: "0.8rem" }}
              />
            </div>

            {/* Topic Filter */}
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="form-input"
              style={{ width: "130px", fontSize: "0.8rem" }}
            >
              <option value="all">All Topics</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table / List */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
              <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>Date</th>
              <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>Topic</th>
              <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>Problems Logged</th>
              <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>Count</th>
              <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>Notes</th>
              <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  No log entries found.
                </td>
              </tr>
            ) : (
              displayedLogs.map((log) => {
                const topicObj = topics.find((t) => t.id === log.topicId);
                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {log.date}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <span
                        className="badge"
                        style={{
                          background: `${topicObj?.color || "#6366f1"}1a`,
                          color: topicObj?.color || "var(--accent-primary)",
                          border: `1px solid ${topicObj?.color || "#6366f1"}40`,
                        }}
                      >
                        {log.topicName}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#fff" }}>
                      {log.problemRange}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontWeight: 700 }}>
                      <span style={{
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "var(--accent-emerald)",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.8rem",
                      }}>
                        +{log.parsedCount}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.8rem", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.notes || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                      <button
                        onClick={() => onDeleteLog(log.id)}
                        title="Delete this entry"
                        style={{
                          color: "var(--text-muted)",
                          padding: "0.3rem",
                          borderRadius: "var(--radius-sm)",
                          display: "inline-flex",
                          alignItems: "center",
                          transition: "color 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-rose)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Load More */}
      {filteredLogs.length > visibleCount && (
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            onClick={() => setVisibleCount((prev) => prev + 25)}
            className="btn-secondary"
            style={{ fontSize: "0.8rem", padding: "0.5rem 1.25rem" }}
          >
            Load More Entries ({filteredLogs.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
