"use client";

import React, { useState } from "react";
import { DailyLog } from "@/types";
import { formatLocalDate } from "@/lib/streaks";

interface ActivityHeatmapProps {
  logs: DailyLog[];
}

export default function ActivityHeatmap({ logs }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    count: number;
    topics: { [topic: string]: number };
  } | null>(null);

  // Map dates to questions and topic breakdowns
  const dateMap = new Map<string, { total: number; topics: { [name: string]: number } }>();
  for (const log of logs) {
    const entry = dateMap.get(log.date) || { total: 0, topics: {} };
    entry.total += log.parsedCount;
    entry.topics[log.topicName] = (entry.topics[log.topicName] || 0) + log.parsedCount;
    dateMap.set(log.date, entry);
  }

  // Generate calendar grid for past 26 weeks (~6 months) ending on current Sunday
  const today = new Date();
  const weeksCount = 26;
  const daysInWeek = 7;

  // Find Monday of current week
  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
  const daysSinceMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekMonday = new Date(today);
  currentWeekMonday.setDate(today.getDate() - daysSinceMon);

  // Starting Monday: 25 weeks prior
  const startMonday = new Date(currentWeekMonday);
  startMonday.setDate(currentWeekMonday.getDate() - (weeksCount - 1) * 7);

  // Build columns (weeks)
  const weeks: { date: Date; dateStr: string; count: number; topics: { [name: string]: number } }[][] = [];
  const monthLabels: { index: number; label: string }[] = [];
  let lastMonth = -1;

  for (let w = 0; w < weeksCount; w++) {
    const weekDays = [];
    for (let d = 0; d < daysInWeek; d++) {
      const cellDate = new Date(startMonday);
      cellDate.setDate(startMonday.getDate() + w * 7 + d);
      const dateStr = formatLocalDate(cellDate);
      const data = dateMap.get(dateStr) || { total: 0, topics: {} };

      weekDays.push({
        date: cellDate,
        dateStr,
        count: data.total,
        topics: data.topics,
      });

      // Track month labels on Mondays
      if (d === 0) {
        const m = cellDate.getMonth();
        if (m !== lastMonth) {
          monthLabels.push({
            index: w,
            label: cellDate.toLocaleDateString("en-US", { month: "short" }),
          });
          lastMonth = m;
        }
      }
    }
    weeks.push(weekDays);
  }

  const getHeatColor = (count: number) => {
    if (count === 0) return "var(--heat-0)";
    if (count <= 5) return "var(--heat-1)";
    if (count <= 10) return "var(--heat-2)";
    if (count <= 20) return "var(--heat-3)";
    return "var(--heat-4)";
  };

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

  return (
    <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem", position: "relative" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "1.25rem",
      }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Activity Heatmap
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Daily questions solved over the last 6 months (each cell = one day)
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          <span>Less</span>
          <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: "var(--heat-0)" }} />
          <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: "var(--heat-1)" }} />
          <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: "var(--heat-2)" }} />
          <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: "var(--heat-3)" }} />
          <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: "var(--heat-4)" }} />
          <span>More</span>
        </div>
      </div>

      {/* Heatmap Grid Container with horizontal scroll on mobile */}
      <div style={{ overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div style={{ display: "inline-flex", flexDirection: "column", minWidth: "700px" }}>
          {/* Month headers */}
          <div style={{ display: "flex", marginLeft: "30px", marginBottom: "6px", height: "18px" }}>
            {monthLabels.map((m, idx) => (
              <span
                key={idx}
                style={{
                  position: "relative",
                  left: `${m.index * 16}px`,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginRight: "-20px",
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid Rows: Day labels + Week columns */}
          <div style={{ display: "flex", gap: "4px" }}>
            {/* Day of week labels */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              width: "26px",
              paddingTop: "2px",
            }}>
              {dayLabels.map((label, idx) => (
                <div
                  key={idx}
                  style={{
                    height: "13px",
                    fontSize: "0.65rem",
                    color: "var(--text-muted)",
                    lineHeight: "13px",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks columns */}
            <div style={{ display: "flex", gap: "4px" }}>
              {weeks.map((week, wIdx) => (
                <div key={wIdx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {week.map((day, dIdx) => {
                    const isFuture = day.date > today;
                    return (
                      <div
                        key={dIdx}
                        onMouseEnter={(e) => {
                          if (isFuture) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 10,
                            date: day.dateStr,
                            count: day.count,
                            topics: day.topics,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          width: "13px",
                          height: "13px",
                          borderRadius: "3px",
                          backgroundColor: isFuture ? "transparent" : getHeatColor(day.count),
                          border: isFuture ? "1px dashed rgba(255,255,255,0.04)" : "none",
                          cursor: isFuture ? "default" : "pointer",
                          transition: "transform 0.1s ease, filter 0.1s ease",
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: "translate(-50%, -100%)",
            background: "rgba(13, 19, 34, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--border-hover)",
            borderRadius: "var(--radius-sm)",
            padding: "0.5rem 0.75rem",
            color: "#fff",
            fontSize: "0.75rem",
            boxShadow: "var(--shadow-card)",
            pointerEvents: "none",
            zIndex: 100,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>
            {new Date(tooltip.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div style={{ color: tooltip.count > 0 ? "var(--accent-emerald)" : "var(--text-muted)" }}>
            {tooltip.count === 0 ? "No questions logged" : `${tooltip.count} question${tooltip.count > 1 ? "s" : ""} solved`}
          </div>
          {Object.entries(tooltip.topics).length > 0 && (
            <div style={{ marginTop: "0.3rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.3rem" }}>
              {Object.entries(tooltip.topics).map(([top, c]) => (
                <div key={top} style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>
                  {top}: <span style={{ fontWeight: 600, color: "#fff" }}>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
